"use client";


import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { deleteOwnAccount } from "@/app/profile/actions";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { SUPPORT_WHATSAPP_HREF } from "@/lib/constants/support";
import { cn } from "@/lib/utils/cn";

export function ProfileSupportSettings() {

  const router = useRouter();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDeleteConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteOwnAccount();

      if (result && "ok" in result && !result.ok) {
        setError(result.error);
        return;
      }

      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <section className="space-y-2">
        <h2 className="px-1 text-[13px] font-medium text-muted">Support & Settings</h2>

        <div className="touch-card divide-y divide-border overflow-hidden rounded-3xl">
          <a
            href={SUPPORT_WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 p-4 text-[14px] font-medium"
          >
            <span>Contact Support</span>
            <ExternalLink size={15} className="shrink-0 text-muted" aria-hidden />
          </a>

          <div>
            <button
              type="button"
              onClick={() => setPrivacyOpen((open) => !open)}
              aria-expanded={privacyOpen}
              className="flex w-full items-center justify-between gap-3 p-4 text-left text-[14px] font-medium"
            >
              <span>Privacy & account</span>
              <ChevronDown
                size={16}
                className={cn(
                  "shrink-0 text-muted transition-transform duration-app",
                  privacyOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>

            {privacyOpen ? (
              <div className="space-y-2 border-t border-border bg-background/50 px-4 py-3">
                <p className="text-[12px] leading-5 text-muted">
                  Manage sensitive account actions. Deleting your profile permanently
                  removes your listings and saved data.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setConfirmOpen(true);
                  }}
                  className="inline-flex h-9 items-center rounded-full border border-red-500/30 bg-red-500/5 px-3.5 text-[12px] font-semibold text-red-500"
                >
                  Delete profile
                </button>
                {error ? (
                  <p className="text-[12px] leading-5 text-red-500">{error}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <AdminConfirmDialog

        open={confirmOpen}
        title="Delete your profile?"
        description="This permanently removes your account, listings, and saved items. This action cannot be undone."
        confirmLabel="Delete profile"
        destructive
        isPending={isPending}
        onCancel={() => {
          if (!isPending) {
            setConfirmOpen(false);
          }
        }}
        onConfirm={handleDeleteConfirm}
      />

    </>
  );
}
