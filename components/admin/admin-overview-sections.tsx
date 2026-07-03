import type {
  AdminActivityItem,
  AdminChartPoint,
  AdminHealthMetric,
} from "@/lib/data/admin-stats";
import { AdminMiniChart } from "@/components/admin/admin-mini-chart";

export function AdminAnalyticsSection({
  newUsers,
  listingsCreated,
}: {
  newUsers: AdminChartPoint[];
  listingsCreated: AdminChartPoint[];
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold">Analytics</h2>
        <span className="text-[10px] text-muted">Last 7 days</span>
      </div>
      <div className="grid gap-2">
        <AdminMiniChart title="New Users" points={newUsers} accent="primary" />
        <AdminMiniChart
          title="Listings Created"
          points={listingsCreated}
          accent="indigo"
        />
      </div>
    </section>
  );
}

export function AdminHealthSection({
  metrics,
  isHealthy,
}: {
  metrics: AdminHealthMetric[];
  isHealthy: boolean;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold">Marketplace Health</h2>
        {isHealthy ? (
          <span className="text-[10px] text-primary">Healthy</span>
        ) : null}
      </div>
      {isHealthy ? (
        <div className="rounded-[12px] border border-primary/20 bg-primary/5 px-3 py-2.5 text-[12px] text-primary">
          Marketplace is healthy 🎉
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-[12px] border border-border bg-surface px-2.5 py-2"
          >
            <p className="text-[16px] font-bold leading-none">{metric.value}</p>
            <p className="mt-1 text-[10px] text-muted">{metric.label}</p>
            {metric.hint ? (
              <p className="mt-0.5 text-[9px] text-muted">{metric.hint}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminActivityFeed({
  activities,
}: {
  activities: AdminActivityItem[];
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-[13px] font-semibold">Recent Activity</h2>
      <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
        {activities.length === 0 ? (
          <p className="px-3 py-4 text-[12px] text-muted">No recent activity</p>
        ) : (
          activities.map((item, index) => (
            <div
              key={item.id}
              className="flex items-start gap-2.5 px-3 py-2.5"
              style={
                index < activities.length - 1
                  ? { borderBottom: "1px solid var(--border)" }
                  : undefined
              }
            >
              <span className="text-[14px] leading-none">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px]">{item.text}</p>
                <p className="text-[10px] text-muted">{item.time}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
