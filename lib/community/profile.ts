import { shopPathForUsername } from "@/lib/utils/username";

/** Profile link for a community member (existing public seller shop). */
export function communityProfileHref(authorId: string, username: string | null) {
  return username ? shopPathForUsername(username) : `/store/${authorId}`;
}