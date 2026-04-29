"use client";

import { usePathname } from "next/navigation";

import { CookieBanner } from "./cookie-banner";

/**
 * Affiche le bandeau cookies global. Le SiteHeader/Footer est ajouté
 * directement par les pages publiques (server component → header avec auth).
 *
 * Routes où on n'affiche RIEN (l'app gère son propre chrome) :
 *   /v/, /staff/, /regie/, /admin/  → ces routes ont leur propre layout
 *   /auth/login, /auth/callback     → pages stand-alone
 */
export function ConditionalChrome() {
  const pathname = usePathname() ?? "";
  const isAppRoute = /^\/(v|staff|regie|admin|auth)\b/.test(pathname);
  if (isAppRoute) return null;
  return <CookieBanner />;
}
