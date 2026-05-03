"use client";

import { useState, useTransition } from "react";

import { broadcastMessage } from "@/app/actions/messaging";

interface PositionLite {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
}

type Target = "all" | "responsibles" | "regie" | { kind: "team"; positionId: string };

interface Props {
  eventId: string;
  positions: PositionLite[];
}

export function BroadcastForm({ eventId, positions }: Props) {
  const [target, setTarget] = useState<Target>("all");
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function submit() {
    if (!content.trim() || pending) return;
    startTransition(async () => {
      const result = await broadcastMessage({
        eventId,
        target: typeof target === "string" ? target : "team",
        positionId: typeof target === "object" ? target.positionId : undefined,
        content: content.trim(),
      });
      if (result.ok) {
        setFeedback(`✅ Message diffusé à ${result.recipientsCount} personne·s`);
        setContent("");
      } else {
        setFeedback(`❌ ${result.error}`);
      }
      setTimeout(() => setFeedback(null), 5000);
    });
  }

  return (
    <section className="rounded-2xl border border-brand-ink/10 bg-white p-5">
      <h3 className="font-display text-lg font-semibold">Nouveau broadcast</h3>
      <p className="mt-1 text-sm text-brand-ink/60">
        Notifie les bénévoles concernés via push + mail (selon préférences).
      </p>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <TargetChip
            active={target === "all"}
            onClick={() => setTarget("all")}
            label="Tout le monde"
            tone="brand"
          />
          <TargetChip
            active={target === "responsibles"}
            onClick={() => setTarget("responsibles")}
            label="Responsables seulement"
            tone="warn"
          />
          <TargetChip
            active={target === "regie"}
            onClick={() => setTarget("regie")}
            label="Régie"
            tone="danger"
          />
          {positions.map((p) => (
            <TargetChip
              key={p.id}
              active={typeof target === "object" && target.positionId === p.id}
              onClick={() => setTarget({ kind: "team", positionId: p.id })}
              label={`${p.icon} ${p.name}`}
              tone="neutral"
            />
          ))}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Annonce, alerte, info pratique…"
          enterKeyHint="send"
          className="w-full rounded-xl border border-brand-ink/15 bg-white px-3 py-2 text-base focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-brand-ink/50">{content.length}/1000 caractères</p>
          <button
            type="button"
            disabled={!content.trim() || pending}
            onClick={submit}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-brand-coral px-5 py-2 text-base font-medium text-white shadow-soft transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
          >
            {pending ? "Envoi…" : "Diffuser"}
          </button>
        </div>

        {feedback && <p className="text-sm">{feedback}</p>}
      </div>
    </section>
  );
}

function TargetChip({
  active,
  onClick,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone: "brand" | "warn" | "danger" | "neutral";
}) {
  const toneClass = active
    ? {
        brand: "bg-brand-coral text-white",
        warn: "bg-wellbeing-yellow text-white",
        danger: "bg-wellbeing-red text-white",
        neutral: "bg-brand-ink text-white",
      }[tone]
    : "bg-brand-ink/5 text-brand-ink/70 hover:bg-brand-ink/10";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[44px] items-center rounded-full px-4 py-2 text-sm font-medium ${toneClass}`}
    >
      {label}
    </button>
  );
}
