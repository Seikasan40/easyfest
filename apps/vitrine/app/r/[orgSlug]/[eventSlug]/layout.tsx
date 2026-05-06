/**
 * /r/[orgSlug]/[eventSlug]/* — Layout Responsable Bénévoles.
 * Hiérarchie 2 : volunteer_lead.
 * Style : proto vert forêt #1A3828, nav tabs or, fond crème.
 */
import { redirect } from "next/navigation";

import { TenantThemeProvider } from "@/components/TenantThemeProvider";
import { createServerClient } from "@/lib/supabase/server";
import { RNav } from "./RNav";

interface Props {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function RLayout({ children, params }: Props) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/auth/login?redirect=/r/${orgSlug}/${eventSlug}`);

  const { data: ev } = await supabase
    .from("events")
    .select("id, name, organization:organization_id (id, slug, name)")
    .eq("slug", eventSlug)
    .maybeSingle();

  if (!ev) redirect("/hub");

  const orgId = (ev as any).organization?.id as string | undefined;

  // Accès : volunteer_lead uniquement (pas direction — eux ont /regie)
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("event_id", ev.id)
    .eq("is_active", true);

  const allowedRoles = ["volunteer_lead", "direction"];
  const hasAccess = (memberships ?? []).some((m: any) => allowedRoles.includes(m.role));
  if (!hasAccess) redirect("/hub");

  const orgName = (ev as any).organization?.name ?? "";
  const eventName = ev.name ?? "";

  const now = new Date();
  const timeFr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const dayFr = now.toLocaleDateString("fr-FR", { weekday: "long" });
  const dayCapitalized = dayFr.charAt(0).toUpperCase() + dayFr.slice(1);

  return (
    <TenantThemeProvider organizationId={orgId} fullHeight>
      <div
        className="mx-auto min-h-screen max-w-[430px]"
        style={{ background: "#F8F4EC" }}
      >
        {/* Header dark */}
        <div
          className="sticky top-0 z-20"
          style={{ background: "#1A3828" }}
        >
          <div className="px-5 pt-14 pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p
                  className="text-xs font-bold uppercase tracking-[0.18em] mb-0.5"
                  style={{ color: "rgba(255,255,255,0.50)" }}
                >
                  {orgName} · Resp. bénévoles
                </p>
                <h1 className="font-display text-2xl font-bold leading-tight text-white truncate">
                  {eventName}
                </h1>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                    {dayCapitalized} · {timeFr}
                  </span>
                  <span
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: "rgba(196,154,44,0.20)", color: "#C49A2C" }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full inline-block"
                      style={{ background: "#C49A2C" }}
                    />
                    RESP.
                  </span>
                </div>
              </div>
              <form action="/auth/logout" method="post" className="mt-1 flex-shrink-0">
                <button
                  type="submit"
                  className="rounded-xl px-3 py-2 text-xs font-semibold transition"
                  style={{
                    background: "rgba(255,255,255,0.10)",
                    color: "rgba(255,255,255,0.70)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  Quitter
                </button>
              </form>
            </div>
          </div>

          {/* Nav tabs */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <RNav orgSlug={orgSlug} eventSlug={eventSlug} />
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-5">
          {children}
        </div>
      </div>
    </TenantThemeProvider>
  );
}
