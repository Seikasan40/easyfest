import { redirect } from "next/navigation";
import Link from "next/link";

import { TenantThemeProvider } from "@/components/TenantThemeProvider";
import { createServerClient } from "@/lib/supabase/server";
import { BottomNav } from "./_components/BottomNav";

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

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, is_mediator, event:event_id (id, name, slug, organization:organization_id (id, slug, name))")
    .eq("user_id", userData.user.id)
    .eq("is_active", true)
    .filter("event.slug", "eq", eventSlug)
    .filter("event.organization.slug", "eq", orgSlug);

  const allMemberships = (memberships ?? []) as any[];
  const membership = allMemberships.length > 0 ? allMemberships[0] : null;

  if (!membership) redirect(`/hub`);

  const m = membership as any;
  const orgId = m.event?.organization?.id as string | undefined;

  return (
    <TenantThemeProvider organizationId={orgId} fullHeight>
      {/*
        BottomNav rend deux variantes CSS :
          • Desktop (≥ md)  → sticky top-0    : doit être AVANT <main>
          • Mobile  (< md)  → fixed  bottom-0 : position fixe, DOM order indifférent
        On le place en tête du flex pour que le sticky desktop fonctionne.
      */}
      <div
        className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col md:max-w-2xl"
        style={{ background: "#F8F4EC" }}
      >
        {/* Mini header with back-to-hub link */}
        <div
          className="flex items-center px-4 py-2"
          style={{
            background: "#1A3828",
            paddingTop: "max(0.5rem, env(safe-area-inset-top))",
          }}
        >
          <Link
            href={`/hub?event=${eventSlug}`}
            className="inline-flex items-center gap-1 text-xs font-semibold"
            style={{ color: "rgba(255,255,255,0.60)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Changer de rôle
          </Link>
        </div>

        <BottomNav orgSlug={orgSlug} eventSlug={eventSlug} />

        <main
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: "max(5rem, env(safe-area-inset-bottom))" }}
        >
          {children}
        </main>
      </div>
    </TenantThemeProvider>
  );
}
