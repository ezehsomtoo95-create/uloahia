import type { ListingCondition, ListingStatus } from "@/lib/types";

export const LISTING_CONDITIONS: ListingCondition[] = [
  "New",
  "Like new",
  "Good",
  "Fair",
  "Needs repair",
];

export const LISTING_STATUSES: ListingStatus[] = [
  "pending",
  "approved",
  "rejected",
  "sold",
];

export const TRUST_INDICATORS = {
  verifiedListing: "Verified listing",
  views: "Views",
  postedTime: "Posted",
  condition: "Condition",
} as const;

export const SELL_FLOW_STEPS = [
  {
    id: "photos",
    label: "Photos",
    helper: "Upload up to 7 clear photos first.",
  },
  {
    id: "details",
    label: "Details",
    helper: "Add title, price, category, condition, and description.",
  },
  {
    id: "location",
    label: "Location",
    helper: "Select state, city, and area from fixed options.",
  },
  {
    id: "preview",
    label: "Preview",
    helper: "Review and submit for moderation.",
  },
] as const;
