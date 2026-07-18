"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/engagement";
import type { AppNotification } from "@/lib/types/engagement";
import { cn } from "@/lib/utils/cn";

export function NotificationsList({
  notifications,
}: {
  notifications: AppNotification[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function markAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  function openNotification(notification: AppNotification) {
    startTransition(async () => {
      if (!notification.readAt) {
        await markNotificationRead(notification.id);
      }
      if (notification.link) {
        router.push(notification.link);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-muted">{notifications.length} recent</p>
        <button
          type="button"
          onClick={markAll}
          disabled={pending || notifications.every((item) => item.readAt)}
          className="cursor-pointer text-[12px] font-medium text-primary disabled:opacity-40"
        >
          Mark all read
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="market-empty">
          <p className="market-empty-title">You&apos;re all caught up</p>
          <p className="market-empty-copy">
            Listing updates and chat alerts will show here.
          </p>
          <Link href="/messages" className="market-empty-cta market-empty-cta--ghost">
            Open messages
          </Link>
        </div>
      ) : (
        <div className="account-inbox">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => openNotification(notification)}
              className={cn(
                "account-inbox-row w-full cursor-pointer text-left",
                !notification.readAt && "bg-primary/[0.04]",
              )}
            >
              {!notification.readAt ? (
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
              ) : (
                <span className="mt-1.5 size-2 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={cn(
                      "text-[14px]",
                      notification.readAt
                        ? "font-medium text-foreground"
                        : "font-semibold text-foreground",
                    )}
                  >
                    {notification.title}
                  </p>
                  <span className="shrink-0 text-[11px] text-muted">
                    {notification.createdAtLabel}
                  </span>
                </div>
                {notification.body ? (
                  <p className="mt-0.5 text-[12px] leading-5 text-muted">
                    {notification.body}
                  </p>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
