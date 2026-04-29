"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onScan: (token: string) => void;
  isPaused?: boolean;
}

/**
 * QR scanner avec BarcodeDetector API (natif Chrome/Edge mobile).
 * Fallback : input fichier (galerie) + token manuel.
 *
 * NOTE : si tu veux iOS Safari, ajouter dynamic import jsQR :
 *   const jsQR = (await import('jsqr')).default;
 */
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
    };
  }
}

export function QrScanner({ onScan, isPaused }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean>(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("BarcodeDetector" in window)) {
      setSupported(false);
      return;
    }
  }, []);

  useEffect(() => {
    if (!supported || isPaused) return;

    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setScanning(true);

        const detector = new window.BarcodeDetector!({ formats: ["qr_code"] });
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0 && barcodes[0]?.rawValue) {
              onScan(barcodes[0].rawValue);
            }
          } catch {
            // ignore — frame errors
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur caméra");
        setScanning(false);
      }
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [supported, isPaused, onScan]);

  if (!supported) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-white/30 bg-white/5 p-6 text-center">
        <p className="text-3xl">📷</p>
        <p className="mt-2 text-sm text-white/70">
          Ce navigateur ne supporte pas la détection QR native (Safari iOS, Firefox).
          Utilise Chrome/Edge ou colle le token manuellement ci-dessous.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-brand-coral/40 bg-black aspect-square">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        muted
        playsInline
      />
      {/* viewfinder */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-3/4 w-3/4 rounded-2xl border-4 border-brand-coral/80 shadow-[0_0_0_999px_rgba(0,0,0,0.4)]" />
      </div>
      {/* status */}
      <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/60 px-3 py-1.5 text-center text-xs text-white">
        {error ? `❌ ${error}` : scanning ? "📡 Scan en cours…" : "Initialisation caméra…"}
      </div>
    </div>
  );
}
