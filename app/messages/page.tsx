import Link from "next/link";
import { redirect } from "next/navigation";
import { getConversationsForUser } from "@/lib/data/chat";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Messages",
  description: "Your AhiaUlo conversations with buyers and sellers.",
};

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/messages");
  }

  const conversations = await getConversationsForUser(user.id);

  return (
    <main className="account-page">
      <header className="market-page-head">
        <h1 className="market-page-title">Messages</h1>
        <p className="market-page-sub">Chat with buyers and sellers about listings.</p>
      </header>

      {conversations.length === 0 ? (
        <div className="market-empty">
          <p className="market-empty-title">No conversations yet</p>
          <p className="market-empty-copy">
            Open a listing and tap Chat with Seller to start talking about an item.
          </p>
          <Link href="/browse" className="market-empty-cta">
            Browse listings
          </Link>
        </div>
      ) : (
        <div className="chat-inbox" role="list">
          {conversations.map((conversation) => {
            const initial = (conversation.otherPartyName || "U").slice(0, 1).toUpperCase();
            const unread = conversation.unreadCount > 0;

            return (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className="chat-inbox-row"
                role="listitem"
              >
                <div className="chat-inbox-avatar" aria-hidden>
                  {conversation.otherPartyAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={conversation.otherPartyAvatarUrl} alt="" />
                  ) : (
                    <span>{initial}</span>
                  )}
                </div>

                <div className="chat-inbox-body">
                  <div className="chat-inbox-top">
                    <p
                      className={cn(
                        "chat-inbox-name",
                        unread && "chat-inbox-name--unread",
                      )}
                    >
                      {conversation.otherPartyName}
                    </p>
                    <time
                      className="chat-inbox-time"
                      dateTime={conversation.lastMessageAt}
                    >
                      {conversation.lastMessageAtLabel}
                    </time>
                  </div>

                  <div className="chat-inbox-meta">
                    <span className="chat-inbox-listing" title={conversation.listingTitle}>
                      {conversation.listingTitle}
                    </span>
                  </div>

                  <div className="chat-inbox-preview-row">
                    <p
                      className={cn(
                        "chat-inbox-preview",
                        unread && "chat-inbox-preview--unread",
                      )}
                    >
                      {conversation.lastMessagePreview}
                    </p>
                    {unread ? (
                      <span className="chat-inbox-badge">
                        {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
