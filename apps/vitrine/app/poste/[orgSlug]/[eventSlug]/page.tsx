/**
 * /poste/[orgSlug]/[eventSlug] — Espace responsable de poste.
 * Style: proto vert forêt #1A3828.
 *
 * SSR. Lookup :
 * 1. La membership post_lead du user → position_id assignée
 * 2. La position (info)
 * 3. UNION : bénévoles via membership.position_id OU via assignments→shift→position_id
 *
 * Bug #5-6 fix (audit-extreme 3 mai 2026) :
 * - Ligne 79 : embed `profiles:user_id (...)` cassé (pas de FK directe memberships→volunteer_profiles)
 * - Ligne 89 : `shifts.label` n'existe pas (vraie col : `notes`)
 * - Logique : on ignorait les volunteers assignés via `assignments` (Anaïs/Sandy invisibles
 *   alors qu'assignées sur Bar via DnD).
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DARK = "#1A3828";
const GOLD = "#C49A2C";
const MUTED = "#7A7060";
const BORDER = "#E5DDD0";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { eventSlug } = await params;
  return { title: `Mon poste · ${eventSlug}` };
}

function getArrivalStatus(volunteer: any): "present" | "late" | "expected" | "unknown" {
  // Heuristic sur les données disponibles
  if (volunteer.profile?.arrived_at) return "present";
  return "expected";
}

export default async function PostePage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: ev } = await supabase
    .from("events")
    .select("id, name, slug")
    .eq("slug", eventSlug)
    .maybeSingle();

  if (!ev) notFound();
  const eventRow: any = ev;

  // Membership post_lead du user (post_lead.position_id = poste qu'il/elle gère)
  const { data: ownMembership } = await (supabase as any)
    .from("memberships")
    .select("role, position_id")
    .eq("user_id", user.id)
    .eq("event_id", eventRow.id)
    .eq("is_active", true)
    .order("role", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!ownMembership || !ownMembership.position_id) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: "#FFFFFF", border: `1px solid ${BORDER}` }}
      >
        <p className="text-3xl mb-3">📋</p>
        <h2 className="font-display text-xl font-bold" style={{ color: DARK }}>
          Aucun poste assigné
        </h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: MUTED }}>
          Tu es responsable de poste mais aucun poste ne t&apos;a encore été affecté. Contacte la régie.
        </p>
        <Link
          href="/hub"
          className="mt-5 inline-block rounded-xl px-4 py-2 text-sm font-semibold"
          style={{ background: DARK, color: "#FFFFFF" }}
        >
          ← Retour au hub
        </Link>
      </div>
    );
  }

  // Info du poste
  const { data: position } = await (supabase as any)
    .from("positions")
    .select("id, slug, name, color, icon, description")
    .eq("id", ownMembership.position_id)
    .maybeSingle();

  // Shifts du poste
  const { data: shifts, error: shiftsErr } = await (supabase as any)
    .from("shifts")
    .select("id, starts_at, ends_at, needs_count, notes")
    .eq("position_id", ownMembership.position_id)
    .order("starts_at", { ascending: true });
  if (shiftsErr) console.error("[Poste] shifts failed:", shiftsErr.message);

  const shiftIds = (shifts ?? []).map((s: any) => s.id);

  // Bénévoles assignés via memberships.position_id (statique)
  const { data: membershipRows, error: mErr } = await (supabase as any)
    .from("memberships")
    .select("user_id, role")
    .eq("event_id", eventRow.id)
    .eq("position_id", ownMembership.position_id)
    .eq("is_active", true)
    .eq("role", "volunteer");
  if (mErr) console.error("[Poste] memberships failed:", mErr.message);

  // Bénévoles assignés via assignments → shifts du poste (DnD)
  const { data: assignmentRows, error: aErr } = shiftIds.length
    ? await (supabase as any)
        .from("assignments")
        .select("volunteer_user_id, status")
        .in("shift_id", shiftIds)
        .in("status", ["pending", "validated"])
    : { data: [] as any[], error: null };
  if (aErr) console.error("[Poste] assignments failed:", aErr.message);

  // UNION des user_ids (membership volunteer ∪ assignment)
  const teamUserIds = Array.from(
    new Set([
      ...(membershipRows ?? []).map((m: any) => m.user_id),
      ...(assignmentRows ?? []).map((a: any) => a.volunteer_user_id),
    ]),
  );

  // Profils
  const { data: profileRows } = teamUserIds.length
    ? await (supabase as any)
        .from("volunteer_profiles")
        .select("user_id, first_name, last_name, full_name, email, phone, avatar_url")
        .in("user_id", teamUserIds)
    : { data: [] as any[] };

  // Scan events pour détecter les arrivées
  const { data: scanRows } = teamUserIds.length
    ? await (supabase as any)
        .from("scan_events")
        .select("volunteer_user_id, scanned_at, scan_kind")
        .eq("event_id", eventRow.id)
        .in("volunteer_user_id", teamUserIds)
        .eq("scan_kind", "arrival")
    : { data: [] as any[] };

  const arrivedIds = new Set((scanRows ?? []).map((s: any) => s.volunteer_user_id));
  const profilesByUserId = new Map<string, any>(
    (profileRows ?? []).map((p: any) => [p.user_id, p]),
  );

  const team = teamUserIds.map((uid: string) => {
    const p = profilesByUserId.get(uid) ?? {};
    return { user_id: uid, profile: p, arrived: arrivedIds.has(uid) };
  });

  // Séparer présents / en attente
  const presents = team.filter((m) => m.arrived);
  const enAttente = team.filter((m) => !m.arrived);

  const pos = position ?? { name: "Poste", color: "#1A3828", icon: "📍", description: null };
  const posColor = pos.color ?? DARK;

  const timeFr = (d?: string | null) =>
    d ? new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";

  // Trouver le shift actuel
  const now = new Date();
  const currentShift = (shifts ?? []).find((s: any) => {
    const start = new Date(s.starts_at);
    const end = new Date(s.ends_at);
    return start <= now && now <= end;
  }) ?? (shifts ?? [])[0];

  return (
    <div className="space-y-4">

      {/* Carte poste */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: DARK,
          boxShadow: "0 2px 16px rgba(26,56,40,0.15)",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            {pos.icon ?? "📍"}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.55)" }}>
              Mon poste
            </p>
            <h2 className="font-display text-2xl font-bold leading-tight text-white">
              {pos.name}
            </h2>
          </div>
        </div>

        {currentShift && (
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>
            {timeFr(currentShift.starts_at)} – {timeFr(currentShift.ends_at)}
          </p>
        )}

        {pos.description && (
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
            {pos.description}
          </p>
        )}

        {/* KPI chips */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: "PRÉSENTS", value: presents.length, alert: false },
            { label: "EN ATTENTE", value: enAttente.length, alert: enAttente.length > 0 },
            { label: "TOTAL", value: team.length, alert: false },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl px-2 py-2 text-center"
              style={{
                background: kpi.alert && kpi.value > 0
                  ? "rgba(196,154,44,0.25)"
                  : "rgba(255,255,255,0.10)",
              }}
            >
              <p className="font-display text-2xl font-bold text-white">{kpi.value}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                {kpi.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Mon équipe */}
      <div>
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em] px-1 mb-2"
          style={{ color: MUTED }}
        >
          MON ÉQUIPE
        </p>

        {team.length === 0 ? (
          <div
            className="rounded-2xl p-6 text-center"
            style={{ background: "#FFFFFF", border: `2px dashed ${BORDER}` }}
          >
            <p className="text-sm" style={{ color: MUTED }}>
              Aucun bénévole assigné à ton poste. La régie peut affecter des bénévoles depuis le planning.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {team.map((m: any) => {
              const p = m.profile ?? {};
              const firstName = p.first_name ?? p.full_name?.split(" ")[0] ?? "?";
              const lastName = p.last_name ?? p.full_name?.split(" ")[1] ?? "";
              const initials = (firstName[0] ?? "?").toUpperCase() + (lastName[0] ?? "").toUpperCase();
              const displayName = p.full_name ?? [p.first_name, p.last_name].filter(Boolean).join(" ") ?? p.email ?? "—";

              return (
                <div
                  key={m.user_id}
                  className="flex items-center gap-3 rounded-2xl p-3"
                  style={{
                    background: "#FFFFFF",
                    border: `1px solid ${BORDER}`,
                    boxShadow: "0 1px 4px rgba(26,56,40,0.06)",
                  }}
                >
                  {/* Avatar */}
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full flex-shrink-0 text-sm font-bold text-white"
                      style={{ background: m.arrived ? DARK : "#9A9080" }}
                    >
                      {initials}
                    </div>
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: DARK }}>
                      {displayName}
                    </p>
                    <p className="text-xs truncate" style={{ color: MUTED }}>
                      {pos.name}
                      {currentShift ? ` · ${timeFr(currentShift.starts_at)}–${timeFr(currentShift.ends_at)}` : ""}
                    </p>
                  </div>

                  {/* Badge présence */}
                  <span
                    className="flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold"
                    style={m.arrived
                      ? { background: "rgba(16,185,129,0.12)", color: "#10B981" }
                      : { background: "rgba(196,154,44,0.12)", color: "#C49A2C" }
                    }
                  >
                    {m.arrived ? "● Présent" : "● En attente"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <Link
          href={`/staff/${orgSlug}/${eventSlug}`}
          className="flex w-full items-center justify-center rounded-2xl py-3.5 text-base font-semibold text-white transition hover:opacity-90"
          style={{ background: DARK, minHeight: "52px" }}
        >
          📷 Scanner mon équipe
        </Link>

        <Link
          href={`/v/${orgSlug}/${eventSlug}/chat`}
          className="flex w-full items-center justify-center rounded-2xl py-3.5 text-base font-semibold transition hover:opacity-90"
          style={{
            background: "#FFFFFF",
            border: `1.5px solid ${DARK}`,
            color: DARK,
            minHeight: "52px",
          }}
        >
          💬 Tchat équipe
        </Link>

        <button
          type="button"
          className="flex w-full items-center justify-center rounded-2xl py-3.5 text-base font-semibold transition hover:opacity-90"
          style={{
            background: "#F5E9C4",
            border: `1px solid rgba(196,154,44,0.30)`,
            color: "#7B5C1A",
            minHeight: "52px",
          }}
        >
          🆘 Demander un renfort
        </button>
      </div>

      {/* Shifts */}
      {(shifts ?? []).length > 0 && (
        <div className="pt-2">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em] px-1 mb-2"
            style={{ color: MUTED }}
          >
            SHIFTS DU POSTE
          </p>
          <div className="space-y-2">
            {(shifts ?? []).map((s: any) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-2xl p-3"
                style={{
                  background: "#FFFFFF",
                  borderLeft: `4px solid ${posColor}`,
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 1px 4px rgba(26,56,40,0.06)",
                }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: DARK }}>
                    {timeFr(s.starts_at)} – {timeFr(s.ends_at)}
                  </p>
                  {s.notes && (
                    <p className="text-xs mt-0.5" style={{ color: MUTED }}>{s.notes}</p>
                  )}
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-bold flex-shrink-0"
                  style={{ background: `${posColor}18`, color: posColor }}
                >
                  {s.needs_count} besoin{s.needs_count > 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 pb-6 text-center">
        <Link href="/hub" className="text-xs underline underline-offset-2" style={{ color: MUTED }}>
          ← Retour au hub
        </Link>
      </div>
    </div>
  );
}
