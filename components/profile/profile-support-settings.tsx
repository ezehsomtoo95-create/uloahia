"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { deleteOwnAccount } from "@/app/profile/actions";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { cn } from "@/lib/utils/cn";

import { SUPPORT_MAILTO_HREF } from "@/lib/constants/support";

export function ProfileSupportSettings({
  showAccountActions = true,
}: {
  showAccountActions?: boolean;
}) {
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
      <section className={cn("account-support", !showAccountActions && "account-support--guest")}>
        <h2 className="account-support__label">Support & Settings</h2>

        <div className="touch-card divide-y divide-border overflow-hidden rounded-xl">
          <a href={SUPPORT_MAILTO_HREF} className="account-support__row">
            <span>Contact Support</span>
            <ExternalLink size={15} className="shrink-0 text-muted" aria-hidden />
          </a>

          <Link href="/privacy" className="account-support__row">
            <span>Privacy Policy</span>
          </Link>

          <Link href="/terms" className="account-support__row">
            <span>Terms of Service</span>
          </Link>

          {showAccountActions ? (
            <div>
              <button
                type="button"
                onClick={() => setPrivacyOpen((open) => !open)}
                aria-expanded={privacyOpen}
                className="account-support__row text-left"
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
                <div className="space-y-2 border-t border-border bg-background/50 px-3.5 py-2.5">
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
          ) : null}
        </div>
      </section>

      {showAccountActions ? (
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
      ) : null}
    </>
  );
}
