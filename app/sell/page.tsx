import dynamic from "next/dynamic";
import {
  getActiveCategoryTree,
  getAllAttributeSchemas,
} from "@/lib/data/categories";
import {
  getActiveLocationTree,
  getDefaultSellLocation,
} from "@/lib/data/locations";
import { BRAND_NAME } from "@/lib/constants/brand";

const SellPageClient = dynamic(
  () =>
    import("@/components/sell/sell-page-client").then((mod) => mod.SellPageClient),
  {
    loading: () => (
      <main className="sell-studio px-1 pb-8 pt-3">
        <div className="h-6 w-40 skeleton rounded" />
        <div className="mt-4 h-40 w-full skeleton rounded-[14px]" />
        <div className="mt-3 h-24 w-full skeleton rounded-[14px]" />
      </main>
    ),
  },
);

export const metadata = {
  title: "Sell on AhiaUlo",
  description: `Create a listing on ${BRAND_NAME}. Post your items for free and reach buyers in your area.`,
  keywords: ["sell", "list item", "post listing", "marketplace", "Nigeria"],
  alternates: {
    canonical: "/sell",
  },
};

export default async function SellPage() {
  const [categoryTree, attributeSchemas, locationTree, defaultLocation] =
    await Promise.all([
      getActiveCategoryTree(),
      getAllAttributeSchemas(),
      getActiveLocationTree(),
      getDefaultSellLocation(),
    ]);

  return (
    <SellPageClient
      categoryTree={categoryTree}
      attributeSchemas={attributeSchemas}
      locationTree={locationTree}
      defaultLocation={defaultLocation}
    />
  );
}
