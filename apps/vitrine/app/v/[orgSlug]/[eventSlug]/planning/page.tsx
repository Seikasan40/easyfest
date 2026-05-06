import { formatDateFr, formatTimeFr } from "@easyfest/shared";
import { createServerClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: "En attente",  bg: "#F5E9C4",       color: "#C49A2C" },
  validated: { label: "Validé ✓",   bg: "rgba(16,185,129,0.12)", color: "#10B981" },
  refused:   { label: "Refusé",      bg: "rgba(239,68,68,0.10)",  color: "#EF4444" },
  reserve:   { label: "Réserve",     bg: "rgba(244,184,96,0.15)", color: "#F4B860" },
  no_show:   { label: "Absent",      bg: "rgba(239,68,68,0.10)",  color: "#EF4444" },
  completed: { label: "Terminé ✓",  bg: "rgba(16,185,129,0.08)", color: "#10B981" },
};

const MEAL_EMOJI: Record<string, string> = {
  matin: "🥐", breakfast: "🥐", "petit-déjeuner": "🥐",
  midi: "🍽️", lunch: "🍽️", "déjeuner": "🍽️",
  soir: "🌙", diner: "🌙", dinner: "🌙",
  snack: "🍪", collation: "🍪",
};

function getMealEmoji(slot: string): string {
  const key = slot.toLowerCase();
  return Object.keys(MEAL_EMOJI).find(k => key.includes(k))
    ? MEAL_EMOJI[Object.keys(MEAL_EMOJI).find(k => key.includes(k))!]
    : "🍴";
}

export default async function PlanningPage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: ev } = await supabase
    .from("events")
    .select("id, name, organization:organization_id (name)")
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev) return null;

  const { data: assignments } = await supabase
    .from("assignments")
    .select(
      `id, status, refusal_reason, rating,
       shift:shift_id (
         starts_at, ends_at, meal_included,
         position:position_id (name, icon, color, description),
         team:team_id (name)
       )`
    )
    .eq("volunteer_user_id", userData.user.id)
    .order("shift(starts_at)" as any, { ascending: true });

  const { data: meals } = await supabase
    .from("meal_allowances")
    .select("id, meal_slot, meal_label, served_at")
    .eq("event_id", ev.id)
    .eq("volunteer_user_id", userData.user.id)
    .order("meal_slot", { ascending: true });

  // Grouper par jour
  const days = new Map<string, any[]>();
  for (const a of assignments ?? []) {
    const d = formatDateFr((a as any).shift?.starts_at);
    if (!days.has(d)) days.set(d, []);
    days.get(d)!.push(a);
  }

  const orgName = (ev as any).organization?.name ?? "";
  const eventName = (ev as any).name ?? "";

  return (
    <div className="flex flex-col" style={{ minHeight: "100%" }}>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-5"
        style={{ background: "#1A3828" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          {orgName}
        </p>
        <h1
          className="font-display text-2xl font-bold leading-tight"
          style={{ color: "#FFFFFF" }}
        >
          Mon planning
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
          {(assignments ?? []).length} shift{(assignments ?? []).length !== 1 ? "s" : ""} · {eventName}
        </p>
      </div>

      {/* Contenu */}
      <div className="flex-1 px-4 py-5 space-y-5">

        {(assignments ?? []).length === 0 ? (
          <div
            className="rounded-2xl border-2 border-dashed p-8 text-center mt-4"
            style={{ borderColor: "#E5DDD0", background: "rgba(255,255,255,0.6)" }}
          >
            <p className="text-3xl mb-2">⏳</p>
            <p className="font-semibold" style={{ color: "#1A3828" }}>
              Pas encore d&apos;affectation
            </p>
            <p className="mt-1 text-sm" style={{ color: "#7A7060" }}>
              L&apos;équipe revient vers toi avec ton planning bientôt.
            </p>
          </div>
        ) : (
          <section className="space-y-5">
            {Array.from(days.entries()).map(([day, list]) => (
              <div key={day}>
                {/* Label jour */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-px" style={{ background: "#E5DDD0" }} />
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.15em]"
                    style={{ color: "#7A7060" }}
                  >
                    {day}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "#E5DDD0" }} />
                </div>

                <div className="space-y-2">
                  {list.map((a: any) => {
                    const shift = a.shift;
                    const pos = shift?.position;
                    const team = shift?.team;
                    const statusCfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG["pending"];
                    const posColor = pos?.color ?? "#1A3828";
                    return (
                      <div
                        key={a.id}
                        className="rounded-2xl bg-white overflow-hidden"
                        style={{
                          borderLeft: `4px solid ${posColor}`,
                          boxShadow: "0 1px 4px rgba(26,56,40,0.08)",
                        }}
                      >
                        <div className="px-4 py-4">
                          {/* Heure + badge statut */}
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className="text-xs font-bold"
                              style={{ color: posColor }}
                            >
                              {formatTimeFr(shift?.starts_at)} – {formatTimeFr(shift?.ends_at)}
                            </span>
                            <span
                              className="text-[10px] font-bold rounded-full px-2 py-0.5"
                              style={{ background: statusCfg.bg, color: statusCfg.color }}
                            >
                              {statusCfg.label}
                            </span>
                          </div>

                          {/* Nom du poste */}
                          <h4 className="font-semibold text-base" style={{ color: "#1A3828" }}>
                            {pos?.icon ? `${pos.icon} ` : ""}{pos?.name ?? "Poste"}
                          </h4>

                          {/* Équipe */}
                          {team?.name && (
                            <p className="text-xs mt-0.5" style={{ color: "#7A7060" }}>
                              Équipe : {team.name}
                            </p>
                          )}

                          {/* Description */}
                          {pos?.description && (
                            <p className="mt-1 text-sm leading-relaxed" style={{ color: "#4A4438" }}>
                              {pos.description}
                            </p>
                          )}

                          {/* Repas inclus */}
                          {shift?.meal_included && (
                            <div
                              className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                              style={{ background: "rgba(16,185,129,0.10)", color: "#10B981" }}
                            >
                              🍽️ Repas inclus
                            </div>
                          )}

                          {/* Raison de refus */}
                          {a.status === "refused" && a.refusal_reason && (
                            <p
                              className="mt-2 text-xs rounded-lg px-3 py-2"
                              style={{ background: "rgba(239,68,68,0.06)", color: "#B91C1C" }}
                            >
                              Motif : {a.refusal_reason}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Section repas */}
        {(meals ?? []).length > 0 && (
          <section className="pb-4">
            {/* Divider */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px" style={{ background: "#E5DDD0" }} />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{ color: "#7A7060" }}
              >
                🍽️ Mes repas
              </span>
              <div className="flex-1 h-px" style={{ background: "#E5DDD0" }} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(meals ?? []).map((m: any) => {
                const served = !!m.served_at;
                const emoji = getMealEmoji(String(m.meal_slot ?? ""));
                return (
                  <div
                    key={m.id}
                    className="flex flex-col gap-1 rounded-2xl p-3"
                    style={{
                      background: served ? "rgba(16,185,129,0.07)" : "#FFFFFF",
                      border: `1.5px solid ${served ? "rgba(16,185,129,0.25)" : "#E5DDD0"}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{emoji}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          background: served ? "rgba(16,185,129,0.15)" : "#F5E9C4",
                          color: served ? "#10B981" : "#C49A2C",
                        }}
                      >
                        {served ? "✓ Servi" : "À venir"}
                      </span>
                    </div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: served ? "#7A7060" : "#1A3828" }}
                    >
                      {m.meal_label ?? m.meal_slot}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
