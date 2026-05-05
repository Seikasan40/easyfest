import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

import { ChatView } from "./ChatView";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

/**
 * Page chat bénévole.
 *
 * Isolation par rôle :
 *   - volunteer / staff_scan : canaux de leur position uniquement + DMs vers leurs responsables
 *   - post_lead              : tous les canaux team + leadership
 *   - volunteer_lead         : idem post_lead
 *   - direction              : tous les canaux sans exception
 *
 * La RLS Postgres est la source de vérité.
 * On construit ici l'UI uniquement avec les canaux auxquels l'user a accès.
 */
export default async function ChatPage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/auth/login?redirect=/v/${orgSlug}/${eventSlug}/chat`);

  // Event
  const { data: ev } = await supabase
    .from("events")
    .select("id, name, organization:organization_id (slug)")
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev) redirect(`/v/${orgSlug}/${eventSlug}`);
  const eventId = (ev as any).id as string;

  // Memberships actives de l'user sur cet event
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, position_id, is_active")
    .eq("user_id", userData.user.id)
    .eq("event_id", eventId)
    .eq("is_active", true);

  const mbs = (memberships ?? []) as any[];
  if (mbs.length === 0) redirect(`/v/${orgSlug}/${eventSlug}`);

  const isRegie = mbs.some((m: any) =>
    ["direction", "volunteer_lead", "post_lead"].includes(m.role),
  );
  const myPositionIds: string[] = mbs.map((m: any) => m.position_id).filter(Boolean);

  // Canaux accessibles — RLS filtre déjà, mais on enrichit avec le nom de la position
  const { data: rawChannels } = await supabase
    .from("message_channels")
    .select("id, name, kind, position_id, positions:position_id (name, icon)")
    .eq("event_id", eventId)
    .order("kind")
    .order("name");

  // Mapper vers un format UI
  type RawCh = {
    id: string;
    name: string;
    kind: "team" | "leadership" | "dm";
    position_id: string | null;
    positions: { name: string; icon: string | null } | null;
  };

  const allChannels = (rawChannels ?? []) as RawCh[];

  // Pour un bénévole normal, on filtre côté applicatif pour ne montrer que sa position
  const visibleChannels = allChannels.filter((ch) => {
    if (isRegie) return true; // la régie voit tout
    if (ch.kind === "leadership") return false; // bénévole ne voit pas leadership
    if (ch.kind === "team" && ch.position_id) {
      return myPositionIds.includes(ch.position_id);
    }
    if (ch.kind === "dm") return true; // les DMs sont filtrés par RLS
    return false;
  });

  const uiChannels = visibleChannels.map((ch) => ({
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
    <ChatView
      channels={uiChannels}
      currentUserId={userData.user.id}
      orgSlug={orgSlug}
      eventSlug={eventSlug}
      defaultChannelId={uiChannels[0]?.id}
    />
  );
}
