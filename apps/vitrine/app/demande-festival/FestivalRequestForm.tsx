"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { slugify } from "@easyfest/shared";

import { TurnstileWidget } from "@/components/TurnstileWidget";
import { submitFestivalRequest } from "@/app/actions/onboard-self-serve";

const TURNSTILE_SITE_KEY = process.env["NEXT_PUBLIC_TURNSTILE_SITE_KEY"];

/**
 * Génère un challenge mathématique simple (anti-bot).
 * On utilise des nombres entre 1-9 pour qu'un humain résolve facilement.
 */
function generateMathChallenge(): { a: number; b: number; expected: number } {
  const a = 1 + Math.floor(Math.random() * 9);
  const b = 1 + Math.floor(Math.random() * 9);
  return { a, b, expected: a + b };
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  orgName: string;
  orgSlug: string;
  orgSiret: string;
  orgAddress: string;
  orgPresident: string;
  eventName: string;
  eventSlug: string;
  eventStartsAt: string;
  eventEndsAt: string;
  eventLocation: string;
  eventCapacity: string;
  eventType: string;
  templateSlug: string;
  consentCgu: boolean;
  consentRgpd: boolean;
}

const INITIAL: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  orgName: "",
  orgSlug: "",
  orgSiret: "",
  orgAddress: "",
  orgPresident: "",
  eventName: "",
  eventSlug: "",
  eventStartsAt: "",
  eventEndsAt: "",
  eventLocation: "",
  eventCapacity: "",
  eventType: "festival-musical",
  templateSlug: "festival-musical-1000",
  consentCgu: false,
  consentRgpd: false,
};

const STEPS = [
  { key: "you", label: "Toi" },
  { key: "org", label: "Asso" },
  { key: "event", label: "Festival" },
  { key: "template", label: "Équipe" },
  { key: "legal", label: "Validation" },
] as const;

export function FestivalRequestForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitted, setSubmitted] = useState<{ email: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Anti-bot defenses
  const [hpWebsite, setHpWebsite] = useState(""); // honeypot — doit rester vide
  const [hpMathAnswer, setHpMathAnswer] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const mathChallenge = useRef(generateMathChallenge());
  const formOpenedAt = useRef<number>(typeof window !== "undefined" ? Date.now() : 0);
  useEffect(() => {
    // S'assurer que le timestamp est correct côté client (re-init si nécessaire)
    if (formOpenedAt.current === 0) formOpenedAt.current = Date.now();
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Slug auto sur orgName et eventName si non touché
      if (key === "orgName" && typeof value === "string" && !prev.orgSlug) {
        next.orgSlug = slugify(value);
      }
      if (key === "eventName" && typeof value === "string" && !prev.eventSlug) {
        next.eventSlug = slugify(value);
      }
      return next;
    });
  }

  const stepValidations: boolean[] = useMemo(() => {
    const mathOk =
      hpMathAnswer.trim() !== "" &&
      Number.parseInt(hpMathAnswer.trim(), 10) === mathChallenge.current.expected;
    // Turnstile : on requiert un token uniquement si la siteKey est configurée
    const turnstileOk = !TURNSTILE_SITE_KEY || turnstileToken.length > 0;
    return [
      Boolean(form.firstName.trim()) && /\S+@\S+\.\S+/.test(form.email),
      Boolean(form.orgName.trim()) && Boolean(form.orgSlug.trim()),
      Boolean(form.eventName.trim()) && Boolean(form.eventStartsAt) && Boolean(form.eventEndsAt) && Boolean(form.eventLocation.trim()),
      Boolean(form.templateSlug),
      form.consentCgu && form.consentRgpd && mathOk && turnstileOk,
    ];
  }, [form, hpMathAnswer, turnstileToken]);

  function handleSubmit() {
    if (pending || !stepValidations.every(Boolean)) return;
    setServerError(null);
    startTransition(async () => {
      const res = await submitFestivalRequest({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || null,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        orgName: form.orgName.trim(),
        orgSlug: form.orgSlug.trim(),
        orgSiret: form.orgSiret.trim() || null,
        orgAddress: form.orgAddress.trim() || null,
        orgPresident: form.orgPresident.trim() || null,
        eventName: form.eventName.trim(),
        eventSlug: form.eventSlug.trim(),
        eventStartsAt: form.eventStartsAt,
        eventEndsAt: form.eventEndsAt,
        eventLocation: form.eventLocation.trim(),
        eventCapacity: form.eventCapacity ? Number(form.eventCapacity) : null,
        eventType: form.eventType,
        templateSlug: form.templateSlug,
        consentCgu: form.consentCgu,
        consentRgpd: form.consentRgpd,
        // Anti-bot fields
        hp_website: hpWebsite,
        hp_math_answer: hpMathAnswer,
        hp_math_expected: mathChallenge.current.expected,
        hp_form_opened_at: formOpenedAt.current,
        turnstileToken: turnstileToken || undefined,
      });
      if (res.ok) {
        setSubmitted({ email: form.email.trim().toLowerCase() });
      } else {
        setServerError(res.error ?? "Erreur inattendue");
      }
    });
  }

  if (submitted) {
    return <SuccessPanel email={submitted.email} />;
  }

  return (
    <div className="space-y-6">
      <Stepper current={step} validations={stepValidations} onJump={setStep} />

      <div className="min-h-[280px]">
        {step === 0 && <StepYou form={form} update={update} />}
        {step === 1 && <StepOrg form={form} update={update} />}
        {step === 2 && <StepEvent form={form} update={update} />}
        {step === 3 && <StepTemplate form={form} update={update} />}
        {step === 4 && (
          <>
            <StepLegal form={form} update={update} />
            {/* Honeypot anti-bot : caché en CSS + accessibilité, doit rester vide */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}>
              <label>
                Site web (laisse vide) :
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={hpWebsite}
                  onChange={(e) => setHpWebsite(e.target.value)}
                />
              </label>
            </div>
            {/* Math challenge anti-bot — visible humain */}
            <label className="mt-4 flex flex-col gap-1.5 rounded-xl border border-brand-ink/10 bg-brand-cream/40 p-3 text-sm">
              <span className="font-medium text-brand-ink/80">
                🔢 Petite vérif anti-spam : combien font {mathChallenge.current.a} + {mathChallenge.current.b} ?
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={hpMathAnswer}
                onChange={(e) => setHpMathAnswer(e.target.value)}
                min={0}
                max={99}
                required
                className="w-24 rounded-lg border border-brand-ink/15 bg-white px-3 py-2 text-base focus:border-brand-coral focus:outline-none"
                style={{ fontSize: "16px" }}
                placeholder="?"
              />
              <span className="text-xs text-brand-ink/55">
                Désolé pour cette friction, c&apos;est la dernière protection avant le mail magique 🤖
              </span>
            </label>
            {/* Turnstile anti-bot — uniquement si la siteKey est configurée (sinon math challenge suffit) */}
            {TURNSTILE_SITE_KEY && (
              <div className="mt-4">
                <TurnstileWidget
                  siteKey={TURNSTILE_SITE_KEY}
                  onVerify={setTurnstileToken}
                  onExpire={() => setTurnstileToken("")}
                />
              </div>
            )}
          </>
        )}
      </div>

      {serverError && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || pending}
          className="inline-flex items-center justify-center rounded-xl border border-brand-ink/15 px-4 py-3 text-sm font-medium text-brand-ink/70 hover:bg-brand-ink/5 disabled:opacity-40"
          style={{ minHeight: "44px" }}
        >
          ← Précédent
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={!stepValidations[step] || pending}
            className="inline-flex items-center justify-center rounded-xl bg-brand-coral px-5 py-3 text-sm font-semibold text-brand-cream transition hover:opacity-90 disabled:opacity-40"
            style={{ minHeight: "44px" }}
          >
            Suivant →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!stepValidations.every(Boolean) || pending}
            className="inline-flex items-center justify-center rounded-xl bg-brand-coral px-5 py-3 text-sm font-semibold text-brand-cream transition hover:opacity-90 disabled:opacity-40"
            style={{ minHeight: "44px" }}
          >
            {pending ? "Envoi…" : "🚀 Recevoir mon mail magique"}
          </button>
        )}
      </div>
    </div>
  );
}

interface StepperProps {
  current: number;
  validations: boolean[];
  onJump: (i: number) => void;
}

function Stepper({ current, validations, onJump }: StepperProps) {
  return (
    <ol className="-mx-1 flex items-center gap-1 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const isActive = i === current;
        const isPast = i < current;
        const canJump = isPast || validations.slice(0, i).every(Boolean);
        return (
          <li key={s.key} className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => canJump && onJump(i)}
              disabled={!canJump}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition ${
                isActive
                  ? "bg-brand-coral/10 font-semibold text-brand-coral"
                  : isPast
                    ? "text-brand-pine"
                    : "text-brand-ink/50"
              } ${canJump ? "hover:bg-brand-ink/5" : "cursor-not-allowed"}`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  isActive
                    ? "bg-brand-coral text-brand-cream"
                    : isPast
                      ? "bg-brand-pine text-brand-cream"
                      : "bg-brand-ink/10 text-brand-ink/60"
                }`}
              >
                {isPast ? "✓" : i + 1}
              </span>
              <span className="truncate">{s.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

interface StepProps {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 inline-block text-xs font-medium uppercase tracking-wider text-brand-ink/70">
        {label} {required && <span className="text-brand-coral">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-brand-ink/50">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-brand-ink/15 bg-brand-cream/30 px-3 py-3 text-base text-brand-ink placeholder:text-brand-ink/40 focus:border-brand-coral focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-coral/20";

function StepYou({ form, update }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold text-brand-ink">Tu es qui ?</h2>
      <p className="text-sm text-brand-ink/60">
        On envoie ton mail magique à cette adresse. Pas de spam, promis.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" required>
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            className={inputClass}
            autoComplete="given-name"
            maxLength={80}
            required
          />
        </Field>
        <Field label="Nom">
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            className={inputClass}
            autoComplete="family-name"
            maxLength={80}
          />
        </Field>
      </div>
      <Field label="Email" required hint="Reçois ton mail magique pour valider la création.">
        <input
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className={inputClass}
          autoComplete="email"
          inputMode="email"
          maxLength={200}
          required
        />
      </Field>
      <Field label="Téléphone" hint="Optionnel — pour les urgences uniquement.">
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          className={inputClass}
          autoComplete="tel"
          inputMode="tel"
          maxLength={30}
        />
      </Field>
    </div>
  );
}

function StepOrg({ form, update }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold text-brand-ink">Ton association</h2>
      <p className="text-sm text-brand-ink/60">
        L&apos;identifiant URL public sera : <code className="rounded bg-brand-ink/5 px-1 text-xs">easyfest.app/{form.orgSlug || "ton-asso"}</code>
      </p>
      <Field label="Nom de l'association" required>
        <input
          type="text"
          value={form.orgName}
          onChange={(e) => update("orgName", e.target.value)}
          className={inputClass}
          maxLength={150}
          required
        />
      </Field>
      <Field label="Identifiant URL" required hint="Lettres minuscules, tirets uniquement.">
        <input
          type="text"
          value={form.orgSlug}
          onChange={(e) => update("orgSlug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
          className={inputClass}
          pattern="[a-z0-9-]+"
          maxLength={64}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="SIRET" hint="Optionnel — utile pour les subventions.">
          <input
            type="text"
            value={form.orgSiret}
            onChange={(e) => update("orgSiret", e.target.value)}
            className={inputClass}
            inputMode="numeric"
            maxLength={14}
          />
        </Field>
        <Field label="Président·e" hint="Nom du/de la président·e en exercice.">
          <input
            type="text"
            value={form.orgPresident}
            onChange={(e) => update("orgPresident", e.target.value)}
            className={inputClass}
            maxLength={100}
          />
        </Field>
      </div>
      <Field label="Adresse" hint="Siège social ou adresse postale principale.">
        <input
          type="text"
          value={form.orgAddress}
          onChange={(e) => update("orgAddress", e.target.value)}
          className={inputClass}
          autoComplete="street-address"
          maxLength={250}
        />
      </Field>
    </div>
  );
}

function StepEvent({ form, update }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold text-brand-ink">Ton festival</h2>
      <Field label="Nom du festival" required>
        <input
          type="text"
          value={form.eventName}
          onChange={(e) => update("eventName", e.target.value)}
          className={inputClass}
          maxLength={150}
          required
        />
      </Field>
      <Field label="Identifiant URL" required hint={`URL : easyfest.app/${form.orgSlug || "ton-asso"}/${form.eventSlug || "ton-festival"}`}>
        <input
          type="text"
          value={form.eventSlug}
          onChange={(e) => update("eventSlug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
          className={inputClass}
          pattern="[a-z0-9-]+"
          maxLength={64}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Début" required>
          <input
            type="datetime-local"
            value={form.eventStartsAt}
            onChange={(e) => update("eventStartsAt", e.target.value)}
            className={inputClass}
            required
          />
        </Field>
        <Field label="Fin" required>
          <input
            type="datetime-local"
            value={form.eventEndsAt}
            onChange={(e) => update("eventEndsAt", e.target.value)}
            className={inputClass}
            required
          />
        </Field>
      </div>
      <Field label="Lieu" required>
        <input
          type="text"
          value={form.eventLocation}
          onChange={(e) => update("eventLocation", e.target.value)}
          className={inputClass}
          placeholder="Ex : Parc de la Mairie, 06000 Nice"
          maxLength={200}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jauge attendue" hint="Nombre de festivaliers maximum.">
          <input
            type="number"
            value={form.eventCapacity}
            onChange={(e) => update("eventCapacity", e.target.value)}
            className={inputClass}
            inputMode="numeric"
            min={0}
            max={1000000}
          />
        </Field>
        <Field label="Type d'événement">
          <select
            value={form.eventType}
            onChange={(e) => update("eventType", e.target.value)}
            className={inputClass}
          >
            <option value="festival-musical">Festival musical</option>
            <option value="foire">Foire / salon</option>
            <option value="manifestation-sportive">Manifestation sportive</option>
            <option value="evenement-culturel">Événement culturel</option>
            <option value="autre">Autre</option>
          </select>
        </Field>
      </div>
    </div>
  );
}

const TEMPLATES = [
  { slug: "festival-musical-1000", emoji: "🎵", name: "Festival musical · 500-2000 pax", desc: "Bar, scène, accueil, sécurité, propreté." },
  { slug: "foire-locale", emoji: "🎪", name: "Foire / salon", desc: "Accueil, signalétique, exposants, billetterie." },
  { slug: "association-vide", emoji: "✨", name: "Je commence de zéro", desc: "Aucun template — je crée mes équipes plus tard." },
];

function StepTemplate({ form, update }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold text-brand-ink">Quel modèle d&apos;équipe ?</h2>
      <p className="text-sm text-brand-ink/60">
        On crée tes postes (bar, accueil, scène…) automatiquement. Tu pourras les éditer ensuite.
      </p>
      <div className="space-y-3">
        {TEMPLATES.map((t) => {
          const isActive = form.templateSlug === t.slug;
          return (
            <button
              key={t.slug}
              type="button"
              onClick={() => update("templateSlug", t.slug)}
              aria-pressed={isActive}
              className={`flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-coral/20 ${
                isActive
                  ? "border-brand-coral bg-brand-coral/5 shadow-sm"
                  : "border-brand-ink/10 hover:border-brand-coral/40 hover:bg-brand-cream/50"
              }`}
              style={{ minHeight: "44px" }}
            >
              <span aria-hidden className="text-2xl">{t.emoji}</span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-brand-ink">{t.name}</span>
                <span className="mt-0.5 block text-xs text-brand-ink/60">{t.desc}</span>
              </span>
              {isActive && <span className="text-sm font-bold text-brand-coral">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepLegal({ form, update }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold text-brand-ink">Validation</h2>
      <p className="text-sm text-brand-ink/70">
        Récap : <strong>{form.eventName}</strong> par <strong>{form.orgName}</strong>
        {form.eventStartsAt && <> du {new Date(form.eventStartsAt).toLocaleDateString("fr-FR")}</>}
        {form.eventEndsAt && <> au {new Date(form.eventEndsAt).toLocaleDateString("fr-FR")}</>}
        {form.eventLocation && <>, à {form.eventLocation}</>}.
      </p>

      <label className="flex items-start gap-3 rounded-xl border border-brand-ink/10 bg-brand-cream/40 p-3 text-sm text-brand-ink/80">
        <input
          type="checkbox"
          checked={form.consentCgu}
          onChange={(e) => update("consentCgu", e.target.checked)}
          className="mt-0.5 h-5 w-5 accent-brand-coral"
          required
        />
        <span>
          J&apos;accepte les{" "}
          <a href="/legal/cgu" target="_blank" className="font-medium underline">
            CGU d&apos;Easyfest
          </a>{" "}
          et la{" "}
          <a href="/legal/mentions" target="_blank" className="font-medium underline">
            politique de mentions légales
          </a>
          .
        </span>
      </label>

      <label className="flex items-start gap-3 rounded-xl border border-brand-ink/10 bg-brand-cream/40 p-3 text-sm text-brand-ink/80">
        <input
          type="checkbox"
          checked={form.consentRgpd}
          onChange={(e) => update("consentRgpd", e.target.checked)}
          className="mt-0.5 h-5 w-5 accent-brand-coral"
          required
        />
        <span>
          J&apos;accepte que mes données soient traitées conformément au{" "}
          <a href="/legal/rgpd" target="_blank" className="font-medium underline">
            RGPD
          </a>
          . Je peux supprimer mon festival à tout moment (Article 17).
        </span>
      </label>

      <p className="rounded-lg bg-brand-amber/10 px-3 py-2 text-xs text-brand-ink/70">
        💡 Après validation, tu reçois un mail magique. <strong>Clique-le dans les 24h</strong> pour finaliser
        la création de ton festival.
      </p>
    </div>
  );
}

function SuccessPanel({ email }: { email: string }) {
  return (
    <div className="space-y-4 rounded-2xl border-2 border-brand-pine/30 bg-brand-pine/5 p-6 text-center">
      <div aria-hidden className="text-5xl">📬</div>
      <h2 className="font-display text-2xl font-black text-brand-pine">Vérifie ta boîte mail</h2>
      <p className="text-sm text-brand-ink/80">
        On vient d&apos;envoyer un mail magique à <strong>{email}</strong>.
      </p>
      <p className="text-sm text-brand-ink/70">
        Clique le lien dans le mail pour finaliser la création de ton festival. Le lien est valable 24h.
      </p>
      <p className="text-xs text-brand-ink/50">
        Pas de mail ? Vérifie tes spams, ou{" "}
        <a href="/contact" className="underline">contacte-nous</a>.
      </p>
    </div>
  );
}
