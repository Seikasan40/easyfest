import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

import { ChatView } from "./ChatView";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
  searchParams: Promise<{ dm?: string }>;
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
export default async function ChatPage({ params, searchParams }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const { dm: dmUserId } = await searchParams;
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
    .select("id, name, kind, position_id, participant_user_ids, positions:position_id (name, icon)")
    .eq("event_id", eventId)
    .order("kind")
    .order("name");

  // Résoudre les noms des interlocuteurs pour les canaux DM
  const dmChannels = (rawChannels ?? []).filter((c: any) => c.kind === "direct" || c.kind === "dm");
  const otherUserIds = [
    ...new Set(
      dmChannels.flatMap((c: any) =>
        ((c.participant_user_ids ?? []) as string[]).filter((id) => id !== userData.user!.id),
      ),
    ),
  ];
  const dmNameMap: Record<string, string> = {};
  if (otherUserIds.length > 0) {
    const { data: apps } = await supabase
      .from("volunteer_applications")
      .select("user_id, full_name")
      .eq("event_id", eventId)
      .in("user_id", otherUserIds);
    for (const a of apps ?? []) {
      if (a.user_id) dmNameMap[a.user_id] = a.full_name ?? "Interlocuteur";
    }
  }

  // Mapper vers un format UI
  type RawCh = {
    id: string;
    name: string;
    kind: "team" | "leadership" | "dm";
    position_id: string | null;
    participant_user_ids: string[] | null;
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

  // ── Trouver ou créer le canal direct si ?dm=userId ─────────────────────────
  let dmChannelId: string | null = null;
  if (dmUserId && dmUserId !== userData.user.id) {
    // Chercher canal direct existant entre les deux users
    const existing = allChannels.find((ch) => {
      if (ch.kind !== "dm") return false;
      const pts: string[] = ch.participant_user_ids ?? [];
      return pts.includes(userData.user!.id) && pts.includes(dmUserId!);
    });

    if (existing) {
      dmChannelId = existing.id;
    } else {
      // Créer le canal direct
      const { data: newCh } = await supabase
        .from("message_channels")
        .insert({
          event_id: eventId,
          kind: "direct",
          name: `dm-${[userData.user.id, dmUserId].sort().join("-").slice(0, 40)}`,
          participant_user_ids: [userData.user.id, dmUserId],
        } as any)
        .select("id")
        .single();
      if (newCh) dmChannelId = (newCh as any).id;
    }
  }

  const uiChannels = visibleChannels.map((ch) => {
    let dmLabel = "Message direct";
    if (ch.kind === "dm") {
      const otherId = ((ch.participant_user_ids ?? []) as string[]).find(
        (id) => id !== userData.user!.id,
      );
      if (otherId && dmNameMap[otherId]) dmLabel = `DM : ${dmNameMap[otherId]}`;
    }
    return {
      id: ch.id,
      name: ch.name,
      kind: ch.kind,
      position_id: ch.position_id,
      label:
        ch.kind === "leadership"
          ? "Régie / Direction"
          : ch.kind === "dm"
            ? dmLabel
            : ch.positions?.name ?? ch.name,
      emoji:
        ch.kind === "leadership"
          ? "🎛️"
          : ch.kind === "dm"
            ? "💌"
            : (ch.positions?.icon ?? "👥"),
    };
  });

  // Si un canal DM a été trouvé/créé et n'est pas encore dans la liste, l'ajouter
  let finalChannels = uiChannels;
  let defaultChannelId = dmChannelId ?? uiChannels[0]?.id;
  if (dmChannelId && !uiChannels.find((c) => c.id === dmChannelId)) {
    // Récupérer le nom du destinataire si possible
    let newDmLabel = "Message direct";
    if (dmUserId && dmNameMap[dmUserId]) {
      newDmLabel = `DM : ${dmNameMap[dmUserId]}`;
    } else if (dmUserId) {
      const { data: app } = await supabase
        .from("volunteer_applications")
        .select("full_name")
        .eq("event_id", eventId)
        .eq("user_id", dmUserId)
        .maybeSingle();
      if (app?.full_name) newDmLabel = `DM : ${app.full_name}`;
    }
    finalChannels = [
      {
        id: dmChannelId,
        name: newDmLabel,
        kind: "dm",
        position_id: null,
        label: newDmLabel,
        emoji: "💌",
      },
      ...uiChannels,
    ];
  }

  return (
    <ChatView
      channels={finalChannels}
      currentUserId={userData.user.id}
      orgSlug={orgSlug}
      eventSlug={eventSlug}
      defaultChannelId={defaultChannelId}
    />
  );
}
