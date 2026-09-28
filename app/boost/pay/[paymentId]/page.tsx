import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BoostPaymentResult } from "@/components/boost/boost-payment-result";
import { getCurrentUser } from "@/lib/data/listings";
import { supabaseAdmin } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payment status",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ paymentId: string }>;
  // Next.js App Router searchParams values can be string | string[] | undefined.
  searchParams: Promise<{ reference?: string | string[] }>;
};

/** Normalize a Next.js search param to a single trimmed string ("" when absent). */
function normalizeSearchParam(value: string | string[] | undefined): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return (value[0] ?? "").trim();
  }
  return "";
}

export default async function BoostPaymentStatusPage({ params, searchParams }: Props) {
  const { paymentId } = await params;
  const { reference: rawReference } = await searchParams;

  // Normalize into a plain trimmed string BEFORE any .trim() or equality check,
  // so the value can never be an array when it reaches Paystack verification.
  const reference = normalizeSearchParam(rawReference);

  const user = await getCurrentUser();
  if (!user) {
    redirect(
      "/login?next=" + encodeURIComponent(`/boost/pay/${paymentId}?reference=${reference}`),
    );
  }

  const admin = supabaseAdmin();
  const paymentUuid = paymentId.trim();

  const { data: payment } = await admin
    .from("boost_payments")
    .select(
      "id, user_id, listing_id, status, provider_reference, amount_ngn, currency, package_name",
    )
    .eq("id", paymentUuid)
    .maybeSingle();

  // No matching payment for this route param → 404 (does not leak existence).
  if (!payment) {
    notFound();
  }

  // Ownership: only the buyer may view their payment status. Treat a mismatch
  // as not-found rather than leaking that another user has a payment here.
  if (payment.user_id !== user.id) {
    notFound();
  }

  // Display-only snapshot of the DB status. The webhook (not this render) is the
  // source of truth for activation. We deliberately do NOT call activateBoost
  // here: the only thing activation needs is revalidatePath, and Next.js forbids
  // calling revalidatePath during Server Component render (it throws and surfaces
  // as the generic "Something went wrong" error). Activation is deferred to the
  // client via <BoostPaymentResult /> -> confirmBoostFromCallback(), a Server
  // Action in which revalidatePath is legal.
  const initialStatus: "success" | "pending" | "failed" =
    payment.status === "success" ? "success" : "pending";

  // Display-only expiry (read-only RPC, no writes). Null when the boost is not
  // active yet; the Client Component shows "Your boost is live." in that case.
  const expiry =
    initialStatus === "success"
      ? await admin.rpc("active_boost_expires_at", {
          listing_uuid: payment.listing_id,
        })
      : null;
  const initialExpiry =
    expiry != null &&
    expiry.error == null &&
    typeof expiry.data === "string" &&
    expiry.data
      ? expiry.data
      : null;

  return (
    <BoostPaymentResult
      paymentId={payment.id}
      reference={reference}
      packageName={payment.package_name}
      amountNgn={payment.amount_ngn}
      listingId={payment.listing_id}
      initialStatus={initialStatus}
      initialExpiry={initialExpiry}
    />
  );
}