import { createServerClient } from "@/lib/supabase/server";

import { RegieAdminActions } from "./_components/RegieAdminActions";
import { RegieAlerts } from "./_components/RegieAlerts";
import { RegieKpis } from "./_components/RegieKpis";
import { RegiePositionsCoverage } from "./_components/RegiePositionsCoverage";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function RegieDashboard({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev) return null;

  const [
    { count: validatedVolunteers },
    { count: pendingApplications },
    { count: activeAlerts },
    { count: redWellbeing },
    { count: arrivalScansToday },
    { count: mealsServedToday },
  ] = await Promise.all([
    supabase
      .from("memberships")
      .select("*", { count: "exact", head: true })
      .eq("event_id", ev.id)
      .eq("role", "volunteer")
      .eq("is_active", true),
    supabase
      .from("volunteer_applications")
      .select("*", { count: "exact", head: true })
      .eq("event_id", ev.id)
      .eq("status", "pending"),
    supabase
      .from("safer_alerts")
      .select("*", { count: "exact", head: true })
      .eq("event_id", ev.id)
      .in("status", ["open", "acknowledged"]),
    supabase
      .from("wellbeing_reports")
      .select("*", { count: "exact", head: true })
      .eq("event_id", ev.id)
      .eq("level", "red")
      .is("acknowledged_at", null),
    supabase
      .from("scan_events")
      .select("*", { count: "exact", head: true })
      .eq("event_id", ev.id)
      .eq("scan_kind", "arrival")
      .eq("is_replay", false),
    supabase
      .from("meal_allowances")
      .select("*", { count: "exact", head: true })
      .eq("event_id", ev.id)
      .not("served_at", "is", null),
  ]);

  const { data: alerts } = await supabase
    .from("safer_alerts")
    .select("id, kind, status, location_hint, created_at")
    .eq("event_id", ev.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: positions } = await supabase
    .from("positions")
    .select("id, slug, name, color, icon, shifts:shifts (id, needs_count)")
    .eq("event_id", ev.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(8);

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold">Vue d&apos;ensemble</h2>
      <RegieKpis
        validatedVolunteers={validatedVolunteers ?? 0}
        pendingApplications={pendingApplications ?? 0}
        activeAlerts={activeAlerts ?? 0}
        redWellbeing={redWellbeing ?? 0}
        arrivalScansToday={arrivalScansToday ?? 0}
        mealsServedToday={mealsServedToday ?? 0}
      />
      <RegieAdminActions orgSlug={orgSlug} eventSlug={eventSlug} eventId={ev.id} />
      <RegiePositionsCoverage
        orgSlug={orgSlug}
        eventSlug={eventSlug}
        positions={(positions ?? []) as any}
      />
      <RegieAlerts orgSlug={orgSlug} eventSlug={eventSlug} alerts={(alerts ?? []) as any} />
    </div>
  );
}
