import type { MetadataRoute } from "next";
import { BRAND_NAME, TAGLINE } from "@/lib/constants/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description: TAGLINE,
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f7",
    theme_color: "#145c43",
  };
}
