import { Suspense } from "react";
import { AdminDashboardHeader } from "@/components/admin/admin-dashboard-header";
import { AdminKpiGrid } from "@/components/admin/admin-kpi-grid";
import {
  AdminActivityFeed,
  AdminAnalyticsSection,
  AdminHealthSection,
} from "@/components/admin/admin-overview-sections";
import { AdminAllTablesPanel } from "@/components/admin/admin-tables-panel";
import { AdminToolsPanel } from "@/components/admin/admin-tools-panel";
import { ADMIN_MAIN_CLASSNAME } from "@/components/admin/admin-section-header";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminOverview } from "@/lib/data/admin-stats";
import type { AdminTableSort } from "@/lib/data/admin-listings";

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

  return (
    <div className={ADMIN_MAIN_CLASSNAME}>
      <section id="admin-dashboard" className="scroll-mt-4 space-y-3 lg:space-y-6">
        <AdminDashboardHeader notifications={overview.notifications} />
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

      <AdminActivityFeed activities={overview.activities} />

      <Suspense fallback={null}>
        <AdminAllTablesPanel sort={sort as AdminTableSort} query={query} />
      </Suspense>

      <section id="admin-settings" className="scroll-mt-4">
        <AdminToolsPanel pendingCount={overview.pendingReview} />
      </section>
    </div>
  );
}
