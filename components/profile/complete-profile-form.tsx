"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completeProfile } from "@/app/actions/engagement";
import { getSafeReturnPath } from "@/lib/utils/auth-redirect";

export function CompleteProfileForm({
  initialFullName,
  initialUsername,
}: {
  initialFullName?: string | null;
  initialUsername?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = getSafeReturnPath(searchParams.get("next"));
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [username, setUsername] = useState(initialUsername ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await completeProfile({
        phone,
        fullName,
        username: username || undefined,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.replace(next);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="touch-card space-y-3 p-4">
      <div>
        <label className="text-[12px] font-medium text-muted">Phone number *</label>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
          inputMode="tel"
          placeholder="08101234567"
          className="mt-1 h-11 w-full rounded-[12px] border border-border bg-background px-3 text-[14px] outline-none focus:border-primary/40"
        />
        <p className="mt-1 text-[11px] text-muted">
          Required so buyers and sellers can reach each other.
        </p>
      </div>

      <div>
        <label className="text-[12px] font-medium text-muted">Display name</label>
        <input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="How you appear on AhiaUlo"
          className="mt-1 h-11 w-full rounded-[12px] border border-border bg-background px-3 text-[14px] outline-none focus:border-primary/40"
        />
      </div>

      <div>
        <label className="text-[12px] font-medium text-muted">Display name / shop name</label>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="e.g. Tyre John"
          maxLength={40}
          className="mt-1 h-11 w-full rounded-[12px] border border-border bg-background px-3 text-[14px] outline-none focus:border-primary/40"
        />
        <p className="mt-1 text-[11px] text-muted">
          How you appear to buyers. Spaces and names like “Tyre John” are fine.
        </p>
      </div>

      {error ? <p className="text-[12px] text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-primary text-[14px] font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
