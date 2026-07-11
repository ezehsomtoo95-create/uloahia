"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MarketplaceDesktopSidebar } from "@/components/layout/marketplace-desktop-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { ErrorBoundary } from "@/components/error-boundary";
import { SaveToastProvider } from "@/components/listings/save-toast";
import { SavedListingsProvider } from "@/components/listings/saved-listings-provider";
import { cn } from "@/lib/utils/cn";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBrowse = pathname === "/browse";
  const isAdmin = pathname.startsWith("/admin");

  return (
    <SaveToastProvider>
      <SavedListingsProvider>
        <ErrorBoundary title="Marketplace unavailable">
          <div className="marketplace-root bg-background text-foreground">
            {!isAdmin ? <MarketplaceDesktopSidebar /> : null}
            <div className="marketplace-main">
              {!isBrowse ? <TopBar /> : null}
              <div
                className={cn(
                  "marketplace-content-scroll",
                  isBrowse ? "pt-0" : "pt-[56px] lg:pt-0",
                  isAdmin && "marketplace-content-scroll--admin",
                )}
              >
                <div
                  className={cn(
                    "app-container",
                    isAdmin && "app-container--admin-desktop",
                    !isAdmin && "app-container--marketplace-desktop",
                  )}
                >
                  {children}
                </div>
              </div>
            </div>
            <BottomNav />
          </div>
        </ErrorBoundary>
      </SavedListingsProvider>
    </SaveToastProvider>
  );
}
