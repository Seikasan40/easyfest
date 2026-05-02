import type { MetadataRoute } from "next";

import { createServerClient } from "@/lib/supabase/server";

const SITE_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://easyfest.app";

/**
 * Sitemap dynamique Easyfest.
 * - Routes statiques marketing
 * - Toutes les organizations publiques (avec au moins 1 event open)
 * - Tous les events publics open
 * - Toutes les pages d'inscription des events open
 *
 * Servi en cache pendant 1h (force-static + revalidate). Cohérent avec le RGPD-clean :
 * pas de PII exposé, juste des slugs publics.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/demande-festival`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/legal/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/auth/login`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  // Routes dynamiques : orgs et events publics
  const dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    const supabase = createServerClient();

    // Orgs avec au moins 1 event open (RLS publique anon — voir migration 20260502000006)
    const { data: orgs } = await supabase
      .from("organizations")
      .select("slug, updated_at, events!inner(slug, status, updated_at)")
      .eq("events.status", "open");

    for (const org of (orgs ?? []) as any[]) {
      dynamicRoutes.push({
        url: `${SITE_URL}/${org.slug}`,
        lastModified: org.updated_at ? new Date(org.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.8,
      });

      for (const ev of org.events ?? []) {
        if (ev.status !== "open") continue;
        const evMod = ev.updated_at ? new Date(ev.updated_at) : now;
        dynamicRoutes.push({
          url: `${SITE_URL}/${org.slug}/${ev.slug}`,
          lastModified: evMod,
          changeFrequency: "daily",
          priority: 0.95,
        });
        dynamicRoutes.push({
          url: `${SITE_URL}/${org.slug}/${ev.slug}/inscription`,
          lastModified: evMod,
          changeFrequency: "daily",
          priority: 0.9,
        });
      }
    }
  } catch (e) {
    // En cas d'erreur DB on ne casse pas le sitemap, on retourne juste les routes statiques.
    console.error("[sitemap] dynamic routes error:", e);
  }

  return [...staticRoutes, ...dynamicRoutes];
}
