import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: "🎟️", title: "Inscription en 5 min", description: "Formulaire bénévole en 5 étapes claires. Validation par l'équipe, magic-link envoyé. Zéro Excel." },
  { icon: "📷", title: "QR + scan terrain", description: "QR code signé HMAC pour chaque bénévole. 3 modes scan : arrivée, repas, prise de poste. Anti-fraude." },
  { icon: "🎛️", title: "Régie temps réel", description: "Dashboard live, planning drag&drop, broadcasts ciblés, modération chat. Le bus de pilotage." },
  { icon: "💚", title: "Safer Space dédié", description: "Self-report bien-être, bouton alerte grave, médiateur·ices désigné·es. RGPD-clean." },
  { icon: "🇪🇺", title: "Hébergé en France", description: "Données stockées en EU (Paris). DPA Supabase signé. RLS Postgres sur toutes les tables." },
  { icon: "💰", title: "Pricing par édition", description: "Pas d'abonnement à l'année. Free pour 50 bénévoles. À partir de 49 €/édition." },
];

const COMPARISON: Array<[string, string]> = [
  ["✅ 1 outil unique", "❌ 5+ outils dispersés"],
  ["✅ Bénévoles-first (mobile)", "❌ Conçu pour les gros festivals"],
  ["✅ Moins de 200€/édition", "❌ Pourcentage billetterie + per user"],
  ["✅ PWA + APK Android", "❌ Web only ou app payante"],
  ["✅ Safer Space natif", "❌ Pas géré"],
  ["✅ RGPD by design EU", "❌ Conformité à reconstituer"],
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-cream via-brand-cream to-brand-sand/40" aria-hidden />
        <div className="absolute right-0 top-0 -z-10 h-96 w-96 rounded-full bg-brand-coral/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-20 -z-10 h-96 w-96 rounded-full bg-brand-amber/10 blur-3xl" aria-hidden />

        <div className="mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:py-32">
          <div className="flex flex-col items-center text-center">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-coral/30 bg-brand-coral/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-coral">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-coral" />
              Field Test 0.0.1 · live
            </span>
            <h1 className="text-balance font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              Le festival pro,
              <br />
              <span className="bg-gradient-to-r from-brand-coral via-brand-coral to-brand-amber bg-clip-text text-transparent">
                sans le prix pro.
              </span>
            </h1>
            <p className="mt-8 max-w-2xl text-balance text-lg text-brand-ink/70 md:text-xl">
              Easyfest remplace ton tableau Excel partagé, ton WhatsApp et ton outil d'inscription par une seule app pensée pour les organisateurs de festivals associatifs.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/icmpaca/rdl-2026/inscription" className="rounded-xl bg-brand-coral px-7 py-3.5 text-base font-medium text-white shadow-soft transition hover:opacity-90 hover:shadow-glow">
                Devenir bénévole RDL 2026 →
              </Link>
              <Link href="/icmpaca" className="rounded-xl border border-brand-ink/15 bg-white/70 px-7 py-3.5 text-base font-medium text-brand-ink backdrop-blur transition hover:bg-white">
                Découvrir les festivals
              </Link>
            </div>

            <p className="mt-6 text-sm text-brand-ink/50">
              Données EU · DPA Supabase signé · 100% RGPD
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-coral">Ce qui est inclus</p>
            <h2 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">Toute la régie, dans ta poche</h2>
            <p className="mx-auto mt-4 max-w-2xl text-brand-ink/70">Du recrutement bénévole au reporting post-event. Sans Excel, sans WhatsApp, sans débordement.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feat) => (
              <article key={feat.title} className="group rounded-2xl border border-brand-ink/10 bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-coral/30 hover:shadow-glow">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-coral/10 text-2xl">{feat.icon}</div>
                <h3 className="font-display text-xl font-semibold leading-tight">{feat.title}</h3>
                <p className="mt-2 text-sm text-brand-ink/70">{feat.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-coral">Pourquoi pas Weezevent ?</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">Easyfest vs. les solutions pro</h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-brand-ink/10 bg-white shadow-soft">
            <div className="grid grid-cols-2 border-b border-brand-ink/10 bg-brand-ink/5 text-sm font-semibold">
              <div className="p-4 text-center">Easyfest</div>
              <div className="p-4 text-center text-brand-ink/60">Outils pro classiques</div>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={i} className="grid grid-cols-2 border-b border-brand-ink/5 last:border-b-0">
                <div className="p-4 text-sm">{row[0]}</div>
                <div className="p-4 text-sm text-brand-ink/60">{row[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl bg-brand-ink px-8 py-16 text-center text-white shadow-soft">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Tu organises un festival ?</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">Rejoins notre Field Test 0.0.1 — accompagnement direct par notre équipe pour ta prochaine édition.</p>
            <Link href="mailto:hello@easyfest.app?subject=Beta Easyfest pour mon festival" className="mt-8 inline-block rounded-xl bg-brand-coral px-7 py-3.5 font-medium shadow-soft transition hover:opacity-90">
              Discuter avec l'équipe
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
