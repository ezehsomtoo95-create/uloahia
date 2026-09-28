"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Eye, MapPin, MessageSquare } from "lucide-react";
import { recordCommunityPostView } from "@/app/actions/community";
import { LazyAvatar } from "@/components/ui/lazy-avatar";
import { getCommunityChannelLabel } from "@/lib/community/channels";
import { getCommunityFeedImageUrl } from "@/lib/community/images";
import { communityProfileHref } from "@/lib/community/profile";
import type { CommunityPost, CommunityReply } from "@/lib/types/community";
import {
  hasViewedCommunityPostCookie,
  markCommunityPostViewedCookie,
} from "@/lib/utils/community-view-cookie";
import { getSellerInitials } from "@/lib/utils/format";
import { CommunityDeleteButton } from "./community-delete-button";
import { CommunityLikeButton } from "./community-like-button";
import { CommunityReplySection } from "./community-reply-section";
import { ReportButton, ReportSheet } from "@/components/safety/report-sheet";

export function CommunityPostDetail({
  post,
  replies,
  isAuthenticated,
  currentUserId = null,
}: {
  post: CommunityPost;
  replies: CommunityReply[];
  isAuthenticated: boolean;
  currentUserId?: string | null;
}) {
  const postHref = `/community/${post.id}`;
  const profileHref = communityProfileHref(post.authorId, post.authorUsername);
  const channelLabel = getCommunityChannelLabel(post.channel);
  const isOwnPost = Boolean(currentUserId && post.authorId === currentUserId);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (hasViewedCommunityPostCookie(post.id)) {
      return;
    }
    markCommunityPostViewedCookie(post.id);
    void recordCommunityPostView(post.id);
  }, [post.id]);

  return (
    <main className="account-page">
      <Link
        href="/community"
        className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline"
      >
        <ChevronLeft size={16} strokeWidth={2.4} />
        Community
      </Link>

      <article className="rounded-[16px] border border-border/90 bg-surface p-4 sm:p-5">
        <div className="flex items-start gap-2.5">
          <Link href={profileHref} className="shrink-0 no-underline" aria-label={`View ${post.authorName}'s profile`}>
            <LazyAvatar
              src={post.authorAvatarUrl}
              size={44}
              className="size-11 rounded-full"
              fallback={
                <span className="text-[13px] font-semibold text-muted">
                  {getSellerInitials(post.authorName)}
                </span>
              }
            />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <Link
                href={profileHref}
                className="min-w-0 truncate text-[15px] font-bold tracking-[-0.01em] text-foreground no-underline hover:underline"
              >
                {post.authorName}
              </Link>
              <span className="shrink-0 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
                {channelLabel}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-muted">
              <span>{post.createdAtLabel}</span>
              {post.location ? (
                <span className="inline-flex items-center gap-0.5">
                  <span aria-hidden>·</span>
                  <MapPin size={12} strokeWidth={2.2} aria-hidden />
                  {post.location}
                </span>
              ) : null}
            </div>
          </div>

          {isOwnPost ? <CommunityDeleteButton postId={post.id} compact /> : null}
        </div>

        <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground">
          {post.body}
        </p>

                {post.images.length > 0 ? (
          post.images.length === 1 ? (
            /* Single image: compact on phones, unchanged on desktop. */
            <div className="relative mt-3 h-[220px] w-full overflow-hidden rounded-[14px] border border-border/80 bg-surface-raised sm:h-[280px]">
              <Image
                src={getCommunityFeedImageUrl(post.images[0]!)}
                alt=""
                fill
                unoptimized
                sizes="(max-width: 640px) 100vw, 640px"
                className="object-contain"
              />
            </div>
          ) : (
            /* Multiple images: compact HORIZONTAL swipe gallery on phones
               (was a tall vertical stack); desktop grid is unchanged.
               object-contain keeps every image fully visible (no crop). */
            <div className="market-hscroll snap-x mt-3 flex gap-2 sm:grid sm:grid-cols-2 sm:gap-2">
              {post.images.slice(0, 3).map((image, index) => (
                <div
                  key={`${post.id}-${index}`}
                  className="relative h-[150px] w-[70%] shrink-0 snap-start overflow-hidden rounded-[14px] border border-border/80 bg-surface-raised sm:h-[180px] sm:w-auto"
                >
                  <Image
                    src={getCommunityFeedImageUrl(image)}
                    alt=""
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 70vw, 640px"
                    className="object-contain"
                  />
                </div>
              ))}
            </div>
          )
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 pt-3">
          <CommunityLikeButton
            postId={post.id}
            likedByMe={post.likedByMe}
            likeCount={post.likeCount}
            isAuthenticated={isAuthenticated}
            returnPath={postHref}
          />
          <ReportButton onClick={() => setReportOpen(true)} />
          <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted">
            <MessageSquare size={15} strokeWidth={2.2} />
            {post.replyCount}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted">
            <Eye size={15} strokeWidth={2.2} />
            {post.viewCount}
          </span>
        </div>
      </article>

      <CommunityReplySection
        postId={post.id}
        replies={replies}
        isAuthenticated={isAuthenticated}
        currentUserId={currentUserId}
      />

      <ReportSheet
        contentType="community_post"
        contentId={post.id}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        isAuthenticated={isAuthenticated}
      />
    </main>
  );
}