import Link from "next/link";
import { CategoriesExplorer } from "@/components/categories/categories-explorer";
import { getDiscoveryCategories } from "@/lib/data/categories";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Categories",
  description: "Browse every marketplace category on AhiaUlo.",
};

type CategoriesPageProps = {
  searchParams: Promise<{
    expand?: string;
    cat?: string;
    category?: string;
  }>;
};

function resolveExpandedId(
  parents: Awaited<ReturnType<typeof getDiscoveryCategories>>,
  rawSlug?: string | null,
) {
  const slug = rawSlug?.trim().toLowerCase();
  if (!slug) return null;
  return parents.find((parent) => parent.slug === slug)?.id ?? null;
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const [params, parents] = await Promise.all([
    searchParams,
    getDiscoveryCategories(),
  ]);
  const expandSlug =
    (params.expand ?? params.cat ?? params.category)?.trim().toLowerCase() || null;
  const defaultExpandedId = resolveExpandedId(parents, expandSlug);

  return (
    <main className="categories-page market-categories">
      <header className="market-page-head categories-page-head shrink-0">
        <p className="text-[12px] text-muted">
          <Link href="/" className="text-primary hover:underline">
            Home
          </Link>
          <span className="mx-1.5 text-border">/</span>
          Categories
        </p>
        <h1 className="market-page-title mt-1">All categories</h1>
        <p className="market-page-sub max-w-xl">
          Explore products, property, jobs, and services near you.
        </p>
      </header>

      <CategoriesExplorer
        parents={parents}
        defaultExpandedId={defaultExpandedId}
        initialExpandSlug={expandSlug}
      />
    </main>
  );
}
