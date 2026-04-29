"use client";

import * as React from "react";

import { cn } from "../utils/cn";

interface Level {
  value: "green" | "yellow" | "red";
  label: string;
  emoji: string;
  color: string;
  subtitle: string;
}

const LEVELS: Level[] = [
  { value: "green", label: "Ça va", emoji: "🙂", color: "#10B981", subtitle: "Tout roule, je suis dans le rythme." },
  { value: "yellow", label: "Ça commence à être chaud", emoji: "😐", color: "#F59E0B", subtitle: "Fatigue, stress, ou besoin de souffler bientôt." },
  { value: "red", label: "J'ai besoin d'aide", emoji: "🆘", color: "#EF4444", subtitle: "Je ne suis pas bien, je veux qu'un·e responsable me contacte." },
];

interface Props {
  onPick?: (level: Level["value"]) => void;
  className?: string;
}

export function WellbeingPicker({ onPick, className }: Props) {
  const [picked, setPicked] = React.useState<Level["value"] | null>(null);

  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="font-display text-xl font-semibold">Comment tu te sens ?</h2>
      <p className="text-sm text-brand-ink/60">
        Tu peux le mettre à jour quand tu veux. Les responsables voient ton niveau pour t'accompagner.
      </p>
      <div className="space-y-2">
        {LEVELS.map((lv) => {
          const isPicked = picked === lv.value;
          return (
            <button
              key={lv.value}
              type="button"
              onClick={() => {
                setPicked(lv.value);
                onPick?.(lv.value);
              }}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition",
                isPicked ? "border-2 ring-2" : "border-brand-ink/15 hover:bg-white",
              )}
              style={
                isPicked
                  ? { borderColor: lv.color, backgroundColor: `${lv.color}15` }
                  : undefined
              }
            >
              <span className="text-2xl">{lv.emoji}</span>
              <div className="flex-1">
                <p className="font-medium" style={isPicked ? { color: lv.color } : undefined}>
                  {lv.label}
                </p>
                <p className="text-sm text-brand-ink/60">{lv.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
