/**
 * Visual assets for marketplace category discovery.
 * Each parent category must map to a unique local image.
 */
export const CATEGORY_IMAGE_BY_SLUG: Record<string, string> = {
  vehicles: "/categories/vehicles.png",
  cars: "/categories/vehicles.png",
  property: "/categories/property.png",
  "houses-for-sale": "/categories/property.png",
  "houses-for-rent": "/categories/property.png",
  "phones-tablets": "/categories/phones-tablets.png",
  smartphones: "/categories/phones-tablets.png",
  /** Computers = desktop workstation; Electronics = camera/gadgets (not laptops) */
  computers: "/categories/computers-v2.png",
  laptops: "/categories/electronics-v3.png",
  electronics: "/categories/electronics-v4.png",
  fashion: "/categories/fashion.png",
  "fashion-beauty": "/categories/fashion.png",
  "beauty-health": "/categories/beauty-health.png",
  "babies-kids": "/categories/babies-kids.png",
  pets: "/categories/pets.png",
  agriculture: "/categories/agriculture.png",
  "tools-equipment": "/categories/tools-equipment.png",
  "industrial-equipment": "/categories/industrial-equipment.png",
  "sports-outdoors": "/categories/sports-outdoors.png",
  "musical-instruments": "/categories/musical-instruments.png",
  "books-education": "/categories/books-education.png",
  "hobbies-collectibles": "/categories/hobbies-collectibles.png",
  "food-catering": "/categories/food-catering.png",
  "home-furniture": "/categories/home-furniture.png",
  furniture: "/categories/furniture.png",
  "kitchen-appliances": "/categories/kitchen-appliances.png",
  "home-kitchen": "/categories/home-kitchen.png",
  kitchen: "/categories/kitchen-appliances.png",
  "tv-audio": "/categories/tv-audio-v3.png",
  gaming: "/categories/gaming-v3.png",
  jobs: "/categories/jobs-v3.png",
  services: "/categories/services-v3.png",
};

/** Premium product collage hero — no lifestyle people. */
export const MARKETPLACE_HERO_IMAGE = "/marketplace/hero-marketplace-v2.jpg";

export function getCategoryImage(slug: string | null | undefined, icon?: string | null) {
  if (!slug && !icon) {
    return null;
  }

  if (slug && CATEGORY_IMAGE_BY_SLUG[slug]) {
    return CATEGORY_IMAGE_BY_SLUG[slug];
  }

  const key = (slug || icon || "").toLowerCase();
  for (const [mapped, src] of Object.entries(CATEGORY_IMAGE_BY_SLUG)) {
    if (key.includes(mapped) || mapped.includes(key)) {
      return src;
    }
  }

  if (key.includes("phone") || key.includes("tablet")) return CATEGORY_IMAGE_BY_SLUG["phones-tablets"];
  if (key.includes("car") || key.includes("vehicle") || key.includes("bike")) {
    return CATEGORY_IMAGE_BY_SLUG.vehicles;
  }
  if (key.includes("house") || key.includes("property") || key.includes("land") || key.includes("home")) {
    return CATEGORY_IMAGE_BY_SLUG.property;
  }
  if (key.includes("fashion") || key.includes("cloth") || key.includes("shoe")) {
    return CATEGORY_IMAGE_BY_SLUG.fashion;
  }
  if (key.includes("beauty") || key.includes("health") || key.includes("cosmetic")) {
    return CATEGORY_IMAGE_BY_SLUG["beauty-health"];
  }
  if (key.includes("baby") || key.includes("kid") || key.includes("child")) {
    return CATEGORY_IMAGE_BY_SLUG["babies-kids"];
  }
  if (key.includes("pet") || key.includes("dog") || key.includes("cat")) {
    return CATEGORY_IMAGE_BY_SLUG.pets;
  }
  if (key.includes("farm") || key.includes("agric") || key.includes("crop")) {
    return CATEGORY_IMAGE_BY_SLUG.agriculture;
  }
  if (key.includes("tool") || key.includes("equipment")) {
    return CATEGORY_IMAGE_BY_SLUG["tools-equipment"];
  }
  if (key.includes("sport") || key.includes("fitness")) {
    return CATEGORY_IMAGE_BY_SLUG["sports-outdoors"];
  }
  if (key.includes("music") || key.includes("guitar") || key.includes("instrument")) {
    return CATEGORY_IMAGE_BY_SLUG["musical-instruments"];
  }
  if (key.includes("book") || key.includes("educat") || key.includes("school")) {
    return CATEGORY_IMAGE_BY_SLUG["books-education"];
  }
  if (key.includes("food") || key.includes("cater")) {
    return CATEGORY_IMAGE_BY_SLUG["food-catering"];
  }
  if (key.includes("kitchen") || key.includes("appliance")) {
    return CATEGORY_IMAGE_BY_SLUG["kitchen-appliances"];
  }
  if (key.includes("sofa") || key.includes("furniture")) return CATEGORY_IMAGE_BY_SLUG.furniture;
  if (key.includes("job") || key.includes("briefcase")) return CATEGORY_IMAGE_BY_SLUG.jobs;
  if (key.includes("service") || key.includes("repair")) return CATEGORY_IMAGE_BY_SLUG.services;
  if (key.includes("laptop")) return CATEGORY_IMAGE_BY_SLUG.laptops;
  if (key.includes("computer") || key.includes("desktop") || key.includes("monitor")) {
    return CATEGORY_IMAGE_BY_SLUG.computers;
  }
  if (key.includes("game") || key.includes("console")) return CATEGORY_IMAGE_BY_SLUG.gaming;
  if (key.includes("tv") || key.includes("audio") || key.includes("headphone")) {
    return CATEGORY_IMAGE_BY_SLUG["tv-audio"];
  }
  if (key.includes("camera") || key.includes("gadget") || key.includes("electron")) {
    return CATEGORY_IMAGE_BY_SLUG.electronics;
  }

  return null;
}
