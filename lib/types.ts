export type ListingStatus = "pending" | "approved" | "rejected" | "sold";

export type ListingCondition =
  | "New"
  | "Like new"
  | "Good"
  | "Fair"
  | "Needs repair";

/** @deprecated Prefer Category.slug from DB catalog */
export type ListingCategorySlug = string;

export type Country = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type State = {
  id: string;
  countryId: string;
  slug: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type City = {
  id: string;
  stateId: string;
  slug: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type Area = {
  id: string;
  cityId: string;
  slug: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type LocationTreeState = State & {
  cities: Array<City & { areas: Area[] }>;
};

export type Category = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  icon: string | null;
  isFeatured: boolean;
  sortOrder: number;
  isActive: boolean;
  showCondition: boolean;
};

export type CategoryTreeNode = Category & {
  children: CategoryTreeNode[];
};

/** Parent/child category node with rolled-up listing counts (discovery catalog). */
export type CategoryWithCount = Category & {
  listingCount: number;
  children: CategoryWithCount[];
};

export type CategoryAttributeField = {
  id: string;
  categoryId: string;
  fieldKey: string;
  label: string;
  fieldType: "text" | "number" | "select" | "boolean";
  options: string[];
  required: boolean;
  sortOrder: number;
  isActive: boolean;
};

export type ListingAttributes = Record<string, string | number | boolean | null>;

export type Listing = {
  id: string;
  sellerId?: string;
  title: string;
  price: number;
  category: string;
  categoryId?: string | null;
  categoryName?: string;
  attributes?: ListingAttributes;
  countryId?: string | null;
  stateId?: string | null;
  cityId?: string | null;
  areaId?: string | null;
  country?: string | null;
  state: string;
  city: string;
  area: string;
  condition: ListingCondition | string;
  description: string;
  status: ListingStatus;
  views: number;
  verified: boolean;
  isFeatured?: boolean;
  createdAt: string;
  createdAtMs?: number;
  images: string[];
  imageTone?: string;
  imageUrl?: string | null;
  sellerName?: string;
  sellerAvatarUrl?: string | null;
  sellerJoinedAt?: string;
  sellerVerified?: boolean;
  responseTime?: string;
  soldItemsCount?: number;
  sellerPhone?: string | null;
};
