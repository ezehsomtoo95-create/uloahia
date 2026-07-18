import { getCategoryImage } from "@/lib/constants/category-imagery";

/** UI copy for dedicated category marketplaces (categories have no DB description). */
export const CATEGORY_MARKETPLACE_COPY: Record<
  string,
  { eyebrow: string; description: string }
> = {
  vehicles: {
    eyebrow: "Vehicles marketplace",
    description: "Cars, buses, motorcycles, and spare parts from sellers across Nigeria.",
  },
  property: {
    eyebrow: "Property marketplace",
    description: "Houses, land, and rentals — buy or rent with filters that match how you search.",
  },
  "phones-tablets": {
    eyebrow: "Phones & tablets",
    description: "Smartphones and tablets by brand, storage, and condition.",
  },
  "home-furniture": {
    eyebrow: "Home & furniture",
    description: "Sofas, beds, tables, and home essentials for every room.",
  },
  "kitchen-appliances": {
    eyebrow: "Kitchen & appliances",
    description: "Cookware, fridges, and appliances for your kitchen.",
  },
  fashion: {
    eyebrow: "Fashion marketplace",
    description: "Clothing, shoes, and bags for men, women, and kids.",
  },
  jobs: {
    eyebrow: "Jobs marketplace",
    description: "Full-time, part-time, remote, and internship roles near you.",
  },
  services: {
    eyebrow: "Services marketplace",
    description: "Skilled technicians, artisans, and service pros ready to work.",
  },
  computers: {
    eyebrow: "Computers marketplace",
    description: "Laptops, desktops, and accessories for work and school.",
  },
  electronics: {
    eyebrow: "Electronics marketplace",
    description: "Gadgets, accessories, and consumer electronics.",
  },
  "tv-audio": {
    eyebrow: "TV & audio",
    description: "Televisions, speakers, and home entertainment gear.",
  },
  gaming: {
    eyebrow: "Gaming marketplace",
    description: "Consoles, controllers, and games from trusted sellers.",
  },
  "beauty-health": {
    eyebrow: "Beauty & health",
    description: "Cosmetics, skincare, and wellness products.",
  },
  "babies-kids": {
    eyebrow: "Babies & kids",
    description: "Baby gear, toys, and kids’ essentials.",
  },
  pets: {
    eyebrow: "Pets marketplace",
    description: "Pets, pet food, and accessories.",
  },
  agriculture: {
    eyebrow: "Agriculture marketplace",
    description: "Produce, farm tools, and agricultural equipment.",
  },
  "sports-outdoors": {
    eyebrow: "Sports & outdoors",
    description: "Fitness gear, football kits, and outdoor equipment.",
  },
  "industrial-equipment": {
    eyebrow: "Commercial equipment",
    description: "Industrial machines, tools, and commercial gear.",
  },
  "tools-equipment": {
    eyebrow: "Tools & equipment",
    description: "Hand tools, power tools, and workshop equipment.",
  },
};

export function getCategoryMarketplaceCopy(slug: string, name: string) {
  const entry = CATEGORY_MARKETPLACE_COPY[slug];
  return {
    eyebrow: entry?.eyebrow ?? `${name} marketplace`,
    description:
      entry?.description ?? `Browse ${name} listings from sellers across Nigeria.`,
    bannerImage: getCategoryImage(slug),
  };
}

export const CATEGORY_PAGE_SIZE = 24;
