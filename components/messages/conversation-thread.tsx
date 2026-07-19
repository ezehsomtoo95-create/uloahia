"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { sendConversationMessage, markConversationRead } from "@/app/actions/engagement";
import type { ChatMessage } from "@/lib/types/engagement";
import { cn } from "@/lib/utils/cn";
import { shopPathForUsername } from "@/lib/utils/username";

export function ConversationThread({
  conversationId,
  listingId,
  listingTitle,
  otherPartyName,
  otherPartyUsername,
  otherPartyAvatarUrl,
  initialMessages,
  isBlocked,
}: {
  conversationId: string;
  listingId: string;
  listingTitle: string;
  otherPartyName: string;
  otherPartyUsername: string | null;
  otherPartyAvatarUrl?: string | null;
  initialMessages: ChatMessage[];
  isBlocked: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const messagesRef = useRef<HTMLDivElement>(null);

  const nameParts = otherPartyName.trim().split(/\s+/).filter(Boolean);
  const initials =
    nameParts.length >= 2
      ? `${nameParts[0]![0]}${nameParts[1]![0]}`.toUpperCase()
      : (nameParts[0]?.[0] ?? "U").toUpperCase();

  useEffect(() => {
    void markConversationRead(conversationId);
  }, [conversationId]);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages.length]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || isBlocked) {
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await sendConversationMessage(conversationId, trimmed);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const now = new Date().toISOString();
      setMessages((current) => [
        ...current,
        {
          id: `local-${now}`,
          conversationId,
          senderId: "me",
          body: trimmed,
          createdAt: now,
          createdAtLabel: "Just now",
          readAt: null,
          mine: true,
        },
      ]);
      setBody("");
    });
  }

  return (
    <div className="chat-thread">
      <header className="chat-thread-head">
        <p className="text-[12px] text-muted">
          <Link href="/messages" className="text-primary hover:underline">
            Messages
          </Link>
          <span className="mx-1.5 text-border">/</span>
          Conversation
        </p>
        <div className="mt-1 flex items-center gap-2.5">
          <div className="chat-inbox-avatar chat-inbox-avatar--sm" aria-hidden>
            {otherPartyAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={otherPartyAvatarUrl} alt="" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">
            {otherPartyName}
          </h1>
        </div>
        <p className="mt-0.5 text-[12px] text-muted">
          About{" "}
          <Link href={`/listing/${listingId}`} className="text-primary hover:underline">
            {listingTitle}
          </Link>
          {otherPartyUsername ? (
            <>
              {" · "}
              <Link href={shopPathForUsername(otherPartyUsername)} className="hover:underline">
                @{otherPartyUsername}
              </Link>
            </>
          ) : null}
        </p>
      </header>

      <div ref={messagesRef} className="chat-thread-messages">
        {messages.length === 0 ? (
          <div className="market-empty market-empty--center py-8">
            <p className="market-empty-title">Start the conversation</p>
            <p className="market-empty-copy">
              Ask about price, condition, or where to meet.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex", message.mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "chat-bubble",
                  message.mine ? "chat-bubble--mine" : "chat-bubble--theirs",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
                <p
                  className={cn(
                    "mt-1 text-[10px]",
                    message.mine ? "text-primary-foreground/75" : "text-muted",
                  )}
                >
                  {message.createdAtLabel}
                  {message.mine && message.readAt ? " · Read" : null}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={onSubmit} className="chat-thread-composer">
        {isBlocked ? (
          <p className="text-[13px] text-muted">This conversation is unavailable.</p>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={2000}
                placeholder="Write a message…"
                className="h-11 min-w-0 flex-1 rounded-[12px] border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary/40"
              />
              <button
                type="submit"
                disabled={pending || !body.trim()}
                className="h-11 shrink-0 cursor-pointer rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
              >
                Send
              </button>
            </div>
            {error ? <p className="mt-2 text-[12px] text-red-600">{error}</p> : null}
          </>
        )}
      </form>
    </div>
  );
}
