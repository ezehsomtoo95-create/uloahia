"use client";

import type { AdminChartPoint } from "@/lib/data/admin-stats";

export function AdminMiniChart({
  title,
  points,
  accent = "primary",
}: {
  title: string;
  points: AdminChartPoint[];
  accent?: "primary" | "indigo";
}) {
  const width = 280;
  const height = 72;
  const padding = 6;
  const max = Math.max(...points.map((point) => point.value), 1);
  const step = (width - padding * 2) / Math.max(points.length - 1, 1);

  const coordinates = points.map((point, index) => {
    const x = padding + index * step;
    const y = height - padding - (point.value / max) * (height - padding * 2);
    return { x, y, ...point };
  });

  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${coordinates.at(-1)?.x ?? padding} ${height - padding} L ${padding} ${height - padding} Z`;
  const stroke = accent === "primary" ? "var(--primary)" : "var(--indigo)";

  return (
    <div className="rounded-[12px] border border-border bg-surface p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-foreground">{title}</p>
        <p className="text-[10px] text-muted">
          {points.reduce((sum, point) => sum + point.value, 0)} total
        </p>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[72px] w-full"
        role="img"
        aria-label={title}
      >
        <path d={areaPath} fill={stroke} fillOpacity="0.12" />
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coordinates.map((point) => (
          <circle
            key={point.label}
            cx={point.x}
            cy={point.y}
            r="2.5"
            fill={stroke}
          />
        ))}
      </svg>
      <div className="mt-1.5 grid grid-cols-7 gap-0.5">
        {points.map((point) => (
          <span
            key={point.label}
            className="truncate text-center text-[9px] text-muted"
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}
