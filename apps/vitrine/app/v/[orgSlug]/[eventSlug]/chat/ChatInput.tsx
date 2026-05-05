"use client";

import { useRef, useState, useTransition } from "react";

import { sendChannelMessage } from "@/app/actions/chat";

interface Props {
  channelId: string;
  orgSlug: string;
  eventSlug: string;
}

export function ChatInput({ channelId, orgSlug, eventSlug }: Props) {
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const text = content.trim();
    if (!text || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await sendChannelMessage({ channelId, content: text, orgSlug, eventSlug });
      if (res.ok) {
        setContent("");
        textareaRef.current?.focus();
      } else {
        setError(res.error ?? "Erreur d'envoi");
      }
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-brand-ink/10 bg-white px-3 py-2" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
      {error && (
        <p className="mb-1 text-[11px] text-red-600">{error}</p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 2000))}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Message…"
          className="flex-1 resize-none rounded-xl border border-brand-ink/15 px-3 py-2 text-sm focus:border-[var(--theme-primary,_#FF5E5B)] focus:outline-none"
          style={{ fontSize: "16px", maxHeight: "120px" }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!content.trim() || pending}
          className="flex-shrink-0 rounded-xl bg-[var(--theme-primary,_#FF5E5B)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          style={{ minHeight: "40px" }}
        >
          {pending ? "…" : "↑"}
        </button>
      </div>
    </div>
  );
}
