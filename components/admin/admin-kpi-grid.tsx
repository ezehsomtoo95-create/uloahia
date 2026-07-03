import type { AdminKpi } from "@/lib/data/admin-stats";
import { cn } from "@/lib/utils/cn";

function changeClass(tone: AdminKpi["changeTone"]) {
  return cn(
    "text-[9px] font-medium",
    tone === "up" && "text-primary",
    tone === "down" && "text-red-400/90",
    tone === "neutral" && "text-muted",
  );
}

export function AdminKpiGrid({ kpis }: { kpis: AdminKpi[] }) {
  const rows = [kpis.slice(0, 4), kpis.slice(4, 8)];

  return (
    <section className="space-y-2 lg:space-y-3">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
          {row.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-[12px] border border-border bg-surface px-2.5 py-2 lg:px-3 lg:py-3"
            >
              <p className="text-[20px] font-bold leading-none tracking-tight lg:text-[22px]">
                {kpi.value}
              </p>
              <p className="mt-1 text-[10px] text-muted lg:text-[11px]">{kpi.label}</p>
              <p className={cn("mt-0.5", changeClass(kpi.changeTone))}>
                {kpi.change}
              </p>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
