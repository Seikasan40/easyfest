/**
 * /poste/[orgSlug]/[eventSlug]/* — Layout espace responsable de poste (post_lead).
 * Auth obligatoire + check membership.role === "post_lead".
 * Direction/volunteer_lead peuvent aussi accéder pour debug (hierarchy <= 3).
 */
import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

const DARK = "#1A3828";
const MUTED = "rgba(255,255,255,0.60)";

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

  const { data: memberships } = await (supabase as any)
    .from("memberships")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("event_id", ev.id)
    .eq("is_active", true);

  const allowedRoles = ["post_lead", "volunteer_lead", "direction"];
  const hasAccess = (memberships ?? []).some((m: any) => allowedRoles.includes(m.role));
  if (!hasAccess) redirect("/hub");

  const orgName = (ev as any).organization?.name ?? "";
  const eventName = (ev as any).name ?? "";

  return (
    <div
      className="mx-auto min-h-screen w-full max-w-[430px] md:max-w-3xl"
      style={{ background: "#F8F4EC" }}
    >
      {/* Header */}
      <div
        className="px-5 pb-5"
        style={{
          background: DARK,
          paddingTop: "max(1rem, env(safe-area-inset-top))",
        }}
      >
        <p
          className="text-xs font-bold uppercase tracking-[0.2em] mb-1"
          style={{ color: MUTED }}
        >
          {orgName} · Resp. poste
        </p>
        <h1
          className="font-display text-2xl font-bold leading-tight"
          style={{ color: "#FFFFFF" }}
        >
          {eventName}
        </h1>
        <form action="/auth/logout" method="post" className="mt-3">
          <button
            type="submit"
            className="text-xs underline underline-offset-2"
            style={{ color: MUTED }}
          >
            Quitter
          </button>
        </form>
      </div>

      {/* Content */}
      <div className="px-4 py-5">
        {children}
      </div>
    </div>
  );
}
