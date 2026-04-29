"use server";

import { revalidatePath } from "next/cache";

import { createServerClient } from "@/lib/supabase/server";

interface BroadcastInput {
  eventId: string;
  target: "all" | "responsibles" | "regie" | "team";
  positionId?: string;
  content: string;
}

export async function broadcastMessage(input: BroadcastInput) {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  // Trouver ou créer le channel approprié
  let channelKind: "team" | "responsibles" | "regie" | "admin" = "admin";
  let channelName = "Annonces";
  let channelColor = "#FF5E5B";

  if (input.target === "team") {
    if (!input.positionId) return { ok: false, error: "positionId requis pour cible team" };
    channelKind = "team";
    const { data: pos } = await supabase
      .from("positions")
      .select("name, color")
      .eq("id", input.positionId)
      .maybeSingle();
    channelName = `Équipe ${pos?.name ?? ""}`;
    channelColor = pos?.color ?? "#FF5E5B";
  } else if (input.target === "responsibles") {
    channelKind = "responsibles";
    channelName = "Responsables";
    channelColor = "#F59E0B";
  } else if (input.target === "regie") {
    channelKind = "regie";
    channelName = "Régie";
    channelColor = "#EF4444";
  }

  // Trouver le channel
  let { data: channel } = await supabase
    .from("message_channels")
    .select("id")
    .eq("event_id", input.eventId)
    .eq("kind", channelKind)
    .filter("position_id", input.positionId ? "eq" : "is", input.positionId ?? null)
    .maybeSingle();

  if (!channel) {
    const { data: newChannel, error: chanErr } = await supabase
      .from("message_channels")
      .insert({
        event_id: input.eventId,
        kind: channelKind,
        name: channelName,
        position_id: input.positionId ?? null,
        color: channelColor,
      })
      .select("id")
      .single();
    if (chanErr || !newChannel) {
      return { ok: false, error: chanErr?.message ?? "Channel creation failed" };
    }
    channel = newChannel;
  }

  // Insert message
  const { error: msgErr } = await supabase.from("messages").insert({
    channel_id: channel.id,
    sender_user_id: userData.user.id,
    content: input.content,
    is_broadcast: input.target === "all" || input.target === "team",
  });

  if (msgErr) return { ok: false, error: msgErr.message };

  // Compter les destinataires (best-effort)
  let recipientsCount = 0;
  if (input.target === "all") {
    const { count } = await supabase
      .from("memberships")
      .select("*", { count: "exact", head: true })
      .eq("event_id", input.eventId)
      .eq("is_active", true);
    recipientsCount = count ?? 0;
  } else if (input.target === "team" && input.positionId) {
    const { count } = await supabase
      .from("memberships")
      .select("*", { count: "exact", head: true })
      .eq("event_id", input.eventId)
      .eq("position_id", input.positionId)
      .eq("is_active", true);
    recipientsCount = count ?? 0;
  }

  await supabase.from("audit_log").insert({
    user_id: userData.user.id,
    event_id: input.eventId,
    action: "broadcast.sent",
    payload: { target: input.target, recipients_count: recipientsCount },
  });

  revalidatePath("/regie", "layout");
  return { ok: true, recipientsCount };
}
