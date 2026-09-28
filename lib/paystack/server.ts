import "server-only";

import { createHmac } from "node:crypto";

/**
 * Server-only Paystack client.
 *
 * SECURITY:
 *  - Uses PAYSTACK_SECRET_KEY which MUST only ever be used server-side.
 *  - Never import this module from client components.
 *  - The public key (PAYSTACK_PUBLIC_KEY) may be exposed to the browser where
 *    Paystack's frontend integration needs it, but never the secret key.
 */

const PAYSTACK_API_BASE = "https://api.paystack.co";

function paystackHeaders() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error("Missing PAYSTACK_SECRET_KEY configuration.");
  }
  return {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  };
}

export type PaystackInitializeInput = {
  email: string;
  /** Amount in the smallest currency unit (kobo for NGN). */
  amountKobo: number;
  reference: string;
  metadata: Record<string, unknown>;
  callbackUrl: string;
};

export type InitializePaystackResult =
  | { ok: true; authorizationUrl: string; accessCode: string }
  | { ok: false; error: string };

export async function initializePaystackTransaction(
  input: PaystackInitializeInput,
): Promise<InitializePaystackResult> {
  try {
    const response = await fetch(`${PAYSTACK_API_BASE}/transaction/initialize`, {
      method: "POST",
      headers: paystackHeaders(),
      body: JSON.stringify({
        email: input.email,
        amount: String(input.amountKobo),
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
        currency: "NGN",
      }),
    });

    const data = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: { authorization_url?: string; access_code?: string };
    };

    if (!response.ok || !data.status || !data.data?.authorization_url) {
      const message = data.message || `Paystack initialize failed (${response.status}).`;
      return { ok: false, error: message };
    }

    return {
      ok: true,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code ?? "",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Paystack request failed.",
    };
  }
}

export type PaystackVerifiedTransaction = {
  status: "success" | "abandoned" | "failed" | "pending" | "unknown";
  reference: string;
  amountKobo: number;
  currency: string;
  paidAt?: string | null;
};

/**
 * Verify a transaction with Paystack. The authoritative confirmation of a
 * charge must come from here or the (verified) webhook — never the frontend.
 */
export async function verifyPaystackTransaction(
  reference: string,
): Promise<PaystackVerifiedTransaction | null> {
  try {
    const response = await fetch(
      `${PAYSTACK_API_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
      { method: "GET", headers: paystackHeaders() },
    );
    const data = (await response.json()) as {
      status?: boolean;
      data?: {
        status?: string;
        reference?: string;
        amount?: number;
        currency?: string;
        paid_at?: string | null;
      };
    };

    if (!response.ok || !data.status || !data.data) {
      return null;
    }

    const rawStatus = data.data.status?.toLowerCase() ?? "unknown";

    let status: PaystackVerifiedTransaction["status"];
    if (rawStatus === "success") status = "success";
    else if (rawStatus === "abandoned") status = "abandoned";
    else if (rawStatus === "failed") status = "failed";
    else status = "pending";

    return {
      status,
      reference: data.data.reference ?? reference,
      amountKobo: data.data.amount ?? 0,
      currency: data.data.currency ?? "NGN",
      paidAt: data.data.paid_at ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Verify a Paystack webhook signature.
 *
 * Paystack signs the raw HTTP request body with HMAC-SHA512 using the secret
 * key, then sends the hex digest in the "x-paystack-signature" header.
 */
export function isValidPaystackWebhookSignature({
  signature,
  rawBody,
}: {
  signature?: string | null;
  rawBody: string;
}): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  // Signature header Paystack sends: "x-paystack-signature"
  const received = signature?.trim();
  if (!secret || !received) {
    return false;
  }

  const actual = received.startsWith("sha512=")
    ? received.slice("sha512=".length).trim()
    : received;

  const expected = createHmac("sha512", secret).update(rawBody, "utf8").digest("hex");

  // Constant-time-ish comparison.
  if (expected.length !== actual.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  }
  return diff === 0;
}

export function getPaystackPublicKey(): string | null {
  return process.env.PAYSTACK_PUBLIC_KEY || null;
}