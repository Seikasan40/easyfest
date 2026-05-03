import { createServerClient } from "@/lib/supabase/server";
import { PlanningDnd } from "./PlanningDnd";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function RegiePlanningShiftsPage({ params }: PageProps) {
  const { eventSlug } = await params;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select("id, name")
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev) return null;

  // Bug #12-13 fix (audit-extreme 3 mai 2026) :
  // - assignments.volunteer_user_id → auth.users (pas exposé) → embed cassé
  // - memberships → volunteer_profiles : pas de FK directe → embed cassé
  // Split en queries séparées + merge JS-side via Map.
  const { data: shifts, error: shiftsErr } = await supabase
    .from("shifts")
    .select(`
      id, starts_at, ends_at, needs_count,
      position:position_id (id, name, color, icon, event_id),
      assignments:assignments (id, status, volunteer_user_id)
    `)
    .order("starts_at", { ascending: true });
  if (shiftsErr) console.error("[Planning shifts] shifts failed:", shiftsErr.message);

  // Filtrer par event
  const eventShifts = (shifts ?? []).filter((s: any) => s.position?.event_id === ev.id);

  // Bénévoles validés (memberships)
  const { data: members } = await supabase
    .from("memberships")
    .select("user_id, role")
    .eq("event_id", ev.id)
    .eq("role", "volunteer")
    .eq("is_active", true);

  // UNION user_ids : memberships volunteers + assignments volunteers
  const allUserIds = Array.from(
    new Set([
      ...(members ?? []).map((m: any) => m.user_id),
      ...eventShifts.flatMap((s: any) => (s.assignments ?? []).map((a: any) => a.volunteer_user_id)),
    ]),
  );

  // Fetch profiles (1 query)
  const { data: profileRows } = allUserIds.length
    ? await supabase
        .from("volunteer_profiles")
        .select("user_id, full_name, first_name, last_name, email")
        .in("user_id", allUserIds)
    : { data: [] as any[] };

  const profilesByUserId = new Map<string, any>(
    (profileRows ?? []).map((p: any) => [p.user_id, p]),
  );

  const allAssignmentUserIds = new Set(
    eventShifts.flatMap((s: any) => (s.assignments ?? []).map((a: any) => a.volunteer_user_id)),
  );

  const fallbackName = (p: any) =>
    p?.full_name ??
    [p?.first_name, p?.last_name].filter(Boolean).join(" ") ??
    p?.email ??
    "—";

  const unassignedPool = (members ?? [])
    .filter((m: any) => !allAssignmentUserIds.has(m.user_id))
    .map((m: any) => {
      const p = profilesByUserId.get(m.user_id);
      return {
        id: `unassigned-${m.user_id}`,
        status: "pending",
        volunteer_user_id: m.user_id,
        volunteer: { full_name: fallbackName(p), first_name: p?.first_name ?? null },
      };
    });

  const buckets = eventShifts.map((s: any) => ({
    id: s.id,
    starts_at: s.starts_at,
    ends_at: s.ends_at,
    needs_count: s.needs_count,
    position_name: s.position?.name ?? "?",
    position_color: s.position?.color ?? "#FF5E5B",
    assignments: (s.assignments ?? []).map((a: any) => {
      const p = profilesByUserId.get(a.volunteer_user_id);
      return {
        id: a.id,
        status: a.status,
        volunteer_user_id: a.volunteer_user_id,
        volunteer: { full_name: fallbackName(p), first_name: p?.first_name ?? null },
      };
    }),
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
