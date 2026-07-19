import { Suspense } from "react";
import { AdminDesktopSidebar } from "@/components/admin/admin-desktop-sidebar";
import { AdminToastProvider } from "@/components/admin/admin-toast";
import { ErrorBoundary } from "@/components/error-boundary";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminToastProvider>
      <ErrorBoundary title="Admin panel unavailable">
        {/*
          Fixed viewport shell escapes the marketplace height/overflow chain,
          which was clipping dashboard content without a working scrollbar.
        */}
        <div className="admin-desktop-shell fixed inset-0 z-20 flex flex-col overflow-hidden bg-background lg:flex-row">
          <Suspense fallback={null}>
            <AdminDesktopSidebar />
          </Suspense>
          <main className="admin-desktop-main min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <div className="admin-desktop-scroll">{children}</div>
          </main>
        </div>
      </ErrorBoundary>
    </AdminToastProvider>
  );
}
