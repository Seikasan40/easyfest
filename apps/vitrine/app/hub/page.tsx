import { redirect } from "next/navigation";
import Link from "next/link";

import { ROLE_CARDS_ORDER, ROLE_DEFINITIONS, type RoleKind } from "@easyfest/shared";
import { createServerClient } from "@/lib/supabase/server";

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

  const { data: memberships } = await supabase
    .from("memberships")
    .select(`
      role, position_id, is_entry_scanner, is_mediator, is_active,
      event:event_id (
        id, name, slug,
        organization:organization_id (slug, name)
      ),
      position:position_id (name)
    `)
    .eq("user_id", userData.user.id)
    .eq("is_active", true);

  const { data: profile } = await supabase
    .from("volunteer_profiles")
    .select("first_name, full_name")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const firstName = profile?.first_name ?? profile?.full_name?.split(" ")[0] ?? "bénévole";

  if (!memberships || memberships.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10">
        <p className="text-3xl">⏳</p>
        <h1 className="mt-3 font-display text-2xl font-bold">Salut {firstName} 👋</h1>
        <p className="mt-2 text-center text-brand-ink/70">
          Tu n'as pas encore d'affectation active. L'équipe revient vers toi dès que ton
          rôle est confirmé.
        </p>
        <form action="/auth/logout" method="post" className="mt-8">
          <button className="text-sm text-brand-ink/60 underline">Se déconnecter</button>
        </form>
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

      <ul className="space-y-3">
        {ROLE_CARDS_ORDER.flatMap((roleCode) => {
          const matches = (memberships ?? []).filter((m: any) => m.role === roleCode);
          return matches.map((m: any) => {
            const def = ROLE_DEFINITIONS[roleCode];
            const orgSlug = m.event?.organization?.slug;
            const eventSlug = m.event?.slug;
            const subtitle = def.subtitleTemplate
              .replace("{firstName}", firstName)
              .replace("{positionName}", m.position?.name ?? "tous postes");

            return (
              <li key={`${roleCode}-${m.event?.id}`}>
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

      <form action="/auth/logout" method="post" className="mt-8 text-center">
        <button className="text-sm text-brand-ink/60 underline">Se déconnecter</button>
      </form>
    </main>
  );
}
