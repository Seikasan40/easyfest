"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";

export interface ChatMessage {
  id: string;
  channel_id: string;
  author_user_id: string | null;
  content: string;
  created_at: string;
  kind: "channel" | "dm";
  recipient_user_id: string | null;
  author_profile?: {
    first_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

/**
 * Hook Realtime pour un canal de chat.
 * Charge les 50 derniers messages puis s'abonne aux nouvelles insertions.
 */
export function useRealtimeMessages(channelId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseRef = useRef<any>(null);

  // Lazy-init du client Supabase côté browser
  if (!supabaseRef.current) {
    supabaseRef.current = createBrowserClient();
  }
  const supabase = supabaseRef.current;

  const fetchMessages = useCallback(
    async (cid: string) => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("messages")
        .select(
          `id, channel_id, author_user_id, content, created_at, kind, recipient_user_id,
           author_profile:author_user_id (first_name, full_name, avatar_url)`,
        )
        .eq("channel_id", cid)
        .order("created_at", { ascending: true })
        .limit(50);
      setMessages((data as ChatMessage[]) ?? []);
      setLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      return;
    }

    fetchMessages(channelId);

    // Abonnement Realtime aux INSERT sur ce canal
    const subscription = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload: any) => {
          const newMsg = payload.new as ChatMessage;
          // Enrichir avec le profil auteur
          const { data: authorProfile } = await (supabase as any)
            .from("volunteer_profiles")
            .select("first_name, full_name, avatar_url")
            .eq("user_id", newMsg.author_user_id)
            .maybeSingle();
          setMessages((prev) => [
            ...prev,
            { ...newMsg, author_profile: authorProfile ?? null },
          ]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [channelId, fetchMessages, supabase]);

  return { messages, loading };
}
