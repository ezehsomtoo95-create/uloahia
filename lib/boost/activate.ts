import "server-only";

import { revalidatePath } from "next/cache";
import { getActiveBoostPackageById } from "@/lib/boost/packages";
import { verifyPaystackTransaction } from "@/lib/paystack/server";
import { supabaseAdmin } from "@/lib/supabase/service";

/**
 * Server-side boost activation.
 *
 * A boost is ONLY ever activated here, after the charge has been confirmed by
 * Paystack (webhook signature verified + /transaction/verify returns success).
 * The frontend "success" page never activates anything by itself.
 *
 * Guards:
 *  - idempotent: a payment status of 'success' is a no-op (replay protection)
 *  - unpaid / unverified transactions are rejected
 *  - amount & currency are recomputed from the stored package, never from the
 *    client
 *  - the listing must be approved and owned by the payer (enforced in SQL too)
 */

export type ActivateBoostResult =
  | { ok: true; paymentId: string }
  | { ok: false; code: string; error: string };

export async function activateBoost(
  paymentReference: string,
): Promise<ActivateBoostResult> {
  const admin = supabaseAdmin();

  // 1. Load the payment by its unique Paystack reference.
  const { data: payment, error: paymentError } = await admin
    .from("boost_payments")
    .select(
      "id, user_id, listing_id, package_id, package_name, package_duration_days, amount_ngn, currency, status",
    )
    .eq("provider_reference", paymentReference)
    .maybeSingle();

  if (paymentError || !payment) {
    return { ok: false, code: "payment_not_found", error: "Payment record not found." };
  }

  // 2. Idempotency: already processed → nothing to do (webhook replay safe).
  if (payment.status === "success") {
    return { ok: true, paymentId: payment.id };
  }

  if (payment.status !== "pending") {
    return {
      ok: false,
      code: "payment_not_pending",
      error: "This payment cannot be activated.",
    };
  }

  // 3. Authoritative check with Paystack before touching anything.
  const verified = await verifyPaystackTransaction(paymentReference);
  if (!verified || verified.status !== "success") {
    return {
      ok: false,
      code: "unpaid",
      error: "Payment has not been confirmed by Paystack.",
    };
  }

  // 4. Recompute the expected amount from the DB package — never trust the client.
  const pkg = await getActiveBoostPackageById(payment.package_id);
  if (!pkg) {
    return {
      ok: false,
      code: "package_inactive",
      error: "This boost package is no longer available.",
    };
  }

  if (verified.amountKobo !== pkg.priceNgn * 100 || verified.currency !== pkg.currency) {
    return {
      ok: false,
      code: "amount_mismatch",
      error: "Payment amount does not match the package price.",
    };
  }

  // 5. Transactional activation (locking, listing checks, extend semantics).
  const { error: rpcError } = await admin.rpc("activate_boost", {
    payment_uuid: payment.id,
  });

  if (rpcError) {
    return {
      ok: false,
      code: String(rpcError.message ?? "activation_failed"),
      error: "Boost activation failed.",
    };
  }

  // 6. Invalidate cached marketplace pages so the boost surfaces immediately.
  revalidatePath("/", "layout");
  revalidatePath("/browse");
  revalidatePath("/categories");
  revalidatePath("/category", "layout");
  revalidatePath("/my-listings");
  revalidatePath(`/listing/${payment.listing_id}`);
  revalidatePath(`/listing`, "layout");
  revalidatePath(`/store/${payment.user_id}`);

  return { ok: true, paymentId: payment.id };
}