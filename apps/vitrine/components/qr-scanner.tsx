"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onScan: (token: string) => void;
  isPaused?: boolean;
}

/**
 * QR scanner multi-moteur :
 *  - BarcodeDetector API  → Chrome / Edge (Android inclus)
 *  - jsQR (canvas loop)   → iOS Safari, Firefox, tout autre navigateur
 *  - Fallback texte       → si getUserMedia indisponible
 */
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
    };
  }
}

type ScanMode = "detecting" | "barcode" | "jsqr" | "unsupported";

export function QrScanner({ onScan, isPaused }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ScanMode>("detecting");
  const [scanning, setScanning] = useState(false);

  // ─── détection du moteur disponible ────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("BarcodeDetector" in window) {
      setMode("barcode");
    } else {
      import("jsqr")
        .then(() => setMode("jsqr"))
        .catch(() => setMode("unsupported"));
    }
  }, []);

  // ─── BarcodeDetector (Chrome / Edge) ───────────────────────────────────────
  useEffect(() => {
    if (mode !== "barcode" || isPaused) return;

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
  }, [mode, isPaused, onScan]);

  // ─── jsQR canvas loop (iOS Safari, Firefox) ────────────────────────────────
  useEffect(() => {
    if (mode !== "jsqr" || isPaused) return;

    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    async function start() {
      try {
        const jsQR = (await import("jsqr")).default;
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        video.srcObject = stream;
        await video.play();
        setScanning(true);

        const ctx = canvas.getContext("2d")!;

        const tick = () => {
          if (stopped || !video || !canvas) return;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });
            if (code?.data) {
              onScan(code.data);
            }
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
  }, [mode, isPaused, onScan]);

  // ─── états non-caméra ───────────────────────────────────────────────────────
  if (mode === "detecting") {
    return (
      <div className="rounded-2xl border-2 border-dashed border-white/30 bg-white/5 p-6 text-center">
        <p className="text-3xl">🔍</p>
        <p className="mt-2 text-sm text-white/70">Initialisation du scanner…</p>
      </div>
    );
  }

  if (mode === "unsupported") {
    return (
      <div className="rounded-2xl border-2 border-dashed border-white/30 bg-white/5 p-6 text-center">
        <p className="text-3xl">📷</p>
        <p className="mt-2 text-sm text-white/70">
          Scanner caméra indisponible sur ce navigateur.
          Colle le token manuellement ci-dessous.
        </p>
      </div>
    );
  }

  // ─── vue caméra (barcode + jsqr utilisent le même rendu) ───────────────────
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-brand-coral/40 bg-black aspect-square">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        muted
        playsInline
      />
      {/* canvas caché utilisé par jsQR pour analyser les frames */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      {/* viseur */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-3/4 w-3/4 rounded-2xl border-4 border-brand-coral/80 shadow-[0_0_0_999px_rgba(0,0,0,0.4)]" />
      </div>
      {/* statut */}
      <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/60 px-3 py-1.5 text-center text-xs text-white">
        {error
          ? `❌ ${error}`
          : scanning
          ? "📡 Scan en cours…"
          : "Initialisation caméra…"}
      </div>
    </div>
  );
}
