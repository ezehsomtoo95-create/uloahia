import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "./marketplace-desktop.css";
import { AppShell } from "@/components/layout/app-shell";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { BRAND_NAME, DOMAIN, TAGLINE } from "@/lib/constants/brand";
import { localeInitScript } from "@/lib/i18n/locale";
import { themeInitScript } from "@/lib/theme/theme";

/**
 * Icon cache-buster, shared with app/manifest.ts.
 *
 * iOS pins a home-screen apple-touch-icon for weeks and offers no supported
 * way to force a re-fetch, so a changed URL is the only reliable lever. Bump
 * ICONS_V whenever the icon artwork is regenerated. Without it, a corrected
 * icon can ship and never appear on anyone's device.
 */
const ICONS_V = "2";

/** Appends the cache-busting version to a public icon path. */
function ic(path: string) {
  return `${path}?v=${ICONS_V}`;
}

const manrope = Manrope({
  variable: "--font-marketplace",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
  fallback: ["system-ui", "Segoe UI", "Roboto", "sans-serif"],
});

const APP_URL = `https://${DOMAIN}`;

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: BRAND_NAME,
    template: `%s | ${BRAND_NAME}`,
  },
  description: TAGLINE,
  applicationName: BRAND_NAME,
  // Served by app/manifest.ts. The static public/manifest.json that used to
  // shadow this was removed: two manifests drift, and only one of them is
  // type-checked against MetadataRoute.Manifest.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: BRAND_NAME,
    startupImage: [
      {
        url: ic("/icons/apple-splash-1290x2796.png"),
        media:
          "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: ic("/icons/apple-splash-1179x2556.png"),
        media:
          "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: ic("/icons/apple-splash-1170x2532.png"),
        media:
          "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: ic("/icons/apple-splash-1284x2778.png"),
        media:
          "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: ic("/icons/apple-splash-1125x2436.png"),
        media:
          "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: ic("/icons/apple-splash-1242x2688.png"),
        media:
          "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: ic("/icons/apple-splash-828x1792.png"),
        media:
          "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: ic("/icons/apple-splash-750x1334.png"),
        media:
          "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: ic("/icons/apple-splash-2048x2732.png"),
        media:
          "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: ic("/icons/apple-splash-1668x2388.png"),
        media:
          "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: ic("/icons/apple-splash-1640x2360.png"),
        media:
          "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: ic("/icons/apple-splash-1536x2048.png"),
        media:
          "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: ic("/favicon-32x32.png"), sizes: "32x32", type: "image/png" },
      { url: ic("/favicon-16x16.png"), sizes: "16x16", type: "image/png" },
      { url: ic("/icons/icon-192x192.png"), sizes: "192x192", type: "image/png" },
      { url: ic("/icons/icon-512x512.png"), sizes: "512x512", type: "image/png" },
      { url: ic("/icon.png"), sizes: "any", type: "image/png" },
    ],
    apple: [
      { url: ic("/apple-touch-icon.png"), sizes: "180x180", type: "image/png" },
      {
        url: ic("/icons/apple-touch-icon-152x152.png"),
        sizes: "152x152",
        type: "image/png",
      },
      {
        url: ic("/icons/apple-touch-icon-167x167.png"),
        sizes: "167x167",
        type: "image/png",
      },
      {
        url: ic("/icons/apple-touch-icon-180x180.png"),
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: [{ url: ic("/icons/icon-192x192.png"), type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "impact-site-verification": "521bb672-eb40-4315-8d94-c3c74c33e5ad",
  },
  openGraph: {
    title: BRAND_NAME,
    description: TAGLINE,
    url: APP_URL,
    siteName: BRAND_NAME,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: BRAND_NAME,
    description: TAGLINE,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#145c43" },
    { media: "(prefers-color-scheme: dark)", color: "#053f30" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} font-sans antialiased`}>
        <Script
          id="ahiaulo-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <Script
          id="ahiaulo-locale-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: localeInitScript }}
        />
        <ScrollToTop />
        <LocaleProvider>
          <AppShell>{children}</AppShell>
        </LocaleProvider>
      </body>
    </html>
  );
}
