"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "sold", label: "Sold" },
  { value: "rejected", label: "Rejected" },
] as const;

export function AdminToolbar({
  currentStatus,
  currentQuery,
}: {
  currentStatus: string;
  currentQuery: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(next: { status?: string; q?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    if (next.status !== undefined) {
      if (next.status === "all") {
        params.delete("status");
      } else {
        params.set("status", next.status);
      }
    }

    if (next.q !== undefined) {
      if (!next.q.trim()) {
        params.delete("q");
      } else {
        params.set("q", next.q.trim());
      }
    }

    const query = params.toString();
    router.replace(query ? `/admin?${query}` : "/admin");
  }

  return (
    <section className="space-y-3">
      <div className="native-scroll flex gap-1.5 overflow-x-auto">
        {FILTERS.map((filter) => {
          const active = currentStatus === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => updateParams({ status: filter.value })}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium whitespace-nowrap",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted",
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <input
        type="search"
        defaultValue={currentQuery}
        placeholder="Search title, seller, or category"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            updateParams({ q: event.currentTarget.value });
          }
        }}
        className="h-10 w-full rounded-full border border-border bg-surface px-4 text-[13px] outline-none placeholder:text-muted"
      />
    </section>
  );
}
