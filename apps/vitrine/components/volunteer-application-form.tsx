"use client";

import { useState, useTransition } from "react";

import { submitVolunteerApplication } from "@/app/actions/applications";

interface PositionLite {
  slug: string;
  name: string;
  color: string | null;
  icon: string | null;
  description: string | null;
}

interface Props {
  eventId: string;
  eventName: string;
  organizationSlug: string;
  eventSlug: string;
  maxPreferredPositions: number;
  positions: PositionLite[];
}

type Step = 1 | 2 | 3 | 4 | 5;

export function VolunteerApplicationForm({
  eventId,
  eventName,
  organizationSlug,
  eventSlug,
  maxPreferredPositions,
  positions,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state minimal — un Server Action consomme le FormData entier en fin
  const [preferredPositions, setPreferredPositions] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo trop lourde (max 5 Mo). Compresse ton image et réessaye.");
      e.target.value = "";
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError(null);
  }

  function togglePosition(slug: string) {
    setPreferredPositions((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= maxPreferredPositions) return prev;
      return [...prev, slug];
    });
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    formData.append("eventId", eventId);
    formData.append("organizationSlug", organizationSlug);
    formData.append("eventSlug", eventSlug);
    for (const slug of preferredPositions) formData.append("preferredPositionSlugs", slug);
    if (photoFile) formData.set("photoFile", photoFile);

    startTransition(async () => {
      const result = await submitVolunteerApplication(formData);
      if (!result.ok) {
        setError(result.error ?? "Erreur inconnue");
      } else {
        setSuccess(true);
      }
    });
  }

  if (success) {
    return (
      <div className="rounded-2xl bg-wellbeing-green/10 p-8 text-center">
        <div className="mb-4 text-5xl">🎉</div>
        <h2 className="font-display text-2xl font-bold">Candidature envoyée !</h2>
        <p className="mt-2 text-brand-ink/70">
          Tu vas recevoir un mail de confirmation. L'équipe {eventName} reviendra vers
          toi rapidement avec ton accès personnel et ton planning.
        </p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Stepper */}
      <ol className="flex justify-between text-xs font-medium text-brand-ink/40">
        {[1, 2, 3, 4, 5].map((n) => (
          <li
            key={n}
            className={n === step ? "text-brand-coral" : n < step ? "text-brand-ink" : ""}
          >
            {n}.{" "}
            {n === 1 && "Identité"}
            {n === 2 && "Logistique"}
            {n === 3 && "Postes"}
            {n === 4 && "Compétences"}
            {n === 5 && "Engagements"}
          </li>
        ))}
      </ol>

      {/* Étape 1 — Identité (toujours dans le DOM, hidden si pas l'étape) */}
      <fieldset className={step === 1 ? "" : "hidden"} aria-hidden={step !== 1}>
        <Field label="Prénom" name="firstName" required minLength={2} />
        <Field label="Nom" name="lastName" required minLength={2} />
        <Field label="Email" name="email" type="email" required />
        <Field label="Téléphone" name="phone" type="tel" required placeholder="+33 6 12 34 56 78" />
        <Field label="Date de naissance" name="birthDate" type="date" required />
        <Select label="Sexe (optionnel)" name="gender">
          <option value="">—</option>
          <option value="F">Femme</option>
          <option value="M">Homme</option>
          <option value="X">Non-binaire</option>
          <option value="NS">Préfère ne pas répondre</option>
        </Select>
        <Field label="Profession (optionnel)" name="profession" />

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-brand-ink">
            Photo de profil (optionnel mais recommandé)
            <span className="ml-1 text-xs font-normal text-brand-ink/60">— ça aide ton/ta responsable à te reconnaître</span>
          </label>
          <div className="flex items-center gap-3">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Aperçu"
                className="h-16 w-16 rounded-full object-cover ring-2 ring-brand-coral/30"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-ink/8 text-2xl text-brand-ink/40">
                📷
              </div>
            )}
            <label className="flex-1 cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <span className="inline-block rounded-lg border border-dashed border-brand-ink/25 bg-white px-3 py-2 text-sm text-brand-ink/70 hover:border-brand-coral hover:text-brand-coral">
                {photoFile ? `📎 ${photoFile.name}` : "📤 Choisir une photo (JPG/PNG, max 5 Mo)"}
              </span>
            </label>
          </div>
        </div>
      </fieldset>

      {/* Étape 2 — Logistique */}
      <fieldset className={step === 2 ? "" : "hidden"} aria-hidden={step !== 2}>
        <Field label="Date+heure d'arrivée" name="arrivalAt" type="datetime-local" required />
        <Field label="Date+heure de départ" name="departureAt" type="datetime-local" required />
        <Select label="Taille T-shirt" name="size">
          <option value="">—</option>
          {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Textarea
          label="Allergies / régime alimentaire (data sensible — accès limité au catering)"
          name="dietNotes"
          rows={3}
        />
        <Checkbox label="J'ai un véhicule" name="hasVehicle" />
        <Checkbox label="J'ai le permis B" name="drivingLicense" />
      </fieldset>

      {/* Étape 3 — Postes (top N) */}
      <fieldset className={step === 3 ? "" : "hidden"} aria-hidden={step !== 3}>
        <p className="mb-3 text-sm text-brand-ink/70">
          Choisis jusqu'à <strong>{maxPreferredPositions}</strong> postes par ordre de préférence.
          L'équipe affecte selon les besoins. ({preferredPositions.length} sélectionné·s)
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {positions.map((p) => {
            const selectedIndex = preferredPositions.indexOf(p.slug);
            const selected = selectedIndex !== -1;
            const disabled = !selected && preferredPositions.length >= maxPreferredPositions;
            return (
              <button
                key={p.slug}
                type="button"
                disabled={disabled}
                onClick={() => togglePosition(p.slug)}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                  selected
                    ? "border-brand-coral bg-brand-coral/10"
                    : "border-brand-ink/10 bg-white/60 hover:border-brand-ink/25"
                } ${disabled ? "opacity-40" : ""}`}
              >
                <span className="text-2xl">{p.icon}</span>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium">{p.name}</span>
                    {selected && (
                      <span className="rounded-full bg-brand-coral px-2 py-0.5 text-xs font-medium text-white">
                        #{selectedIndex + 1}
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="mt-1 text-xs text-brand-ink/60">{p.description}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Étape 4 — Compétences */}
      <fieldset className={step === 4 ? "" : "hidden"} aria-hidden={step !== 4}>
        <Textarea label="Bio courte (optionnel)" name="bio" rows={3} />
        <Checkbox label="J'ai déjà été bénévole sur un festival" name="isReturning" />
      </fieldset>

      {/* Étape 5 — Engagements */}
      <fieldset className={step === 5 ? "" : "hidden"} aria-hidden={step !== 5}>
        <div className="space-y-3">
          <Checkbox
            label="J'ai lu et j'accepte la charte du festival"
            name="consentCharter"
            required
          />
          <Checkbox
            label="Je m'engage contre toute forme de harcèlement"
            name="consentAntiHarassment"
            required
          />
          <Checkbox
            label="J'accepte le traitement de mes données conformément à la politique de confidentialité (RGPD)"
            name="consentPii"
            required
          />
          <Checkbox label="J'autorise l'utilisation de mon image (photos festival)" name="consentImage" />
        </div>
        <input type="hidden" name="turnstileToken" value="placeholder-turnstile-token" />
      </fieldset>

      {error && (
        <div className="rounded-xl bg-wellbeing-red/10 px-4 py-3 text-sm text-wellbeing-red">
          {error}
        </div>
      )}

      {/* Navigation steps */}
      <div className="flex items-center justify-between pt-4">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (Math.max(1, s - 1) as Step))}
            className="text-sm text-brand-ink/60 hover:underline"
          >
            ← Retour
          </button>
        ) : (
          <span />
        )}

        {step < 5 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (Math.min(5, s + 1) as Step))}
            className="rounded-xl bg-brand-ink px-5 py-2 text-sm font-medium text-white shadow-soft transition hover:opacity-90"
          >
            Continuer →
          </button>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-brand-coral px-6 py-3 text-sm font-medium text-white shadow-soft transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Envoi…" : "Envoyer ma candidature"}
          </button>
        )}
      </div>
    </form>
  );
}

// ─── Inputs primitifs (sans dépendance, shadcn-like) ────────────
function Field({
  label,
  name,
  type = "text",
  required,
  minLength,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium">
        {label} {required && <span className="text-brand-coral">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="w-full rounded-xl border border-brand-ink/15 bg-white px-3 py-2 text-sm focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
      />
    </label>
  );
}

function Select({
  label,
  name,
  children,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <select
        name={name}
        className="w-full rounded-xl border border-brand-ink/15 bg-white px-3 py-2 text-sm focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
      >
        {children}
      </select>
    </label>
  );
}

function Textarea({
  label,
  name,
  rows = 3,
}: {
  label: string;
  name: string;
  rows?: number;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <textarea
        name={name}
        rows={rows}
        className="w-full rounded-xl border border-brand-ink/15 bg-white px-3 py-2 text-sm focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
      />
    </label>
  );
}

function Checkbox({
  label,
  name,
  required,
}: {
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        name={name}
        value="true"
        required={required}
        className="mt-0.5 h-4 w-4 rounded border-brand-ink/30 text-brand-coral focus:ring-brand-coral"
      />
      <span className="text-sm">
        {label} {required && <span className="text-brand-coral">*</span>}
      </span>
    </label>
  );
}
