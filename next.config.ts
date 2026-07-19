import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy
 * - Development: allow 'unsafe-eval' so React / Turbopack debugging & HMR work.
 * - Production: keep a strict script-src without 'unsafe-eval'.
 * - worker-src: required for the PWA service worker.
 */
function buildContentSecurityPolicy() {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:"
    : "script-src 'self' 'unsafe-inline' https:";

  // Turbopack / Next HMR uses websocket upgrades in local development.
  const connectSrc = isDev
    ? "connect-src 'self' https: wss: ws: http://localhost:* http://127.0.0.1:*"
    : "connect-src 'self' https: wss:";

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    connectSrc,
    "frame-src 'self' https:",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    // upgrade-insecure-requests breaks local http://localhost in some browsers
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const withPWA = withPWAInit({
  dest: "public",
  disable: isDev,
  register: true,
  cacheOnFrontEndNav: true,
  // Avoid serving stale authenticated HTML after client navigations.
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  fallbacks: {
    document: "/~offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
    // Keep default Workbox strategies (static assets CacheFirst, etc.)
    // and extend with image / font caching for faster loads.
    extendDefaultRuntimeCaching: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: {
            maxEntries: 16,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          },
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp|avif)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-images",
          expiration: {
            maxEntries: 128,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
        },
      },
      {
        urlPattern: /\.(?:js|css|woff2?)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-assets",
          expiration: {
            maxEntries: 96,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          },
        },
      },
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "supabase-storage",
          expiration: {
            maxEntries: 96,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  // Silence Next 16 webpack/turbopack dual-config warning from next-pwa.
  turbopack: {},
  // Keep the Next.js "N" badge off the bottom-left (over the sidebar).
  devIndicators: {
    position: "bottom-right",
  },
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [384, 640, 750, 828, 1080],
    imageSizes: [32, 48, 64, 96, 120, 200, 240, 400],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
      {
        source: "/icons/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
