/**
 * /regie/[orgSlug]/[eventSlug]/* — Layout régie / direction.
 * Style: proto vert forêt #1A3828, nav horizontale scrollable.
 * Auth + check direction | volunteer_lead.
 */
import { redirect } from "next/navigation";
import Link from "next/link";

import { TenantThemeProvider } from "@/components/TenantThemeProvider";
import { createServerClient } from "@/lib/supabase/server";
import { RegieNav } from "./RegieNav";

interface Props {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function RegieLayout({ children, params }: Props) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/auth/login?redirect=/regie/${orgSlug}/${eventSlug}`);

  const { data: ev } = await supabase
    .from("events")
    .select("id, name, organization:organization_id (id, slug, name)")
    .eq("slug", eventSlug)
    .maybeSingle();

  if (!ev) redirect("/hub");

  const orgId = (ev as any).organization?.id as string | undefined;

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("event_id", ev.id)
    .eq("is_active", true);

  const allowedRoles = ["direction", "volunteer_lead"];
  const hasAccess = (memberships ?? []).some((m: any) => allowedRoles.includes(m.role));
  if (!hasAccess) redirect("/hub");

  const orgName = (ev as any).organization?.name ?? "";
  const eventName = ev.name ?? "";

  // Calcul heure locale pour le header "LIVE"
  const now = new Date();
  const timeFr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const dayFr = now.toLocaleDateString("fr-FR", { weekday: "long" });
  const dayCapitalized = dayFr.charAt(0).toUpperCase() + dayFr.slice(1);

  return (
    <TenantThemeProvider organizationId={orgId} fullHeight>
      <div
        className="mx-auto min-h-screen w-full max-w-[430px] md:max-w-5xl"
        style={{ background: "#F8F4EC" }}
      >
        {/* Header dark */}
        <div
          className="sticky top-0 z-20"
          style={{ background: "#1A3828" }}
        >
          <div
            className="px-5 pb-3"
            style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
          >
            {/* Ligne titre + actions */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p
                  className="text-xs font-bold uppercase tracking-[0.18em] mb-0.5"
                  style={{ color: "rgba(255,255,255,0.50)" }}
                >
                  {orgName}
                </p>
                <h1
                  className="font-display text-2xl font-bold leading-tight text-white truncate"
                >
                  {eventName}
                </h1>
                {/* LIVE badge */}
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                    {dayCapitalized} · {timeFr}
                  </span>
                  <span
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: "rgba(16,185,129,0.20)", color: "#10B981" }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
                    LIVE
                  </span>
                </div>
              </div>
              <div className="mt-1 flex-shrink-0 flex flex-col items-end gap-1.5">
                <Link
                  href={`/hub?event=${eventSlug}`}
                  className="rounded-xl px-3 py-2 text-xs font-semibold transition"
                  style={{
                    background: "rgba(255,255,255,0.10)",
                    color: "rgba(255,255,255,0.70)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  ← Changer de rôle
                </Link>
                <form action="/auth/logout" method="post">
                  <button
                    type="submit"
                    className="text-[10px] underline underline-offset-2"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    Se déconnecter
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Nav tabs */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <RegieNav orgSlug={orgSlug} eventSlug={eventSlug} />
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
