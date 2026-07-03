"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, RefreshCw } from "lucide-react";
import type { AdminNotification } from "@/lib/data/admin-stats";
import { cn } from "@/lib/utils/cn";

export function AdminDashboardHeader({
  notifications,
}: {
  notifications: AdminNotification[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((item) => item.unread).length;

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <section className="flex items-start justify-between gap-3 lg:items-center">
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-primary">
          Operations
        </p>
        <h1 className="type-page-title text-[22px] leading-tight lg:text-[28px]">
          Admin Dashboard
        </h1>
        <p className="mt-0.5 text-[12px] text-muted lg:text-[13px]">
          Business intelligence & marketplace management
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={refresh}
          disabled={isPending}
          className="flex size-9 items-center justify-center rounded-full border border-border bg-surface text-foreground"
          aria-label="Refresh dashboard"
        >
          <RefreshCw size={15} className={cn(isPending && "animate-spin")} />
        </button>

        <div ref={panelRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="relative flex size-9 items-center justify-center rounded-full border border-border bg-surface text-foreground"
            aria-label="Notifications"
          >
            <Bell size={15} />
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
            ) : null}
          </button>

          {open ? (
            <div className="absolute right-0 top-10 z-50 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-[12px] border border-border bg-surface shadow-soft">
              <div className="border-b border-border px-3 py-2">
                <p className="text-[12px] font-semibold">Notifications</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-3 py-4 text-[12px] text-muted">All caught up</p>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "border-b border-border px-3 py-2.5 last:border-b-0",
                        item.unread && "bg-primary/5",
                      )}
                    >
                      <p className="text-[12px] leading-snug">{item.text}</p>
                      <p className="mt-0.5 text-[10px] text-muted">{item.time}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
