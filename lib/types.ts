export type ListingStatus = "pending" | "approved" | "rejected" | "sold";

export type ListingCondition =
  | "New"
  | "Like new"
  | "Good"
  | "Fair"
  | "Needs repair";

import type { ListingCategorySlug } from "@/lib/constants/categories";

export type { ListingCategorySlug } from "@/lib/constants/categories";

export type EasternState = "Anambra" | "Enugu" | "Imo" | "Abia" | "Ebonyi";

export type Listing = {
  id: string;
  sellerId?: string;
  title: string;
  price: number;
  category: ListingCategorySlug | string;
  state: EasternState | string;
  city: string;
  area: string;
  condition: ListingCondition | string;
  description: string;
  status: ListingStatus;
  views: number;
  verified: boolean;
  createdAt: string;
  createdAtMs?: number;
  images: string[];
  imageTone?: string;
  imageUrl?: string | null;
  sellerName?: string;
  sellerJoinedAt?: string;
  sellerVerified?: boolean;
  responseTime?: string;
  soldItemsCount?: number;
  sellerPhone?: string | null;
};
