"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onScrolledToBottom: () => void;
  alreadyRead: boolean;
}

export function CharterModal({ open, onClose, onScrolledToBottom, alreadyRead }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(alreadyRead);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => { if (alreadyRead) setHasScrolledToBottom(true); }, [alreadyRead]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
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
    <div role="dialog" aria-labelledby="charter-title" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-brand-ink/60 backdrop-blur-sm" />

      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-brand-ink/10 bg-brand-cream px-5 py-4">
          <div>
            <h2 id="charter-title" className="font-display text-xl font-bold">📜 Charte du festival</h2>
            <p className="mt-0.5 text-xs text-brand-ink/60">Lecture obligatoire — fais défiler jusqu'en bas</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-2 text-brand-ink/60 transition hover:bg-brand-ink/5">✕</button>
        </header>

        <div className="relative h-1.5 overflow-hidden bg-brand-ink/10">
          <div className={`h-full transition-all ${hasScrolledToBottom ? "bg-wellbeing-green" : "bg-brand-coral"}`} style={{ width: `${Math.round(scrollProgress * 100)}%` }} />
        </div>

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-6">
          <article className="space-y-8">
            <section className="rounded-xl bg-gradient-to-br from-brand-coral/10 to-brand-amber/10 p-5">
              <h3 className="font-display text-2xl font-bold">🎉 Un festival festif, sûr, inclusif et respectueux 🌈🌍</h3>
              <p className="mt-3 text-brand-ink/80">
                Cette charte vise à encourager <strong>une bonne entente dans la fête</strong>. Chacun·e est appelé·e à être vigilant·e. Apprenons ensemble à éviter les comportements sexistes, homophobes, transphobes, racistes et plus globalement irrespectueux. <strong>Nos musiques sont actuelles, nos comportements aussi !</strong>
              </p>
              <p className="mt-3 text-sm text-brand-ink/60">Cette charte s'applique à <strong>chacun·e</strong> : public, bénévoles, artistes, partenaires, équipes.</p>
            </section>

            <section>
              <h3 className="mb-3 font-display text-lg font-semibold">🤝 Respect & Inclusivité</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-wellbeing-green/10 p-3 text-sm">✅ Respect de toutes les personnes</div>
                <div className="rounded-lg bg-wellbeing-green/10 p-3 text-sm">✅ Écoute, consentement, bienveillance</div>
                <div className="rounded-lg bg-wellbeing-green/10 p-3 text-sm">✅ Espace libre d'expression, sans jugement</div>
                <div className="rounded-lg bg-wellbeing-red/10 p-3 text-sm">❌ Discriminations (racisme, sexisme…)</div>
                <div className="rounded-lg bg-wellbeing-red/10 p-3 text-sm">❌ Blagues oppressives, remarques déplacées</div>
                <div className="rounded-lg bg-wellbeing-red/10 p-3 text-sm">❌ Présomptions de genre ou d'identité</div>
              </div>
            </section>

            <section>
              <h3 className="mb-3 font-display text-lg font-semibold">🛑 Les 10 règles à connaître</h3>
              <ol className="space-y-3">
                {[
                  "Si tu es témoin d'une agression sexiste, homophobe, transphobe ou raciste, ne reste pas sans rien dire et agis. Le stand Consentis à l'entrée du site est notre point relais.",
                  "N'agresse pas. Être lourd·e ou crétin·e ce n'est pas draguer, c'est agresser.",
                  "Honte aux frotteurs·ses ! Notre corps nous appartient : toucher une partie du corps sexuellement connotée (seins, fesses…) par surprise n'est pas une technique de drague, c'est une agression sexuelle.",
                  "Non c'est non, ça ne veut pas dire oui ou peut-être, et ce n'est certainement pas de la fausse modestie. On n'insiste pas après un refus.",
                  "En milieu festif, tout n'est pas permis. L'usage ou l'abus de drogues et d'alcool ne justifie en rien une attitude sexiste.",
                  "Forcer une personne à consommer des stupéfiants / à avoir un rapport sexuel / à avoir un rapport sexuel non protégé est bien entendu prohibé.",
                  "Proférer des insultes à caractère sexiste, sexuel ou raciste, ou même faire des remarques liées à l'apparence d'une personne n'est pas toléré.",
                  "Une personne ayant consommé trop de stupéfiants ou d'alcool n'est pas en mesure de donner son consentement de manière éclairée.",
                  "Utiliser la violence pour parvenir à ses fins ce n'est pas faire preuve de virilité, c'est forcer, et ça c'est exclu.",
                  "Si tu croises une personne en situation de détresse, viens à sa rescousse et n'hésite pas à l'emmener à la Croix Rouge, à la prévention ou au stand Consentis.",
                ].map((rule, i) => (
                  <li key={i} className="flex gap-3 rounded-xl border border-brand-ink/10 bg-white p-3 text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-coral font-bold text-white">{i + 1}</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h3 className="mb-3 font-display text-lg font-semibold">🛟 Sécurité & Responsabilités</h3>
              <ul className="space-y-2 text-sm">
                <li className="rounded-lg border border-brand-ink/10 bg-brand-ink/5 p-3">👮 Présence de sécurité et de secours en continu</li>
                <li className="rounded-lg border border-brand-ink/10 bg-brand-ink/5 p-3">👶 Enfants sous la responsabilité de leurs parents</li>
                <li className="rounded-lg border border-brand-ink/10 bg-brand-ink/5 p-3">📣 Toute situation de violence ou de harcèlement <strong>doit être signalée</strong></li>
                <li className="rounded-lg border border-brand-ink/10 bg-brand-ink/5 p-3">🏘️ Respect du voisinage, même en quittant le site</li>
              </ul>
            </section>

            <section>
              <h3 className="mb-3 font-display text-lg font-semibold">🚫 Violences & Consentement</h3>
              <div className="rounded-xl border-2 border-wellbeing-red/30 bg-wellbeing-red/5 p-4">
                <p className="font-bold text-wellbeing-red">‼️ Tolérance zéro pour :</p>
                <ul className="mt-2 list-disc pl-5 text-sm"><li>Violences physiques, verbales ou psychologiques</li></ul>
                <hr className="my-3 border-wellbeing-red/20" />
                <p className="text-sm">💬 Le consentement doit être <strong>clair, affirmé, enthousiaste</strong></p>
                <p className="text-sm">❗ <strong>Pas de réponse = Pas de consentement</strong></p>
                <p className="mt-2 text-sm font-medium text-wellbeing-red">➡️ Comportement inapproprié = exclusion immédiate</p>
              </div>
            </section>

            <section>
              <h3 className="mb-3 font-display text-lg font-semibold">💛 Soutien & Prévention</h3>
              <p className="text-sm text-brand-ink/80">🤝 L'association <strong>Albatros / Consentis</strong> est présente sur le site pour informer, écouter et sensibiliser sur :</p>
              <ul className="mt-2 list-disc pl-5 text-sm"><li>Les comportements à risque</li><li>Les conduites addictives</li><li>Le respect mutuel</li></ul>
            </section>

            <section>
              <h3 className="mb-3 font-display text-lg font-semibold">🌍 Écoresponsabilité & Lieu</h3>
              <ul className="space-y-2 text-sm">
                <li className="rounded-lg bg-wellbeing-green/10 p-3">♻️ Ramène ta gourde vide (eau dispo au bar)</li>
                <li className="rounded-lg bg-wellbeing-green/10 p-3">🗑️ Tri des déchets & respect des consignes</li>
                <li className="rounded-lg bg-wellbeing-green/10 p-3">🚭 Pas de mégots au sol</li>
                <li className="rounded-lg bg-wellbeing-red/10 p-3">❌ Pas de grimpe ni de tags sur les murs · aucune dégradation tolérée</li>
              </ul>
            </section>

            <section>
              <h3 className="mb-3 font-display text-lg font-semibold">✅ Autorisé / ❌ Interdit</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-wellbeing-green/30 bg-wellbeing-green/5 p-4">
                  <p className="mb-2 font-medium text-wellbeing-green">✅ Autorisé</p>
                  <ul className="space-y-1 text-sm"><li>Gourdes vides & ecocups</li><li>Brumisateurs, crèmes solaires, ventilateurs manuels</li><li>Le soleil ☀️</li><li>Ta bonne humeur & bienveillance 😎</li></ul>
                </div>
                <div className="rounded-xl border border-wellbeing-red/30 bg-wellbeing-red/5 p-4">
                  <p className="mb-2 font-medium text-wellbeing-red">❌ Interdit</p>
                  <ul className="space-y-1 text-sm"><li>Plastique jetable, contenants en verre</li><li>Alcool & nourriture extérieurs</li><li>Objets dangereux (couteaux, objets pointus…)</li><li>Drones, appareils photo pro</li><li>🐶 Animaux</li><li>Discriminations, blagues sexistes, comportements intrusifs</li></ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-3 font-display text-lg font-semibold">📞 Numéros d'urgence</h3>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div className="rounded-xl border border-wellbeing-red/30 bg-wellbeing-red/5 p-3 text-center"><p className="text-xl">🚑</p><p className="font-bold text-wellbeing-red text-2xl">15</p><p className="text-xs">SAMU</p></div>
                <div className="rounded-xl border border-wellbeing-red/30 bg-wellbeing-red/5 p-3 text-center"><p className="text-xl">🚒</p><p className="font-bold text-wellbeing-red text-2xl">18</p><p className="text-xs">Pompiers</p></div>
                <div className="rounded-xl border border-wellbeing-red/30 bg-wellbeing-red/5 p-3 text-center"><p className="text-xl">🚓</p><p className="font-bold text-wellbeing-red text-2xl">17</p><p className="text-xs">Police</p></div>
                <div className="rounded-xl border border-wellbeing-red/30 bg-wellbeing-red/5 p-3 text-center"><p className="text-xl">📞</p><p className="font-bold text-wellbeing-red text-2xl">112</p><p className="text-xs">Europe</p></div>
              </div>
            </section>

            <section className="rounded-xl bg-gradient-to-br from-brand-amber/10 to-brand-coral/10 p-5 text-center">
              <p className="font-display text-2xl font-bold">🎶 Respect — Écoute — Solidarité — Bienveillance ❤️</p>
              <p className="mt-3 text-sm text-brand-ink/70">
                <strong>En venant, tu acceptes cette charte.</strong>
                <br />
                Merci de faire de ce festival un moment de joie, de respect et de liberté.
              </p>
            </section>
          </article>
        </div>

        <footer className="border-t border-brand-ink/10 bg-brand-cream px-5 py-4">
          {!hasScrolledToBottom ? (
            <p className="text-center text-sm text-brand-ink/60">📖 Continue de scroller pour finir la lecture ({Math.round(scrollProgress * 100)}%)</p>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium text-wellbeing-green">✅ Charte lue intégralement</span>
              <button type="button" onClick={onClose} className="rounded-xl bg-brand-coral px-5 py-2 text-sm font-medium text-white shadow-soft transition hover:opacity-90">J'ai compris, fermer</button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
