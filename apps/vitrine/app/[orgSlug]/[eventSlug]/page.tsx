import { notFound } from "next/navigation";
import Link from "next/link";

import { formatDateFr } from "@easyfest/shared";

import { SiteFooter, SiteHeader } from "@/components/site-header";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function EventPage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select(`id, name, slug, description, starts_at, ends_at, location, status, registration_open_at, registration_close_at, cover_image_url, organization:organization_id (id, name, slug, logo_url)`)
    .eq("slug", eventSlug)
    .maybeSingle();

  const e = ev as any;
  if (!e || e.organization?.slug !== orgSlug) notFound();

  const { data: positions } = await supabase
    .from("positions")
    .select("id, name, slug, description, color, icon, display_order")
    .eq("event_id", e.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  const isOpen = e.status === "open";
  const closedReason = e.registration_close_at && new Date(e.registration_close_at) < new Date() ? "Les inscriptions sont closes." : "Les inscriptions ne sont pas encore ouvertes.";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-cream via-brand-cream to-brand-sand/30" aria-hidden />
        <div className="absolute right-10 top-10 -z-10 h-72 w-72 rounded-full bg-brand-coral/15 blur-3xl" aria-hidden />

        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <Link href={`/${orgSlug}`} className="text-sm font-medium text-brand-ink/60 transition hover:text-brand-coral">← {e.organization?.name}</Link>

          <div className="mt-6 grid items-end gap-8 md:grid-cols-[2fr_1fr]">
            <div>
              <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">{e.name}</h1>
              {e.description && (<p className="mt-4 max-w-2xl text-lg text-brand-ink/70">{e.description}</p>)}
            </div>

            <div className="rounded-2xl border border-brand-ink/10 bg-white/80 p-5 backdrop-blur-sm shadow-soft">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-brand-ink/50">Dates</dt>
                  <dd className="mt-0.5 font-medium">{formatDateFr(e.starts_at)} → {formatDateFr(e.ends_at)}</dd>
                </div>
                {e.location && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-widest text-brand-ink/50">Lieu</dt>
                    <dd className="mt-0.5 font-medium">{e.location}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-brand-ink/50">Statut</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${isOpen ? "bg-wellbeing-green/15 text-wellbeing-green" : "bg-brand-ink/10 text-brand-ink/60"}`}>
                      <span className={`h-2 w-2 rounded-full ${isOpen ? "animate-pulse bg-wellbeing-green" : "bg-brand-ink/30"}`} />
                      {isOpen ? "Inscriptions ouvertes" : "Inscriptions fermées"}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/40 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-coral">{((positions as any[]) ?? []).length} postes ouverts</p>
              <h2 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">Choisis où tu veux t'investir</h2>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {((positions as any[]) ?? []).map((p: any) => (
              <article key={p.id} className="flex items-start gap-4 rounded-2xl border border-brand-ink/10 bg-white p-5 transition hover:border-brand-coral/30 hover:shadow-soft">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: `${p.color ?? "#FF5E5B"}18`, color: p.color ?? "#FF5E5B" }}>
                  {p.icon ?? "🎟️"}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold leading-tight">{p.name}</h3>
                  {p.description && (<p className="mt-1 text-sm text-brand-ink/60">{p.description}</p>)}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {isOpen ? (
            <div className="overflow-hidden rounded-3xl bg-brand-ink p-10 text-center text-white shadow-soft md:p-14">
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-coral">Devenir bénévole</p>
              <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">Tu veux nous rejoindre ?</h2>
              <p className="mx-auto mt-4 max-w-xl text-white/70">
                Le formulaire prend ~5 minutes. Top 3 préférences de poste, c'est l'équipe qui valide ensuite et t'envoie ton accès personnel par mail.
              </p>
              <Link href={`/${orgSlug}/${eventSlug}/inscription`} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-coral px-8 py-3.5 font-medium shadow-soft transition hover:opacity-90">
                S'inscrire comme bénévole →
              </Link>
              <p className="mt-5 text-xs text-white/50">Données EU · DPA Supabase signé · Conformité RGPD garantie</p>
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-10 text-center shadow-soft">
              <p className="text-5xl">⏳</p>
              <h2 className="mt-4 font-display text-2xl font-semibold">{closedReason}</h2>
              <p className="mt-2 text-brand-ink/60">Reviens plus tard ou contacte directement l'organisation.</p>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
