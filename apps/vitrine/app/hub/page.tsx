import { redirect } from "next/navigation";
import Link from "next/link";

import { ROLE_CARDS_ORDER, ROLE_DEFINITIONS, type RoleKind } from "@easyfest/shared";
import { createServerClient } from "@/lib/supabase/server";
import { onboardCurrentUser } from "@/app/actions/onboard";

const DARK = "#1A3828";
const MUTED = "#7A7060";
const BORDER = "#E5DDD0";

const ROLE_ICON: Record<RoleKind, { emoji: string; bg: string }> = {
  volunteer:       { emoji: "🎟️", bg: "rgba(26,56,40,0.10)" },
  post_lead:       { emoji: "🧑‍🤝‍🧑", bg: "rgba(26,56,40,0.10)" },
  staff_scan:      { emoji: "📷",  bg: "rgba(196,154,44,0.15)" },
  volunteer_lead:  { emoji: "📋",  bg: "rgba(26,56,40,0.10)" },
  direction:       { emoji: "🎛️", bg: "rgba(196,154,44,0.15)" },
};

export default async function HubPage() {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login?redirect=/hub");

  await onboardCurrentUser();

  const [{ data: memberships, error: memErr }, { data: profile }] = await Promise.all([
    supabase
      .from("memberships")
      .select("role, position_id, event_id, is_entry_scanner, is_mediator, is_active")
      .eq("user_id", userData.user.id)
      .eq("is_active", true),
    supabase
      .from("volunteer_profiles")
      .select("first_name, full_name")
      .eq("user_id", userData.user.id)
      .maybeSingle(),
  ]);

  if (memErr) {
    console.error("[Hub] memberships fetch failed:", memErr.message, memErr.details);
  }

  const eventIds = Array.from(
    new Set((memberships ?? []).map((m: any) => m.event_id).filter(Boolean)),
  );
  const positionIds = Array.from(
    new Set((memberships ?? []).map((m: any) => m.position_id).filter(Boolean)),
  );

  const { data: events } = eventIds.length
    ? await supabase.from("events").select("id, name, slug, organization_id").in("id", eventIds)
    : { data: [] as any[] };

  const orgIds = Array.from(
    new Set((events ?? []).map((e: any) => e.organization_id).filter(Boolean)),
  );

  const [{ data: organizations }, { data: positions }] = await Promise.all([
    orgIds.length
      ? supabase.from("organizations").select("id, slug, name").in("id", orgIds)
      : Promise.resolve({ data: [] as any[] }),
    positionIds.length
      ? supabase.from("positions").select("id, name").in("id", positionIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const eventsById = new Map((events ?? []).map((e: any) => [e.id, e]));
  const orgsById = new Map((organizations ?? []).map((o: any) => [o.id, o]));
  const posById = new Map((positions ?? []).map((p: any) => [p.id, p]));

  const enrichedMemberships = (memberships ?? []).map((m: any) => {
    const event = eventsById.get(m.event_id) as any;
    const organization = event ? orgsById.get(event.organization_id) : null;
    return {
      ...m,
      event: event
        ? { id: event.id, name: event.name, slug: event.slug, organization: organization ?? null }
        : null,
      position: m.position_id ? posById.get(m.position_id) ?? null : null,
    };
  });

  const firstName = profile?.first_name ?? profile?.full_name?.split(" ")[0] ?? "bénévole";

  /* ── État vide / erreur ─────────────────────────────── */
  if (!memberships || memberships.length === 0) {
    return (
      <main
        className="mx-auto flex min-h-screen max-w-[430px] flex-col items-center justify-center px-6 py-10"
        style={{ background: "#F8F4EC" }}
        data-testid={memErr ? "hub-error" : "hub-empty"}
      >
        <div
          className="w-full rounded-3xl p-8 text-center"
          style={{ background: "#FFFFFF", boxShadow: "0 2px 20px rgba(26,56,40,0.08)" }}
        >
          <p className="text-4xl mb-3">{memErr ? "⚠️" : "⏳"}</p>
          <h1 className="font-display text-2xl font-bold" style={{ color: DARK }}>
            Salut {firstName}
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: MUTED }}>
            {memErr
              ? "Une erreur technique nous empêche de charger tes affectations. Réessaie dans quelques minutes."
              : "Tu n'as pas encore d'affectation active. L'équipe revient vers toi dès que ton rôle est confirmé."}
          </p>
          <div className="mt-6 flex flex-col items-center gap-2">
            <Link
              href="/account/privacy"
              className="text-xs underline underline-offset-2"
              style={{ color: MUTED }}
            >
              Mes données et vie privée
            </Link>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="text-xs underline underline-offset-2"
                style={{ color: MUTED }}
              >
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  /* ── Hub principal ──────────────────────────────────── */
  return (
    <main
      className="mx-auto min-h-screen max-w-[430px]"
      style={{ background: "#F8F4EC" }}
    >
      {/* Header */}
      <div
        className="px-5 pt-14 pb-6"
        style={{ background: DARK }}
      >
        <p
          className="text-xs font-bold uppercase tracking-[0.2em] mb-1"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          Easyfest
        </p>
        <h1
          className="font-display text-3xl font-bold leading-tight"
          style={{ color: "#FFFFFF" }}
        >
          Salut {firstName}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
          Choisis ton espace pour entrer.
        </p>
      </div>

      {/* Cartes rôles */}
      <div className="px-4 py-5 space-y-3" data-testid="hub-role-list">
        {ROLE_CARDS_ORDER.flatMap((roleCode) => {
          const matches = enrichedMemberships.filter((m: any) => m.role === roleCode);
          return matches.map((m: any) => {
            const def = ROLE_DEFINITIONS[roleCode];
            const orgSlug = m.event?.organization?.slug;
            const eventSlug = m.event?.slug;
            const subtitle = def.subtitleTemplate
              .replace("{firstName}", firstName)
              .replace("{positionName}", m.position?.name ?? "tous postes");
            const icon = ROLE_ICON[roleCode] ?? { emoji: "🎟️", bg: "rgba(26,56,40,0.10)" };

            return (
              <Link
                key={`${roleCode}-${m.event?.id}`}
                href={`${def.routePrefix}/${orgSlug}/${eventSlug}`}
                data-role-card={roleCode}
                className="flex items-center gap-4 rounded-2xl bg-white p-5 transition hover:opacity-90 active:scale-[0.98]"
                style={{
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 1px 6px rgba(26,56,40,0.07)",
                }}
              >
                {/* Icône */}
                <span
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl"
                  style={{ background: icon.bg }}
                >
                  {icon.emoji}
                </span>

                {/* Texte */}
                <div className="min-w-0 flex-1">
                  <p
                    className="font-display text-base font-bold leading-tight"
                    style={{ color: DARK }}
                  >
                    {def.label}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: MUTED }}>
                    {m.event?.organization?.name} · {m.event?.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#9A9080" }}>
                    {subtitle}
                  </p>
                </div>

                {/* Flèche */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-5 w-5 flex-shrink-0"
                  style={{ color: "#C49A2C" }}
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            );
          });
        })}
      </div>

      {/* Footer liens */}
      <div className="px-5 pb-10 flex flex-col items-center gap-2 text-center">
        <div
          className="w-full h-px mb-2"
          style={{ background: BORDER }}
        />
        <Link
          href="/account/privacy"
          className="text-xs underline underline-offset-2"
          style={{ color: MUTED }}
        >
          Mes données et vie privée
        </Link>
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="text-xs underline underline-offset-2"
            style={{ color: MUTED }}
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </main>
  );
}
