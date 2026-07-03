import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./marketplace-desktop.css";
import { AppShell } from "@/components/layout/app-shell";
import { BRAND_NAME, DOMAIN, TAGLINE } from "@/lib/constants/brand";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(`https://${DOMAIN}`),
  title: {
    default: BRAND_NAME,
    template: `%s | ${BRAND_NAME}`,
  },
  description: TAGLINE,
  applicationName: BRAND_NAME,
  openGraph: {
    title: BRAND_NAME,
    description: TAGLINE,
    url: `https://${DOMAIN}`,
    siteName: BRAND_NAME,
    type: "website",
  },
  twitter: {
    title: BRAND_NAME,
    description: TAGLINE,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FAF9F7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
