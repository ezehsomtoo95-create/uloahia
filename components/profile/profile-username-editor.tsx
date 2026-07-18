"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateProfileUsername } from "@/app/profile/actions";
import { cn } from "@/lib/utils/cn";
import { USERNAME_MAX_LENGTH } from "@/lib/utils/username";

export function ProfileUsernameEditor({
  username,
}: {
  username: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(username ?? "");
  const [value, setValue] = useState(username ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDisplayName(username ?? "");
    if (!editing) {
      setValue(username ?? "");
    }
  }, [username, editing]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await updateProfileUsername(value);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDisplayName(result.username);
      setValue(result.username);
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div className="mt-0.5 flex items-center gap-1.5">
        <p className="truncate text-[13px] text-neutral-600 dark:text-neutral-400">
          {displayName || "Add a display name"}
        </p>
        <button
          type="button"
          onClick={() => {
            setError("");
            setValue(displayName);
            setEditing(true);
          }}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          aria-label={displayName ? "Edit display name" : "Add display name"}
        >
          <Pencil size={12} strokeWidth={2.2} />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-1.5 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoFocus
          maxLength={USERNAME_MAX_LENGTH}
          placeholder="e.g. Tyre John"
          aria-label="Display name"
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
            setValue(displayName);
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
