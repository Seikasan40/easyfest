"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { validateApplication, refuseApplication, inviteVolunteer } from "@/app/actions/applications-admin";

interface Application {
  id: string;
  status: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  birth_date: string | null;
  is_minor: boolean | null;
  arrival_at: string | null;
  departure_at: string | null;
  preferred_position_slugs: string[];
  skills: string[];
  limitations: string[];
  created_at: string;
  refusal_reason: string | null;
  source: string;
  invited_at: string | null;
  has_account: boolean;
}

const STATUSES = ["pending", "validated", "refused", "reserve", "pre_selected"] as const;

const STATUS_LABELS_FR: Record<string, string> = {
  all: "Toutes",
  pending: "En attente",
  validated: "Validé",
  refused: "Refusé",
  reserve: "Réserve",
  pre_selected: "Pré-sélectionné",
};

export function ApplicationsTable({
  applications,
  eventName,
}: {
  applications: Application[];
  eventName: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [_, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return applications.filter((a) => {
      if (filter !== "all" && a.status !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          a.full_name.toLowerCase().includes(s) ||
          a.email.toLowerCase().includes(s) ||
          (a.phone ?? "").includes(s)
        );
      }
      return true;
    });
  }, [applications, filter, search]);

  function validate(id: string) {
    setPendingId(id);
    startTransition(async () => {
      const res = await validateApplication(id);
      setPendingId(null);
      setFeedback(res.ok ? "✅ Candidature validée + email envoyé" : `❌ ${res.error}`);
      if (res.ok) router.refresh(); // Refresh la liste pour afficher le nouveau statut
      setTimeout(() => setFeedback(null), 4000);
    });
  }

  function refuse(id: string) {
    const reason = prompt("Motif du refus (visible côté candidat·e)");
    if (!reason) return;
    setPendingId(id);
    startTransition(async () => {
      const res = await refuseApplication(id, reason);
      setPendingId(null);
      setFeedback(res.ok ? "Candidature refusée" : `❌ ${res.error}`);
      if (res.ok) router.refresh();
      setTimeout(() => setFeedback(null), 4000);
    });
  }

  function invite(id: string, email: string) {
    if (!confirm(`Envoyer un magic-link de connexion à ${email} ?`)) return;
    setPendingId(id);
    startTransition(async () => {
      const res = await inviteVolunteer(id);
      setPendingId(null);
      setFeedback(res.ok ? `📧 Invitation envoyée à ${email}` : `❌ ${res.error}`);
      if (res.ok) router.refresh(); // Refresh pour basculer le bouton "Inviter" en "Déjà invité·e"
      setTimeout(() => setFeedback(null), 5000);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-brand-ink/5 p-1">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`inline-flex min-h-[40px] items-center rounded-lg px-3 py-1.5 text-sm font-medium ${
                filter === s ? "bg-white shadow-soft" : "text-brand-ink/60"
              }`}
            >
              {STATUS_LABELS_FR[s] ?? s}
              {s !== "all" && (
                <span className="ml-1 text-brand-ink/50">
                  ({applications.filter((a) => a.status === s).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Recherche nom / email / tel…"
          inputMode="search"
          enterKeyHint="search"
          className="h-11 flex-1 rounded-xl border border-brand-ink/15 bg-white px-3 py-2 text-base focus:border-brand-coral focus:outline-none"
        />
      </div>

      {feedback && (
        <p className="rounded-xl bg-brand-sand/40 px-4 py-2 text-sm">{feedback}</p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-brand-ink/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-ink/5 text-left text-xs uppercase tracking-widest text-brand-ink/60">
            <tr>
              <th className="px-3 py-2">Nom</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Email · Tel</th>
              <th className="px-3 py-2">Postes souhaités</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-brand-ink/50">
                  Aucune candidature ne correspond aux filtres.
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} className="border-t border-brand-ink/5 hover:bg-brand-ink/[0.02]">
                  <td className="px-3 py-2">
                    <p className="font-medium">{a.full_name}</p>
                    {a.is_minor && (
                      <span className="text-xs font-medium text-wellbeing-yellow">
                        ⚠️ Mineur
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill status={a.status} />
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <p>{a.email}</p>
                    <p className="text-brand-ink/50">{a.phone}</p>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {a.preferred_position_slugs?.slice(0, 3).join(", ")}
                  </td>
                  <td className="px-3 py-2 text-xs text-brand-ink/60">
                    {a.skills?.slice(0, 2).join(", ")}
                    {a.limitations?.length > 0 && (
                      <p className="text-wellbeing-yellow">⚠ {a.limitations.join(", ")}</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {a.status === "pending" && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={pendingId === a.id}
                          onClick={() => validate(a.id)}
                          className="rounded-lg bg-wellbeing-green px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {pendingId === a.id ? "…" : "Valider"}
                        </button>
                        <button
                          type="button"
                          disabled={pendingId === a.id}
                          onClick={() => refuse(a.id)}
                          className="rounded-lg border border-brand-ink/20 px-2.5 py-1 text-xs font-medium text-brand-ink/70 hover:bg-brand-ink/5 disabled:opacity-50"
                        >
                          Refuser
                        </button>
                      </div>
                    )}
                    {a.status === "validated" && !a.has_account && (
                      <div className="flex flex-col gap-1">
                        {a.invited_at ? (
                          <>
                            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700" title={`Invité le ${new Date(a.invited_at).toLocaleString("fr-FR")}`}>
                              📧 Déjà invité·e
                            </span>
                            <button
                              type="button"
                              disabled={pendingId === a.id}
                              onClick={() => invite(a.id, a.email)}
                              className="rounded-lg border border-blue-200 bg-blue-50/50 px-2.5 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >
                              Renvoyer
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={pendingId === a.id}
                            onClick={() => invite(a.id, a.email)}
                            className="rounded-lg bg-brand-coral px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                          >
                            {pendingId === a.id ? "…" : "📧 Inviter"}
                          </button>
                        )}
                      </div>
                    )}
                    {a.status === "validated" && a.has_account && (
                      <span className="text-xs text-emerald-700" title="Compte créé, peut se connecter">
                        ✓ Connecté·e
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { tone: string; label: string }> = {
    pending: { tone: "bg-wellbeing-yellow/15 text-wellbeing-yellow", label: "En attente" },
    validated: { tone: "bg-wellbeing-green/15 text-wellbeing-green", label: "Validé" },
    refused: { tone: "bg-wellbeing-red/15 text-wellbeing-red", label: "Refusé" },
    reserve: { tone: "bg-brand-amber/15 text-brand-amber", label: "Réserve" },
    pre_selected: { tone: "bg-brand-coral/15 text-brand-coral", label: "Pré-sél." },
    duplicate: { tone: "bg-brand-ink/10 text-brand-ink/60", label: "Doublon" },
  };
  const { tone, label } = map[status] ?? map["pending"]!;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>;
}
