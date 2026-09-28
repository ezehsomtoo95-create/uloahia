import Image from "next/image";
import Link from "next/link";
import { Eye, MapPin, MessageSquare } from "lucide-react";
import { LazyAvatar } from "@/components/ui/lazy-avatar";
import { getCommunityChannelLabel } from "@/lib/community/channels";
import { getCommunityFeedImageUrl } from "@/lib/community/images";
import { communityProfileHref } from "@/lib/community/profile";
import type { CommunityPost } from "@/lib/types/community";
import { getSellerInitials } from "@/lib/utils/format";
import { CommunityDeleteButton } from "./community-delete-button";
import { CommunityLikeButton } from "./community-like-button";

export function CommunityPostCard({
  post,
  isAuthenticated,
  currentUserId = null,
}: {
  post: CommunityPost;
  isAuthenticated: boolean;
  currentUserId?: string | null;
}) {
  const postHref = `/community/${post.id}`;
  const profileHref = communityProfileHref(post.authorId, post.authorUsername);
  const channelLabel = getCommunityChannelLabel(post.channel);
  const isOwnPost = Boolean(currentUserId && post.authorId === currentUserId);

  return (
    <article className="rounded-[16px] border border-border/90 bg-surface p-3.5 shadow-[0_1px_0_color-mix(in_srgb,var(--border)_50%,transparent)] sm:p-4">
      <div className="flex items-start gap-2.5">
        <Link
          href={profileHref}
          className="shrink-0 no-underline"
          aria-label={`View ${post.authorName}'s profile`}
        >
          <LazyAvatar
            src={post.authorAvatarUrl}
            size={40}
            className="size-10 rounded-full"
            fallback={
              <span className="text-[12px] font-semibold text-muted">
                {getSellerInitials(post.authorName)}
              </span>
            }
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link
              href={profileHref}
              className="min-w-0 truncate text-[14px] font-semibold tracking-[-0.01em] text-foreground no-underline hover:underline"
            >
              {post.authorName}
            </Link>
            <span className="shrink-0 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
              {channelLabel}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted">
            <span>{post.createdAtLabel}</span>
            {post.location ? (
              <span className="inline-flex items-center gap-0.5">
                <span aria-hidden>·</span>
                <MapPin size={11} strokeWidth={2.2} aria-hidden />
                {post.location}
              </span>
            ) : null}
          </div>
        </div>

        {isOwnPost ? <CommunityDeleteButton postId={post.id} compact /> : null}
      </div>

      <Link href={postHref} className="mt-2.5 block no-underline">
        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground">
          {post.body}
        </p>
        {post.images.length > 0 ? (
          post.images.length === 1 ? (
            <div
              className="relative mt-3 h-[160px] w-full overflow-hidden rounded-[12px] border border-border/80 bg-surface-raised"
            >
              <Image
                src={getCommunityFeedImageUrl(post.images[0]!)}
                alt=""
                fill
                unoptimized
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-contain"
              />
            </div>
          ) : (
            /* Multiple images: compact HORIZONTAL swipe gallery on phones
               (text-first feed, nothing stacked vertically); the desktop
               grid layout is unchanged. Full image always visible
               (object-contain, no cropping). */
            <div className="market-hscroll snap-x mt-3 flex gap-1.5 sm:grid sm:grid-cols-3 sm:gap-1.5">
              {post.images.slice(0, 3).map((image, index) => (
                <div
                  key={`${post.id}-img-${index}`}
                  className="relative h-[120px] w-[64%] shrink-0 snap-start overflow-hidden rounded-[12px] border border-border/80 bg-surface-raised sm:h-[110px] sm:w-auto"
                >
                  <Image
                    src={getCommunityFeedImageUrl(image)}
                    alt=""
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 64vw, 33vw"
                    className="object-contain"
                  />
                </div>
              ))}
            </div>
          )
        ) : null}
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 pt-2.5">
        <CommunityLikeButton
          postId={post.id}
          likedByMe={post.likedByMe}
          likeCount={post.likeCount}
          isAuthenticated={isAuthenticated}
          returnPath={postHref}
        />
        <Link
          href={postHref}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-muted transition duration-app hover:border-primary/35 hover:text-primary"
        >
          <MessageSquare size={15} strokeWidth={2.2} />
          {post.replyCount}
        </Link>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted">
          <Eye size={15} strokeWidth={2.2} />
          {post.viewCount}
        </span>
      </div>
    </article>
  );
}
