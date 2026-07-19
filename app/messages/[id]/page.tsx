import { notFound, redirect } from "next/navigation";
import { ConversationThread } from "@/components/messages/conversation-thread";
import {
  getConversationForUser,
  getMessagesForConversation,
} from "@/lib/data/chat";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/messages/${id}`);
  }

  const conversation = await getConversationForUser(id, user.id);
  if (!conversation) {
    notFound();
  }

  const messages = await getMessagesForConversation(id, user.id);

  return (
    <main className="marketplace-page marketplace-page--chat flex min-h-0 flex-1 flex-col pt-0 pb-0">
      <ConversationThread
        conversationId={conversation.id}
        listingId={conversation.listingId}
        listingTitle={conversation.listingTitle}
        otherPartyId={conversation.otherPartyId}
        otherPartyName={conversation.otherPartyName}
        otherPartyUsername={conversation.otherPartyUsername}
        otherPartyAvatarUrl={conversation.otherPartyAvatarUrl}
        initialMessages={messages}
        isBlocked={conversation.isBlocked}
      />
    </main>
  );
}
