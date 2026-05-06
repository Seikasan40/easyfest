import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";

import { CookieBanner } from "@/components/cookie-banner";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

// Police display : Playfair Display — serif haute-contraste éditoriale.
// Utilisée pour tous les titres (font-display dans Tailwind).
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-serif", // conserve la même CSS var pour compat Tailwind
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Easyfest — Le festival pro, sans le prix pro",
    template: "%s · Easyfest",
  },
  description:
    "L'app de référence des organisateurs de festivals associatifs. Bénévoles, planning, sponsors, sécurité, RGPD — hébergé en France.",
  metadataBase: new URL(process.env["NEXT_PUBLIC_APP_URL"] ?? "https://easyfest.app"),
  applicationName: "Easyfest",
  authors: [{ name: "Easyfest", url: "https://easyfest.app" }],
  keywords: [
    "logiciel festival",
    "gestion bénévoles",
    "association culturelle",
    "planning festival",
    "billetterie association",
    "RGPD festival",
    "alternative Weezevent",
    "scan QR bénévole",
  ],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/logos-v4-fmono/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: [
      {
        url: "/brand/logos-v4-fmono/app-icon.svg",
        sizes: "180x180",
        type: "image/svg+xml",
      },
    ],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Easyfest",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Easyfest",
    title: "Easyfest — Le festival pro, sans le prix pro",
    description:
      "Une seule app pour gérer ton festival : bénévoles, planning, sponsors, conventions, sécurité. Hébergé en EU, 100% RGPD.",
    url: "https://easyfest.app",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Easyfest — Le festival pro, sans le prix pro",
        type: "image/svg+xml",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Easyfest — Le festival pro, sans le prix pro",
    description:
      "Une seule app pour gérer ton festival : bénévoles, planning, sponsors, conventions, sécurité.",
    images: ["/og-image.svg"],
    creator: "@easyfest_app",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Maximum-scale et user-scalable laissés par défaut (NE PAS désactiver le zoom :
  // accessibilité WCAG SC 1.4.4 + 1.4.10).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FF5E5B" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1A1A" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfairDisplay.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Easyfest",
              description:
                "SaaS multi-tenant pour organisateurs de festivals associatifs. Gestion bénévoles, planning, sponsors, conventions, sécurité.",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web, iOS, Android",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "EUR",
                priceSpecification: {
                  "@type": "PriceSpecification",
                  description: "Free pour 50 bénévoles. Crew dès 29€/mois.",
                },
              },
              creator: {
                "@type": "Organization",
                name: "Easyfest",
                url: "https://easyfest.app",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-easyfest-cream font-sans text-easyfest-ink antialiased">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
