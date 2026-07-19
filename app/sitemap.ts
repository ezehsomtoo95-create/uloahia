import type { MetadataRoute } from "next";
import { DOMAIN } from "@/lib/constants/brand";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 3600;

const PUBLIC_STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}> = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/browse", changeFrequency: "daily", priority: 0.9 },
  { path: "/categories", changeFrequency: "daily", priority: 0.85 },
  { path: "/saved", changeFrequency: "weekly", priority: 0.5 },
  { path: "/profile", changeFrequency: "monthly", priority: 0.4 },
  { path: "/messages", changeFrequency: "weekly", priority: 0.4 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = `https://${DOMAIN}`;

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_STATIC_ROUTES.map(
    ({ path, changeFrequency, priority }) => ({
      url: `${siteUrl}${path}`,
      lastModified: new Date(),
      changeFrequency,
      priority,
    }),
  );

  const supabase = await createClient();
  const [{ data: listings }, { data: categories }] = await Promise.all([
    supabase
      .from("listings")
      .select("id, created_at, reviewed_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("slug, updated_at, created_at")
      .eq("is_active", true)
      .is("parent_id", null),
  ]);

  const listingEntries: MetadataRoute.Sitemap = (listings ?? []).map((listing) => ({
    url: `${siteUrl}/listing/${listing.id}`,
    lastModified: new Date(listing.reviewed_at ?? listing.created_at),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryEntries: MetadataRoute.Sitemap = (categories ?? []).map((category) => ({
    url: `${siteUrl}/category/${category.slug}`,
    lastModified: new Date(category.updated_at ?? category.created_at ?? Date.now()),
    changeFrequency: "daily",
    priority: 0.85,
  }));

  return [...staticEntries, ...categoryEntries, ...listingEntries];
}
