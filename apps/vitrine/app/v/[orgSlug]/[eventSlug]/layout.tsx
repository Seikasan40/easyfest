import { redirect } from "next/navigation";
import Link from "next/link";

import { createServerClient } from "@/lib/supabase/server";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function VolunteerLayout({ children, params }: LayoutProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/auth/login?redirect=/v/${orgSlug}/${eventSlug}`);

  const { data: ev } = await supabase
    .from("events")
    .select("id, name, slug, organization:organization_id (slug, name)")
    .eq("slug", eventSlug)
    .maybeSingle();

  if (!ev || (ev as any).organization?.slug !== orgSlug) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-brand-cream">
      <header className="sticky top-0 z-10 border-b border-brand-ink/10 bg-white/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-brand-coral">
              {(ev as any).organization?.name}
            </p>
            <h1 className="font-display text-lg font-semibold leading-tight">{ev.name}</h1>
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

      <nav className="sticky bottom-0 z-10 grid grid-cols-5 border-t border-brand-ink/10 bg-white/95 px-2 py-1.5 backdrop-blur">
        <NavItem href={`/v/${orgSlug}/${eventSlug}`} label="Accueil" emoji="🏠" />
        <NavItem href={`/v/${orgSlug}/${eventSlug}/qr`} label="Mon QR" emoji="🎟️" />
        <NavItem href={`/v/${orgSlug}/${eventSlug}/planning`} label="Planning" emoji="🗓️" />
        <NavItem href={`/v/${orgSlug}/${eventSlug}/wellbeing`} label="Bien-être" emoji="💚" />
        <NavItem href={`/v/${orgSlug}/${eventSlug}/feed`} label="Fil" emoji="📣" />
      </nav>
    </div>
  );
}

function NavItem({ href, label, emoji }: { href: string; label: string; emoji: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium text-brand-ink/70 hover:bg-brand-ink/5"
    >
      <span aria-hidden className="text-lg">
        {emoji}
      </span>
      {label}
    </Link>
  );
}
