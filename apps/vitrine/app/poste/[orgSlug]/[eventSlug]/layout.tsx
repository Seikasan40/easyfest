/**
 * /poste/[orgSlug]/[eventSlug]/* — Layout espace responsable de poste (post_lead).
 * Auth obligatoire + check membership.role === "post_lead".
 * Direction/volunteer_lead peuvent aussi accéder pour debug (hierarchy <= 3).
 */
import { redirect } from "next/navigation";

import { TenantThemeProvider } from "@/components/TenantThemeProvider";
import { createServerClient } from "@/lib/supabase/server";

interface Props {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function PosteLayout({ children, params }: Props) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/auth/login?redirect=/poste/${orgSlug}/${eventSlug}`);

  const { data: ev } = await supabase
    .from("events")
    .select("id, name, organization:organization_id (id, slug, name)")
    .eq("slug", eventSlug)
    .maybeSingle();

  if (!ev) redirect("/hub");

  const orgId = (ev as any).organization?.id as string | undefined;

  const { data: memberships } = await (supabase as any)
    .from("memberships")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("event_id", ev.id)
    .eq("is_active", true);

  const allowedRoles = ["post_lead", "volunteer_lead", "direction"];
  const hasAccess = (memberships ?? []).some((m: any) => allowedRoles.includes(m.role));
  if (!hasAccess) redirect("/hub");

  return (
    <TenantThemeProvider organizationId={orgId} fullHeight>
      <div className="mx-auto max-w-3xl">
        <header
          className="sticky top-0 z-10 border-b border-brand-ink/10 bg-white/95 px-4 py-3 backdrop-blur sm:px-6"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-xs font-medium uppercase tracking-widest"
                style={{ color: "var(--theme-primary, #FF5E5B)" }}
              >
                {(ev as any).organization?.name} · Resp. poste
              </p>
              <h1 className="truncate font-display text-xl font-semibold leading-tight">
                {(ev as any).name}
              </h1>
            </div>
            <form action="/auth/logout" method="post">
              <button className="min-h-[44px] rounded-lg border border-brand-ink/15 px-3 py-2 text-xs font-medium hover:bg-brand-ink/5">
                Quitter
              </button>
            </form>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6">{children}</div>
      </div>
    </TenantThemeProvider>
  );
}
