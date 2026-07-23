import Image from "next/image";
import Link from "next/link";
import { categoryOverviewHref } from "@/lib/categories/discovery";
import { getCategoryImage } from "@/lib/constants/category-imagery";
import { cn } from "@/lib/utils/cn";

export type CategoryCoverItem = {
  slug: string;
  name: string;
  icon?: string | null;
  listingCount?: number;
};

/**
 * Compact square category tiles — product photo first, label second.
 * Soft tinted face + inset image for instant recognition (marketplace grid).
 */
export function CategoryCoverGrid({
  categories,
  className,
}: {
  categories: CategoryCoverItem[];
  className?: string;
}) {
  return (
    <div className={cn("category-cover-grid", className)}>
      {categories.map((category) => {
        const image = getCategoryImage(category.slug, category.icon);
        return (
          <Link
            key={category.slug}
            href={categoryOverviewHref(category.slug)}
            className="category-cover"
            aria-label={category.name}
          >
            <span className="category-cover-face">
              <span className="category-cover-photo">
                {image ? (
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 28vw, (max-width: 1024px) 14vw, 120px"
                    loading="lazy"
                    decoding="async"
                    className="category-cover-img"
                    unoptimized
                  />
                ) : (
                  <span className="category-cover-fallback">
                    {category.name.slice(0, 1)}
                  </span>
                )}
              </span>
            </span>
            <span className="category-cover-name">{category.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
