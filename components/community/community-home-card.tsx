import Link from "next/link";
import { ArrowRight, MessagesSquare } from "lucide-react";

/**
 * Home card promoting the Community section. Sits between "Shop by category"
 * and "Featured Listings" on the home feed.
 *
 * Mobile (< sm): a compact horizontal teaser banner (~65-80px) - small icon
 * left, title + description beside it, a small inline CTA on the right.
 * Responsive notes (iPhone narrow viewports):
 * - The text column is the ONLY flexible child (`min-w-0 flex-1` + its own
 *   `overflow-hidden`, which forces the flex `min-width:auto` to 0 on iOS
 *   Safari), so it absorbs all squeeze - the icon and CTA never clip.
 * - The card itself does not clip on mobile (`overflow-hidden` only from
 *   `sm:` up): nothing can overflow it, and skipping the clip avoids the
 *   WebKit border-radius + transform compositing bug that shaved the card's
 *   left edge on iOS.
 * - Title drops to 13px on mobile so "🇳🇬 AhiaUlo Community" fits on one
 *   line at iPhone widths (truncate only kicks in on ultra-narrow devices).
 * - Description wraps EXACTLY as two lines on mobile — "Business, gist,
 *   opportunities &" / "what's happening around Nigeria." — via two
 *   `block sm:inline` spans (a viewport-responsive break, not a device hack).
 *   The `block` display on mobile forces a line break after the "&"
 *   regardless of container width, preventing the 3rd-line bug that the old
 *   `<br>` approach had on narrower Android devices. On desktop (`inline`),
 *   the spans flow as one line with `truncate`.
 * Desktop (sm+): the original full row layout, unchanged.
 */
export function CommunityHomeCard() {
  return (
    <section className="market-block">
      <Link
        href="/community"
        className="group relative z-10 flex flex-row items-center gap-1 rounded-[16px] border border-primary/15 bg-gradient-to-br from-primary/10 via-surface to-surface px-2.5 py-2.5 no-underline transition duration-app hover:border-primary/30 hover:from-primary/12 active:scale-[0.99] sm:overflow-hidden sm:gap-5 sm:px-4 sm:py-4"
        aria-label="Open the AhiaUlo Community forum"
      >
        <span
          className="grid size-7 shrink-0 place-items-center rounded-[8px] border border-primary/20 bg-primary/10 text-primary [&_svg]:size-[14px] sm:size-11 sm:rounded-[14px] sm:[&_svg]:size-[22px]"
          aria-hidden
        >
          <MessagesSquare strokeWidth={2} />
        </span>

        <span className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <span className="min-w-0 truncate text-[13px] font-bold leading-tight tracking-[-0.02em] text-foreground sm:text-[16px] sm:leading-normal">
            🇳🇬 AhiaUlo Community
          </span>
          {/*
            Mobile: each span is `block` so the description is ALWAYS exactly
            two lines — "Business, gist, opportunities &" / "what's happening
            around Nigeria." — regardless of viewport width. `block sm:inline`
            forces the line break after the "&" without relying on text fitting
            (which the old `<br>` approach failed at on narrower Android
            devices, producing a 3rd line). On desktop (`inline`), the text
            flows as one line with `truncate`.
          */}
          <span className="min-w-0 text-[11px] leading-snug text-muted sm:truncate sm:text-[13px] sm:leading-normal">
            <span className="block sm:inline"
              >Business, gist, opportunities &amp;</span
            >
            <span className="block sm:inline"
              >&nbsp;what&apos;s happening around Nigeria.</span
            >
          </span>
        </span>

        <span className="inline-flex h-7 shrink-0 items-center gap-1 self-center whitespace-nowrap rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground transition duration-app group-hover:bg-primary/90 sm:h-9 sm:whitespace-normal sm:px-4 sm:text-[13px]">
          Join conversation
          <ArrowRight size={14} strokeWidth={2.2} className="size-3 shrink-0 transition-transform duration-app group-hover:translate-x-0.5 sm:size-[15px]" />
        </span>
      </Link>
    </section>
  );
}