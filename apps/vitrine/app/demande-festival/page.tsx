import type { Metadata } from "next";

import { SiteFooter, SiteHeader } from "@/components/site-header";

import { FestivalRequestForm } from "./FestivalRequestForm";

export const metadata: Metadata = {
  title: "Lancer mon festival sur Easyfest",
  description:
    "Crée ton festival en 5 minutes : organisation, dates, équipe et inscription bénévoles. Sans compte préalable, gratuit jusqu'à 50 bénévoles.",
  alternates: { canonical: "https://easyfest.app/demande-festival" },
  openGraph: {
    title: "Lancer mon festival sur Easyfest",
    description:
      "Crée ton festival en 5 minutes. Bénévoles, billetterie, planning, sécurité — tout depuis ton téléphone.",
    url: "https://easyfest.app/demande-festival",
    type: "website",
  },
  robots: { index: true, follow: true },
};

// Page publique no-auth, indexable
export const dynamic = "force-static";
export const revalidate = 3600;

export default function DemandeFestivalPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-cream">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-3xl px-4 pt-8 sm:pt-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-coral">
            5 minutes — sans compte
          </p>
          <h1 className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">
            Lance ton festival sur Easyfest
          </h1>
          <p className="mt-3 max-w-2xl text-base text-brand-ink/70 sm:text-lg">
            Décris ton orga, ton festival et tes besoins. On te crée ton espace direction et ta page publique
            d&apos;inscription bénévoles. Tu reçois un mail magique pour valider, c&apos;est tout.
          </p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            <Bullet>Pas besoin de créer un compte d&apos;abord</Bullet>
            <Bullet>Aucune carte bancaire requise</Bullet>
            <Bullet>Pas de migration : on importe ton planning Excel après</Bullet>
            <Bullet>Tu peux supprimer en 1 clic à tout moment (RGPD Art. 17)</Bullet>
          </ul>
        </section>

        <section className="mx-auto mt-8 w-full max-w-3xl px-4 pb-12 sm:mt-12 sm:pb-20">
          <div className="rounded-3xl border border-brand-ink/10 bg-white p-5 shadow-sm sm:p-8">
            <FestivalRequestForm />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-brand-ink/80">
      <span aria-hidden className="mt-0.5 text-brand-pine">✓</span>
      <span>{children}</span>
    </li>
  );
}
