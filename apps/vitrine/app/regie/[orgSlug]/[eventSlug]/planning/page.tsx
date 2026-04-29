import { createServerClient } from "@/lib/supabase/server";
import { PlanningDnd } from "./PlanningDnd";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function RegiePlanningPage({ params }: PageProps) {
  const { eventSlug } = await params;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select("id, name")
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev) return null;

  const { data: shifts } = await supabase
    .from("shifts")
    .select(`
      id, starts_at, ends_at, needs_count,
      position:position_id (id, name, color, icon, event_id),
      assignments:assignments (
        id, status, volunteer_user_id,
        volunteer:volunteer_user_id (volunteer_profiles!user_id (full_name, first_name))
      )
    `)
    .order("starts_at", { ascending: true });

  // Filtrer par event
  const eventShifts = (shifts ?? []).filter((s: any) => s.position?.event_id === ev.id);

  // Bénévoles validés mais sans assignment = pool
  const { data: members } = await supabase
    .from("memberships")
    .select(`
      user_id, role,
      profile:volunteer_profiles!memberships_user_id_fkey (full_name, first_name)
    `)
    .eq("event_id", ev.id)
    .eq("role", "volunteer")
    .eq("is_active", true);

  const allAssignmentUserIds = new Set(
    eventShifts.flatMap((s: any) => s.assignments.map((a: any) => a.volunteer_user_id)),
  );
  const unassignedPool = (members ?? [])
    .filter((m: any) => !allAssignmentUserIds.has(m.user_id))
    .map((m: any) => ({
      id: `unassigned-${m.user_id}`,
      status: "pending",
      volunteer_user_id: m.user_id,
      volunteer: { full_name: m.profile?.full_name ?? "—", first_name: m.profile?.first_name ?? null },
    }));

  const buckets = eventShifts.map((s: any) => ({
    id: s.id,
    starts_at: s.starts_at,
    ends_at: s.ends_at,
    needs_count: s.needs_count,
    position_name: s.position?.name ?? "?",
    position_color: s.position?.color ?? "#FF5E5B",
    assignments: s.assignments.map((a: any) => ({
      id: a.id,
      status: a.status,
      volunteer_user_id: a.volunteer_user_id,
      volunteer: a.volunteer?.volunteer_profiles ?? { full_name: "—", first_name: null },
    })),
  }));

  return (
    <div className="space-y-4">
      <header>
        <h2 className="font-display text-2xl font-bold">Planning maître</h2>
        <p className="text-sm text-brand-ink/60">
          Drag & drop pour ré-affecter les bénévoles entre créneaux ou les renvoyer au pool.
        </p>
      </header>

      <PlanningDnd initialBuckets={buckets} unassigned={unassignedPool} />
    </div>
  );
}
