import type { AdminKpi } from "@/lib/data/admin-stats";
import { cn } from "@/lib/utils/cn";

function changeClass(tone: AdminKpi["changeTone"]) {
  return cn(
    "text-[11px] font-medium",
    tone === "up" && "text-primary",
    tone === "down" && "text-red-400/90",
    tone === "neutral" && "text-muted",
  );
}

/** Matches home listing grid gaps: 0.85rem mobile, 1.1rem desktop. */
export function AdminKpiGrid({ kpis }: { kpis: AdminKpi[] }) {
  const rows = [kpis.slice(0, 4), kpis.slice(4, 8)];

  return (
    <section className="flex flex-col gap-[0.85rem] lg:gap-[1.1rem]">
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="grid grid-cols-2 gap-[0.85rem] lg:grid-cols-4 lg:gap-[1.1rem]"
        >
          {row.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-[12px] border border-border bg-surface px-[0.8rem] py-[0.85rem] lg:px-4 lg:py-4"
            >
              <p className="text-[22px] font-bold leading-none tracking-tight lg:text-[24px]">
                {kpi.value}
              </p>
              <p className="mt-2 text-[11px] text-muted lg:text-[12px]">{kpi.label}</p>
              <p className={cn("mt-1", changeClass(kpi.changeTone))}>{kpi.change}</p>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
