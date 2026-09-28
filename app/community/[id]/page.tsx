import { notFound } from "next/navigation";
import { CommunityPostDetail } from "@/components/community/community-post-detail";
import { getCommunityPost, getCommunityReplies } from "@/lib/data/community";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getCommunityPost(id, null);

  if (!post) {
    return {
      title: "Post Not Found",
      description: "This community post could not be found.",
      alternates: {
        canonical: "/community",
      },
    };
  }

  return {
    title: "Community Post",
    description: post.body.slice(0, 150),
    alternates: {
      canonical: `/community/${id}`,
    },
  };
}

export default async function CommunityPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [post, replies] = await Promise.all([
    getCommunityPost(id, user?.id ?? null),
    getCommunityReplies(id, user?.id ?? null),
  ]);

  if (!post) {
    notFound();
  }

  return (
    <CommunityPostDetail
      post={post}
      replies={replies}
      isAuthenticated={Boolean(user)}
      currentUserId={user?.id ?? null}
    />
  );
}