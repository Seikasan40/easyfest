import { notFound } from "next/navigation";
import Link from "next/link";

import { formatDateFr } from "@easyfest/shared";
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
    .select(`
      id, name, slug, description, starts_at, ends_at, location,
      status, registration_open_at, registration_close_at,
      cover_image_url,
      organization:organization_id (id, name, slug, logo_url)
    `)
    .eq("slug", eventSlug)
    .maybeSingle();

  if (!ev || (ev as any).organization?.slug !== orgSlug) notFound();

  const { data: positions } = await supabase
    .from("positions")
    .select("id, name, slug, description, color, icon, display_order")
    .eq("event_id", ev.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  const isOpen = ev.status === "open";
  const closedReason =
    ev.registration_close_at && new Date(ev.registration_close_at) < new Date()
      ? "Les inscriptions sont closes."
      : "Les inscriptions ne sont pas encore ouvertes.";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href={`/${orgSlug}`} className="text-sm text-brand-ink/60 hover:underline">
        ← {(ev as any).organization?.name}
      </Link>

      <header className="mt-6">
        <h1 className="font-display text-5xl font-bold leading-tight">{ev.name}</h1>
        <p className="mt-3 text-brand-ink/70">{ev.description}</p>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-brand-ink/50">Dates</dt>
            <dd className="font-medium">
              {formatDateFr(ev.starts_at)} — {formatDateFr(ev.ends_at)}
            </dd>
          </div>
          <div>
            <dt className="text-brand-ink/50">Lieu</dt>
            <dd className="font-medium">{ev.location ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-brand-ink/50">Statut</dt>
            <dd>
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isOpen
                    ? "bg-wellbeing-green/15 text-wellbeing-green"
                    : "bg-brand-ink/10 text-brand-ink/60"
                }`}
              >
                {isOpen ? "Inscriptions ouvertes" : "Inscriptions fermées"}
              </span>
            </dd>
          </div>
        </dl>
      </header>

      <section className="mt-12">
        <h2 className="mb-4 font-display text-2xl font-semibold">Postes ouverts</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(positions ?? []).map((p) => (
            <div
              key={p.id}
              className="flex items-start gap-3 rounded-xl border border-brand-ink/10 bg-white/60 p-4"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
                style={{ backgroundColor: `${p.color ?? "#FF5E5B"}20`, color: p.color ?? "#FF5E5B" }}
              >
                {p.icon ?? "🎟️"}
              </span>
              <div>
                <h3 className="font-medium">{p.name}</h3>
                {p.description && <p className="mt-1 text-sm text-brand-ink/70">{p.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl bg-brand-ink p-8 text-center text-white">
        {isOpen ? (
          <>
            <h2 className="font-display text-3xl font-bold">Tu veux nous rejoindre ?</h2>
            <p className="mt-2 text-white/80">
              Le formulaire prend ~5 minutes. Top 3 préférences de poste, c'est l'équipe qui valide ensuite.
            </p>
            <Link
              href={`/${orgSlug}/${eventSlug}/inscription`}
              className="mt-6 inline-block rounded-xl bg-brand-coral px-8 py-3 font-medium shadow-soft transition hover:opacity-90"
            >
              S'inscrire comme bénévole →
            </Link>
          </>
        ) : (
          <>
            <h2 className="font-display text-2xl font-semibold">{closedReason}</h2>
            <p className="mt-2 text-white/80">Reviens plus tard ou contacte l'organisation.</p>
          </>
        )}
      </section>
    </main>
  );
}
