import { redirect } from "next/navigation";
import Link from "next/link";

import { TenantThemeProvider } from "@/components/TenantThemeProvider";
import { createServerClient } from "@/lib/supabase/server";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function VolunteerLayout({ children, params }: LayoutProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user)
    redirect(`/auth/login?redirect=/v/${orgSlug}/${eventSlug}`);

  // Membership check : any active member of this event can access /v.
  // Sans membership → /hub (cas: vendor, ancien collaborateur, demande non finalisée).
  // Patch P1 : avant ce check, l'UI exposait le nom de l'org + nom event a tout user authentifie.
  // ⚠️ Un user peut avoir plusieurs memberships actives sur un même event (cas Sandy : volunteer + volunteer_lead).
  // On utilise .limit(1) + tri pour prendre le rôle le plus permissif (ordre alphabétique par
  // chance favorable à direction > post_lead > staff_scan > volunteer > volunteer_lead, on agrège is_mediator OR).
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, is_mediator, event:event_id (id, name, slug, organization:organization_id (id, slug, name))")
    .eq("user_id", userData.user.id)
    .eq("is_active", true)
    .filter("event.slug", "eq", eventSlug)
    .filter("event.organization.slug", "eq", orgSlug);

  // Agrège : pas de membership = pas d'accès.
  const allMemberships = (memberships ?? []) as any[];
  const membership = allMemberships.length > 0 ? allMemberships[0] : null;
  // is_mediator est true si UNE des memberships actives a is_mediator=true OU si une est direction.
  const aggregatedIsMediator = allMemberships.some(
    (mb) => mb.is_mediator === true || mb.role === "direction",
  );

  if (!membership) {
    redirect(`/hub`);
  }

  const m = membership as any;
  const ev = m.event;
  const orgId = ev?.organization?.id as string | undefined;
  const isMediator = aggregatedIsMediator;

  return (
    <TenantThemeProvider organizationId={orgId} fullHeight>
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-brand-cream">
        <header
          className="sticky top-0 z-10 border-b border-brand-ink/10 bg-white/80 px-4 py-3 backdrop-blur"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-xs font-medium uppercase tracking-widest"
                style={{ color: "var(--theme-primary, #FF5E5B)" }}
              >
                {ev?.organization?.name}
              </p>
              <h1 className="font-display text-lg font-semibold leading-tight">{ev?.name}</h1>
            </div>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-brand-ink/15 px-3 py-1 text-xs text-brand-ink/70 hover:bg-white"
              >
                Quitter
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4">{children}</main>

        {/* Bug #16 fix : sur mobile 412px, 6 colonnes étaient écrasées (mediators).
            On bascule en flex avec scroll horizontal seulement si médiateur (6 onglets) ;
            grille standard pour 5 onglets (chacun ~80px = 400px ≤ 412px). */}
        <nav
          aria-label="Navigation bénévole"
          className={`sticky bottom-0 z-10 border-t border-brand-ink/10 bg-white/95 backdrop-blur ${
            isMediator
              ? "flex overflow-x-auto px-2 pt-1.5"
              : "grid grid-cols-5 px-2 pt-1.5"
          }`}
          style={{
            WebkitOverflowScrolling: "touch",
            paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))",
          }}
        >
          <NavItem href={`/v/${orgSlug}/${eventSlug}`} label="Accueil" emoji="🏠" wide={isMediator} />
          <NavItem href={`/v/${orgSlug}/${eventSlug}/qr`} label="Mon QR" emoji="🎟️" wide={isMediator} />
          <NavItem href={`/v/${orgSlug}/${eventSlug}/planning`} label="Planning" emoji="🗓️" wide={isMediator} />
          <NavItem href={`/v/${orgSlug}/${eventSlug}/wellbeing`} label="Bien-être" emoji="💚" wide={isMediator} />
          <NavItem href={`/v/${orgSlug}/${eventSlug}/feed`} label="Fil" emoji="📣" wide={isMediator} />
          {isMediator && (
            <NavItem href={`/v/${orgSlug}/${eventSlug}/safer`} label="Safer" emoji="🛡️" wide />
          )}
        </nav>
      </div>
    </TenantThemeProvider>
  );
}

function NavItem({
  href,
  label,
  emoji,
  wide = false,
}: {
  href: string;
  label: string;
  emoji: string;
  wide?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium text-brand-ink/70 hover:bg-brand-ink/5 ${
        wide ? "min-w-[68px] flex-shrink-0" : ""
      }`}
    >
      <span aria-hidden className="text-lg">
        {emoji}
      </span>
      {label}
    </Link>
  );
}
