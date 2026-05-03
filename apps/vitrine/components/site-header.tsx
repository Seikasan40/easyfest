import Link from "next/link";

import { Logo } from "@/components/Logo";
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
    <header
      className="sticky top-0 z-40 border-b border-brand-ink/10 bg-brand-cream/80 backdrop-blur-md"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Easyfest, accueil"
          className="inline-flex min-h-[44px] items-center transition hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-easyfest-coral"
        >
          <Logo variant="horizontal" size={36} priority />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/icmpaca"
            className="inline-flex min-h-[44px] items-center rounded-lg px-3 py-3 text-sm font-medium text-brand-ink/70 transition hover:bg-brand-ink/5 hover:text-brand-ink"
          >
            Festivals
          </Link>
          <Link
            href="/legal/privacy"
            className="inline-flex min-h-[44px] items-center rounded-lg px-3 py-3 text-sm font-medium text-brand-ink/70 transition hover:bg-brand-ink/5 hover:text-brand-ink"
          >
            Confidentialité
          </Link>
        </nav>

        {isLogged ? (
          <div className="flex items-center gap-2">
            <Link
              href="/hub"
              className="inline-flex min-h-[44px] items-center rounded-xl bg-brand-ink px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Mon espace
            </Link>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center rounded-xl border border-brand-ink/15 px-3 py-2 text-sm font-medium text-brand-ink/70 transition hover:bg-brand-ink/5"
              >
                Quitter
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/auth/login"
            className="inline-flex min-h-[44px] items-center rounded-xl bg-brand-coral px-4 py-2 text-sm font-medium text-white shadow-soft transition hover:opacity-90"
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
            <Logo variant="horizontal" size={32} />
            <p className="mt-3 text-sm text-brand-ink/60">
              Le festival pro, sans le prix pro. SaaS multi-tenant pour festivals associatifs.
            </p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-tagline text-easyfest-pine">
              Hébergé en France · RGPD-clean
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-brand-ink/50">
              Navigation
            </h3>
            <ul className="mt-3 space-y-1 text-sm">
              <li>
                <Link
                  href="/"
                  className="inline-flex min-h-[44px] items-center py-3 text-brand-ink/70 hover:text-brand-coral"
                >
                  Accueil
                </Link>
              </li>
              <li>
                <Link
                  href="/icmpaca"
                  className="inline-flex min-h-[44px] items-center py-3 text-brand-ink/70 hover:text-brand-coral"
                >
                  Festivals partenaires
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/login"
                  className="inline-flex min-h-[44px] items-center py-3 text-brand-ink/70 hover:text-brand-coral"
                >
                  Connexion
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-brand-ink/50">
              Légal & sécurité
            </h3>
            <ul className="mt-3 space-y-1 text-sm">
              <li>
                <Link
                  href="/legal/privacy"
                  className="inline-flex min-h-[44px] items-center py-3 text-brand-ink/70 hover:text-brand-coral"
                >
                  Politique de confidentialité
                </Link>
              </li>
              <li className="py-1 text-brand-ink/60">
                DPA Supabase EU signé · 29 avril 2026
              </li>
              <li className="py-1 text-brand-ink/60">RGPD-clean · Données EU only</li>
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
