"use client";

/**
 * Wizard onboarding self-service direction (OC-01).
 * 5 étapes en client component, soumissions server actions à la fin.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createOrganizationFromWizard, inviteTeamMembers } from "@/app/actions/org-creation";

type TemplateSummary = {
  slug: string;
  name: string;
  description: string | null;
  jauge_label: string | null;
  positions: { slug: string; name: string; icon?: string }[];
};

type Props = {
  userEmail: string;
  templates: TemplateSummary[];
};

const STEPS = [
  { key: "org", label: "Asso" },
  { key: "event", label: "Événement" },
  { key: "template", label: "Template" },
  { key: "team", label: "Équipe" },
  { key: "done", label: "Terminé" },
] as const;

const TEAM_ROLES = [
  { value: "direction", label: "Direction" },
  { value: "volunteer_lead", label: "Régie bénévole" },
  { value: "post_lead", label: "Responsable de poste" },
  { value: "staff_scan", label: "Staff scan entrée" },
] as const;

type Invite = { email: string; role: (typeof TEAM_ROLES)[number]["value"] };

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
}

function isoDateInputValue(date: Date): string {
  // value pour <input type="datetime-local"> (sans timezone)
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function OnboardingWizard({ templates }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  // Form state
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgSlugTouched, setOrgSlugTouched] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventSlug, setEventSlug] = useState("");
  const [eventSlugTouched, setEventSlugTouched] = useState(false);
  const today = new Date();
  const [eventStarts, setEventStarts] = useState(
    isoDateInputValue(new Date(today.getFullYear(), today.getMonth() + 3, 15, 18, 0)),
  );
  const [eventEnds, setEventEnds] = useState(
    isoDateInputValue(new Date(today.getFullYear(), today.getMonth() + 3, 17, 23, 0)),
  );
  const [templateSlug, setTemplateSlug] = useState<string | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);

  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [createdOrgSlug, setCreatedOrgSlug] = useState<string | null>(null);
  const [createdEventSlug, setCreatedEventSlug] = useState<string | null>(null);

  // Auto-slug from name si pas encore touché
  function onOrgNameChange(v: string) {
    setOrgName(v);
    if (!orgSlugTouched) setOrgSlug(slugify(v));
  }
  function onEventNameChange(v: string) {
    setEventName(v);
    if (!eventSlugTouched) setEventSlug(slugify(v));
  }

  function next() {
    setServerError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setServerError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  // Validations par étape
  const canContinueOrg =
    orgName.trim().length >= 2 && /^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$/.test(orgSlug);
  const canContinueEvent =
    eventName.trim().length >= 2 &&
    /^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$/.test(eventSlug) &&
    new Date(eventEnds) > new Date(eventStarts);
  const canContinueTemplate = true; // template optionnel

  // Submit après l'étape "Template" → crée org + event + template
  async function submitCreation() {
    setServerError(null);
    startTransition(async () => {
      const res = await createOrganizationFromWizard({
        org_name: orgName.trim(),
        org_slug: orgSlug,
        event_name: eventName.trim(),
        event_slug: eventSlug,
        event_starts: new Date(eventStarts).toISOString(),
        event_ends: new Date(eventEnds).toISOString(),
        template_slug: templateSlug,
      });
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      setCreatedEventId(res.event_id);
      setCreatedOrgSlug(res.org_slug);
      setCreatedEventSlug(res.event_slug);
      setStep(3); // → Équipe
    });
  }

  async function submitInvites() {
    if (!createdEventId) return;
    setServerError(null);
    startTransition(async () => {
      const res = await inviteTeamMembers({
        event_id: createdEventId,
        invites: invites.filter((i) => i.email.trim().length > 0),
      });
      if (!res.ok && res.errors.length > 0) {
        setServerError(
          `Invitations partielles : ${res.invited} envoyées, ${res.errors.length} en erreur (${res.errors.map((e) => e.email).join(", ")}).`,
        );
      }
      // Avancer même en cas d'erreurs partielles — l'org est créée, l'utilisateur peut réessayer plus tard
      setStep(4);
    });
  }

  function addInvite() {
    if (invites.length >= 10) return;
    setInvites([...invites, { email: "", role: "volunteer_lead" }]);
  }
  function updateInvite(i: number, patch: Partial<Invite>) {
    setInvites(invites.map((inv, idx) => (idx === i ? { ...inv, ...patch } : inv)));
  }
  function removeInvite(i: number) {
    setInvites(invites.filter((_, idx) => idx !== i));
  }

  return (
    <div className="shadow-soft mt-8 rounded-2xl bg-white p-6">
      {/* Progress */}
      <ol className="mb-8 flex items-center justify-between text-xs">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                i < step
                  ? "bg-emerald-500 text-white"
                  : i === step
                    ? "bg-brand-coral text-white"
                    : "bg-brand-ink/10 text-brand-ink/50"
              }`}
              data-testid={`step-indicator-${s.key}`}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span
              className={`hidden font-medium sm:inline ${i === step ? "text-brand-coral" : "text-brand-ink/60"}`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="bg-brand-ink/15 ml-2 hidden h-px w-6 sm:block" />
            )}
          </li>
        ))}
      </ol>

      {/* Étape 1 : Asso */}
      {step === 0 && (
        <section data-testid="step-org">
          <h2 className="font-display text-xl font-semibold">1. Ton association</h2>
          <p className="text-brand-ink/60 mt-1 text-sm">Le nom et l'identifiant URL.</p>

          <div className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="text-brand-ink font-medium">Nom de l'association</span>
              <input
                type="text"
                value={orgName}
                onChange={(e) => onOrgNameChange(e.target.value)}
                placeholder="ZIK en PACA"
                data-testid="org-name"
                className="border-brand-ink/15 focus:border-brand-coral mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                autoFocus
              />
            </label>
            <label className="block text-sm">
              <span className="text-brand-ink font-medium">Slug URL</span>
              <span className="text-brand-ink/50 ml-2 text-xs">
                easyfest.app/<strong>{orgSlug || "mon-asso"}</strong>
              </span>
              <input
                type="text"
                value={orgSlug}
                onChange={(e) => {
                  setOrgSlug(slugify(e.target.value));
                  setOrgSlugTouched(true);
                }}
                placeholder="zik-en-paca"
                data-testid="org-slug"
                className="border-brand-ink/15 focus:border-brand-coral mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={next}
              disabled={!canContinueOrg}
              data-testid="continue-btn"
              className="bg-brand-coral shadow-soft hover:bg-brand-coral/90 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
            >
              Continuer →
            </button>
          </div>
        </section>
      )}

      {/* Étape 2 : Événement */}
      {step === 1 && (
        <section data-testid="step-event">
          <h2 className="font-display text-xl font-semibold">2. Ton 1er événement</h2>
          <p className="text-brand-ink/60 mt-1 text-sm">
            Tu pourras en créer d'autres ensuite. Statut <strong>brouillon</strong> jusqu'à
            ouverture des inscriptions.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="text-brand-ink font-medium">Nom de l'événement</span>
              <input
                type="text"
                value={eventName}
                onChange={(e) => onEventNameChange(e.target.value)}
                placeholder="Roots du Lac 2026"
                data-testid="event-name"
                className="border-brand-ink/15 focus:border-brand-coral mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
              />
            </label>
            <label className="block text-sm">
              <span className="text-brand-ink font-medium">Slug URL</span>
              <span className="text-brand-ink/50 ml-2 text-xs">
                /{orgSlug || "asso"}/<strong>{eventSlug || "mon-event"}</strong>
              </span>
              <input
                type="text"
                value={eventSlug}
                onChange={(e) => {
                  setEventSlug(slugify(e.target.value));
                  setEventSlugTouched(true);
                }}
                data-testid="event-slug"
                className="border-brand-ink/15 focus:border-brand-coral mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-brand-ink font-medium">Début</span>
                <input
                  type="datetime-local"
                  value={eventStarts}
                  onChange={(e) => setEventStarts(e.target.value)}
                  data-testid="event-starts"
                  className="border-brand-ink/15 focus:border-brand-coral mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="text-brand-ink font-medium">Fin</span>
                <input
                  type="datetime-local"
                  value={eventEnds}
                  onChange={(e) => setEventEnds(e.target.value)}
                  data-testid="event-ends"
                  className="border-brand-ink/15 focus:border-brand-coral mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                />
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={back}
              className="border-brand-ink/15 text-brand-ink/70 rounded-xl border px-5 py-2.5 text-sm font-medium"
            >
              ← Retour
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!canContinueEvent}
              data-testid="continue-btn"
              className="bg-brand-coral shadow-soft hover:bg-brand-coral/90 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
            >
              Continuer →
            </button>
          </div>
        </section>
      )}

      {/* Étape 3 : Template */}
      {step === 2 && (
        <section data-testid="step-template">
          <h2 className="font-display text-xl font-semibold">3. Choisir un modèle</h2>
          <p className="text-brand-ink/60 mt-1 text-sm">
            Pré-remplit les postes d'équipe. 100 % personnalisable ensuite.
          </p>

          <ul className="mt-6 space-y-3">
            {templates.map((t) => (
              <li key={t.slug}>
                <button
                  type="button"
                  onClick={() => setTemplateSlug(t.slug === templateSlug ? null : t.slug)}
                  data-testid={`template-${t.slug}`}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    templateSlug === t.slug
                      ? "border-brand-coral bg-brand-coral/5 shadow-soft"
                      : "border-brand-ink/10 hover:border-brand-coral/40 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-base font-semibold">{t.name}</p>
                    {t.jauge_label && (
                      <span className="bg-brand-ink/5 text-brand-ink/60 rounded-full px-2 py-0.5 text-xs">
                        {t.jauge_label}
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-brand-ink/60 mt-1 text-sm">{t.description}</p>
                  )}
                  <p className="text-brand-ink/50 mt-2 text-xs">
                    Postes pré-remplis :{" "}
                    {t.positions
                      .slice(0, 5)
                      .map((p) => `${p.icon ?? "•"} ${p.name}`)
                      .join(", ")}
                    {t.positions.length > 5 && `… (+${t.positions.length - 5})`}
                  </p>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => setTemplateSlug(null)}
                data-testid="template-none"
                className={`w-full rounded-xl border p-4 text-left transition ${
                  templateSlug === null
                    ? "border-brand-coral bg-brand-coral/5"
                    : "border-brand-ink/15 hover:border-brand-coral/40 border-dashed"
                }`}
              >
                <p className="font-display text-base font-semibold">Aucun template</p>
                <p className="text-brand-ink/60 mt-1 text-sm">
                  Je crée mes postes à la main depuis le dashboard régie.
                </p>
              </button>
            </li>
          </ul>

          {serverError && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError}
            </p>
          )}

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={back}
              className="border-brand-ink/15 text-brand-ink/70 rounded-xl border px-5 py-2.5 text-sm font-medium"
            >
              ← Retour
            </button>
            <button
              type="button"
              onClick={submitCreation}
              disabled={!canContinueTemplate || pending}
              data-testid="create-org-btn"
              className="bg-brand-coral shadow-soft hover:bg-brand-coral/90 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
            >
              {pending ? "Création…" : "Créer l'organisation →"}
            </button>
          </div>
        </section>
      )}

      {/* Étape 4 : Équipe */}
      {step === 3 && (
        <section data-testid="step-team">
          <h2 className="font-display text-xl font-semibold">4. Inviter ton équipe</h2>
          <p className="text-brand-ink/60 mt-1 text-sm">
            Optionnel — tu peux passer cette étape et inviter plus tard. Maximum 10 personnes ici,
            puis depuis le dashboard.
          </p>

          <ul className="mt-6 space-y-3">
            {invites.map((inv, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <input
                  type="email"
                  value={inv.email}
                  onChange={(e) => updateInvite(i, { email: e.target.value })}
                  placeholder="email@asso.fr"
                  data-testid={`invite-email-${i}`}
                  className="border-brand-ink/15 focus:border-brand-coral min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none"
                />
                <select
                  value={inv.role}
                  onChange={(e) => updateInvite(i, { role: e.target.value as Invite["role"] })}
                  data-testid={`invite-role-${i}`}
                  className="border-brand-ink/15 focus:border-brand-coral rounded-lg border px-2 py-2 text-sm focus:outline-none"
                >
                  {TEAM_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeInvite(i)}
                  className="text-brand-ink/50 text-xs underline"
                  aria-label="Supprimer l'invitation"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={addInvite}
            disabled={invites.length >= 10}
            data-testid="add-invite-btn"
            className="border-brand-ink/20 text-brand-ink/70 hover:border-brand-coral/40 mt-3 rounded-xl border border-dashed px-4 py-2 text-sm disabled:opacity-50"
          >
            + Ajouter une invitation
          </button>

          {serverError && (
            <p className="mt-4 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              {serverError}
            </p>
          )}

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="border-brand-ink/15 text-brand-ink/70 rounded-xl border px-5 py-2.5 text-sm font-medium"
              data-testid="skip-team-btn"
            >
              Passer
            </button>
            <button
              type="button"
              onClick={submitInvites}
              disabled={pending || invites.length === 0}
              data-testid="submit-invites-btn"
              className="bg-brand-coral shadow-soft hover:bg-brand-coral/90 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
            >
              {pending
                ? "Envoi…"
                : `Envoyer ${invites.length} invitation${invites.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </section>
      )}

      {/* Étape 5 : Done */}
      {step === 4 && (
        <section data-testid="step-done">
          <p className="text-5xl">🎉</p>
          <h2 className="font-display mt-3 text-2xl font-bold">Ton organisation est en ligne</h2>
          <p className="text-brand-ink/70 mt-2 text-sm">
            Tu peux dès maintenant ouvrir ton dashboard régie pour configurer les postes, les
            créneaux et ouvrir les inscriptions bénévoles.
          </p>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={() => router.push(`/regie/${createdOrgSlug}/${createdEventSlug}`)}
              data-testid="goto-regie-btn"
              className="bg-brand-coral shadow-soft hover:bg-brand-coral/90 w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition"
            >
              Aller au dashboard régie →
            </button>
            <button
              type="button"
              onClick={() => router.push("/hub")}
              className="border-brand-ink/15 text-brand-ink/70 hover:border-brand-coral/40 w-full rounded-xl border px-5 py-3 text-sm font-medium"
            >
              Retour au hub
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
