"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  BarChart3,
  CheckCheck,
  Download,
  Users,
} from "lucide-react";
import { approveAllPending, exportListingsCsv } from "@/app/admin/actions";

export function AdminToolsPanel({ pendingCount }: { pendingCount: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function downloadCsv() {
    startTransition(async () => {
      const csv = await exportListingsCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ahiaulo-listings-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleApproveAll() {
    startTransition(async () => {
      await approveAllPending();
      router.refresh();
    });
  }

  const buttonActions = [
    {
      label: "Approve all",
      icon: CheckCheck,
      onClick: handleApproveAll,
      disabled: pendingCount === 0 || isPending,
    },
    {
      label: "Export CSV",
      icon: Download,
      onClick: downloadCsv,
      disabled: isPending,
    },
  ] as const;

  const linkActions = [
    { label: "View analytics", icon: BarChart3, href: "/admin#admin-analytics" },
    { label: "Manage users", icon: Users, href: "/admin#admin-users" },
  ] as const;

  const actionClassName =
    "flex items-center gap-2 rounded-[12px] border border-border bg-surface px-2.5 py-2 text-left disabled:opacity-50";

  return (
    <section className="space-y-2">
      <h2 className="text-[13px] font-semibold">Admin Tools</h2>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        {buttonActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={actionClassName}
            >
              <Icon size={14} className="shrink-0 text-primary" />
              <span className="text-[11px] font-medium">{action.label}</span>
            </button>
          );
        })}
        {linkActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={action.href} className={actionClassName}>
              <Icon size={14} className="shrink-0 text-primary" />
              <span className="text-[11px] font-medium">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
