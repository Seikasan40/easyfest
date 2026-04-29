import { redirect } from "next/navigation";
import Link from "next/link";

import { createServerClient } from "@/lib/supabase/server";

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
    .select("id, name, organization:organization_id (slug, name)")
    .eq("slug", eventSlug)
    .maybeSingle();

  if (!ev) redirect("/hub");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("event_id", ev.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!membership || !["direction", "volunteer_lead"].includes(membership.role)) {
    redirect("/hub");
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="sticky top-0 z-10 border-b border-brand-ink/10 bg-white/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-brand-coral">
              {(ev as any).organization?.name} · Régie
            </p>
            <h1 className="font-display text-xl font-semibold leading-tight">{ev.name}</h1>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <NavTab href={`/regie/${orgSlug}/${eventSlug}`} label="Dashboard" />
            <NavTab href={`/regie/${orgSlug}/${eventSlug}/applications`} label="Candidatures" />
            <NavTab href={`/regie/${orgSlug}/${eventSlug}/planning`} label="Planning" />
            <NavTab href={`/regie/${orgSlug}/${eventSlug}/safer`} label="Safer" />
            <NavTab href={`/regie/${orgSlug}/${eventSlug}/messages`} label="Messages" />
          </nav>
          <form action="/auth/logout" method="post">
            <button className="rounded-lg border border-brand-ink/15 px-3 py-1 text-xs">
              Quitter
            </button>
          </form>
        </div>
      </header>

      <div className="px-6 py-6">{children}</div>
    </div>
  );
}

function NavTab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-1.5 font-medium text-brand-ink/70 hover:bg-brand-ink/5"
    >
      {label}
    </Link>
  );
}
