"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminListingManageModal } from "@/components/admin/admin-listing-manage-modal";
import { AdminReportManageModal } from "@/components/admin/admin-report-manage-modal";
import { AdminUserManageModal } from "@/components/admin/admin-user-manage-modal";
import type {
  AdminListing,
  AdminReportRow,
  AdminTableSort,
  AdminUserRow,
} from "@/lib/data/admin-listings";
import { cn } from "@/lib/utils/cn";

const SECTION_LINKS = [
  { label: "Listings", href: "/admin#admin-listings" },
  { label: "Users", href: "/admin#admin-users" },
  { label: "Reports", href: "/admin#admin-reports" },
] as const;

const SORTS: { value: AdminTableSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "most_viewed", label: "Most viewed" },
];

const TABLE_HEADER = (
  <>
    <span>User</span>
    <span>Status</span>
    <span>Created</span>
    <span className="text-center">Views</span>
    <span className="text-center">Action</span>
  </>
);

function statusClass(status: string) {
  return cn(
    "inline-flex max-w-full truncate rounded-full px-1.5 py-0 text-[9px] font-medium capitalize leading-4",
    status === "pending" && "bg-amber-500/15 text-amber-300",
    status === "approved" && "bg-primary/15 text-primary",
    status === "sold" && "bg-indigo-500/15 text-indigo-300",
    status === "rejected" && "bg-red-500/15 text-red-300",
    status === "active" && "bg-primary/15 text-primary",
    status === "suspended" && "bg-red-500/15 text-red-300",
    status === "reported" && "bg-red-500/15 text-red-300",
  );
}

const ADMIN_TABLE_GRID =
  "minmax(0,1.55fr) minmax(0,0.72fr) minmax(0,0.82fr) minmax(1.6rem,0.42fr) minmax(2.35rem,0.5fr)";

function AdminTableGrid({
  header,
  rows,
}: {
  header: React.ReactNode;
  rows: React.ReactNode;
}) {
  return (
    <div className="w-full text-[10px] leading-tight">
      <div
        className="grid items-center gap-x-1 border-b border-border bg-background/60 px-2 py-1.5 text-[10px] font-medium text-muted"
        style={{ gridTemplateColumns: ADMIN_TABLE_GRID }}
      >
        {header}
      </div>
      {rows}
    </div>
  );
}

function AdminTableRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid items-center gap-x-1 border-b border-border/70 px-2 py-1.5 last:border-b-0"
      style={{ gridTemplateColumns: ADMIN_TABLE_GRID }}
    >
      {children}
    </div>
  );
}

function AdminUserCell({
  primary,
  secondary,
}: {
  primary: string;
  secondary: string;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-[10px]">{primary}</p>
      <p className="truncate text-[9px] text-muted">{secondary}</p>
    </div>
  );
}

function AdminCreatedCell({ value }: { value: string }) {
  return (
    <p className="truncate text-[9px] leading-snug text-muted" title={value}>
      {value}
    </p>
  );
}

function AdminViewsCell({ value }: { value: React.ReactNode }) {
  return <p className="text-center text-[10px] tabular-nums">{value}</p>;
}

function AdminStatusCell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 items-center">{children}</div>;
}

function AdminActionCell({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center">{children}</div>;
}

function TableShell({
  children,
  emptyMessage,
  isEmpty,
}: {
  children: React.ReactNode;
  emptyMessage: string;
  isEmpty: boolean;
}) {
  if (isEmpty) {
    return (
      <div className="rounded-[12px] border border-dashed border-border px-3 py-8 text-center">
        <p className="text-[12px] text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
      {children}
    </div>
  );
}

function viewButtonClass() {
  return "inline-flex shrink-0 whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-[9px] font-medium leading-4";
}

type AdminDataTablesProps = {
  mode?: "single" | "all";
  tab?: "listings" | "users" | "reports";
  sort: AdminTableSort;
  query: string;
  listings: AdminListing[];
  users: AdminUserRow[];
  reports: AdminReportRow[];
};

export function AdminDataTables({
  mode = "single",
  tab = "listings",
  sort,
  query,
  listings: initialListings,
  users: initialUsers,
  reports: initialReports,
}: AdminDataTablesProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showAll = mode === "all";
  const [listings, setListings] = useState(initialListings);
  const [users, setUsers] = useState(initialUsers);
  const [reports, setReports] = useState(initialReports);
  const [activeListingId, setActiveListingId] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  useEffect(() => {
    setListings(initialListings);
  }, [initialListings]);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    setReports(initialReports);
  }, [initialReports]);

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(next)) {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    const basePath = showAll ? "/admin" : pathname;
    const qs = params.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath);
  }

  function handleListingUpdated(
    listingId: string,
    patch: { status?: string; removed?: boolean },
  ) {
    setListings((current) => {
      if (patch.removed) {
        return current.filter((listing) => listing.id !== listingId);
      }

      if (patch.status) {
        return current.map((listing) =>
          listing.id === listingId ? { ...listing, status: patch.status! } : listing,
        );
      }

      return current;
    });
  }

  function handleUserUpdated(
    userId: string,
    patch: { accountStatus?: string; removed?: boolean },
  ) {
    setUsers((current) => {
      if (patch.removed) {
        return current.filter((user) => user.id !== userId);
      }

      if (patch.accountStatus) {
        return current.map((user) =>
          user.id === userId ? { ...user, accountStatus: patch.accountStatus! } : user,
        );
      }

      return current;
    });
  }

  function handleReportUpdated(reportId: string) {
    setReports((current) => current.filter((report) => report.id !== reportId));
  }

  const listingsTable = (
    <TableShell
      isEmpty={listings.length === 0}
      emptyMessage="No listings match your filters"
    >
      <AdminTableGrid
        header={TABLE_HEADER}
        rows={
          <>
            {listings.slice(0, 50).map((listing) => (
              <AdminTableRow key={listing.id}>
                <AdminUserCell primary={listing.sellerName} secondary={listing.title} />
                <AdminStatusCell>
                  <span className={statusClass(listing.status)}>{listing.status}</span>
                </AdminStatusCell>
                <AdminCreatedCell value={listing.createdAt} />
                <AdminViewsCell value={listing.views} />
                <AdminActionCell>
                  <button
                    type="button"
                    onClick={() => setActiveListingId(listing.id)}
                    className={viewButtonClass()}
                  >
                    View
                  </button>
                </AdminActionCell>
              </AdminTableRow>
            ))}
          </>
        }
      />
    </TableShell>
  );

  const usersTable = (
    <TableShell isEmpty={users.length === 0} emptyMessage="No users match your search">
      <AdminTableGrid
        header={TABLE_HEADER}
        rows={
          <>
            {users.slice(0, 50).map((user) => (
              <AdminTableRow key={user.id}>
                <AdminUserCell primary={user.name} secondary={user.phone} />
                <AdminStatusCell>
                  <span className={statusClass(user.accountStatus)}>{user.accountStatus}</span>
                </AdminStatusCell>
                <AdminCreatedCell value={user.createdAt} />
                <AdminViewsCell value={user.listingCount} />
                <AdminActionCell>
                  <button
                    type="button"
                    onClick={() => setActiveUserId(user.id)}
                    className={viewButtonClass()}
                  >
                    View
                  </button>
                </AdminActionCell>
              </AdminTableRow>
            ))}
          </>
        }
      />
    </TableShell>
  );

  const reportsTable = (
    <TableShell isEmpty={reports.length === 0} emptyMessage="No reported listings">
      <AdminTableGrid
        header={TABLE_HEADER}
        rows={
          <>
            {reports.slice(0, 50).map((report) => (
              <AdminTableRow key={report.id}>
                <AdminUserCell primary={report.listingTitle} secondary={report.reason} />
                <AdminStatusCell>
                  <span className={statusClass("reported")}>Reported</span>
                </AdminStatusCell>
                <AdminCreatedCell value={report.createdAt} />
                <AdminViewsCell value="—" />
                <AdminActionCell>
                  <button
                    type="button"
                    onClick={() => setActiveReportId(report.id)}
                    className={viewButtonClass()}
                  >
                    View
                  </button>
                </AdminActionCell>
              </AdminTableRow>
            ))}
          </>
        }
      />
    </TableShell>
  );

  return (
    <>
      {showAll ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="native-scroll flex gap-1 overflow-x-auto lg:hidden">
              {SECTION_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="search"
                defaultValue={query}
                placeholder="Search listings, users, reports..."
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    updateParams({ q: event.currentTarget.value || undefined });
                  }
                }}
                className="h-9 min-w-0 flex-1 rounded-full border border-border bg-background px-3 text-[12px] outline-none placeholder:text-muted"
              />
              <select
                value={sort}
                onChange={(event) =>
                  updateParams({ sort: event.target.value || undefined })
                }
                className="h-9 shrink-0 rounded-full border border-border bg-background px-3 text-[11px] outline-none"
              >
                {SORTS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <section id="admin-listings" className="scroll-mt-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-semibold">Listings</h2>
              <span className="text-[10px] text-muted">Excel view</span>
            </div>
            {listingsTable}
          </section>

          <section id="admin-users" className="scroll-mt-4 space-y-2">
            <h2 className="text-[13px] font-semibold">Users</h2>
            {usersTable}
          </section>

          <section id="admin-reports" className="scroll-mt-4 space-y-2">
            <h2 className="text-[13px] font-semibold">Reports</h2>
            {reportsTable}
          </section>
        </div>
      ) : (
        <section id="admin-tables" className="space-y-2 pb-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold">Admin Tables</h2>
            <span className="text-[10px] text-muted">Excel view</span>
          </div>

          <div className="flex gap-2">
            <input
              type="search"
              defaultValue={query}
              placeholder="Search..."
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  updateParams({ q: event.currentTarget.value || undefined });
                }
              }}
              className="h-9 min-w-0 flex-1 rounded-full border border-border bg-background px-3 text-[12px] outline-none placeholder:text-muted"
            />
            {tab === "listings" ? (
              <select
                value={sort}
                onChange={(event) =>
                  updateParams({ sort: event.target.value || undefined })
                }
                className="h-9 shrink-0 rounded-full border border-border bg-background px-3 text-[11px] outline-none"
              >
                {SORTS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {tab === "listings" ? listingsTable : null}
          {tab === "users" ? usersTable : null}
          {tab === "reports" ? reportsTable : null}
        </section>
      )}

      <AdminListingManageModal
        listingId={activeListingId}
        onClose={() => setActiveListingId(null)}
        onUpdated={handleListingUpdated}
      />

      <AdminUserManageModal
        userId={activeUserId}
        onClose={() => setActiveUserId(null)}
        onUpdated={handleUserUpdated}
      />

      <AdminReportManageModal
        reportId={activeReportId}
        onClose={() => setActiveReportId(null)}
        onUpdated={handleReportUpdated}
        onViewListing={(listingId) => {
          setActiveReportId(null);
          setActiveListingId(listingId);
        }}
        onViewSeller={(sellerId) => {
          setActiveReportId(null);
          setActiveUserId(sellerId);
        }}
      />
    </>
  );
}
