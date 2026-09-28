"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Chip, ChipRow } from "@/components/ui/chip";
import { COMMUNITY_CHANNELS } from "@/lib/community/channels";
import type {
  CommunityPost,
  CommunityPostChannelSlug,
  CommunityTabSlug,
} from "@/lib/types/community";
import { CommunityCreatePost } from "./community-create-post";
import { CommunityPostCard } from "./community-post-card";

export function CommunityPageClient({
  posts,
  tab,
  isAuthenticated,
  currentUserId = null,
}: {
  posts: CommunityPost[];
  tab: CommunityTabSlug;
  isAuthenticated: boolean;
  currentUserId?: string | null;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const defaultChannel: CommunityPostChannelSlug | undefined =
    tab === "trending" || tab === "latest" ? undefined : tab;

  return (
    <main className="account-page">
      <header className="market-page-head">
        <h1 className="market-page-title">🇳🇬 AhiaUlo Community</h1>
        <p className="market-page-sub">
          Business, gist, opportunities &amp; what&apos;s happening around Nigeria.
        </p>
      </header>

      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-primary text-[15px] font-semibold text-primary-foreground shadow-[0_10px_24px_color-mix(in_srgb,var(--primary)_28%,transparent)] transition duration-app hover:bg-primary/90 active:scale-[0.99]"
      >
        <Plus size={19} strokeWidth={2.4} />
        Create a post
      </button>

      <div className="mt-3">
        <ChipRow>
          {COMMUNITY_CHANNELS.map((channel) => (
            <Chip
              key={channel.slug}
              href={`/community?tab=${channel.slug}`}
              active={tab === channel.slug}
            >
              {channel.label}
            </Chip>
          ))}
        </ChipRow>
      </div>

      <div className="mt-3 space-y-3">
        {posts.length === 0 ? (
          <div className="market-empty market-empty--center py-10">
            <p className="market-empty-title">Nothing here yet</p>
            <p className="market-empty-copy">
              Be the first to start the conversation in this channel.
            </p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="market-empty-cta"
            >
              Create a post
            </button>
          </div>
        ) : (
          posts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              isAuthenticated={isAuthenticated}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>

      <footer className="mt-6 text-center">
        <Link href="/" className="text-[12px] font-medium text-primary hover:underline">
          AhiaUlo Community
        </Link>
      </footer>

      {/* Small floating create button. Sits above the bottom nav (72px) plus
          its safe-area inset, and reuses the same create-post sheet — it does
          not introduce a second posting flow. */}
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        aria-label="Create a community post"
        className="fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 grid size-11 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_22px_color-mix(in_srgb,var(--primary)_38%,transparent)] transition duration-app hover:bg-primary/90 active:scale-95 lg:bottom-6"
      >
        <Plus size={20} strokeWidth={2.4} />
      </button>

      <CommunityCreatePost
        isAuthenticated={isAuthenticated}
        defaultChannel={defaultChannel}
        returnPath="/community"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </main>
  );
}