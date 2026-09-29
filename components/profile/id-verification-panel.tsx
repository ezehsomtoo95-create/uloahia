"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IdCard, ShieldCheck, Trash2, Upload } from "lucide-react";
import {
  submitVerificationDoc,
  withdrawVerificationDoc,
  type VerificationDocType,
} from "@/app/actions/verification";
import { SellerTierBadge } from "@/components/seller/seller-tier-badge";
import { toVerificationTier, type VerificationTier } from "@/lib/types/engagement";
import { cn } from "@/lib/utils/cn";

const DOC_TYPES: { value: VerificationDocType; label: string }[] = [
  { value: "government_id", label: "Government ID" },
  { value: "national_id", label: "National ID" },
  { value: "drivers_licence", label: "Driver's licence" },
  { value: "passport", label: "Passport" },
];

export function docTypeLabel(value: string | undefined): string {
  return DOC_TYPES.find((d) => d.value === value)?.label ?? "ID";
}

export type MyVerificationRequest = {
  id: string;
  doc_type: string;
  status: string;
  rejection_reason: string | null;
} | null;

/**
 * Seller-facing ID verification panel.
 *
 * The document goes to a private bucket; no URL is ever shown back to the
 * seller, because a seller must not be able to re-read their own ID through
 * the API. Once approved, the badge appears on their listings and store.
 */
export function IdVerificationPanel({
  tier,
  request,
}: {
  tier: VerificationTier;
  request: MyVerificationRequest;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<VerificationDocType>("government_id");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const resolvedTier = toVerificationTier(tier);
  const status = request?.status ?? null;

  if (resolvedTier === "id_verified" || status === "approved") {
    return (
      <section className="rounded-[14px] border border-emerald-500/30 bg-emerald-50/50 p-3 dark:bg-emerald-950/20">
        <div className="flex flex-wrap items-center gap-2">
          <ShieldCheck size={15} className="text-emerald-600" aria-hidden />
          <p className="text-[13px] font-semibold">You&apos;re ID verified</p>
          <SellerTierBadge tier="id_verified" size="sm" fullLabel />
        </div>
        <p className="mt-1 text-[12px] text-muted">
          Your badge shows on your listings and store page. Only you and the
          AhiaUlo team can see the document you submitted.
        </p>
      </section>
    );
  }

  if (status === "pending") {
    return (
      <section className="rounded-[14px] border border-border bg-surface p-3">
        <div className="flex flex-wrap items-center gap-2">
          <IdCard size={15} className="text-muted" aria-hidden />
          <p className="text-[13px] font-semibold">Verification in review</p>
        </div>
        <p className="mt-1 text-[12px] text-muted">
          We&apos;re checking your {docTypeLabel(request?.doc_type).toLowerCase()}.
          This usually takes a day or two.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              if (!request) return;
              const result = await withdrawVerificationDoc(request.id);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setError("");
              router.refresh();
            })
          }
          className="mt-2 inline-flex h-8 cursor-pointer items-center gap-1 rounded-full border border-border px-3 text-[11px] font-medium text-foreground/85 disabled:opacity-50"
        >
          <Trash2 size={12} aria-hidden />
          Withdraw and upload a different one
        </button>
        {error ? <p className="mt-2 text-[11px] text-red-500">{error}</p> : null}
      </section>
    );
  }

  return (
    <section className="rounded-[14px] border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheck size={15} className="text-muted" aria-hidden />
        <p className="text-[13px] font-semibold">Get verified</p>
      </div>
      <p className="mt-1 text-[12px] text-muted">
        Verified sellers stand out to buyers. Send a photo of a government ID
        and we&apos;ll check it by hand. It&apos;s stored privately and never
        shown on your profile.
      </p>

      {status === "rejected" && request?.rejection_reason ? (
        <p className="mt-2 rounded-[10px] border border-red-500/30 bg-red-500/5 px-2.5 py-2 text-[12px] text-red-600">
          We couldn&apos;t accept that one: {request.rejection_reason}
        </p>
      ) : null}

      <form
        className="mt-3 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          const file = fileRef.current?.files?.[0];
          if (!file) {
            setError("Choose a photo of your ID first.");
            return;
          }
          setError("");
          const formData = new FormData();
          formData.set("document", file);
          formData.set("docType", docType);
          startTransition(async () => {
            const result = await submitVerificationDoc(formData);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setFileName(null);
            if (fileRef.current) fileRef.current.value = "";
            router.refresh();
          });
        }}
      >
        <div className="flex flex-wrap gap-1.5">
          {DOC_TYPES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDocType(d.value)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition duration-app",
                docType === d.value
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-2 rounded-[10px] border border-dashed border-border px-3 py-2.5 text-[12px]">
          <span className="truncate text-muted">
            {fileName ?? "Choose a photo of your ID (JPG, PNG, WebP, under 5MB)"}
          </span>
          <Upload size={14} aria-hidden className="shrink-0 text-muted" />
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
          />
        </label>

        {error ? <p className="text-[12px] text-red-500">{error}</p> : null}

        <button
          type="submit"
          disabled={pending || !fileName}
          className="h-10 w-full cursor-pointer rounded-full bg-primary text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit for review"}
        </button>
      </form>
    </section>
  );
}
