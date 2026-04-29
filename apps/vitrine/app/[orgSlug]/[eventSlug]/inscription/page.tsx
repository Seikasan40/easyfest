import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter, SiteHeader } from "@/components/site-header";
import { VolunteerApplicationForm } from "@/components/volunteer-application-form";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function InscriptionPage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select(`id, name, slug, status, starts_at, ends_at, timezone, registration_open_at, registration_close_at, max_preferred_positions, organization:organization_id (id, name, slug)`)
    .eq("slug", eventSlug)
    .maybeSingle();

  const e = ev as any;
  if (!e || e.organization?.slug !== orgSlug) notFound();

  if (e.status !== "open") {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">
          <div className="mx-auto max-w-2xl px-6 py-20 text-center">
            <p className="text-5xl">🚪</p>
            <h1 className="mt-4 font-display text-3xl font-bold">Inscriptions fermées</h1>
            <p className="mt-3 text-brand-ink/70">Les inscriptions pour <strong>{e.name}</strong> ne sont pas ouvertes pour le moment.</p>
            <Link href={`/${orgSlug}`} className="mt-8 inline-block rounded-xl bg-brand-coral px-6 py-3 font-medium text-white">Voir les autres festivals</Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { data: positions } = await supabase
    .from("positions")
    .select("slug, name, color, icon, description")
    .eq("event_id", e.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <Link href={`/${orgSlug}/${eventSlug}`} className="text-sm font-medium text-brand-ink/60 transition hover:text-brand-coral">← Retour au festival</Link>

          <header className="mt-6 mb-8 rounded-2xl bg-white p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-coral">{e.organization?.name} · Candidature bénévole</p>
            <h1 className="mt-2 font-display text-3xl font-bold leading-tight md:text-4xl">{e.name}</h1>
            <p className="mt-3 text-sm text-brand-ink/60">~5 minutes. Tes données restent privées (RGPD). L'équipe valide ta candidature et t'envoie ensuite ton accès personnel par mail.</p>
          </header>

          <VolunteerApplicationForm
            eventId={e.id}
            eventName={e.name}
            organizationSlug={orgSlug}
            eventSlug={eventSlug}
            maxPreferredPositions={e.max_preferred_positions ?? 3}
            eventStartsAt={e.starts_at}
            eventEndsAt={e.ends_at}
            positions={(positions as any[]) ?? []}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
