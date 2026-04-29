"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface Props {
  token?: string;
  expiresAt?: string;
}

export function QrDisplay({ token, expiresAt }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!token || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, token, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 280,
      color: { dark: "#1F2233", light: "#FFF4E6" },
    });
  }, [token]);

  if (!token) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-brand-ink/15 bg-white text-brand-ink/50">
        Génération du QR…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-ink/10 bg-white p-6 text-center shadow-soft">
      <canvas ref={canvasRef} width={280} height={280} className="mx-auto" />
      {expiresAt && (
        <p className="mt-3 text-xs text-brand-ink/50">
          Renouvelé après {new Date(expiresAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}
