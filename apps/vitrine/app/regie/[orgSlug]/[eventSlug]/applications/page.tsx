import { formatDateTimeFr, isMinor } from "@easyfest/shared";
import { createServerClient } from "@/lib/supabase/server";
import { ApplicationsTable } from "@/components/applications-table";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function ApplicationsPage({ params }: PageProps) {
  const { eventSlug } = await params;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select("id, name")
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev) return null;

  const { data: applications } = await supabase
    .from("volunteer_applications")
    .select(`
      id, status, full_name, first_name, last_name, email, phone, birth_date, is_minor,
      arrival_at, departure_at, preferred_position_slugs, skills, limitations,
      created_at, refusal_reason, source, admin_notes, invited_at
    `)
    .eq("event_id", ev.id)
    .order("created_at", { ascending: false });

  // Récupérer les emails des comptes ayant une membership active sur CET event
  // (tous rôles : direction / volunteer / volunteer_lead / post_lead / staff_scan).
  // C'est la source de vérité "a un compte connecté à ce festival" — plus fiable
  // que volunteer_profiles.email qui peut manquer pour les comptes non-bénévoles.
  const { data: activeMembers } = await supabase
    .from("memberships")
    .select(`
      user_id,
      profile:volunteer_profiles!memberships_user_id_fkey (email)
    `)
    .eq("event_id", ev.id)
    .eq("is_active", true);
  const accountEmails = new Set(
    (activeMembers ?? [])
      .map((m: any) => (m.profile?.email ?? "").toLowerCase())
      .filter(Boolean),
  );
  const enrichedApps = (applications ?? []).map((a: any) => ({
    ...a,
    has_account: accountEmails.has((a.email ?? "").toLowerCase()),
  }));

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Candidatures</h2>
        <p className="text-sm text-brand-ink/60">
          {(applications ?? []).length} candidature{(applications ?? []).length > 1 ? "s" : ""}
        </p>
      </header>

      <ApplicationsTable applications={enrichedApps} eventName={ev.name} />
    </div>
  );
}
