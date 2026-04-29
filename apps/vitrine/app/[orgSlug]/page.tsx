import { notFound } from "next/navigation";
import Link from "next/link";

import { createServerClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function OrgPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const supabase = createServerClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, logo_url")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (!org) notFound();

  const { data: events } = await supabase
    .from("events")
    .select("id, name, slug, description, starts_at, ends_at, location, status, cover_image_url")
    .eq("organization_id", org.id)
    .in("status", ["open", "closed"])
    .order("starts_at", { ascending: true });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-12">
        <p className="text-sm font-medium uppercase tracking-widest text-brand-coral">
          Espace inscription bénévoles
        </p>
        <h1 className="mt-2 font-display text-5xl font-bold">{org.name}</h1>
        <p className="mt-3 text-brand-ink/70">
          Choisis ton festival pour t'inscrire comme bénévole. Une candidature ≠ une
          confirmation : l'équipe valide chaque profil avant l'envoi du planning.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        {(events ?? []).map((ev) => {
          const formatter = new Intl.DateTimeFormat("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          return (
            <Link
              key={ev.id}
              href={`/${orgSlug}/${ev.slug}`}
              className="group rounded-2xl border border-brand-ink/10 bg-white/70 p-6 shadow-soft transition hover:border-brand-coral/40 hover:shadow-glow"
            >
              <div className="mb-4 flex items-start justify-between">
                <h2 className="font-display text-2xl font-semibold">{ev.name}</h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    ev.status === "open"
                      ? "bg-wellbeing-green/15 text-wellbeing-green"
                      : "bg-brand-ink/10 text-brand-ink/60"
                  }`}
                >
                  {ev.status === "open" ? "Inscriptions ouvertes" : "Bientôt"}
                </span>
              </div>
              <p className="mb-4 text-sm text-brand-ink/70">{ev.description}</p>
              <dl className="space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="text-brand-ink/50">Dates</dt>
                  <dd>{formatter.format(new Date(ev.starts_at))} — {formatter.format(new Date(ev.ends_at))}</dd>
                </div>
                {ev.location && (
                  <div className="flex gap-2">
                    <dt className="text-brand-ink/50">Lieu</dt>
                    <dd>{ev.location}</dd>
                  </div>
                )}
              </dl>
              <p className="mt-4 text-sm font-medium text-brand-coral group-hover:underline">
                Voir le festival →
              </p>
            </Link>
          );
        })}
      </section>

      {events?.length === 0 && (
        <p className="rounded-xl bg-brand-sand/40 p-6 text-center text-brand-ink/70">
          Aucun festival n'est ouvert aux inscriptions pour le moment. Reviens bientôt.
        </p>
      )}
    </main>
  );
}
