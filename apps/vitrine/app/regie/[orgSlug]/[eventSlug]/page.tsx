import Link from "next/link";

import { createServerClient } from "@/lib/supabase/server";

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

  // KPIs en parallèle
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

  // Dernières alertes
  const { data: alerts } = await supabase
    .from("safer_alerts")
    .select("id, kind, status, location_hint, created_at")
    .eq("event_id", ev.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Couverture des postes (besoin vs validé)
  const { data: positions } = await supabase
    .from("positions")
    .select(`
      id, name, color, icon,
      shifts:shifts (id, needs_count)
    `)
    .eq("event_id", ev.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(8);

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold">Vue d'ensemble</h2>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Bénévoles actifs" value={validatedVolunteers ?? 0} emoji="🎟️" />
        <Kpi label="Candidatures à valider" value={pendingApplications ?? 0} emoji="📥" tone={pendingApplications ? "warn" : undefined} />
        <Kpi label="Alertes ouvertes" value={activeAlerts ?? 0} emoji="🚨" tone={activeAlerts ? "danger" : undefined} />
        <Kpi label="Bien-être rouge" value={redWellbeing ?? 0} emoji="❤️‍🩹" tone={redWellbeing ? "warn" : undefined} />
        <Kpi label="Arrivées aujourd'hui" value={arrivalScansToday ?? 0} emoji="🚪" />
        <Kpi label="Repas servis" value={mealsServedToday ?? 0} emoji="🍽️" />
      </section>

      {/* Couverture postes */}
      <section>
        <h3 className="mb-3 font-display text-lg font-semibold">Couverture des postes</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {(positions ?? []).map((p: any) => {
            const totalNeeds = (p.shifts ?? []).reduce((s: number, sh: any) => s + (sh.needs_count ?? 0), 0);
            return (
              <div
                key={p.id}
                className="rounded-xl border border-brand-ink/10 bg-white p-4"
                style={{ borderLeft: `4px solid ${p.color}` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{p.icon}</span>
                  <p className="font-medium">{p.name}</p>
                </div>
                <p className="mt-2 text-xs text-brand-ink/60">
                  Besoins cumulés : <strong>{totalNeeds}</strong>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dernières alertes safer */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Alertes safer space</h3>
          <Link
            href={`/regie/${orgSlug}/${eventSlug}/safer`}
            className="text-sm text-brand-coral hover:underline"
          >
            Voir tout →
          </Link>
        </div>
        {(alerts ?? []).length === 0 ? (
          <div className="rounded-xl bg-wellbeing-green/10 p-4 text-sm">
            ✅ Aucune alerte récente.
          </div>
        ) : (
          <ul className="space-y-2">
            {(alerts ?? []).map((a: any) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-brand-ink/10 bg-white p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {alertEmoji(a.kind)} {a.kind} {a.location_hint && `· ${a.location_hint}`}
                  </p>
                  <p className="text-xs text-brand-ink/60">
                    {new Date(a.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
                <StatusPill status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  emoji,
  tone,
}: {
  label: string;
  value: number;
  emoji: string;
  tone?: "warn" | "danger";
}) {
  const ring =
    tone === "danger"
      ? "ring-2 ring-wellbeing-red/40"
      : tone === "warn"
      ? "ring-2 ring-wellbeing-yellow/40"
      : "";
  return (
    <div className={`rounded-xl border border-brand-ink/10 bg-white p-4 ${ring}`}>
      <p className="text-2xl">{emoji}</p>
      <p className="mt-1 font-display text-3xl font-bold leading-tight">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-widest text-brand-ink/50">
        {label}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { tone: string; label: string }> = {
    open: { tone: "bg-wellbeing-red/15 text-wellbeing-red", label: "Ouverte" },
    acknowledged: { tone: "bg-wellbeing-yellow/15 text-wellbeing-yellow", label: "Prise" },
    in_progress: { tone: "bg-brand-coral/15 text-brand-coral", label: "En cours" },
    resolved: { tone: "bg-wellbeing-green/15 text-wellbeing-green", label: "Résolue" },
    false_alarm: { tone: "bg-brand-ink/10 text-brand-ink/60", label: "Fausse alerte" },
  };
  const { tone, label } = map[status] ?? map["open"]!;
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>{label}</span>;
}

function alertEmoji(kind: string): string {
  return (
    {
      harassment: "🛑",
      physical_danger: "⚠️",
      medical: "🩺",
      wellbeing_red: "🆘",
      other: "❗",
    }[kind] ?? "❗"
  );
}
