"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { ThemePreset } from "@easyfest/shared";

import { applyThemePreset, saveCustomTheme } from "@/app/actions/theme";

interface ThemePickerProps {
  organizationId: string;
  orgSlug: string;
  eventSlug: string;
  presets: ThemePreset[];
  currentSlug: string;
  isPremium: boolean;
  customPrimary: string | null;
  customAccent: string | null;
  customSurface: string | null;
  customText: string | null;
}

export function ThemePicker(props: ThemePickerProps) {
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState(props.currentSlug);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSelect(slug: string) {
    if (slug === selectedSlug || pending) return;
    setSelectedSlug(slug);
    setFeedback(null);

    startTransition(async () => {
      const res = await applyThemePreset({
        organizationId: props.organizationId,
        presetSlug: slug,
        orgSlug: props.orgSlug,
        eventSlug: props.eventSlug,
      });
      if (res.ok) {
        setFeedback({ type: "ok", msg: "Thème appliqué — toutes les pages sont mises à jour." });
        // Bug #14 fix : revalidatePath côté serveur ne re-render PAS la page courante
        // (TenantThemeProvider du layout) tant qu'on ne navigue pas. router.refresh()
        // force Next.js à re-fetcher les RSC et donc à appliquer immédiatement le thème.
        router.refresh();
      } else {
        setFeedback({ type: "err", msg: res.error ?? "Erreur inattendue" });
        setSelectedSlug(props.currentSlug);
      }
    });
  }

  return (
    <div className="space-y-8">
      {feedback && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === "ok"
              ? "border-brand-pine/30 bg-brand-pine/10 text-brand-pine"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-base font-semibold uppercase tracking-widest text-brand-ink/70">
          5 ambiances prêtes à l&apos;emploi
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {props.presets.map((preset) => (
            <PresetCard
              key={preset.slug}
              preset={preset}
              isActive={preset.slug === selectedSlug}
              isPending={pending && preset.slug === selectedSlug}
              onSelect={() => handleSelect(preset.slug)}
            />
          ))}
        </div>
      </section>

      <CustomSection
        organizationId={props.organizationId}
        orgSlug={props.orgSlug}
        eventSlug={props.eventSlug}
        isPremium={props.isPremium}
        initialPrimary={props.customPrimary}
        initialAccent={props.customAccent}
        initialSurface={props.customSurface}
        initialText={props.customText}
        onResult={setFeedback}
      />
    </div>
  );
}

interface PresetCardProps {
  preset: ThemePreset;
  isActive: boolean;
  isPending: boolean;
  onSelect: () => void;
}

function PresetCard({ preset, isActive, isPending, onSelect }: PresetCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 ${
        isActive
          ? "border-brand-coral shadow-lg ring-2 ring-brand-coral/30"
          : "border-brand-ink/10 hover:border-brand-coral/40 hover:shadow-md"
      }`}
      style={{ minHeight: "180px" }}
    >
      <div
        className="flex h-24 items-end justify-between p-3"
        style={{ backgroundColor: preset.surface }}
      >
        <span
          className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: preset.primary, color: preset.primaryText }}
        >
          {preset.label}
        </span>
        <span
          className="h-6 w-6 rounded-full"
          style={{ backgroundColor: preset.accent }}
          aria-hidden
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 bg-white p-3">
        <p className="text-sm font-semibold text-brand-ink">{preset.vibe}</p>
        <p className="text-xs text-brand-ink/60">{preset.recommendedFor}</p>
        <div className="mt-auto pt-2">
          {isActive ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-coral">
              {isPending ? "Application…" : "✓ Actif"}
            </span>
          ) : (
            <span className="text-xs text-brand-ink/50">Cliquer pour appliquer</span>
          )}
        </div>
      </div>
    </button>
  );
}

interface CustomSectionProps {
  organizationId: string;
  orgSlug: string;
  eventSlug: string;
  isPremium: boolean;
  initialPrimary: string | null;
  initialAccent: string | null;
  initialSurface: string | null;
  initialText: string | null;
  onResult: (f: { type: "ok" | "err"; msg: string }) => void;
}

function CustomSection(props: CustomSectionProps) {
  const [primary, setPrimary] = useState(props.initialPrimary ?? "#FF5E5B");
  const [accent, setAccent] = useState(props.initialAccent ?? "#F4B860");
  const [surface, setSurface] = useState(props.initialSurface ?? "#FFF8F0");
  const [text, setText] = useState(props.initialText ?? "#1A1A1A");
  const [pending, startTransition] = useTransition();

  const router = useRouter();
  function handleSave() {
    if (!props.isPremium || pending) return;
    startTransition(async () => {
      const res = await saveCustomTheme({
        organizationId: props.organizationId,
        orgSlug: props.orgSlug,
        eventSlug: props.eventSlug,
        primary,
        accent,
        surface,
        text,
      });
      if (res.ok) {
        props.onResult({ type: "ok", msg: "Couleurs personnalisées enregistrées." });
        router.refresh();
      } else {
        props.onResult({ type: "err", msg: res.error ?? "Erreur inattendue" });
      }
    });
  }

  return (
    <section
      className={`rounded-2xl border-2 border-dashed p-5 sm:p-6 ${
        props.isPremium ? "border-brand-amber/60 bg-brand-amber/5" : "border-brand-ink/15 bg-brand-ink/[0.02]"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold uppercase tracking-widest text-brand-ink/70">
          Couleurs sur mesure
        </h2>
        {!props.isPremium && (
          <span className="rounded-full bg-brand-amber px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-ink">
            Premium
          </span>
        )}
      </div>

      {!props.isPremium ? (
        <p className="text-sm text-brand-ink/70">
          Active le mode premium pour saisir tes propres couleurs HEX et matcher l&apos;identité exacte de ton festival.{" "}
          <span className="font-medium text-brand-ink">Disponible sur le plan Festival et plus.</span>
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ColorField label="Primaire" value={primary} onChange={setPrimary} />
          <ColorField label="Accent" value={accent} onChange={setAccent} />
          <ColorField label="Surface" value={surface} onChange={setSurface} />
          <ColorField label="Texte" value={text} onChange={setText} />
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="col-span-2 mt-2 inline-flex items-center justify-center rounded-xl bg-brand-coral px-4 py-3 text-sm font-semibold text-brand-cream transition hover:bg-brand-coral/90 disabled:opacity-50 sm:col-span-4"
            style={{ minHeight: "44px" }}
          >
            {pending ? "Enregistrement…" : "Enregistrer mes couleurs"}
          </button>
        </div>
      )}
    </section>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-brand-ink/70">
      <span className="uppercase tracking-wider">{label}</span>
      <span className="flex items-center gap-2 rounded-lg border border-brand-ink/15 bg-white p-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border-0"
          aria-label={`Couleur ${label.toLowerCase()}`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="w-full bg-transparent font-mono text-xs text-brand-ink focus:outline-none"
          maxLength={7}
          inputMode="text"
          spellCheck={false}
        />
      </span>
    </label>
  );
}
