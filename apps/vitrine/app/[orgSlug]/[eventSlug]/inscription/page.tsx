import { notFound } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";
import { VolunteerApplicationForm } from "@/components/volunteer-application-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function InscriptionPage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select(`
      id, name, slug, status, registration_open_at, registration_close_at,
      max_preferred_positions,
      organization:organization_id (id, name, slug)
    `)
    .eq("slug", eventSlug)
    .maybeSingle();

  if (!ev || (ev as any).organization?.slug !== orgSlug) notFound();

  if (ev.status !== "open") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-display text-3xl font-bold">Inscriptions fermées</h1>
        <p className="mt-3 text-brand-ink/70">
          Les inscriptions pour {ev.name} ne sont pas ouvertes pour le moment.
        </p>
      </main>
    );
  }

  const { data: positions } = await supabase
    .from("positions")
    .select("slug, name, color, icon, description")
    .eq("event_id", ev.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-widest text-brand-coral">
          {(ev as any).organization?.name} · Candidature bénévole
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold">{ev.name}</h1>
        <p className="mt-2 text-sm text-brand-ink/60">
          ~5 minutes. Tes données restent privées (RGPD). L'équipe valide ta candidature
          et t'envoie ensuite ton accès personnel.
        </p>
      </header>

      <VolunteerApplicationForm
        eventId={ev.id}
        eventName={ev.name}
        organizationSlug={orgSlug}
        eventSlug={eventSlug}
        maxPreferredPositions={ev.max_preferred_positions ?? 3}
        positions={positions ?? []}
      />
    </main>
  );
}
