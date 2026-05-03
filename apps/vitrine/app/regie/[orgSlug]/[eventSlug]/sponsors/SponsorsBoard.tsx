"use client";

import { useMemo, useState, useTransition } from "react";

import { upsertSponsor, deleteSponsor, updateSponsorStatus } from "@/app/actions/sponsors";

interface Sponsor {
  id: string;
  name: string;
  tier: string;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  amount_eur: number;
  amount_in_kind: string | null;
  counterparts: string[];
  internal_notes: string | null;
  next_action_at: string | null;
  next_action: string | null;
  signed_at: string | null;
  paid_at: string | null;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  prospect: { label: "Prospect", color: "bg-gray-100 text-gray-700" },
  in_discussion: { label: "En discussion", color: "bg-amber-100 text-amber-800" },
  pending_signature: { label: "Attente signature", color: "bg-blue-100 text-blue-800" },
  signed: { label: "Signé", color: "bg-emerald-100 text-emerald-800" },
  paid: { label: "Payé", color: "bg-emerald-200 text-emerald-900" },
  cancelled: { label: "Annulé", color: "bg-red-100 text-red-700" },
};

const TIER_LABEL: Record<string, { label: string; color: string }> = {
  bronze: { label: "Bronze", color: "text-amber-700" },
  silver: { label: "Silver", color: "text-gray-500" },
  gold: { label: "Gold", color: "text-yellow-600" },
  platinum: { label: "Platinum", color: "text-blue-600" },
  partner: { label: "Partenaire", color: "text-[var(--theme-primary,_#FF5E5B)]" },
};

export function SponsorsBoard({ sponsors, eventId }: { sponsors: Sponsor[]; eventId: string }) {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return sponsors.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          (s.contact_name ?? "").toLowerCase().includes(q) ||
          (s.contact_email ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sponsors, filter, search]);

  function changeStatus(id: string, newStatus: string) {
    startTransition(async () => {
      const res = await updateSponsorStatus(id, newStatus);
      setFeedback(res.ok ? "✓ Statut mis à jour" : `❌ ${res.error}`);
      setTimeout(() => setFeedback(null), 3000);
    });
  }

  function remove(id: string, name: string) {
    if (!confirm(`Supprimer ${name} ? Cette action est irréversible.`)) return;
    startTransition(async () => {
      const res = await deleteSponsor(id);
      setFeedback(res.ok ? "Sponsor supprimé" : `❌ ${res.error}`);
      setTimeout(() => setFeedback(null), 3000);
    });
  }

  return (
    <div className="space-y-3">
      {/* Filtres + bouton ajouter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-brand-ink/5 p-1 text-xs">
          {(["all", "prospect", "in_discussion", "signed", "paid"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1 font-medium ${
                filter === s ? "bg-white shadow-soft" : "text-brand-ink/60"
              }`}
            >
              {s === "all" ? "Tous" : STATUS_LABEL[s]?.label ?? s}
              <span className="ml-1 text-brand-ink/50">
                ({s === "all" ? sponsors.length : sponsors.filter((sp) => sp.status === s).length})
              </span>
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Recherche nom, contact…"
          inputMode="search"
          enterKeyHint="search"
          className="h-11 flex-1 rounded-xl border border-brand-ink/15 bg-white px-3 py-2 text-base focus:border-[var(--theme-primary,_#FF5E5B)] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            setEditingSponsor(null);
            setShowAddModal(true);
          }}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--theme-primary,_#FF5E5B)] px-4 py-2 text-sm font-semibold text-white shadow-glow hover:bg-[var(--theme-primary,_#FF5E5B)] hover:opacity-90"
        >
          + Ajouter
        </button>
      </div>

      {feedback && (
        <p className="rounded-xl bg-brand-sand/40 px-4 py-2 text-sm">{feedback}</p>
      )}

      {/* Cards grid */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <p className="col-span-full rounded-xl border border-dashed border-brand-ink/15 py-12 text-center text-sm text-brand-ink/50">
            Aucun sponsor pour ce filtre.
          </p>
        ) : (
          filtered.map((s) => {
            const tier = TIER_LABEL[s.tier];
            const status = STATUS_LABEL[s.status];
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-brand-ink/10 bg-white p-4 shadow-sm"
              >
                <header className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-bold leading-tight">{s.name}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${tier?.color ?? ""}`}>
                      {tier?.label ?? s.tier}
                    </p>
                  </div>
                  <span
                    className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-semibold ${status?.color ?? "bg-gray-100"}`}
                  >
                    {status?.label ?? s.status}
                  </span>
                </header>

                <div className="space-y-2 text-xs">
                  {(s.contact_name || s.contact_email) && (
                    <div className="text-brand-ink/70">
                      {s.contact_name && <p className="font-semibold">{s.contact_name}</p>}
                      {s.contact_email && (
                        <a href={`mailto:${s.contact_email}`} className="text-[var(--theme-primary,_#FF5E5B)] hover:underline">
                          {s.contact_email}
                        </a>
                      )}
                      {s.contact_phone && (
                        <p>
                          <a href={`tel:${s.contact_phone}`} className="text-brand-ink/60">
                            {s.contact_phone}
                          </a>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-xl font-bold text-brand-ink">
                      {Number(s.amount_eur).toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    {s.amount_in_kind && (
                      <span className="text-[10px] text-brand-ink/60">+ {s.amount_in_kind}</span>
                    )}
                  </div>

                  {s.counterparts.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-ink/40">
                        Contreparties
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {s.counterparts.slice(0, 3).map((c, i) => (
                          <li key={i} className="text-[11px] text-brand-ink/70">• {c}</li>
                        ))}
                        {s.counterparts.length > 3 && (
                          <li className="text-[10px] text-brand-ink/40">
                            +{s.counterparts.length - 3} autres
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {s.next_action && (
                    <div className="rounded-lg bg-amber-50 px-2 py-1.5 text-[11px]">
                      <p className="font-semibold text-amber-900">📌 Prochaine action</p>
                      <p className="text-amber-800">{s.next_action}</p>
                      {s.next_action_at && (
                        <p className="text-[10px] text-amber-700">
                          → {new Date(s.next_action_at).toLocaleDateString("fr-FR")}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <footer className="mt-3 flex items-center gap-1 border-t border-brand-ink/5 pt-2">
                  <select
                    value={s.status}
                    onChange={(e) => changeStatus(s.id, e.target.value)}
                    disabled={pending}
                    className="flex-1 rounded-lg border border-brand-ink/15 bg-white px-2 py-1 text-[11px]"
                  >
                    {Object.entries(STATUS_LABEL).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSponsor(s);
                      setShowAddModal(true);
                    }}
                    className="rounded-lg border border-brand-ink/15 px-2 py-1 text-[11px] hover:bg-brand-ink/5"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(s.id, s.name)}
                    className="rounded-lg border border-red-200 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"
                  >
                    🗑
                  </button>
                </footer>
              </div>
            );
          })
        )}
      </div>

      {showAddModal && (
        <SponsorModal
          sponsor={editingSponsor}
          eventId={eventId}
          onClose={() => {
            setShowAddModal(false);
            setEditingSponsor(null);
          }}
        />
      )}
    </div>
  );
}

function SponsorModal({
  sponsor,
  eventId,
  onClose,
}: {
  sponsor: Sponsor | null;
  eventId: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    formData.append("eventId", eventId);
    if (sponsor) formData.append("sponsorId", sponsor.id);
    startTransition(async () => {
      const res = await upsertSponsor(formData);
      if (res.ok) onClose();
      else setError(res.error ?? "Erreur");
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">
            {sponsor ? "Modifier sponsor" : "Nouveau sponsor"}
          </h3>
          <button onClick={onClose} className="text-2xl text-brand-ink/50 hover:text-brand-ink">
            ×
          </button>
        </div>
        <form action={handleSubmit} className="space-y-3 text-sm">
          <Field label="Nom" name="name" defaultValue={sponsor?.name ?? ""} required />
          <div className="grid grid-cols-2 gap-2">
            <SelectField label="Tier" name="tier" defaultValue={sponsor?.tier ?? "bronze"}>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
              <option value="partner">Partenaire</option>
            </SelectField>
            <SelectField label="Statut" name="status" defaultValue={sponsor?.status ?? "prospect"}>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </SelectField>
          </div>
          <Field label="Contact" name="contactName" defaultValue={sponsor?.contact_name ?? ""} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Email" name="contactEmail" type="email" defaultValue={sponsor?.contact_email ?? ""} />
            <Field label="Tel" name="contactPhone" type="tel" defaultValue={sponsor?.contact_phone ?? ""} />
          </div>
          <Field label="Montant (€)" name="amountEur" type="number" defaultValue={String(sponsor?.amount_eur ?? "0")} />
          <Field label="Apport en nature" name="amountInKind" defaultValue={sponsor?.amount_in_kind ?? ""} placeholder="ex: 50 boissons" />
          <TextareaField
            label="Contreparties (1 par ligne)"
            name="counterparts"
            defaultValue={sponsor?.counterparts.join("\n") ?? ""}
            rows={3}
            placeholder="Logo bâche scène&#10;Stand 3x3&#10;10 places VIP"
          />
          <TextareaField
            label="Notes internes"
            name="internalNotes"
            defaultValue={sponsor?.internal_notes ?? ""}
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Prochaine action" name="nextAction" defaultValue={sponsor?.next_action ?? ""} />
            <Field label="Date action" name="nextActionAt" type="date" defaultValue={sponsor?.next_action_at?.slice(0, 10) ?? ""} />
          </div>

          {error && <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-brand-ink/15 py-2 text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-xl bg-[var(--theme-primary,_#FF5E5B)] py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? "…" : sponsor ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue = "",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  // Mobile-first : inputMode/autoComplete inférés du nom + h-11 + text-base
  const lc = name.toLowerCase();
  const extra: Record<string, unknown> = {};
  if (type === "email" || lc.includes("email")) {
    extra["inputMode"] = "email";
    extra["autoComplete"] = "email";
    extra["autoCapitalize"] = "none";
    extra["spellCheck"] = false;
  } else if (type === "tel" || lc.includes("phone")) {
    extra["inputMode"] = "tel";
    extra["autoComplete"] = "tel";
  } else if (type === "url" || lc.includes("url") || lc.includes("website")) {
    extra["inputMode"] = "url";
    extra["autoComplete"] = "url";
    extra["autoCapitalize"] = "none";
    extra["spellCheck"] = false;
  } else if (type === "number" || lc.includes("amount")) {
    extra["inputMode"] = "decimal";
  }
  return (
    <label className="block">
      <span className="text-xs font-semibold text-brand-ink/70">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        enterKeyHint="next"
        {...extra}
        className="mt-1 h-11 w-full rounded-lg border border-brand-ink/15 bg-white px-3 py-2 text-base focus:border-[var(--theme-primary,_#FF5E5B)] focus:outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-brand-ink/70">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 h-11 w-full rounded-lg border border-brand-ink/15 bg-white px-3 py-2 text-base focus:border-[var(--theme-primary,_#FF5E5B)] focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function TextareaField({
  label,
  name,
  defaultValue = "",
  rows = 3,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-brand-ink/70">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-brand-ink/15 bg-white px-3 py-2 text-base focus:border-[var(--theme-primary,_#FF5E5B)] focus:outline-none"
      />
    </label>
  );
}
