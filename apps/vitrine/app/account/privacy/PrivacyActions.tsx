"use client";

/**
 * Boutons d'action pour /account/privacy.
 *  • mode="export"  : déclenche /api/account/export et stream le download
 *  • mode="delete"  : champ "DELETE" + POST /api/account/delete + redirect
 *  • mode="restore" : POST /api/account/restore + refresh
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

import { PH_EVENTS } from "@/lib/analytics/posthog-events";
import { usePostHog } from "@/lib/analytics/usePostHog";

type Props = {
  mode: "export" | "delete" | "restore";
};

export default function PrivacyActions({ mode }: Props) {
  const router = useRouter();
  const { capture } = usePostHog();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      const filename =
        match?.[1] ?? `easyfest-export-${new Date().toISOString().slice(0, 10)}.json`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      capture(PH_EVENTS.ACCOUNT_EXPORT_DOWNLOADED);
    } catch (e) {
      setError((e as Error).message ?? "export_failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (confirm !== "DELETE") {
      setError('Tape "DELETE" en majuscules pour confirmer.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      capture(PH_EVENTS.ACCOUNT_DELETION_REQUESTED);
      router.push("/legal/privacy?account_deleted=1");
    } catch (e) {
      setError((e as Error).message ?? "delete_failed");
      setBusy(false);
    }
  }

  async function handleRestore() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/restore", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      capture(PH_EVENTS.ACCOUNT_DELETION_CANCELLED);
      router.refresh();
    } catch (e) {
      setError((e as Error).message ?? "restore_failed");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "export") {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={handleExport}
          disabled={busy}
          data-testid="export-btn"
          className="bg-brand-coral shadow-soft hover:bg-brand-coral/90 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
        >
          {busy ? "Préparation…" : "Télécharger mes données (JSON)"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">Erreur : {error}</p>}
      </div>
    );
  }

  if (mode === "restore") {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={handleRestore}
          disabled={busy}
          data-testid="restore-btn"
          className="shadow-soft rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "Restauration…" : "Annuler la suppression"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">Erreur : {error}</p>}
      </div>
    );
  }

  // mode === "delete"
  return (
    <div className="mt-4 space-y-3">
      <label className="block text-sm">
        <span className="text-brand-ink/70">
          Tape <code className="bg-brand-ink/5 rounded px-1.5 py-0.5 font-mono">DELETE</code> pour
          confirmer&nbsp;:
        </span>
        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          data-testid="delete-confirm-input"
          autoComplete="off"
          spellCheck={false}
          className="border-brand-ink/15 focus:border-brand-coral mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
          placeholder="DELETE"
        />
      </label>
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy || confirm !== "DELETE"}
        data-testid="delete-btn"
        className="shadow-soft rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
      >
        {busy ? "Suppression…" : "Supprimer mon compte"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">Erreur : {error}</p>}
    </div>
  );
}
