"use client";

import { useEffect, useRef, useState } from "react";
import { markChannelRead } from "@/app/actions/chat";
import { useRealtimeMessages } from "./useRealtimeMessages";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

interface Channel {
  id: string;
  name: string;
  kind: "team" | "leadership" | "dm";
  position_id: string | null;
  label: string;       // Nom affiché
  emoji: string;
}

interface Props {
  channels: Channel[];
  currentUserId: string;
  orgSlug: string;
  eventSlug: string;
  defaultChannelId?: string;
}

export function ChatView({
  channels,
  currentUserId,
  orgSlug,
  eventSlug,
  defaultChannelId,
}: Props) {
  const [activeChannelId, setActiveChannelId] = useState<string | null>(
    defaultChannelId ?? channels[0]?.id ?? null,
  );
  const { messages, loading } = useRealtimeMessages(activeChannelId);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas à chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Marquer comme lu à l'ouverture et à chaque changement de canal
  useEffect(() => {
    if (activeChannelId) {
      markChannelRead({ channelId: activeChannelId });
    }
  }, [activeChannelId]);

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-4xl">💬</p>
        <p className="mt-3 font-medium text-brand-ink/70">Aucun salon disponible</p>
        <p className="mt-1 text-sm text-brand-ink/50">
          La régie n'a pas encore créé de canal pour cet événement.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Onglets canaux ── */}
      <div className="flex gap-1 overflow-x-auto border-b border-brand-ink/10 bg-white px-2 py-2">
        {channels.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => setActiveChannelId(ch.id)}
            className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              ch.id === activeChannelId
                ? "bg-[var(--theme-primary,_#FF5E5B)] text-white"
                : "bg-brand-ink/5 text-brand-ink/60 hover:bg-brand-ink/10"
            }`}
          >
            {ch.emoji} {ch.label}
          </button>
        ))}
      </div>

      {/* ── Titre canal actif ── */}
      {activeChannel && (
        <div className="border-b border-brand-ink/5 bg-white/80 px-4 py-2">
          <p className="text-xs font-semibold text-brand-ink/60">
            {activeChannel.emoji} {activeChannel.label}
            {activeChannel.kind === "leadership" && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] text-amber-800">
                Régie uniquement
              </span>
            )}
          </p>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-ink/20 border-t-[var(--theme-primary,_#FF5E5B)]" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="py-8 text-center text-sm text-brand-ink/50">
            Pas encore de message. Sois le premier à écrire ! 👋
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} currentUserId={currentUserId} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      {activeChannelId && (
        <ChatInput channelId={activeChannelId} orgSlug={orgSlug} eventSlug={eventSlug} />
      )}
    </div>
  );
}
