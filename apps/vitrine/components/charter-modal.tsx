"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onScrolledToBottom: () => void;
  alreadyRead: boolean;
}

/**
 * Modal Charte avec scroll-locked : le bouton "J'ai compris" n'est cliquable
 * que quand l'utilisateur·rice a effectivement scrollé jusqu'au bas du contenu.
 * Tolérance de 50px pour les écrans tactiles.
 */
export function CharterModal({ open, onClose, onScrolledToBottom, alreadyRead }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(alreadyRead);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    if (alreadyRead) setHasScrolledToBottom(true);
  }, [alreadyRead]);

  // ESC ferme la modale
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll quand modale ouverte
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    const progress = max > 0 ? Math.min(1, el.scrollTop / max) : 1;
    setScrollProgress(progress);
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
      if (!hasScrolledToBottom) {
        setHasScrolledToBottom(true);
        onScrolledToBottom();
      }
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="charter-title"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-brand-ink/50 backdrop-blur-sm"
      />

      {/* Modal */}
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-brand-ink/10 bg-brand-cream px-5 py-4">
          <div>
            <h2 id="charter-title" className="font-display text-xl font-bold">
              📜 Charte du festival & engagements
            </h2>
            <p className="mt-0.5 text-xs text-brand-ink/60">
              Lecture obligatoire avant validation
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-2 text-brand-ink/60 transition hover:bg-brand-ink/5"
          >
            ✕
          </button>
        </header>

        {/* Progress bar (scroll) */}
        <div className="relative h-1 overflow-hidden bg-brand-ink/10">
          <div
            className={`h-full transition-all ${
              hasScrolledToBottom ? "bg-wellbeing-green" : "bg-brand-coral"
            }`}
            style={{ width: `${Math.round(scrollProgress * 100)}%` }}
          />
        </div>

        {/* Body — scrollable */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-6"
        >
          <article className="prose prose-sm max-w-none">
            <h3 className="font-display text-lg font-semibold">📜 Charte du festival</h3>
            <p>
              En tant que bénévole, je m'engage à :
            </p>
            <ul className="my-2 list-disc space-y-1 pl-5 text-sm">
              <li>
                Respecter mes horaires de shifts et prévenir mon·ma responsable en cas
                d'imprévu (au moins 2h avant si possible).
              </li>
              <li>Porter mon bracelet bénévole de manière visible toute la durée du festival.</li>
              <li>
                Adopter une attitude bienveillante et respectueuse envers le public, les
                artistes, les autres bénévoles et l'équipe.
              </li>
              <li>
                Respecter les consignes de sécurité du site, du chapiteau, des zones de
                stockage et les directives des responsables.
              </li>
              <li>
                Signaler tout incident, comportement déplacé ou besoin d'aide via le
                bouton d'alerte de l'app, à un·e responsable, ou à un·e médiateur·ice.
              </li>
              <li>
                Ne pas consommer d'alcool ou de substances pendant les shifts. Pendant le
                temps libre, modération et sécurité collective avant tout.
              </li>
              <li>
                Respecter les biens du festival : matériel, structures, décor, instruments
                des artistes.
              </li>
            </ul>

            <h3 className="mt-8 font-display text-lg font-semibold">
              🤝 Engagement anti-harcèlement
            </h3>
            <p>
              Le festival a une politique <strong>tolérance zéro</strong> face au
              harcèlement, à toutes les formes de discrimination (sexisme, racisme,
              LGBTphobie, validisme, classisme, body-shaming), aux violences verbales,
              physiques ou psychologiques, et à tout comportement inadéquat.
            </p>
            <p>
              <strong>En cas de témoin ou de victime :</strong>
            </p>
            <ul className="my-2 list-disc space-y-1 pl-5 text-sm">
              <li>
                Active le bouton <strong>ALERTE GRAVE</strong> dans l'onglet Bien-être de
                l'app — la régie et tes responsables sont notifié·es immédiatement.
              </li>
              <li>
                Adresse-toi à un·e responsable identifiable (badge couleur) ou à un·e
                médiateur·ice désigné·e (Sandy, Florence sur cette édition).
              </li>
              <li>
                Le numéro de la régie générale du festival figure dans ton mail de
                confirmation. N'hésite jamais à appeler.
              </li>
            </ul>
            <p>
              Toute personne signalée pour harcèlement fait l'objet d'une procédure de
              modération avec validation collégiale (3 personnes minimum) avant éviction
              du festival. La régie a le pouvoir d'éviction immédiate en cas de gravité.
            </p>

            <h3 className="mt-8 font-display text-lg font-semibold">
              🛡️ Protection de tes données (RGPD)
            </h3>
            <p>
              Tes données personnelles (identité, contact, allergies, photos) sont
              stockées en Union Européenne (région Paris), chiffrées au repos. Elles ne
              sont accessibles qu'aux personnes habilitées :
            </p>
            <ul className="my-2 list-disc space-y-1 pl-5 text-sm">
              <li>Identité et contact : tes responsables et la régie</li>
              <li>Allergies / régime : uniquement le·la responsable catering</li>
              <li>Photos : uniquement si tu as donné ton accord (case "droit à l'image")</li>
              <li>Téléphone : uniquement les responsables, pour t'appeler en cas d'urgence</li>
            </ul>
            <p>
              Tu peux à tout moment : accéder à tes données, les rectifier, les supprimer,
              t'opposer au traitement. Contact :{" "}
              <a className="text-brand-coral" href="mailto:dpo@easyfest.app">
                dpo@easyfest.app
              </a>
              . Tes données sont automatiquement supprimées 12 mois après la fin du
              festival.
            </p>

            <h3 className="mt-8 font-display text-lg font-semibold">
              📞 Numéros utiles (à mémoriser)
            </h3>
            <ul className="my-2 list-disc space-y-1 pl-5 text-sm">
              <li>
                <strong>SAMU</strong> (urgence médicale) :{" "}
                <strong className="text-wellbeing-red">15</strong>
              </li>
              <li>
                <strong>Pompiers</strong> :{" "}
                <strong className="text-wellbeing-red">18</strong>
              </li>
              <li>
                <strong>Police-secours</strong> :{" "}
                <strong className="text-wellbeing-red">17</strong>
              </li>
              <li>
                <strong>Numéro européen d'urgence</strong> :{" "}
                <strong className="text-wellbeing-red">112</strong>
              </li>
              <li>
                <strong>Régie festival</strong> : numéro communiqué dans ton mail de
                confirmation
              </li>
            </ul>

            <h3 className="mt-8 font-display text-lg font-semibold">
              💚 Bien-être pendant ton shift
            </h3>
            <p>
              Si tu te sens fatigué·e, stressé·e ou simplement pas bien : utilise l'onglet{" "}
              <strong>Bien-être</strong> de l'app pour signaler ton état (vert / jaune /
              rouge). Tes responsables peuvent ainsi adapter ton shift, te proposer une
              pause, ou te mettre en lien avec un·e médiateur·ice.
            </p>
            <p>
              <strong>Tu n'es jamais obligé·e</strong> de finir un shift. Si tu pars, on
              s'organise — c'est mieux pour tout le monde qu'un burn-out silencieux.
            </p>

            <h3 className="mt-8 font-display text-lg font-semibold">✨ Merci</h3>
            <p>
              Sans toi, ce festival n'existe pas. On compte sur toi, et tu peux compter
              sur nous. À très vite sur place.
            </p>
            <p className="text-xs text-brand-ink/50">
              Charte v1.0.0 · valable pour l'édition en cours.
            </p>
          </article>
        </div>

        {/* Footer */}
        <footer className="border-t border-brand-ink/10 bg-brand-cream px-5 py-4">
          {!hasScrolledToBottom ? (
            <p className="text-center text-sm text-brand-ink/60">
              📖 Continue de scroller pour finir la lecture (
              {Math.round(scrollProgress * 100)}%)
            </p>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium text-wellbeing-green">
                ✅ Charte lue intégralement
              </span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-brand-coral px-5 py-2 text-sm font-medium text-white shadow-soft transition hover:opacity-90"
              >
                J'ai compris, fermer
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
