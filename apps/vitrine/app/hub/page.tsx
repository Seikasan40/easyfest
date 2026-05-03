import { redirect } from "next/navigation";
import Link from "next/link";

import { ROLE_CARDS_ORDER, ROLE_DEFINITIONS, type RoleKind } from "@easyfest/shared";
import { createServerClient } from "@/lib/supabase/server";
import { onboardCurrentUser } from "@/app/actions/onboard";

const EMOJI: Record<RoleKind, string> = {
  volunteer: "🎟️",
  post_lead: "🧑‍🤝‍🧑",
  staff_scan: "📷",
  volunteer_lead: "📋",
  direction: "🎛️",
};

/**
 * Picker home — affiche uniquement les cartes pour les rôles dont l'utilisateur dispose.
 */
export default async function HubPage() {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login?redirect=/hub");

  // Upgrade auto : si l'user a des applications validées sans encore de membership, on les onboard
  await onboardCurrentUser();

  // Bug #18 fix (3 mai 2026 ~17h45 UTC) : ne PAS utiliser d'embed PostgREST
  // imbriqué (event:event_id (... organization:organization_id (...))) dans
  // une page critique comme /hub. Cause directe : un cycle de policies RLS
  // sur memberships (migration 20260503020000 ajoutait une policy avec
  // sub-query sur la même table) provoquait `42P17 infinite recursion
  // detected` côté Postgres → `data` arrivait à `null` → toutes les pages
  // affichaient "Tu n'as pas encore d'affectation" pour 100% des comptes.
  //
  // Le fix RLS lui-même est dans 20260503040000_fix_memberships_rls_recursion.sql.
  // Ici on ajoute une défense en profondeur : split en queries séparées sans
  // embed, avec error destructuré. Si une RLS pathologique réapparaît un
  // jour, on log + on affiche un état d'erreur claire au user au lieu de
  // tomber silencieusement sur "Salut bénévole".
  const [{ data: memberships, error: memErr }, { data: profile }] = await Promise.all([
    supabase
      .from("memberships")
      .select(
        "role, position_id, event_id, is_entry_scanner, is_mediator, is_active",
      )
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

  // Fetch events + organizations + positions en parallèle (3 queries dédupées)
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

  // Merge JS-side : mêmes shapes que l'embed PostgREST original pour ne pas
  // casser la suite (m.event?.organization?.slug, m.position?.name, etc.).
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

  if (!memberships || memberships.length === 0) {
    return (
      <main
        className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10"
        data-testid={memErr ? "hub-error" : "hub-empty"}
      >
        <p className="text-3xl">{memErr ? "⚠️" : "⏳"}</p>
        <h1 className="mt-3 font-display text-2xl font-bold">Salut {firstName} 👋</h1>
        <p className="mt-2 text-center text-brand-ink/70">
          {memErr
            ? "Une erreur technique nous empêche de charger tes affectations. L'équipe a été notifiée. Réessaie dans quelques minutes ou recontacte la régie si ça persiste."
            : "Tu n'as pas encore d'affectation active. L'équipe revient vers toi dès que ton rôle est confirmé."}
        </p>
        <div className="mt-8 flex flex-col items-center gap-2">
          <Link href="/account/privacy" className="text-sm text-brand-ink/60 underline">
            Mes données et vie privée
          </Link>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              aria-label="Se déconnecter d'Easyfest"
              className="rounded-lg px-3 py-2 text-sm font-medium text-brand-ink/60 underline transition hover:bg-brand-ink/5 hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-coral"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-widest text-brand-coral">
          Easyfest
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold">Salut {firstName} 👋</h1>
        <p className="mt-2 text-sm text-brand-ink/70">
          Choisis ton rôle pour entrer dans l'app.
        </p>
      </header>

      <ul className="space-y-3" data-testid="hub-role-list">
        {ROLE_CARDS_ORDER.flatMap((roleCode) => {
          const matches = enrichedMemberships.filter((m: any) => m.role === roleCode);
          return matches.map((m: any) => {
            const def = ROLE_DEFINITIONS[roleCode];
            const orgSlug = m.event?.organization?.slug;
            const eventSlug = m.event?.slug;
            const subtitle = def.subtitleTemplate
              .replace("{firstName}", firstName)
              .replace("{positionName}", m.position?.name ?? "tous postes");

            return (
              <li key={`${roleCode}-${m.event?.id}`} data-role-card={roleCode}>
                <Link
                  href={`${def.routePrefix}/${orgSlug}/${eventSlug}`}
                  className="group flex items-center gap-4 rounded-2xl border border-brand-ink/10 bg-white p-5 shadow-soft transition hover:border-brand-coral/40 hover:shadow-glow"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-coral/15 text-2xl">
                    {EMOJI[roleCode]}
                  </span>
                  <div className="flex-1">
                    <p className="font-display text-lg font-semibold leading-tight">{def.label}</p>
                    <p className="text-xs text-brand-ink/60">
                      {m.event?.organization?.name} · {m.event?.name}
                    </p>
                    <p className="text-xs text-brand-ink/50">{subtitle}</p>
                  </div>
                  <span aria-hidden className="text-brand-ink/30 group-hover:text-brand-coral">→</span>
                </Link>
              </li>
            );
          });
        })}
      </ul>

      <div className="mt-8 flex flex-col items-center gap-2 text-center">
        <Link href="/account/privacy" className="text-sm text-brand-ink/60 underline">
          Mes données et vie privée
        </Link>
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            aria-label="Se déconnecter d'Easyfest"
            className="rounded-lg px-3 py-2 text-sm font-medium text-brand-ink/60 underline transition hover:bg-brand-ink/5 hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-coral"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </main>
  );
}
