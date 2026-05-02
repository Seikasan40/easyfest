import type { MetadataRoute } from "next";

const SITE_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://easyfest.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        // Tenant-scoped + auth pages : pas d'intérêt SEO + risque d'indexation de données privées
        disallow: [
          "/auth/",
          "/api/",
          "/hub",
          "/regie/",
          "/v/",
          "/staff/",
          "/poste/",
          "/admin/",
          "/onboarding/",
          "/account/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
