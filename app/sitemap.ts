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
  { path: "/saved", changeFrequency: "weekly", priority: 0.5 },
  { path: "/profile", changeFrequency: "monthly", priority: 0.4 },
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
  const { data: listings } = await supabase
    .from("listings")
    .select("id, created_at, reviewed_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const listingEntries: MetadataRoute.Sitemap = (listings ?? []).map((listing) => ({
    url: `${siteUrl}/listing/${listing.id}`,
    lastModified: new Date(listing.reviewed_at ?? listing.created_at),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...listingEntries];
}
