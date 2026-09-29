import type { MetadataRoute } from "next";
import { BRAND_NAME, TAGLINE } from "@/lib/constants/brand";

/**
 * App Router web app manifest, served at /manifest.webmanifest.
 *
 * Single source of truth. A static public/manifest.json used to sit alongside
 * this and was the one layout.tsx actually pointed at, so the two drifted
 * silently; that file has been removed.
 *
 * ICONS_V is a cache-buster. iOS in particular keeps a stale apple-touch-icon
 * on the home screen for weeks and there is no supported way to force a
 * re-fetch, so the only reliable lever is a changed URL. Bump this when the
 * icon artwork changes.
 */

/** Bump whenever icons/splashes are regenerated. */
const ICONS_V = "2";

const icon = (path: string) => `${path}?v=${ICONS_V}`;

/** Matches `--background: #faf7f0` in globals.css, so the splash is not a black box. */
const BACKGROUND_COLOR = "#FAF7F0";

/** Matches `--primary: #145c43`. */
const THEME_COLOR = "#145C43";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description: TAGLINE,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    categories: ["shopping", "lifestyle"],
    lang: "en",
    dir: "ltr",
    icons: [
      {
        src: icon("/icons/icon-192x192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: icon("/icons/icon-512x512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: icon("/icons/icon-maskable-192x192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: icon("/icons/icon-maskable-512x512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: icon("/apple-touch-icon.png"),
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
