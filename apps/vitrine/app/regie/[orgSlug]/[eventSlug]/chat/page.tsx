import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

// On réutilise ChatView (composant partagé depuis /v)
import { ChatView } from "@/app/v/[orgSlug]/[eventSlug]/chat/ChatView";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

/**
 * Chat régie — accès à TOUS les canaux de l'événement.
 * La régie peut parler dans tous les salons équipes + salon leadership.
 */
export default async function RegieChatPage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/auth/login`);

  // Vérifier que l'utilisateur est bien régie/direction sur cet event
  const { data: ev } = await supabase
    .from("events")
    .select("id, name, organization:organization_id (slug)")
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev) redirect(`/regie/${orgSlug}`);
  const eventId = (ev as any).id as string;

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("event_id", eventId)
    .eq("is_active", true)
    .in("role", ["direction", "volunteer_lead", "post_lead"])
    .limit(1)
    .maybeSingle();

  if (!membership) redirect(`/regie/${orgSlug}/${eventSlug}`);

  // Tous les canaux (RLS + filtre applicatif rôle élevé = tout)
  const { data: rawChannels } = await supabase
    .from("message_channels")
    .select("id, name, kind, position_id, positions:position_id (name, icon)")
    .eq("event_id", eventId)
    .order("kind")
    .order("name");

  type RawCh = {
    id: string;
    name: string;
    kind: "team" | "leadership" | "dm";
    position_id: string | null;
    positions: { name: string; icon: string | null } | null;
  };

  const uiChannels = ((rawChannels ?? []) as RawCh[]).map((ch) => ({
    id: ch.id,
    name: ch.name,
    kind: ch.kind,
    position_id: ch.position_id,
    label:
      ch.kind === "leadership"
        ? "Régie / Direction"
        : ch.kind === "dm"
          ? "Message direct"
          : ch.positions?.name ?? ch.name,
    emoji:
      ch.kind === "leadership"
        ? "🎛️"
        : ch.kind === "dm"
          ? "💌"
          : (ch.positions?.icon ?? "👥"),
  }));

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border border-brand-ink/10 bg-white overflow-hidden">
      <div className="border-b border-brand-ink/10 px-4 py-3">
        <h2 className="font-display text-lg font-bold">Chat équipes</h2>
        <p className="text-xs text-brand-ink/60">
          Tu as accès à tous les salons. Les bénévoles ne voient que leur équipe.
        </p>
      </div>
      <ChatView
        channels={uiChannels}
        currentUserId={userData.user.id}
        orgSlug={orgSlug}
        eventSlug={eventSlug}
        defaultChannelId={uiChannels[0]?.id}
      />
    </div>
  );
}
