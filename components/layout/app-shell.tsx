"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";
import { EngagementBadgesProvider } from "@/components/layout/engagement-badges-provider";
import { MarketplaceDesktopSidebar } from "@/components/layout/marketplace-desktop-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { ErrorBoundary } from "@/components/error-boundary";
import { SaveToastProvider } from "@/components/listings/save-toast";
import { SavedListingsProvider } from "@/components/listings/saved-listings-provider";
import { cn } from "@/lib/utils/cn";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isHome = pathname === "/";
  const isChatThread = /^\/messages\/[^/]+$/.test(pathname);
  const isAuthScreen =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/update-password" ||
    pathname.startsWith("/update-password/");

  return (
    <SaveToastProvider>
      <SavedListingsProvider>
        <EngagementBadgesProvider>
          <ErrorBoundary title="Marketplace unavailable">
            <div className="marketplace-root bg-background text-foreground">
              {!isAdmin ? <TopBar /> : null}
              <div
                className={cn(
                  "marketplace-body",
                  isAdmin && "marketplace-body--admin",
                )}
              >
                {!isAdmin ? <MarketplaceDesktopSidebar /> : null}
                <div className="marketplace-main">
                  <div
                    className={cn(
                      "marketplace-content-scroll",
                      !isAdmin && !isHome && !isChatThread && "pt-[3.75rem] lg:pt-0",
                      isHome && "marketplace-content-scroll--home",
                      isChatThread && "marketplace-content-scroll--chat pt-[3.75rem] lg:pt-0",
                      isAdmin && "marketplace-content-scroll--admin",
                      isAuthScreen && "marketplace-content-scroll--auth",
                    )}
                  >
                    <div
                      className={cn(
                        "app-container",
                        isAdmin && "app-container--admin-desktop",
                        !isAdmin && "app-container--marketplace-desktop",
                        isAuthScreen && "app-container--auth",
                        isChatThread && "app-container--chat",
                      )}
                    >
                      {children}
                    </div>
                  </div>
                </div>
              </div>
              <BottomNav />
            </div>
          </ErrorBoundary>
        </EngagementBadgesProvider>
      </SavedListingsProvider>
    </SaveToastProvider>
  );
}
