/**
 * /staff/[orgSlug]/[eventSlug]/* — Layout scanner terrain (staff_scan).
 * Style: mode sombre, fond #0D1F14, coins dorés, comme le prototype.
 * Auth + check rôle staff_scan / is_entry_scanner.
 */
import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

interface Props {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function StaffLayout({ children, params }: Props) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/auth/login?redirect=/staff/${orgSlug}/${eventSlug}`);

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, is_entry_scanner, event:event_id (id, name, slug, organization:organization_id (id, slug, name))")
    .eq("user_id", userData.user.id)
    .eq("is_active", true)
    .filter("event.slug", "eq", eventSlug);

  const all = (memberships ?? []) as any[];
  const allowedRoles = ["direction", "volunteer_lead", "post_lead", "staff_scan"];
  const hasAccess = all.some(
    (m) => allowedRoles.includes(m.role) || m.is_entry_scanner === true,
  );
  if (!hasAccess) redirect("/hub");

  const membership = all[0]!;
  const eventName = (membership as any).event?.name ?? eventSlug;
  const orgName = (membership as any).event?.organization?.name ?? orgSlug;

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col md:max-w-3xl"
      style={{ background: "#0D1F14" }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-5 pb-4"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          paddingTop: "max(1rem, env(safe-area-inset-top))",
        }}
      >
        <p
          className="text-xs font-bold uppercase tracking-[0.2em] mb-0.5"
          style={{ color: "rgba(196,154,44,0.80)" }}
        >
          {orgName} · Mode terrain
        </p>
        <h1
          className="font-display text-xl font-bold"
          style={{ color: "#FFFFFF" }}
        >
          {eventName}
        </h1>
      </div>

      {/* Content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>
    </div>
  );
}
