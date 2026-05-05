"use server";

/**
 * Server Actions — Chat temps réel bidirectionnel
 *
 * Schéma existant :
 *   - message_channels.kind = enum (team, responsibles, regie, admin, direct)
 *   - message_channels.position_id pour les canaux team
 *   - message_channels.participant_user_ids uuid[] pour les canaux direct
 *   - messages.sender_user_id  ← colonne canonique (NOT NULL)
 *   - messages.author_user_id  ← alias ajouté par migration 20260505000001
 *
 * Isolation stricte :
 *   volunteer         → canal team de sa position uniquement
 *   post_lead         → canaux team + responsibles
 *   volunteer_lead    → canaux team + responsibles + regie
 *   direction         → tous les canaux sans exception
 */

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

interface ActionResult {
  ok: boolean;
  error?: string;
}

// ── Envoyer un message dans un canal ─────────────────────────────────────────

export async function sendChannelMessage(input: {
  channelId: string;
  content: string;
  orgSlug: string;
  eventSlug: string;
}): Promise<ActionResult> {
  const content = input.content.trim();
  if (!content) return { ok: false, error: "Message vide" };
  if (content.length > 2000) return { ok: false, error: "Message trop long (max 2000 car.)" };

  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  // Récupérer le canal + vérifier l'accès
  const { data: channel } = await supabase
    .from("message_channels")
    .select("id, event_id, kind, position_id, participant_user_ids")
    .eq("id", input.channelId)
    .maybeSingle();

  if (!channel) return { ok: false, error: "Canal introuvable" };
  const ch = channel as any;

  // Memberships actives sur l'event
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, position_id")
    .eq("user_id", userData.user.id)
    .eq("event_id", ch.event_id)
    .eq("is_active", true);

  const mbs = (memberships ?? []) as any[];
  if (mbs.length === 0) return { ok: false, error: "Aucun accès à cet événement" };

  const isDirection = mbs.some((m) => m.role === "direction");
  const isRegie = mbs.some((m) => ["direction", "volunteer_lead"].includes(m.role));
  const isLead = mbs.some((m) => ["direction", "volunteer_lead", "post_lead"].includes(m.role));
  const myPositionIds = mbs.map((m) => m.position_id).filter(Boolean);

  // Vérification selon kind
  switch (ch.kind) {
    case "team":
      if (!isRegie && !myPositionIds.includes(ch.position_id)) {
        return { ok: false, error: "Tu n'es pas dans cette équipe" };
      }
      break;
    case "responsibles":
      if (!isLead) return { ok: false, error: "Canal réservé aux responsables" };
      break;
    case "regie":
      if (!isRegie) return { ok: false, error: "Canal réservé à la régie" };
      break;
    case "admin":
      if (!isDirection) return { ok: false, error: "Canal réservé à la direction" };
      break;
    case "direct": {
      const participants = (ch.participant_user_ids ?? []) as string[];
      if (!participants.includes(userData.user.id)) {
        return { ok: false, error: "Tu n'es pas participant de ce canal direct" };
      }
      break;
    }
  }

  // Insérer le message — RLS valide en DB
  const { error } = await supabase.from("messages").insert({
    channel_id: input.channelId,
    sender_user_id: userData.user.id,
    author_user_id: userData.user.id,
    content,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/v/${input.orgSlug}/${input.eventSlug}/chat`);
  revalidatePath(`/regie/${input.orgSlug}/${input.eventSlug}/chat`);
  return { ok: true };
}

// ── Envoyer un message direct (DM) ───────────────────────────────────────────

export async function sendDirectMessage(input: {
  recipientUserId: string;
  content: string;
  orgSlug: string;
  eventSlug: string;
  eventId: string;
}): Promise<ActionResult> {
  const content = input.content.trim();
  if (!content) return { ok: false, error: "Message vide" };
  if (content.length > 2000) return { ok: false, error: "Message trop long (max 2000 car.)" };

  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };
  if (userData.user.id === input.recipientUserId)
    return { ok: false, error: "Tu ne peux pas t'écrire à toi-même" };

  // Vérifier que l'émetteur est membre actif
  const { data: senderMb } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("event_id", input.eventId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!senderMb) return { ok: false, error: "Aucun accès à cet événement" };

  // Trouver ou créer le canal direct
  // participant_user_ids contient les deux UUIDs (ordre non garanti, on cherche les deux)
  const { data: existingChannels } = await supabase
    .from("message_channels")
    .select("id, participant_user_ids")
    .eq("event_id", input.eventId)
    .eq("kind", "direct") as any;

  const existing = ((existingChannels ?? []) as any[]).find((c) => {
    const pts: string[] = c.participant_user_ids ?? [];
    return pts.includes(userData.user!.id) && pts.includes(input.recipientUserId);
  });

  let channelId: string;
  if (existing) {
    channelId = existing.id;
  } else {
    const { data: newChannel, error: chErr } = await supabase
      .from("message_channels")
      .insert({
        event_id: input.eventId,
        kind: "direct",
        name: `direct-${userData.user.id.slice(0, 6)}-${input.recipientUserId.slice(0, 6)}`,
        participant_user_ids: [userData.user.id, input.recipientUserId],
      })
      .select("id")
      .single();
    if (chErr || !newChannel)
      return { ok: false, error: chErr?.message ?? "Erreur création canal direct" };
    channelId = (newChannel as any).id;
  }

  const { error } = await supabase.from("messages").insert({
    channel_id: channelId,
    sender_user_id: userData.user.id,
    author_user_id: userData.user.id,
    content,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/v/${input.orgSlug}/${input.eventSlug}/chat`);
  return { ok: true };
}

// ── Marquer canal comme lu ────────────────────────────────────────────────────

export async function markChannelRead(input: { channelId: string }): Promise<ActionResult> {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const { error } = await supabase.from("message_reads").upsert(
    {
      user_id: userData.user.id,
      channel_id: input.channelId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "user_id,channel_id" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
