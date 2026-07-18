"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { waitForInitialAuthSession } from "@/lib/client/auth-session";

type EngagementBadgesValue = {
  messageUnread: number;
  notificationUnread: number;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
};

const EngagementBadgesContext = createContext<EngagementBadgesValue | null>(null);

export function EngagementBadgesProvider({ children }: { children: React.ReactNode }) {
  const [messageUnread, setMessageUnread] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const session = await waitForInitialAuthSession(supabase);
    const userId = session?.user?.id;

    if (!userId) {
      setIsAuthenticated(false);
      setMessageUnread(0);
      setNotificationUnread(0);
      return;
    }

    setIsAuthenticated(true);

    const [conversationsResult, notificationsResult] = await Promise.all([
      supabase
        .from("conversations")
        .select("buyer_id, seller_id, buyer_unread_count, seller_unread_count")
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null),
    ]);

    const messageTotal = (conversationsResult.data ?? []).reduce((total, row) => {
      if (row.buyer_id === userId) {
        return total + (row.buyer_unread_count ?? 0);
      }
      return total + (row.seller_unread_count ?? 0);
    }, 0);

    setMessageUnread(messageTotal);
    setNotificationUnread(notificationsResult.count ?? 0);
  }, []);

  useEffect(() => {
    void refresh();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    const interval = window.setInterval(() => {
      void refresh();
    }, 45000);

    return () => {
      subscription.unsubscribe();
      window.clearInterval(interval);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({
      messageUnread,
      notificationUnread,
      isAuthenticated,
      refresh,
    }),
    [messageUnread, notificationUnread, isAuthenticated, refresh],
  );

  return (
    <EngagementBadgesContext.Provider value={value}>
      {children}
    </EngagementBadgesContext.Provider>
  );
}

export function useEngagementBadges() {
  const value = useContext(EngagementBadgesContext);
  if (!value) {
    return {
      messageUnread: 0,
      notificationUnread: 0,
      isAuthenticated: false,
      refresh: async () => undefined,
    };
  }
  return value;
}
