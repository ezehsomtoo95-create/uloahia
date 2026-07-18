import { redirect } from "next/navigation";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { getNotificationsForUser } from "@/lib/data/chat";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notifications",
  description: "Marketplace alerts for AhiaUlo.",
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/notifications");
  }

  const notifications = await getNotificationsForUser(user.id);

  return (
    <main className="account-page">
      <header className="market-page-head">
        <h1 className="market-page-title">Notifications</h1>
        <p className="market-page-sub">Chat, listing reviews, and marketplace updates.</p>
      </header>
      <NotificationsList notifications={notifications} />
    </main>
  );
}
