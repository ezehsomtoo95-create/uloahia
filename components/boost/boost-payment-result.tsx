"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { confirmBoostFromCallback } from "@/app/actions/boost";
import { formatBoostExpiryDate, formatNaira } from "@/lib/utils/format";

type Status = "success" | "pending" | "failed";

type BoostPaymentResultProps = {
  paymentId: string;
  reference: string;
  packageName: string | null;
  amountNgn: number | null;
  listingId: string | null;
  initialStatus: Status;
  initialExpiry: string | null;
};

type State = {
  status: Status;
  loading: boolean;
  error: string | null;
  expiryLabel: string | null;
};

export function BoostPaymentResult({
  paymentId,
  reference,
  packageName,
  amountNgn,
  listingId,
  initialStatus,
  initialExpiry,
}: BoostPaymentResultProps) {
  const [state, setState] = useState<State>({
    status: initialStatus,
    loading: initialStatus === "pending",
    error: null,
    expiryLabel: initialExpiry ? formatBoostExpiryDate(initialExpiry) : null,
  });

  useEffect(() => {
    // next/script with strategy="beforeInteractive" runs the theme/locale init
    // scripts before React hydration. useEffect never runs during SSR, but guard
    // explicitly anyway.
    if (typeof window === "undefined") {
      return;
    }

    // Already settled (webhook confirmed) → no client-side activation needed.
    if (state.status === "success") {
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    // Activate at most once. confirmBoostFromCallback is idempotent: if the
    // webhook already ran, activate_boost is a no-op and it resolves "success".
    void confirmBoostFromCallback(paymentId, reference).then((result) => {
      if (cancelled) {
        return;
      }

      if (result.success) {
        const nextStatus: Status =
          result.data?.status === "success" ? "success" : "pending";
        setState({
          status: nextStatus,
          loading: false,
          error: null,
          expiryLabel:
            nextStatus === "success" ? result.data?.boostExpiresAt ?? null : null,
        });
      } else {
        setState({
          status: "failed",
          loading: false,
          error: result.error ?? "Something went wrong. Please try again.",
          expiryLabel: null,
        });
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, reference, state.status]);

  const { status, loading, error, expiryLabel } = state;

  return (
    <main className="account-page flex min-h-dvh items-center justify-center pb-safe">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 text-center">
        {status === "success" ? (
          <>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 size={28} aria-hidden />
            </div>
            <h1 className="text-xl font-bold">Your listing is now boosted! 🎉</h1>
            <p className="mt-1.5 text-sm text-muted">
              {packageName} boost · {formatNaira(amountNgn ?? 0)}
            </p>
            <p className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
              {expiryLabel ? (
                <span>Your boost runs until {expiryLabel}.</span>
              ) : (
                <span>Your boost is live.</span>
              )}
            </p>
            <div className="mt-5 space-y-2">
              <Link
                href="/"
                className="flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
              >
                View Featured Listings
              </Link>
              <div className="space-y-2">
                <Link
                  href={`/listing/${listingId ?? ""}`}
                  className="flex h-11 w-full items-center justify-center rounded-full border border-border text-sm font-medium"
                >
                  View Your Listing
                </Link>
                <Link
                  href="/my-listings"
                  className="flex h-11 w-full items-center justify-center rounded-full border border-border text-sm font-medium"
                >
                  Back to My Listings
                </Link>
              </div>
            </div>
          </>
        ) : status === "pending" ? (
          <>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <Clock3 size={28} aria-hidden />
            </div>
            <h1 className="text-xl font-bold">Payment pending</h1>
            <p className="mt-1.5 text-sm text-muted">
              We&apos;re confirming your payment with Paystack. This usually takes a
              few seconds — refresh this page to check again.
            </p>
            {loading ? (
              <p className="mt-3 text-sm text-muted">Activating your boost…</p>
            ) : error ? (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-red-400/30 bg-red-400/5 px-3 py-2 text-sm text-red-500"
              >
                {error}
              </p>
            ) : null}
            <a
              href={`/boost/pay/${paymentId}?reference=${reference ?? ""}`}
              className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            >
              Check status again
            </a>
          </>
        ) : (
          <>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <XCircle size={28} aria-hidden />
            </div>
            <h1 className="text-xl font-bold">Payment failed or cancelled</h1>
            <p className="mt-1.5 text-sm text-muted">
              No charge was completed. If you already paid, your boost will be
              activated automatically from Paystack&apos;s confirmation.
            </p>
            {error ? (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-red-400/30 bg-red-400/5 px-3 py-2 text-sm text-red-500"
              >
                {error}
              </p>
            ) : null}
            <Link
              href={`/boost/${listingId ?? ""}`}
              className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            >
              Try again
            </Link>
          </>
        )}
      </div>
    </main>
  );
}