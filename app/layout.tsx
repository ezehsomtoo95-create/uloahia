import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "./marketplace-desktop.css";
import { AppShell } from "@/components/layout/app-shell";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { BRAND_NAME, DOMAIN, TAGLINE } from "@/lib/constants/brand";
import { themeInitScript } from "@/lib/theme/theme";

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Script
          id="ahiaulo-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <ScrollToTop />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );}
