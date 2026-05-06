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

const MODES: { key: Mode; label: string; emoji: string }[] = [
  { key: "arrival", label: "Arrivée", emoji: "🚪" },
  { key: "meal",    label: "Repas",   emoji: "🍽️" },
  { key: "post_take", label: "Poste", emoji: "🎯" },
];

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

  // Couleur de l'état de résultat
  const resultBg = result
    ? result.replay
      ? "rgba(196,154,44,0.15)"
      : result.ok
      ? "rgba(16,185,129,0.15)"
      : "rgba(239,68,68,0.15)"
    : "transparent";

  const resultBorder = result
    ? result.replay
      ? "rgba(196,154,44,0.40)"
      : result.ok
      ? "rgba(16,185,129,0.40)"
      : "rgba(239,68,68,0.40)"
    : "transparent";

  return (
    <div className="space-y-4">

      {/* Mode picker */}
      <div
        className="grid grid-cols-3 gap-1.5 rounded-2xl p-1.5"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => { setMode(m.key); setResult(null); }}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl text-sm font-semibold transition"
            style={
              mode === m.key
                ? { background: "#C49A2C", color: "#0D1F14" }
                : { background: "transparent", color: "rgba(255,255,255,0.55)" }
            }
          >
            <span className="mr-1">{m.emoji}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Webcam scan area */}
      <QrScanner onScan={handleScan} isPaused={!!result} />

      {/* Manual token entry */}
      <div className="space-y-2">
        <label
          className="block text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ color: "rgba(255,255,255,0.40)" }}
        >
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
            className="h-11 flex-1 rounded-xl px-3 py-2 text-base text-white placeholder-white/30 focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: "16px",
            }}
          />
          <button
            type="button"
            onClick={() => manualToken && handleScan(manualToken)}
            disabled={pending || !manualToken}
            className="inline-flex min-h-[44px] items-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-40"
            style={{ background: "#C49A2C", color: "#0D1F14" }}
          >
            {pending ? "…" : "Scanner"}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: resultBg,
            border: `1.5px solid ${resultBorder}`,
          }}
        >
          {result.replay ? (
            <>
              <p className="text-2xl mb-1">⚠️</p>
              <p className="font-semibold text-base" style={{ color: "#C49A2C" }}>
                Déjà scanné
              </p>
              {result.first_scanned_at && (
                <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Premier scan : {new Date(result.first_scanned_at).toLocaleString("fr-FR")}
                </p>
              )}
            </>
          ) : !result.ok ? (
            <>
              <p className="text-2xl mb-1">❌</p>
              <p className="font-semibold text-base" style={{ color: "#EF4444" }}>
                Refusé
              </p>
              <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                {result.error ?? "Token invalide ou expiré."}
              </p>
            </>
          ) : (
            <>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1"
                style={{ color: "#10B981" }}
              >
                ✅ Scan validé · {
                  mode === "arrival" ? "Arrivée" :
                  mode === "meal" ? "Repas" : "Prise de poste"
                }
              </p>
              {result.volunteer && (
                <>
                  <p className="font-display text-2xl font-bold text-white leading-tight">
                    {result.volunteer.full_name}
                  </p>
                  {result.volunteer.is_minor && (
                    <p
                      className="mt-2 rounded-xl px-3 py-1.5 text-xs font-semibold"
                      style={{ background: "rgba(196,154,44,0.15)", color: "#C49A2C" }}
                    >
                      ⚠️ Mineur — vérifier autorisation parentale
                    </p>
                  )}
                  {result.volunteer.size && (
                    <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
                      T-shirt : <strong>{result.volunteer.size}</strong>
                    </p>
                  )}
                </>
              )}

              {/* Repas restants — mis en valeur */}
              {typeof result.meals_remaining === "number" && (
                <div
                  className="mt-3 rounded-xl p-3"
                  style={{
                    background: result.meals_remaining > 0
                      ? "rgba(16,185,129,0.12)"
                      : "rgba(239,68,68,0.10)",
                    border: result.meals_remaining > 0
                      ? "1px solid rgba(16,185,129,0.25)"
                      : "1px solid rgba(239,68,68,0.25)",
                  }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5"
                    style={{ color: result.meals_remaining > 0 ? "#10B981" : "#EF4444" }}
                  >
                    Repas restants
                  </p>
                  <p
                    className="font-display text-3xl font-bold"
                    style={{ color: result.meals_remaining > 0 ? "#10B981" : "#EF4444" }}
                  >
                    {result.meals_remaining}
                  </p>
                  {result.meals_remaining === 0 && (
                    <p className="text-xs mt-0.5" style={{ color: "rgba(239,68,68,0.80)" }}>
                      Quota épuisé
                    </p>
                  )}
                </div>
              )}

              {/* Prochain shift */}
              {result.next_shift && (
                <div
                  className="mt-3 rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1"
                    style={{ color: "rgba(255,255,255,0.50)" }}
                  >
                    Prochain shift
                  </p>
                  <p className="font-medium text-white">
                    {result.next_shift.position?.icon} {result.next_shift.position?.name}
                  </p>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.60)" }}>
                    {new Date(result.next_shift.starts_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" – "}
                    {new Date(result.next_shift.ends_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setResult(null);
              setManualToken("");
            }}
            className="mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:opacity-80 w-full"
            style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.80)" }}
          >
            Scan suivant →
          </button>
        </div>
      )}
    </div>
  );
}
