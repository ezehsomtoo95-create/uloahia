export function AdminTablesSkeleton() {
  return (
    <section className="space-y-2 pb-2">
      <div className="h-4 w-28 animate-pulse rounded bg-border/60" />
      <div className="flex gap-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-7 w-16 animate-pulse rounded-full bg-border/60"
          />
        ))}
      </div>
      <div className="h-9 animate-pulse rounded-full bg-border/60" />
      <div className="space-y-2 rounded-[12px] border border-border p-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-8 animate-pulse rounded bg-border/40" />
        ))}
      </div>
    </section>
  );
}
