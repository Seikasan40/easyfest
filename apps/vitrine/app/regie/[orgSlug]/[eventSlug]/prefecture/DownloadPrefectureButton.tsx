"use client";

import { useState } from "react";

interface Props {
  eventId: string;
  eventSlug: string;
}

export function DownloadPrefectureButton({ eventId, eventSlug }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(
        `/api/prefecture-export?eventId=${encodeURIComponent(eventId)}`,
        { method: "GET", cache: "no-store" }
      );
      if (!res.ok) {
        const txt = await res.text();
        let msg = "Génération impossible";
        try { msg = (JSON.parse(txt) as any).error ?? msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const today = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pack-prefecture-${eventSlug}-${today}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message ?? "Erreur inconnue");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary,_#FF5E5B)] px-5 py-3 text-base font-semibold text-white shadow-soft transition hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
        style={{ touchAction: "manipulation" }}
        aria-busy={pending}
      >
        {pending ? "Génération du pack…" : "⬇️ Télécharger le pack ZIP"}
      </button>
      {error && (
        <p className="rounded-xl bg-wellbeing-red/10 px-3 py-2 text-xs text-wellbeing-red" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-brand-ink/55">
        Format ZIP · 5 fichiers · récap.md + 3× CSV + README
      </p>
    </div>
  );
}
