"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateProfilePhone } from "@/app/profile/actions";
import { cn } from "@/lib/utils/cn";
import { formatDisplayPhone } from "@/lib/utils/phone";

export function PhoneNumberManager({
  phoneLabel,
  phoneRaw,
  needsPhone,
}: {
  phoneLabel: string | null;
  phoneRaw: string;
  needsPhone: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [display, setDisplay] = useState(
    needsPhone ? "Add phone number" : phoneLabel || "—",
  );
  const [value, setValue] = useState(phoneRaw ? formatDisplayPhone(phoneRaw) : "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDisplay(needsPhone ? "Add phone number" : phoneLabel || "—");
    if (!editing) {
      setValue(phoneRaw ? formatDisplayPhone(phoneRaw) : "");
    }
  }, [needsPhone, phoneLabel, phoneRaw, editing]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    startTransition(async () => {
      const result = await updateProfilePhone(value);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const nextLabel = result.phone || formatDisplayPhone(value);
      setDisplay(nextLabel);
      setValue(nextLabel);
      setEditing(false);
      setSuccess("Phone updated.");
      router.refresh();
    });
  }

  if (editing) {
    return (
      <form onSubmit={onSubmit} className="mt-0.5 space-y-1">
        <div className="flex items-center gap-1.5">
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoFocus
            inputMode="tel"
            autoComplete="tel"
            placeholder="08101234567"
            aria-label="Phone number"
            className={cn(
              "h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 text-[13px] outline-none",
              "focus:border-primary/40",
            )}
          />
          <button
            type="submit"
            disabled={pending || !value.trim()}
            className="h-8 shrink-0 rounded-lg bg-primary px-2.5 text-[12px] font-semibold text-primary-foreground disabled:opacity-50"
          >
            {pending ? "…" : "Save"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setEditing(false);
              setError("");
              setValue(phoneRaw ? formatDisplayPhone(phoneRaw) : "");
            }}
            className="h-8 shrink-0 rounded-lg border border-border px-2.5 text-[12px] font-medium text-neutral-700 dark:text-neutral-300"
          >
            Cancel
          </button>
        </div>
        {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
      </form>
    );
  }

  return (
    <div className="mt-0.5 space-y-1">
      <div className="flex min-w-0 items-center gap-1.5">
        <p className="min-w-0 truncate text-[13px] text-neutral-600 dark:text-neutral-400">
          <span className="sr-only">Phone number </span>
          {display}
        </p>
        <button
          type="button"
          onClick={() => {
            setError("");
            setSuccess("");
            setValue(phoneRaw ? formatDisplayPhone(phoneRaw) : "");
            setEditing(true);
          }}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          aria-label={needsPhone ? "Add phone number" : "Edit phone number"}
        >
          <Pencil size={12} strokeWidth={2.2} />
        </button>
      </div>
      {success ? (
        <p className="text-[12px] text-emerald-700 dark:text-emerald-400">{success}</p>
      ) : null}
    </div>
  );
}
