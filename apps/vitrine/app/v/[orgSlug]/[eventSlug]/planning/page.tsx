import { formatDateFr, formatTimeFr } from "@easyfest/shared";
import { createServerClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function PlanningPage({ params }: PageProps) {
  const { eventSlug } = await params;
  const supabase = createServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: ev } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev) return null;

  const { data: assignments } = await supabase
    .from("assignments")
    .select(
      `
      id, status, refusal_reason, rating, validated_by_volunteer_at,
      shift:shift_id (
        starts_at, ends_at, meal_included,
        position:position_id (name, icon, color, description)
      )
    `,
    )
    .eq("volunteer_user_id", userData.user.id)
    .order("shift(starts_at)" as any, { ascending: true });

  const { data: meals } = await supabase
    .from("meal_allowances")
    .select("id, meal_slot, meal_label, served_at")
    .eq("event_id", ev.id)
    .eq("volunteer_user_id", userData.user.id)
    .order("meal_slot", { ascending: true });

  // Group assignments by day
  const days = new Map<string, typeof assignments>();
  for (const a of assignments ?? []) {
    const d = formatDateFr((a as any).shift?.starts_at);
    const arr = days.get(d) ?? [];
    arr.push(a);
    days.set(d, arr);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold">Mon planning</h1>
        <p className="text-sm text-brand-ink/60">
          Tes créneaux, repas et infos pratiques.
        </p>
      </header>

      {(assignments ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-ink/15 bg-white/50 p-6 text-center">
          <p className="text-3xl">⏳</p>
          <p className="mt-2 font-medium">Pas encore d'affectation</p>
          <p className="mt-1 text-sm text-brand-ink/60">
            L'équipe revient vers toi avec ton planning détaillé bientôt.
          </p>
        </div>
      ) : (
        <section className="space-y-4">
          {Array.from(days.entries()).map(([day, list]) => (
            <div key={day}>
              <h3 className="mb-2 text-sm font-medium uppercase tracking-widest text-brand-ink/50">
                {day}
              </h3>
              <div className="space-y-2">
                {(list ?? []).map((a) => {
                  const shift = (a as any).shift;
                  const pos = shift?.position;
                  return (
                    <div
                      key={a.id}
                      className="rounded-xl border border-brand-ink/10 bg-white p-4"
                      style={{ borderLeft: `4px solid ${pos?.color ?? "#FF5E5B"}` }}
                    >
                      <div className="flex items-baseline justify-between">
                        <h4 className="font-medium">
                          {pos?.icon} {pos?.name}
                        </h4>
                        <span className="text-xs text-brand-ink/60">
                          {formatTimeFr(shift?.starts_at)} – {formatTimeFr(shift?.ends_at)}
                        </span>
                      </div>
                      {pos?.description && (
                        <p className="mt-1 text-sm text-brand-ink/70">{pos.description}</p>
                      )}
                      {shift?.meal_included && (
                        <p className="mt-1 text-xs font-medium text-wellbeing-green">
                          🍽️ Repas inclus
                        </p>
                      )}
                      <div className="mt-3">
                        <StatusBadge status={a.status as string} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {(meals ?? []).length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-brand-ink/50">
            <span aria-hidden="true">🍽️</span> Mes repas
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(meals ?? []).map((m) => {
              const slot = String(m.meal_slot ?? "").toLowerCase();
              const emoji = slot.includes("matin") || slot.includes("breakfast") || slot.includes("petit")
                ? "🥐"
                : slot.includes("midi") || slot.includes("lunch") || slot.includes("dej")
                  ? "🍽️"
                  : slot.includes("soir") || slot.includes("diner") || slot.includes("dinner")
                    ? "🌙"
                    : slot.includes("snack") || slot.includes("collat") || slot.includes("encas")
                      ? "🍪"
                      : "🍴";
              const served = !!m.served_at;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col gap-1 rounded-2xl border p-3 transition ${
                    served
                      ? "border-wellbeing-green/30 bg-wellbeing-green/5"
                      : "border-brand-ink/10 bg-white"
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl" aria-hidden="true">{emoji}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        served
                          ? "bg-wellbeing-green/15 text-wellbeing-green"
                          : "bg-brand-ink/10 text-brand-ink/60"
                      }`}
                    >
                      {served ? "✓ Servi" : "À venir"}
                    </span>
                  </div>
                  <p className={`text-sm font-medium ${served ? "text-brand-ink/60" : ""}`}>
                    {m.meal_label ?? m.meal_slot}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: string; label: string }> = {
    pending: { tone: "bg-brand-ink/10 text-brand-ink/60", label: "En attente" },
    validated: { tone: "bg-wellbeing-green/15 text-wellbeing-green", label: "Validé" },
    refused: { tone: "bg-wellbeing-red/15 text-wellbeing-red", label: "Refusé" },
    reserve: { tone: "bg-wellbeing-yellow/15 text-wellbeing-yellow", label: "Réserve" },
    no_show: { tone: "bg-wellbeing-red/15 text-wellbeing-red", label: "Absent" },
    completed: { tone: "bg-wellbeing-green/10 text-wellbeing-green/80", label: "Terminé" },
  };
  const { tone, label } = map[status] ?? map["pending"]!;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}
