import { Suspense } from "react";
import { AdminDataTables } from "@/components/admin/admin-data-tables";
import { AdminTablesSkeleton } from "@/components/admin/admin-tables-skeleton";
import type { AdminTableSort } from "@/lib/data/admin-listings";
import { getAdminTableData } from "@/lib/data/admin-listings";
import { createClient } from "@/lib/supabase/server";

async function AdminTablesContent({
  tab,
  sort,
  query,
  mode = "single",
}: {
  tab?: "listings" | "users" | "reports";
  sort: AdminTableSort;
  query: string;
  mode?: "single" | "all";
}) {
  const supabase = await createClient();

  if (mode === "all") {
    const [listingsData, usersData, reportsData] = await Promise.all([
      getAdminTableData(supabase, { tab: "listings", sort, q: query }),
      getAdminTableData(supabase, { tab: "users", q: query }),
      getAdminTableData(supabase, { tab: "reports", q: query }),
    ]);

    return (
      <AdminDataTables
        mode="all"
        sort={sort}
        query={query}
        listings={listingsData.listings}
        users={usersData.users}
        reports={reportsData.reports}
      />
    );
  }

  const data = await getAdminTableData(supabase, {
    tab: tab ?? "listings",
    sort,
    q: query,
  });

  return (
    <AdminDataTables
      mode="single"
      tab={tab ?? "listings"}
      sort={sort}
      query={query}
      listings={data.listings}
      users={data.users}
      reports={data.reports}
    />
  );
}

export function AdminTablesPanel({
  tab,
  sort,
  query,
  mode = "single",
}: {
  tab?: "listings" | "users" | "reports";
  sort: AdminTableSort;
  query: string;
  mode?: "single" | "all";
}) {
  return (
    <Suspense fallback={<AdminTablesSkeleton />}>
      <AdminTablesContent tab={tab} sort={sort} query={query} mode={mode} />
    </Suspense>
  );
}

export function AdminAllTablesPanel({
  sort,
  query,
}: {
  sort: AdminTableSort;
  query: string;
}) {
  return <AdminTablesPanel sort={sort} query={query} mode="all" />;
}
