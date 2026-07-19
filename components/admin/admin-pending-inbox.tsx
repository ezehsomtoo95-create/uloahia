import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils/relative-time";

export type AdminPendingInboxItem = {
  id: string;
  kind: "signup" | "listing";
  title: string;
  meta: string;
  href: string;
  createdAt: string;
};

export function AdminPendingInbox({
  items,
  pendingListingCount,
}: {
  items: AdminPendingInboxItem[];
  pendingListingCount: number;
}) {
  return (
    <section id="admin-pending" className="scroll-mt-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold">Pending Approvals</h2>
          <p className="text-[10px] text-muted">
            New sign-ups and listings awaiting review
            {pendingListingCount > 0 ? ` · ${pendingListingCount} pending listings` : ""}
          </p>
        </div>
        <Link
          href="/admin#admin-listings"
          className="text-[11px] font-semibold text-primary"
        >
          Open listings
        </Link>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
        {items.length === 0 ? (
          <p className="px-3 py-4 text-[12px] text-muted">Inbox is clear — nothing pending.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-start justify-between gap-3 px-3 py-2.5 text-left hover:bg-background/80"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-foreground">
                      <span className="mr-1.5 inline-flex rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                        {item.kind === "signup" ? "Signup" : "Listing"}
                      </span>
                      {item.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted">{item.meta}</p>
                  </div>
                  <time className="shrink-0 text-[10px] text-muted">
                    {formatRelativeTime(item.createdAt)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
