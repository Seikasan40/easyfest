import type { Metadata, Viewport } from "next";

import { CookieBanner } from "@/components/cookie-banner";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Easyfest — Le festival pro, sans le prix pro",
    template: "%s · Easyfest",
  },
  description:
    "Easyfest est l'outil de référence des organisateurs de festivals associatifs. Inscription bénévoles, planning, scan QR, bien-être, RGPD-clean.",
  metadataBase: new URL(process.env["NEXT_PUBLIC_APP_URL"] ?? "https://easyfest.app"),
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Easyfest",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF4E6" },
    { media: "(prefers-color-scheme: dark)", color: "#1F2233" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-brand-cream font-sans text-brand-ink antialiased">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
