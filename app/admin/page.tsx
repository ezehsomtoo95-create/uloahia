import { Suspense } from "react";
import { AdminCatalogPanel } from "@/components/admin/admin-catalog-panel";
import { AdminDashboardHeader } from "@/components/admin/admin-dashboard-header";
import { AdminKpiGrid } from "@/components/admin/admin-kpi-grid";
import {
  AdminActivityFeed,
  AdminAnalyticsSection,
  AdminHealthSection,
} from "@/components/admin/admin-overview-sections";
import { AdminPendingInbox } from "@/components/admin/admin-pending-inbox";
import { AdminAllTablesPanel } from "@/components/admin/admin-tables-panel";
import { AdminToolsPanel } from "@/components/admin/admin-tools-panel";
import { ADMIN_MAIN_CLASSNAME } from "@/components/admin/admin-section-header";
import { requireAdmin } from "@/lib/admin/auth";
import {
  getActiveCategoryTree,
  getAllAttributeSchemas,
} from "@/lib/data/categories";
import { getActiveLocationTree } from "@/lib/data/locations";
import { getAdminOverview } from "@/lib/data/admin-stats";
import type { AdminTableSort } from "@/lib/data/admin-listings";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const sort =
    params.sort === "oldest" || params.sort === "most_viewed"
      ? params.sort
      : "newest";
  const query = params.q ?? "";

  const { supabase } = await requireAdmin();
  const overview = await getAdminOverview(supabase);
  const catalogClient = await createClient();
  const [categoryTree, attributeSchemas, locationTree, countriesResult] =
    await Promise.all([
      getActiveCategoryTree(),
      getAllAttributeSchemas(),
      getActiveLocationTree(),
      catalogClient
        .from("countries")
        .select("id, code, name, is_active, sort_order")
        .order("sort_order", { ascending: true }),
    ]);

  const countries = (countriesResult.data ?? []).map((row) => ({
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order ?? 0),
  }));

  return (
    <>
      <AdminDashboardHeader notifications={overview.notifications} />
      <div className={ADMIN_MAIN_CLASSNAME}>
      <section id="admin-dashboard" className="scroll-mt-4 flex flex-col gap-[0.85rem] lg:gap-[1.1rem]">
        <AdminKpiGrid kpis={overview.kpis} />
      </section>

      <section id="admin-analytics" className="scroll-mt-4">
        <AdminAnalyticsSection
          newUsers={overview.charts.newUsers}
          listingsCreated={overview.charts.listingsCreated}
        />
      </section>

      <AdminHealthSection
        metrics={overview.health}
        isHealthy={overview.isHealthy}
      />

      <AdminPendingInbox
        items={overview.pendingInbox}
        pendingListingCount={overview.pendingReview}
      />

      <AdminActivityFeed activities={overview.activities} />

      <Suspense fallback={null}>
        <AdminAllTablesPanel sort={sort as AdminTableSort} query={query} />
      </Suspense>

      <AdminCatalogPanel
        categoryTree={categoryTree}
        attributeSchemas={attributeSchemas}
        locationTree={locationTree}
        countries={countries}
      />

      <section id="admin-settings" className="scroll-mt-4">
        <AdminToolsPanel pendingCount={overview.pendingReview} />
      </section>
      </div>
    </>
  );
}
