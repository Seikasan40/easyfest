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

  // Bug #11 fix : embed `volunteer_profiles!memberships_user_id_fkey` cassé (FK pointe auth.users).
  // Split en 2 queries.
  const { data: activeMemberRows } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("event_id", ev.id)
    .eq("is_active", true);
  const activeUserIds = Array.from(
    new Set((activeMemberRows ?? []).map((m: any) => m.user_id).filter(Boolean)),
  );
  const { data: profileRows } = activeUserIds.length
    ? await supabase
        .from("volunteer_profiles")
        .select("user_id, email")
        .in("user_id", activeUserIds)
    : { data: [] as any[] };
  const accountEmails = new Set(
    (profileRows ?? [])
      .map((p: any) => (p.email ?? "").toLowerCase())
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
