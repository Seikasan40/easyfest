import Link from "next/link";

import { createServerClient } from "@/lib/supabase/server";

/**
 * Header global — affichage navigation + bouton login/hub selon état auth.
 * Utilisé sur les pages publiques (vitrine + form). Caché sur /v/, /staff/, /regie/, /admin/.
 */
export async function SiteHeader() {
  const supabase = createServerClient();
  const { data } = await supabase.auth.getUser();
  const isLogged = !!data.user;

  return (
    <header className="sticky top-0 z-40 border-b border-brand-ink/10 bg-brand-cream/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 transition hover:opacity-80">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-coral text-lg font-bold text-white shadow-soft"
          >
            E
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-brand-ink">
            Easyfest
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/icmpaca"
            className="rounded-lg px-3 py-2 text-sm font-medium text-brand-ink/70 transition hover:bg-brand-ink/5 hover:text-brand-ink"
          >
            Festivals
          </Link>
          <Link
            href="/legal/privacy"
            className="rounded-lg px-3 py-2 text-sm font-medium text-brand-ink/70 transition hover:bg-brand-ink/5 hover:text-brand-ink"
          >
            Confidentialité
          </Link>
        </nav>

        {isLogged ? (
          <div className="flex items-center gap-2">
            <Link
              href="/hub"
              className="rounded-xl bg-brand-ink px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Mon espace
            </Link>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-xl border border-brand-ink/15 px-3 py-2 text-sm font-medium text-brand-ink/70 transition hover:bg-brand-ink/5"
              >
                Quitter
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/auth/login"
            className="rounded-xl bg-brand-coral px-4 py-2 text-sm font-medium text-white shadow-soft transition hover:opacity-90"
          >
            Connexion
          </Link>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-brand-ink/10 bg-brand-cream/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-coral text-sm font-bold text-white"
              >
                E
              </span>
              <span className="font-display text-lg font-bold">Easyfest</span>
            </div>
            <p className="mt-3 text-sm text-brand-ink/60">
              Le festival pro, sans le prix pro. SaaS multi-tenant pour festivals associatifs.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-brand-ink/50">
              Navigation
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/" className="text-brand-ink/70 hover:text-brand-coral">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/icmpaca" className="text-brand-ink/70 hover:text-brand-coral">
                  Festivals partenaires
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="text-brand-ink/70 hover:text-brand-coral">
                  Connexion
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-brand-ink/50">
              Légal & sécurité
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/legal/privacy" className="text-brand-ink/70 hover:text-brand-coral">
                  Politique de confidentialité
                </Link>
              </li>
              <li className="text-brand-ink/60">
                DPA Supabase EU signé · 29 avril 2026
              </li>
              <li className="text-brand-ink/60">RGPD-clean · Données EU only</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-brand-ink/10 pt-6 text-xs text-brand-ink/50 sm:flex-row">
          <p>© 2026 Easyfest. Tous droits réservés.</p>
          <p>Built with ❤️ for festival organizers.</p>
        </div>
      </div>
    </footer>
  );
}
