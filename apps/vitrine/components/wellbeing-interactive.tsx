"use client";

import { useState, useTransition } from "react";

import { reportWellbeing, triggerSaferAlert } from "@/app/actions/wellbeing";

const LEVELS = [
  { value: "green", label: "Ça va", emoji: "🙂", color: "#10B981", subtitle: "Tout roule, je suis dans le rythme." },
  { value: "yellow", label: "Ça commence à être chaud", emoji: "😐", color: "#F59E0B", subtitle: "Fatigue, stress, ou besoin de souffler bientôt." },
  { value: "red", label: "J'ai besoin d'aide", emoji: "🆘", color: "#EF4444", subtitle: "Je ne suis pas bien, je veux qu'un·e responsable me contacte." },
] as const;

const ALERT_KINDS = [
  { value: "harassment", label: "Harcèlement", emoji: "🛑", description: "Témoin ou victime d'un comportement inadmissible." },
  { value: "physical_danger", label: "Danger physique", emoji: "⚠️", description: "Une situation dangereuse vient d'arriver." },
  { value: "medical", label: "Urgence médicale", emoji: "🩺", description: "Quelqu'un est blessé ou malaise." },
  { value: "other", label: "Autre", emoji: "❗", description: "Autre situation grave nécessitant une intervention." },
];

interface Props {
  eventId: string;
  eventName: string;
  wellbeingEnabled: boolean;
  saferEnabled: boolean;
  lastLevel?: "green" | "yellow" | "red";
  lastReportedAt?: string;
}

export function WellbeingInteractive({
  eventId,
  eventName,
  wellbeingEnabled,
  saferEnabled,
  lastLevel,
  lastReportedAt,
}: Props) {
  const [picked, setPicked] = useState<string | null>(lastLevel ?? null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Safer alert state
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertKind, setAlertKind] = useState<string | null>(null);
  const [alertDescription, setAlertDescription] = useState("");
  const [alertSent, setAlertSent] = useState(false);

  function pickLevel(value: string) {
    setPicked(value);
    startTransition(async () => {
      const result = await reportWellbeing({ eventId, level: value as "green" | "yellow" | "red" });
      setFeedback(result.ok ? "Merci, l'équipe est informée." : `Erreur : ${result.error}`);
      setTimeout(() => setFeedback(null), 4000);
    });
  }

  function submitAlert() {
    if (!alertKind || pending) return;
    startTransition(async () => {
      const result = await triggerSaferAlert({
        eventId,
        kind: alertKind,
        description: alertDescription,
      });
      if (result.ok) setAlertSent(true);
      else setFeedback(`Erreur : ${result.error}`);
    });
  }

  return (
    <>
      {wellbeingEnabled && (
        <section className="space-y-3">
          <header>
            <h1 className="font-display text-2xl font-bold">Comment tu te sens ?</h1>
            <p className="text-sm text-brand-ink/60">
              Tu peux le mettre à jour quand tu veux. Les responsables voient ton niveau pour t'accompagner.
            </p>
          </header>

          <div className="space-y-2">
            {LEVELS.map((lv) => {
              const isPicked = picked === lv.value;
              return (
                <button
                  key={lv.value}
                  type="button"
                  disabled={pending}
                  onClick={() => pickLevel(lv.value)}
                  className={`flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition disabled:opacity-50 ${
                    isPicked ? "ring-2" : "border-brand-ink/15 hover:bg-white"
                  }`}
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

          {feedback && (
            <p className="rounded-xl bg-brand-sand/40 px-4 py-2 text-sm">{feedback}</p>
          )}

          {lastReportedAt && (
            <p className="text-xs text-brand-ink/50">
              Dernière mise à jour : {new Date(lastReportedAt).toLocaleString("fr-FR")}
            </p>
          )}
        </section>
      )}

      {saferEnabled && (
        <section className="space-y-3 pt-4">
          <hr className="border-brand-ink/10" />
          {alertSent ? (
            <div className="rounded-2xl bg-wellbeing-red/10 p-6 text-center">
              <div className="text-4xl">📡</div>
              <h3 className="mt-2 font-display text-lg font-bold text-wellbeing-red">
                Alerte envoyée
              </h3>
              <p className="mt-1 text-sm">
                La régie et les responsables ont été notifié·es. Quelqu'un va venir te voir.
              </p>
            </div>
          ) : !alertOpen ? (
            <button
              type="button"
              onClick={() => setAlertOpen(true)}
              className="w-full rounded-2xl bg-wellbeing-red p-5 text-left text-white shadow-soft transition hover:opacity-95"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🚨</span>
                <div>
                  <p className="font-display text-lg font-bold leading-tight">ALERTE GRAVE</p>
                  <p className="text-sm opacity-90">
                    Bouton de signalement immédiat pour {eventName}
                  </p>
                </div>
              </div>
            </button>
          ) : (
            <div className="rounded-2xl border-2 border-wellbeing-red/40 bg-white p-5">
              <h3 className="font-display text-lg font-bold text-wellbeing-red">
                🚨 Signaler un problème grave
              </h3>
              <p className="mt-1 text-sm text-brand-ink/70">
                Notification immédiate régie + responsables.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {ALERT_KINDS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setAlertKind(k.value)}
                    className={`rounded-xl border p-3 text-left text-sm transition ${
                      alertKind === k.value
                        ? "border-wellbeing-red bg-wellbeing-red/10"
                        : "border-brand-ink/15 hover:bg-brand-ink/5"
                    }`}
                  >
                    <span className="mr-2">{k.emoji}</span>
                    {k.label}
                  </button>
                ))}
              </div>
              {alertKind && (
                <textarea
                  value={alertDescription}
                  onChange={(e) => setAlertDescription(e.target.value)}
                  rows={3}
                  placeholder="Décris brièvement (où, qui, quoi)…"
                  enterKeyHint="send"
                  className="mt-3 w-full rounded-xl border border-brand-ink/15 bg-white px-3 py-2 text-base focus:border-wellbeing-red focus:outline-none focus:ring-2 focus:ring-wellbeing-red/20"
                />
              )}
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setAlertOpen(false)}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-brand-ink/15 px-4 py-2 text-sm text-brand-ink/70 hover:bg-brand-ink/5"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={submitAlert}
                  disabled={!alertKind || pending}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-wellbeing-red px-4 py-3 text-base font-medium text-white shadow-soft transition hover:opacity-90 disabled:opacity-50"
                >
                  {pending ? "Envoi…" : "Envoyer l'alerte"}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
