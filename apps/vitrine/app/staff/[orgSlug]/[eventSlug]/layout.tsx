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

  // Vérifier rôle staff_scan ou supérieur OU is_entry_scanner
  const { data: membership } = await supabase
    .from("memberships")
    .select("role, is_entry_scanner, event:event_id (id, name, slug, organization:organization_id (slug, name))")
    .eq("user_id", userData.user.id)
    .eq("is_active", true)
    .filter("event.slug", "eq", eventSlug)
    .maybeSingle();

  if (
    !membership ||
    (!["direction", "volunteer_lead", "post_lead", "staff_scan"].includes(membership.role) &&
      !membership.is_entry_scanner)
  ) {
    redirect(`/hub`);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-brand-ink text-white">
      <header className="px-4 py-3 border-b border-white/10">
        <p className="text-xs uppercase tracking-widest text-brand-coral">Staff terrain</p>
        <h1 className="font-display text-lg font-bold">{(membership as any).event?.name}</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-4">{children}</main>
    </div>
  );
}
