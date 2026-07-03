import { Suspense } from "react";
import { AdminDesktopSidebar } from "@/components/admin/admin-desktop-sidebar";
import { AdminToastProvider } from "@/components/admin/admin-toast";
import { ErrorBoundary } from "@/components/error-boundary";
import { requireAdmin } from "@/lib/admin/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

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
