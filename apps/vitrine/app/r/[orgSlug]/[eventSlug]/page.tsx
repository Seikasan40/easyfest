/**
 * /r/[orgSlug]/[eventSlug] — Dashboard Responsable Bénévoles.
 * Rôle : volunteer_lead (hiérarchie 2).
 * Accès : validation candidatures, planning toutes équipes, scan arrivées.
 */
import Link from "next/link";

import { createServerClient } from "@/lib/supabase/server";

const DARK = "#1A3828";
const BORDER = "#E5DDD0";
const MUTED = "#7A7060";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export const dynamic = "force-dynamic";

export default async function RDashboard({ params }: PageProps) {
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
    { count: arrivalScansToday },
    { count: activeAlerts },
    { count: totalPositions },
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
      .from("scan_events")
      .select("*", { count: "exact", head: true })
      .eq("event_id", ev.id)
      .eq("scan_kind", "arrival")
      .eq("is_replay", false),
    supabase
      .from("safer_alerts")
      .select("*", { count: "exact", head: true })
      .eq("event_id", ev.id)
      .in("status", ["open", "acknowledged"]),
    supabase
      .from("positions")
      .select("*", { count: "exact", head: true })
      .eq("event_id", ev.id)
      .eq("is_active", true),
  ]);

  const base = `/r/${orgSlug}/${eventSlug}`;

  const kpis = [
    {
      label: "BÉNÉVOLES",
      value: validatedVolunteers ?? 0,
      sub: "comptes validés",
      tone: "default" as const,
    },
    {
      label: "CANDIDATURES",
      value: pendingApplications ?? 0,
      sub: pendingApplications ? "à valider" : "Tout traité ✓",
      tone: ((pendingApplications ?? 0) > 0 ? "warn" : "default") as "warn" | "default",
    },
    {
      label: "PRÉSENTS",
      value: arrivalScansToday ?? 0,
      sub: `/ ${validatedVolunteers ?? 0} attendus`,
      tone: "default" as const,
    },
    {
      label: "ALERTES",
      value: activeAlerts ?? 0,
      sub: (activeAlerts ?? 0) > 0 ? "à traiter" : "Espace serein ✓",
      tone: ((activeAlerts ?? 0) > 0 ? "danger" : "default") as "danger" | "default",
    },
  ];

  const quickLinks = [
    {
      href: `${base}/applications`,
      emoji: "📥",
      label: "Candidatures",
      desc: "Valider les inscriptions",
      badge: (pendingApplications ?? 0) > 0 ? String(pendingApplications) : null,
    },
    {
      href: `${base}/planning`,
      emoji: "📅",
      label: "Planning",
      desc: `${totalPositions ?? 0} postes`,
      badge: null,
    },
    {
      href: `${base}/benevoles`,
      emoji: "👥",
      label: "Bénévoles",
      desc: `${validatedVolunteers ?? 0} membres`,
      badge: null,
    },
    {
      href: `${base}/safer`,
      emoji: "🛟",
      label: "Safer Space",
      desc: "Alertes & médiateurs",
      badge: (activeAlerts ?? 0) > 0 ? String(activeAlerts) : null,
    },
    {
      href: `${base}/chat`,
      emoji: "💬",
      label: "Chat",
      desc: "Équipes & broadcast",
      badge: null,
    },
    {
      href: `/staff/${orgSlug}/${eventSlug}`,
      emoji: "📲",
      label: "Scanner",
      desc: "Mode terrain",
      badge: null,
    },
  ];

  return (
    <div className="space-y-5">

      {/* KPIs 2×2 */}
      <section className="grid grid-cols-2 gap-3">
        {kpis.map((k) => {
          const valueColor =
            k.tone === "danger" ? "#EF4444" :
            k.tone === "warn" ? "#C49A2C" :
            DARK;
          const subColor =
            k.tone === "danger" ? "#EF4444" :
            k.tone === "warn" ? "#C49A2C" :
            MUTED;
          return (
            <div
              key={k.label}
              className="rounded-2xl p-4"
              style={{
                background: "#FFFFFF",
                border: `1px solid ${BORDER}`,
                boxShadow: "0 1px 4px rgba(26,56,40,0.06)",
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: MUTED }}>
                {k.label}
              </p>
              <p className="font-display text-3xl font-bold leading-tight" style={{ color: valueColor }}>
                {k.value}
              </p>
              <p className="text-xs mt-1" style={{ color: subColor }}>
                {k.sub}
              </p>
            </div>
          );
        })}
      </section>

      {/* Alerte candidatures en attente */}
      {(pendingApplications ?? 0) > 0 && (
        <Link
          href={`${base}/applications`}
          className="flex items-center gap-3 rounded-2xl px-4 py-3 transition hover:opacity-80"
          style={{
            background: "rgba(196,154,44,0.08)",
            border: "1px solid rgba(196,154,44,0.25)",
          }}
        >
          <span className="text-xl">📥</span>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "#7A5800" }}>
              {pendingApplications} candidature{(pendingApplications ?? 0) > 1 ? "s" : ""} en attente
            </p>
            <p className="text-xs" style={{ color: "#9A7A30" }}>
              Tap pour valider
            </p>
          </div>
          <span className="text-sm font-bold" style={{ color: "#C49A2C" }}>→</span>
        </Link>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: BORDER }} />
        <span className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: MUTED }}>
          ACCÈS RAPIDES
        </span>
        <div className="flex-1 h-px" style={{ background: BORDER }} />
      </div>

      {/* Quick links 2×3 */}
      <section className="grid grid-cols-2 gap-2">
        {quickLinks.map((lk) => (
          <Link
            key={lk.href}
            href={lk.href}
            className="flex items-center gap-2 rounded-2xl p-3 transition hover:opacity-80 relative"
            style={{
              background: "#FFFFFF",
              border: `1px solid ${BORDER}`,
              boxShadow: "0 1px 4px rgba(26,56,40,0.06)",
            }}
          >
            <span className="text-xl">{lk.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate" style={{ color: DARK }}>{lk.label}</p>
              <p className="text-[10px]" style={{ color: MUTED }}>{lk.desc}</p>
            </div>
            {lk.badge && (
              <span
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: "#EF4444" }}
              >
                {lk.badge}
              </span>
            )}
            <span className="ml-auto text-sm flex-shrink-0" style={{ color: "#C49A2C" }}>→</span>
          </Link>
        ))}
      </section>

    </div>
  );
}
