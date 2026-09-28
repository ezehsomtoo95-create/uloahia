import type {
  CommunityChannel,
  CommunityPostChannelSlug,
  CommunityViewSlug,
} from "@/lib/types/community";

/** Channel pills shown on the Community page (Trending + Latest are views). */
export const COMMUNITY_CHANNELS: CommunityChannel[] = [
  { slug: "trending", label: "Trending" },
  { slug: "latest", label: "Latest" },
  { slug: "business", label: "Business" },
  { slug: "deals-opportunities", label: "Deals & Opportunities" },
  { slug: "nigeria-gist", label: "Nigeria Gist" },
  { slug: "cars-transport", label: "Cars & Transport" },
  { slug: "tech", label: "Tech" },
  { slug: "property", label: "Property" },
  { slug: "jobs-career", label: "Jobs & Career" },
  { slug: "local-city", label: "Local / City" },
];

export function isCommunityViewSlug(slug: string): slug is CommunityViewSlug {
  return slug === "trending" || slug === "latest";
}

export function isCommunityPostChannelSlug(slug: string): slug is CommunityPostChannelSlug {
  return (
    slug === "business" ||
    slug === "deals-opportunities" ||
    slug === "nigeria-gist" ||
    slug === "cars-transport" ||
    slug === "tech" ||
    slug === "property" ||
    slug === "jobs-career" ||
    slug === "local-city"
  );
}

/** Pure post channels (persisted) — used by the create-post flow. */
export const COMMUNITY_POST_CHANNELS: { slug: CommunityPostChannelSlug; label: string }[] =
  COMMUNITY_CHANNELS.filter(
    (channel): channel is { slug: CommunityPostChannelSlug; label: string } =>
      isCommunityPostChannelSlug(channel.slug),
  ).map((channel) => ({
    slug: channel.slug,
    label: channel.label,
  }));

export function getCommunityChannelLabel(slug: string): string {
  return (
    COMMUNITY_CHANNELS.find((channel) => channel.slug === slug)?.label ??
    "Trending"
  );
}