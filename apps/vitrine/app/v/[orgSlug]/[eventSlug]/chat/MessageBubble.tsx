"use client";

import type { ChatMessage } from "./useRealtimeMessages";

interface Props {
  message: ChatMessage;
  currentUserId: string;
}

export function MessageBubble({ message, currentUserId }: Props) {
  const isOwn = message.author_user_id === currentUserId;
  const authorName =
    message.author_profile?.first_name ??
    message.author_profile?.full_name?.split(" ")[0] ??
    "?";
  const avatarUrl = message.author_profile?.avatar_url ?? null;
  const initials = authorName[0]?.toUpperCase() ?? "?";
  const time = new Date(message.created_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      {!isOwn && (
        <div className="flex-shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--theme-primary,_#FF5E5B)]/15 text-xs font-bold text-[var(--theme-primary,_#FF5E5B)]">
              {initials}
            </div>
          )}
        </div>
      )}

      <div className={`max-w-[80%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        {!isOwn && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-ink/50">
            {authorName}
          </span>
        )}
        <div
          className={`rounded-2xl px-3 py-2 text-sm leading-snug ${
            isOwn
              ? "rounded-tr-sm bg-[var(--theme-primary,_#FF5E5B)] text-white"
              : "rounded-tl-sm border border-brand-ink/10 bg-white text-brand-ink"
          }`}
        >
          {message.content}
        </div>
        <span className="text-[9px] text-brand-ink/40">{time}</span>
      </div>
    </div>
  );
}
