import { NextResponse, type NextRequest } from "next/server";
import { activateBoost } from "@/lib/boost/activate";
import { isValidPaystackWebhookSignature } from "@/lib/paystack/server";

/**
 * Paystack webhook receiver.
 *
 * SECURITY:
 *  - The request body is consumed as raw text so the HMAC-SHA512 signature can
 *    be verified over the exact bytes Paystack signed.
 *  - Only a verified "charge.success" event can activate a boost — and even
 *    then activation re-verifies with Paystack /transaction/verify server-side.
 *  - Idempotency is enforced both here (status 'success' short-circuit in
 *    activateBoost) and in the DB (activate_boost RPC returns NULL for replays).
 *
 * Configure in the Paystack dashboard → Webhooks → URL:
 *   https://YOUR_DOMAIN/api/paystack/webhook
 */

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!isValidPaystackWebhookSignature({ signature, rawBody })) {
    return NextResponse.json({ status: "invalid_signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ status: "invalid_json" }, { status: 400 });
  }

  const event =
    payload && typeof payload === "object" && "event" in payload
      ? (payload as { event?: unknown }).event
      : null;

  if (event !== "charge.success") {
    // Acknowledge non-charge events so Paystack stops retrying them.
    return NextResponse.json({ status: "ignored" });
  }

  const reference =
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    payload.data &&
    typeof payload.data === "object"
      ? (payload as { data?: { reference?: unknown } }).data?.reference
      : null;

  if (typeof reference !== "string" || !reference.trim()) {
    return NextResponse.json({ status: "missing_reference" }, { status: 400 });
  }

  const result = await activateBoost(reference.trim());

  if (result.ok) {
    return NextResponse.json({ status: "verified", paymentId: result.paymentId });
  }

  // Transient verification failures should be retried by Paystack.
  if (result.code === "unpaid") {
    return NextResponse.json(
      { status: "unconfirmed", code: result.code },
      { status: 502 },
    );
  }

  // Permanent failures (unknown reference, tampered amount, ineligible listing)
  // are acknowledged so Paystack does not retry forever.
  return NextResponse.json({ status: "ignored", code: result.code });
}

export async function GET() {
  return NextResponse.json({ ok: true, name: "paystack-webhook" });
}