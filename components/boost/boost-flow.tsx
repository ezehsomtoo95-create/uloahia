"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check, Loader2, Rocket, Sparkles } from "lucide-react";
import { initializeBoost } from "@/app/actions/boost";
import { cn } from "@/lib/utils/cn";
import { formatNaira } from "@/lib/utils/format";

export type BoostPackageOption = {
  id: string;
  name: string;
  description: string;
  durationDays: number;
  price: number;
  isPopular: boolean;
};

type BoostFlowProps = {
  listingId: string;
  listingTitle: string;
  packages: BoostPackageOption[];
  isEligible: boolean;
  alreadyBoosted: boolean;
  boostExpiresAtLabel: string | null;
  unauthorized?: boolean;
};

type FlowStatus =
  | "idle"
  | "initializing"
  | "redirecting"
  | "error"
  | "ineligible";

export function BoostFlow({
  listingId,
  listingTitle,
  packages,
  isEligible,
  alreadyBoosted,
  boostExpiresAtLabel,
  unauthorized = false,
}: BoostFlowProps) {
  const [selectedId, setSelectedId] = useState<string>(
    packages.find((pkg) => pkg.isPopular)?.id ?? packages[0]?.id ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<FlowStatus>(
    !isEligible ? "ineligible" : "idle",
  );
  const [isPending, startTransition] = useTransition();

  const selected = packages.find((pkg) => pkg.id === selectedId);

  function handlePay() {
    if (isPending || status === "initializing" || status === "redirecting") {
      return; // prevent duplicate submissions while init is in progress
    }
    if (!selected) {
      setError("Please choose a boost package.");
      setStatus("error");
      return;
    }

    setError(null);
    setStatus("initializing");
    startTransition(async () => {
      const result = await initializeBoost(listingId, selected.id);

      if (!result.success) {
        setError(result.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      if (result.data?.authorizationUrl) {
        setStatus("redirecting");
        // Hard navigation to Paystack's hosted/redirect checkout.
        window.location.href = result.data.authorizationUrl;
        return;
      }

      setError("Could not start checkout. Please try again.");
      setStatus("error");
    });
  }

  return (
    <div className="boost-flow space-y-5">
      <header className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Rocket size={26} strokeWidth={2} aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Boost your listing</h1>
        <p className="mt-1 text-sm text-muted">
          Get more visibility and reach more buyers on AhiaUlo.
        </p>
        <p className="mt-1 truncate text-xs text-muted">{listingTitle}</p>
      </header>

      {unauthorized ? (
        <Notice tone="error" title="Access denied" body="You can only boost listings you own." />
      ) : null}

      {!isEligible ? (
        <Notice
          tone="muted"
          title="This listing can&apos;t be boosted yet"
          body="Boost is only available for live (approved) listings that aren&apos;t sold."
        />
      ) : (
        <>
          {alreadyBoosted ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                <Sparkles size={15} aria-hidden /> Boosted
              </span>
              {boostExpiresAtLabel ? (
                <p className="mt-0.5 text-muted">
                  Your boost runs until {boostExpiresAtLabel}. Extend anytime.
                </p>
              ) : null}
            </div>
          ) : null}
<section className="space-y-2.5" aria-label="Boost packages">
            {packages.map((pkg) => {
              const isSelected = pkg.id === selectedId;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(pkg.id);
                    setError(null);
                    if (status === "error") setStatus("idle");
                  }}
                  className={cn(
                    "relative flex w-full items-center justify-between gap-3 rounded-2xl border bg-surface px-4 py-3.5 text-left transition",
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {pkg.isPopular ? (
                    <span className="absolute -top-2.5 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                      Popular
                    </span>
                  ) : null}
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold">{pkg.name}</span>
                      <span className="text-xs text-muted">{pkg.durationDays} days</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {pkg.description}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-[15px] font-bold tabular-nums">
                      {formatNaira(pkg.price)}
                    </span>
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border",
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                      aria-hidden
                    >
                      {isSelected ? <Check size={12} strokeWidth={3} /> : null}
                    </span>
                  </span>
                </button>
              );
            })}
          </section>

          <div className="rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Total</span>
              <span className="text-lg font-bold tabular-nums">
                {selected ? formatNaira(selected.price) : "—"}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-4 text-muted">
              Paid securely with Paystack (test mode). Boosting increases
              visibility but does not guarantee a sale.
            </p>
          </div>

          {error ? (
            <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/5 px-4 py-2.5 text-sm text-red-500">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handlePay}
            disabled={!selected || status === "initializing" || status === "redirecting" || isPending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "initializing" || status === "redirecting" || isPending ? (
              <>
                <Loader2 size={18} className="animate-spin" aria-hidden />
                {status === "redirecting" ? "Redirecting to Paystack…" : "Preparing checkout…"}
              </>
            ) : (
              <>
                {alreadyBoosted ? "Extend Boost" : "Pay with Paystack"}
                <ArrowRight size={18} aria-hidden />
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}

function Notice({ tone, title, body }: { tone: "error" | "muted"; title: string; body: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3.5 text-sm",
        tone === "error" ? "border-red-400/30 bg-red-400/5 text-red-500" : "border-border bg-surface/60 text-muted",
      )}
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-0.5 text-muted">{body}</p>
    </div>
  );
}