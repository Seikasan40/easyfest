import { notFound } from "next/navigation";
import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/site-header";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function OrgPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const supabase = createServerClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, logo_url, contact_email")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (!org) notFound();

  const { data: events } = await supabase
    .from("events")
    .select("id, name, slug, description, starts_at, ends_at, location, status, cover_image_url")
    .eq("organization_id", (org as any).id)
    .in("status", ["open", "closed"])
    .order("starts_at", { ascending: true });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <section className="relative overflow-hidden bg-gradient-to-b from-brand-cream to-white/60">
        <div className="absolute right-0 top-0 -z-10 h-96 w-96 rounded-full bg-brand-amber/10 blur-3xl" aria-hidden />
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <Link href="/" className="text-sm font-medium text-brand-ink/60 transition hover:text-brand-coral">← Accueil</Link>
          <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-brand-coral">Espace inscription bénévoles</p>
          <h1 className="mt-2 font-display text-5xl font-bold tracking-tight md:text-6xl">{(org as any).name}</h1>
          <p className="mt-4 max-w-2xl text-brand-ink/70">
            Choisis ton festival pour t'inscrire comme bénévole. Une candidature ≠ une confirmation : l'équipe valide chaque profil avant l'envoi du planning.
          </p>
        </div>
      </section>

      <section className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {((events as any[]) ?? []).length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-soft">
              <p className="text-5xl">🎪</p>
              <h2 className="mt-4 font-display text-xl font-bold">Aucun festival ouvert pour le moment</h2>
              <p className="mt-2 text-brand-ink/60">
                Reviens bientôt, ou contacte-nous à <a className="text-brand-coral hover:underline" href={`mailto:${(org as any).contact_email ?? "hello@easyfest.app"}`}>{(org as any).contact_email ?? "hello@easyfest.app"}</a>.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {((events as any[]) ?? []).map((ev) => {
                const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
                const isOpen = ev.status === "open";
                return (
                  <Link key={ev.id} href={`/${orgSlug}/${ev.slug}`} className="group relative overflow-hidden rounded-3xl border border-brand-ink/10 bg-white shadow-soft transition hover:-translate-y-1 hover:border-brand-coral/40 hover:shadow-glow">
                    <div className="h-32 bg-gradient-to-br from-brand-coral/40 via-brand-amber/30 to-brand-forest/20" style={ev.cover_image_url ? { backgroundImage: `url(${ev.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
                    <div className="p-6">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <h2 className="font-display text-2xl font-bold leading-tight">{ev.name}</h2>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${isOpen ? "bg-wellbeing-green/15 text-wellbeing-green" : "bg-brand-ink/10 text-brand-ink/60"}`}>
                          {isOpen ? "Inscriptions ouvertes" : "Bientôt"}
                        </span>
                      </div>
                      {ev.description && (<p className="mb-4 text-sm text-brand-ink/70">{ev.description}</p>)}
                      <dl className="space-y-1.5 text-sm">
                        <div className="flex gap-2">
                          <dt className="w-12 shrink-0 text-brand-ink/50">📅</dt>
                          <dd>{fmt.format(new Date(ev.starts_at))} — {fmt.format(new Date(ev.ends_at))}</dd>
                        </div>
                        {ev.location && (
                          <div className="flex gap-2">
                            <dt className="w-12 shrink-0 text-brand-ink/50">📍</dt>
                            <dd>{ev.location}</dd>
                          </div>
                        )}
                      </dl>
                      <p className="mt-5 inline-flex items-center text-sm font-medium text-brand-coral group-hover:underline">Voir le festival →</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
