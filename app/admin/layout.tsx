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
        <div className="admin-desktop-shell">
          <Suspense fallback={null}>
            <AdminDesktopSidebar />
          </Suspense>
          <main className="admin-desktop-main">
            <div className="admin-desktop-scroll">{children}</div>
          </main>
        </div>
      </ErrorBoundary>
    </AdminToastProvider>
  );
}
