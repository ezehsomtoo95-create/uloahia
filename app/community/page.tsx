import { CommunityPageClient } from "@/components/community/community-page-client";
import {
  isCommunityPostChannelSlug,
  isCommunityViewSlug,
} from "@/lib/community/channels";
import { getCommunityFeed } from "@/lib/data/community";
import { createClient } from "@/lib/supabase/server";
import type { CommunityTabSlug } from "@/lib/types/community";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Community",
  description:
    "AhiaUlo Community — business, gist, opportunities and what's happening around Nigeria.",
  keywords: ["community", "forum", "Nigeria", "business", "gist", "opportunities"],
  alternates: {
    canonical: "/community",
  },
};

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: CommunityTabSlug =
    rawTab &&
    (isCommunityViewSlug(rawTab) || isCommunityPostChannelSlug(rawTab))
      ? rawTab
      : "latest";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const posts = await getCommunityFeed(tab, user?.id ?? null);

  return (
    <CommunityPageClient
      posts={posts}
      tab={tab}
      isAuthenticated={Boolean(user)}
      currentUserId={user?.id ?? null}
    />
  );
}