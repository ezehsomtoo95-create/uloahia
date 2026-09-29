import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminVerificationQueue } from "@/lib/data/admin-verification";
import { VerificationQueueTable } from "@/components/admin/verification-queue-table";

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
] as const;

export default async function AdminVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { status: rawStatus } = await searchParams;

  const status = FILTERS.some((f) => f.value === rawStatus)
    ? (rawStatus as string)
    : "pending";

  const rows = await getAdminVerificationQueue(supabase, { status });

  return (
    <main className="admin-desktop-main overflow-y-auto p-4 lg:p-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[15px] font-semibold">ID verification</h1>
          <p className="mt-1 max-w-2xl text-[12px] text-muted">
            Review a seller&apos;s government ID and approve it to grant the
            ID&nbsp;verified badge. Documents are stored privately; each preview
            is a short-lived link and is never a public URL.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <a
              key={f.value}
              href={f.value === "pending" ? "/admin/verification" : `/admin/verification?status=${f.value}`}
              aria-current={status === f.value ? "page" : undefined}
              className={
                status === f.value
                  ? "rounded-full border border-primary/50 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
                  : "rounded-full border border-border px-2.5 py-1 text-[11px] text-muted hover:text-foreground"
              }
            >
              {f.label}
            </a>
          ))}
        </div>
      </header>

      {status === "pending" ? (
        <p className="mb-3 rounded-[10px] border border-border bg-surface px-3 py-2 text-[11px] text-muted">
          Oldest submissions first. Approving sets the seller to ID&nbsp;verified
          immediately; rejecting leaves any existing tier untouched.
        </p>
      ) : null}

      <VerificationQueueTable rows={rows} />
    </main>
  );
}
