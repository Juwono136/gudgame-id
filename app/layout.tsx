import type { Metadata } from "next";
import { Geist_Mono, Lexend } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { brandAssets, siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { AppProviders } from "@/providers/app-providers";

/** App reads live DB/Redis data — do not prerender at `next build` (Docker has no database). */
export const dynamic = "force-dynamic";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: brandAssets.favicon, sizes: "any" },
      { url: brandAssets.logo, sizes: "128x128", type: "image/png" },
      { url: brandAssets.logo512, sizes: "512x512", type: "image/png" },
    ],
    shortcut: brandAssets.favicon,
    apple: [{ url: brandAssets.logo512, sizes: "512x512", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteConfig.shortName,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={cn("h-full", lexend.variable, geistMono.variable)}
    >
      <body className="flex min-h-full flex-col font-sans">
        <NextTopLoader
          color="#0047FF"
          height={3}
          showSpinner={false}
          shadow="0 0 12px rgba(0,71,255,0.45)"
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
