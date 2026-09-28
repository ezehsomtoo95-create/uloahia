"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";
import { activateBoost } from "@/lib/boost/activate";
import { getActiveBoostPackageById } from "@/lib/boost/packages";
import { DOMAIN } from "@/lib/constants/brand";
import { initializePaystackTransaction } from "@/lib/paystack/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import { formatZodError, listingIdSchema } from "@/lib/validation/common";
import { formatBoostExpiryDate } from "@/lib/utils/format";

const packageIdSchema = z.string().uuid("Invalid boost package.");

export type InitializeBoostResult = {
  paymentId: string;
  authorizationUrl: string;
};

/** Absolute origin for Paystack's callback_url (works in dev and prod). */
async function resolveAppBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) {
    return `https://${DOMAIN}`;
  }
  const proto =
    headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Login required.");
  }
  if (!user.email_confirmed_at) {
    throw new Error("Verify your email before boosting listings.");
  }

  return { supabase, user };
}

/**
 * Step 1 of the boost flow: create a PENDING payment record and ask Paystack to
 * start a checkout. Activation is NOT performed here — it only ever happens
 * after Paystack confirms the charge (webhook + verify).
 */
export async function initializeBoost(
  listingId: string,
  packageId: string,
): Promise<ActionResult<InitializeBoostResult>> {
  try {
    const parsedListingId = listingIdSchema.parse(listingId.trim());
    const parsedPackageId = packageIdSchema.parse(packageId.trim());

    const { user } = await requireUser();
    const admin = supabaseAdmin();

    // Own + eligible listing check (server-side, bypasses RLS).
    const { data: listing, error: listingError } = await admin
      .from("listings")
      .select("id, seller_id, status")
      .eq("id", parsedListingId)
      .maybeSingle();

    if (listingError || !listing) {
      return actionError("Listing not found or access denied.");
    }
    if (listing.seller_id !== user.id) {
      return actionError("Listing not found or access denied.");
    }
    if (listing.status !== "approved") {
      return actionError("Only live (approved) listings can be boosted.");
    }

    // Price/duration come from the database package — never from the client.
    const pkg = await getActiveBoostPackageById(parsedPackageId);
    if (!pkg) {
      return actionError("That boost package is no longer available.");
    }

    const reference = `boost_${randomBytes(16).toString("hex")}`;

    const { data: payment, error: insertError } = await admin
      .from("boost_payments")
      .insert({
        user_id: user.id,
        listing_id: parsedListingId,
        type: "boost",
        package_id: pkg.id,
        package_name: pkg.name,
        package_duration_days: pkg.durationDays,
        amount_ngn: pkg.priceNgn,
        currency: pkg.currency,
        provider: "paystack",
        provider_reference: reference,
        status: "pending",
        raw_metadata: { package_name: pkg.name },
      })
      .select("id")
      .single();

    if (insertError || !payment) {
      console.error("[boost] failed to create payment", {
        code: insertError?.code,
        message: insertError?.message,
      });
      return actionError("Could not start checkout. Please try again.");
    }

    const baseUrl = await resolveAppBaseUrl();
    const initialized = await initializePaystackTransaction({
      email: user.email ?? "",
      amountKobo: pkg.priceNgn * 100,
      reference,
      metadata: {
        payment_id: payment.id,
        listing_id: parsedListingId,
        user_id: user.id,
        type: "boost",
      },
      callbackUrl: `${baseUrl}/boost/pay/${payment.id}?reference=${reference}&payment=${payment.id}`,
    });

    if (!initialized.ok) {
      // No checkout was started — mark the pending payment abandoned so it
      // can never be activated later.
      await admin
        .from("boost_payments")
        .update({ status: "abandoned", updated_at: new Date().toISOString() })
        .eq("id", payment.id);
      return actionError(initialized.error);
    }

    return actionSuccess({
      paymentId: payment.id,
      authorizationUrl: initialized.authorizationUrl,
    });
  } catch (error) {
    return actionError(formatZodError(error));
  }
}

/**
 * Resolve the active boost's end time as a display label via the
 * `active_boost_expires_at` RPC (read-only, no writes). Returns null when there
 * is no active boost for the listing yet.
 */
async function resolveBoostExpiryLabel(
  admin: ReturnType<typeof supabaseAdmin>,
  listingId: string | null,
): Promise<string | null> {
  if (!listingId) {
    return null;
  }
  const { data, error } = await admin.rpc("active_boost_expires_at", {
    listing_uuid: listingId,
  });
  if (error != null || typeof data !== "string" || !data) {
    return null;
  }
  return formatBoostExpiryDate(data);
}

/**
 * Idempotent helper the callback page uses after checkout: if the webhook
 * already ran, this is a no-op; otherwise the server verifies with Paystack and
 * activates. The frontend success page alone never activates a boost.
 */
export async function confirmBoostFromCallback(
  paymentId: string,
  reference: string,
): Promise<
  ActionResult<{
    status: string;
    listingId?: string;
    boostExpiresAt?: string | null;
  }>
> {
  try {
    const paymentUuid = z.string().uuid("Invalid payment.").parse(paymentId.trim());
    const referenceString = z
      .string()
      .trim()
      .min(1, "Missing payment reference.")
      .max(200)
      .parse(reference.trim());

    const { user } = await requireUser();
    const admin = supabaseAdmin();

    const { data: payment } = await admin
      .from("boost_payments")
      .select("id, user_id, listing_id, status, provider_reference")
      .eq("id", paymentUuid)
      .maybeSingle();

    if (!payment || payment.user_id !== user.id) {
      return actionError("Payment not found or access denied.");
    }

    // Already success → the webhook beat us here; nothing to do.
    if (payment.status === "success") {
      revalidatePath("/my-listings");
      revalidatePath(`/listing/${payment.listing_id}`);
      revalidatePath("/", "layout");
      return actionSuccess({
        status: "success",
        listingId: payment.listing_id,
        boostExpiresAt: await resolveBoostExpiryLabel(admin, payment.listing_id),
      });
    }

    if (payment.provider_reference !== referenceString) {
      return actionError("Payment reference mismatch.");
    }

    const activated = await activateBoost(referenceString);

    if (activated.ok) {
      revalidatePath("/my-listings");
      revalidatePath(`/listing/${payment.listing_id}`);
      revalidatePath("/", "layout");
      return actionSuccess({
        status: "success",
        listingId: payment.listing_id,
        boostExpiresAt: await resolveBoostExpiryLabel(admin, payment.listing_id),
      });
    }

    if (activated.code === "unpaid") {
      return actionSuccess({ status: "pending" });
    }

    return actionError(activated.error);
  } catch (error) {
    return actionError(formatZodError(error));
  }
}