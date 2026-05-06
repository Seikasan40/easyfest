import { redirect } from "next/navigation";

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
      {/* Coque proto : fond crème chaud, max 430px, centré */}
      <div
        className="mx-auto flex min-h-screen max-w-[430px] flex-col"
        style={{ background: "#F8F4EC" }}
      >
        <main
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: "0" }}
        >
          {children}
        </main>
        <BottomNav orgSlug={orgSlug} eventSlug={eventSlug} />
      </div>
    </TenantThemeProvider>
  );
}
