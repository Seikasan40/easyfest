/**
 * /r/[orgSlug]/[eventSlug]/benevoles — Liste des bénévoles pour resp. bénévoles.
 * Affiche tous les volunteers validés avec leur équipe, présence, infos.
 */
import { createServerClient } from "@/lib/supabase/server";

const DARK = "#1A3828";
const BORDER = "#E5DDD0";
const MUTED = "#7A7060";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export const dynamic = "force-dynamic";

// Génère des initiales depuis un nom
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

// Couleur avatar déterministe
const AVATAR_COLORS = [
  "#1A3828", "#2D5A3D", "#7A5800", "#8B2635",
  "#1A4A6B", "#4A3D7A", "#6B4A1A", "#2D6B5A",
];
function avatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

export default async function BenevolesPage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev) return null;

  // 1. Memberships volunteer actives
  const { data: rawMembers } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("event_id", ev.id)
    .eq("role", "volunteer")
    .eq("is_active", true);

  const memberIds = (rawMembers ?? []).map((m: any) => m.user_id);

  // 2. Profils
  const { data: profiles } = memberIds.length
    ? await supabase
        .from("volunteer_profiles")
        .select("user_id, full_name, first_name, last_name, avatar_url, phone, email")
        .in("user_id", memberIds)
    : { data: [] as any[] };

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

  // 3. Positions pour chaque membre
  const { data: assignments } = await supabase
    .from("assignments")
    .select(`
      volunteer_user_id,
      shift:shift_id (position:position_id (id, name, color, icon, event_id))
    `)
    .in("volunteer_user_id", memberIds)
    .in("status", ["pending", "validated"]);

  // Index user → positions
  const positionsByUser = new Map<string, { name: string; color: string; icon: string | null }[]>();
  (assignments ?? []).forEach((a: any) => {
    const pos = a.shift?.position;
    if (!pos || pos.event_id !== ev.id) return;
    const uid = a.volunteer_user_id;
    const existing = positionsByUser.get(uid) ?? [];
    if (!existing.find((p) => p.name === pos.name)) {
      existing.push({ name: pos.name, color: pos.color ?? DARK, icon: pos.icon });
    }
    positionsByUser.set(uid, existing);
  });

  // 4. Scans arrivée
  const { data: scans } = await supabase
    .from("scan_events")
    .select("volunteer_user_id")
    .eq("event_id", ev.id)
    .eq("scan_kind", "arrival")
    .eq("is_replay", false)
    .in("volunteer_user_id", memberIds);

  const arrivedIds = new Set((scans ?? []).map((s: any) => s.volunteer_user_id));

  // Construire la liste
  const volunteers = memberIds.map((uid: string) => {
    const p = profileMap.get(uid);
    const name =
      p?.full_name ??
      [p?.first_name, p?.last_name].filter(Boolean).join(" ") ??
      p?.email ??
      "—";
    return {
      uid,
      name,
      email: p?.email ?? null,
      phone: p?.phone ?? null,
      arrived: arrivedIds.has(uid),
      positions: positionsByUser.get(uid) ?? [],
    };
  }).sort((a, b) => {
    // Arrivés en premier, puis par nom
    if (a.arrived !== b.arrived) return a.arrived ? -1 : 1;
    return a.name.localeCompare(b.name, "fr");
  });

  const arrivedCount = volunteers.filter((v) => v.arrived).length;
  const unassignedCount = volunteers.filter((v) => v.positions.length === 0).length;

  return (
    <div className="space-y-4">
      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "TOTAL", value: volunteers.length, color: DARK },
          { label: "PRÉSENTS", value: arrivedCount, color: "#10B981" },
          { label: "SANS POSTE", value: unassignedCount, color: unassignedCount > 0 ? "#C49A2C" : MUTED },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-3 text-center"
            style={{ background: "#FFFFFF", border: `1px solid ${BORDER}` }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: MUTED }}>{s.label}</p>
            <p className="font-display text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: BORDER }} />
        <span className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: MUTED }}>
          {volunteers.length} BÉNÉVOLES
        </span>
        <div className="flex-1 h-px" style={{ background: BORDER }} />
      </div>

      {/* Liste */}
      <ul className="space-y-2">
        {volunteers.map((v) => {
          const color = avatarColor(v.name);
          const ini = initials(v.name);
          return (
            <li
              key={v.uid}
              className="rounded-2xl overflow-hidden"
              style={{
                background: "#FFFFFF",
                border: `1px solid ${BORDER}`,
                boxShadow: "0 1px 4px rgba(26,56,40,0.06)",
              }}
            >
              <div className="p-3 flex items-center gap-3">
                {/* Avatar initiales */}
                <div
                  className="h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: v.arrived ? "#10B981" : color }}
                >
                  {ini}
                </div>

                {/* Infos */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold truncate" style={{ color: DARK }}>
                      {v.name}
                    </p>
                    {v.arrived && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[9px] font-bold flex-shrink-0"
                        style={{ background: "rgba(16,185,129,0.10)", color: "#10B981" }}
                      >
                        ● Présent
                      </span>
                    )}
                  </div>

                  {/* Positions */}
                  {v.positions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {v.positions.map((pos) => (
                        <span
                          key={pos.name}
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            background: `${pos.color}18`,
                            color: pos.color,
                          }}
                        >
                          {pos.icon ? `${pos.icon} ` : ""}{pos.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px]" style={{ color: "#C49A2C" }}>
                      ⚠ Sans équipe affectée
                    </p>
                  )}
                </div>

                {/* Contact rapide */}
                {(v.phone || v.email) && (
                  <a
                    href={v.phone ? `tel:${v.phone}` : `mailto:${v.email}`}
                    className="flex-shrink-0 rounded-xl px-2 py-1.5 text-xs font-semibold transition hover:opacity-80"
                    style={{ background: "#F8F4EC", border: `1px solid ${BORDER}`, color: DARK }}
                  >
                    {v.phone ? "📞" : "✉️"}
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {volunteers.length === 0 && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: "#FFFFFF", border: `1px dashed ${BORDER}` }}
        >
          <p className="text-sm" style={{ color: MUTED }}>
            Aucun bénévole validé pour l'instant.
          </p>
        </div>
      )}
    </div>
  );
}
