"use client";

import { useState, useTransition } from "react";

import { verifyScan } from "@/app/actions/scan";
import { QrScanner } from "./qr-scanner";

type Mode = "arrival" | "meal" | "post_take";

interface VolunteerInfo {
  user_id: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  is_minor?: boolean | null;
  size?: string | null;
  skills?: string[] | null;
}

interface ScanResult {
  ok: boolean;
  replay: boolean;
  scan_kind: Mode;
  first_scanned_at?: string | null;
  volunteer?: VolunteerInfo;
  meals_remaining?: number;
  next_shift?: { starts_at: string; ends_at: string; position?: { name: string; color?: string; icon?: string } } | null;
  error?: string;
}

interface Props {
  eventId: string;
  eventName: string;
}

export function ScanInterface({ eventId, eventName }: Props) {
  const [mode, setMode] = useState<Mode>("arrival");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [manualToken, setManualToken] = useState("");

  function handleScan(token: string) {
    setResult(null);
    startTransition(async () => {
      const r = await verifyScan({ token, eventId, scanKind: mode });
      setResult(r);
    });
  }

  return (
    <div className="space-y-4">
      {/* Mode picker — 3 cols toujours OK car icône+1 mot court */}
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/10 p-1">
        {(["arrival", "meal", "post_take"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`inline-flex min-h-[44px] items-center justify-center rounded-lg px-2 py-2 text-sm font-medium transition ${
              mode === m ? "bg-brand-coral text-white" : "text-white/70 hover:bg-white/10"
            }`}
          >
            {m === "arrival" && "🚪 Arrivée"}
            {m === "meal" && "🍽️ Repas"}
            {m === "post_take" && "🎯 Poste"}
          </button>
        ))}
      </div>

      {/* Webcam scan area — caméra réelle via BarcodeDetector */}
      <QrScanner onScan={handleScan} isPaused={!!result} />

      {/* Manual token entry (debug + fallback) */}
      <div className="space-y-2">
        <label className="block text-xs uppercase tracking-widest text-white/50">
          Token QR (mode manuel)
        </label>
        <div className="flex gap-2">
          <input
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="eyJ2IjoxLCJ2aWQiOi..."
            autoCapitalize="none"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="search"
            className="h-11 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-base text-white placeholder-white/30 focus:border-brand-coral focus:outline-none"
          />
          <button
            type="button"
            onClick={() => manualToken && handleScan(manualToken)}
            disabled={pending || !manualToken}
            className="inline-flex min-h-[44px] items-center rounded-xl bg-brand-coral px-4 py-2 text-sm font-medium text-white shadow-soft transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "…" : "Scanner"}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`rounded-2xl p-5 ${
            result.replay
              ? "bg-wellbeing-yellow/20 ring-2 ring-wellbeing-yellow/40"
              : result.ok
              ? "bg-wellbeing-green/20 ring-2 ring-wellbeing-green/40"
              : "bg-wellbeing-red/20 ring-2 ring-wellbeing-red/40"
          }`}
        >
          {result.replay ? (
            <>
              <p className="text-xl">⚠️ Déjà scanné</p>
              {result.first_scanned_at && (
                <p className="mt-1 text-sm">
                  Premier scan : {new Date(result.first_scanned_at).toLocaleString("fr-FR")}
                </p>
              )}
            </>
          ) : !result.ok ? (
            <>
              <p className="text-xl">❌ Refusé</p>
              <p className="mt-1 text-sm">{result.error ?? "Token invalide ou expiré."}</p>
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-widest text-wellbeing-green">
                ✅ Scan validé · {mode}
              </p>
              {result.volunteer && (
                <>
                  <p className="mt-1 font-display text-2xl font-bold text-white">
                    {result.volunteer.full_name}
                  </p>
                  {result.volunteer.is_minor && (
                    <p className="mt-1 text-xs font-medium text-wellbeing-yellow">
                      ⚠️ Mineur — vérifier autorisation parentale
                    </p>
                  )}
                  {result.volunteer.size && (
                    <p className="mt-1 text-sm">T-shirt : {result.volunteer.size}</p>
                  )}
                </>
              )}
              {result.next_shift && (
                <div className="mt-3 rounded-xl bg-white/10 p-3 text-sm">
                  <p className="text-xs uppercase tracking-widest opacity-70">Prochain shift</p>
                  <p className="mt-0.5 font-medium">
                    {result.next_shift.position?.icon} {result.next_shift.position?.name}
                  </p>
                  <p className="opacity-70">
                    {new Date(result.next_shift.starts_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
              {typeof result.meals_remaining === "number" && (
                <p className="mt-2 text-sm">
                  🍽️ {result.meals_remaining} repas restant{result.meals_remaining > 1 ? "s" : ""}
                </p>
              )}
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setManualToken("");
            }}
            className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
          >
            Continuer
          </button>
        </div>
      )}
    </div>
  );
}
