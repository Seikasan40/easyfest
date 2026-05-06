# Index screenshots commercial — Audit extrême Cowork 2 mai 2026

Screenshots capturés par session MCP (limitation : pas de save_to_disk fonctionnel à cette date).
Pour générer physiquement les images : Claude Code peut faire un re-pass via Playwright (script à créer dans `scripts/screenshots-marketing.ts`).

Liste des écrans à capturer (URL + role + état attendu) :

## Pages publiques (anonymous)
- 001 / `/` / homepage hero "Le festival pro, sans le prix pro" + CTA Lancer mon festival
- 002 / `/demande-festival` / wizard étape Toi
- 003 / `/demande-festival` / wizard étape Asso
- 004 / `/demande-festival` / wizard étape Festival
- 005 / `/demande-festival` / wizard étape Équipe (5 templates)
- 006 / `/demande-festival` / wizard étape Validation (CGU+RGPD+math+turnstile)
- 007 / `/demande-festival` / écran succès "Vérifie ta boîte mail"
- 008 / `/icmpaca` / vitrine asso publique
- 009 / `/icmpaca/rdl-2026` / vitrine festival publique
- 010 / `/icmpaca/rdl-2026/inscription` / form bénévole 5 étapes
- 011 / `/pricing` / tarifs
- 012 / `/legal/cgu` / CGU
- 013 / `/legal/mentions` / mentions
- 014 / `/legal/privacy` / politique confidentialité
- 015 / `/legal/sub-processors` / sous-traitants

## Pamela direction
- 016 / `/auth/login` / form connexion (eye + magic-link tab + comptes démo)
- 017 / `/hub` / 1 carte régie ZIK PACA RDL2026
- 018 / `/regie/icmpaca/rdl-2026` / dashboard 6 KPIs + actions admin
- 019 / `/regie/.../applications` / 85 candidatures avec filtres + boutons Inviter
- 020 / `/regie/.../planning` / pool 82 pre-volunteers + 18 colonnes équipes
- 021 / `/regie/.../planning` / drag en cours (overlay)
- 022 / `/regie/.../planning` / right-click menu équipes
- 023 / `/regie/.../sponsors` / 4 sponsors avec stats financières
- 024 / `/regie/.../plan` / upload plan + aperçu mode jour/nuit
- 025 / `/regie/.../safer` / 0 alertes + 0 wellbeing
- 026 / `/regie/.../messages` / broadcast 18 chips équipes
- 027 / `/regie/.../prefecture` / pack Cerfa + ZIP download
- 028 / `/regie/.../settings/theme` / 5 ambiances (EasyFest Coral active)

## Sandy multi-rôle
- 029 / `/hub` / 3 cartes (volunteer + 2× volunteer_lead)
- 030 / `/regie/.../safer` / vue régie alertes
- 031 / `/v/icmpaca/rdl-2026/safer` / vue mediator avec actions
- 032 / `/v/.../safer` / alerte ouverte + bouton Prendre en charge
- 033 / `/v/.../safer` / alerte Pris en charge + boutons résolue/fausse
- 034 / `/v/.../safer` / textarea notes résolution
- 035 / `/v/.../safer` / alerte Résolu

## Mahaut post_lead Bar
- 036 / `/poste/icmpaca/rdl-2026` / vue poste Bar (équipe + shifts + tchat)

## Lucas volunteer
- 037 / `/hub` / 1 carte bénévole Bar
- 038 / `/v/icmpaca/rdl-2026` / accueil prochain créneau
- 039 / `/v/.../qr` / QR code SVG visible
- 040 / `/v/.../planning` / mes shifts + repas
- 041 / `/v/.../wellbeing` / 3 niveaux ça va/chaud/aide
- 042 / `/v/.../wellbeing` / niveau jaune sélectionné
- 043 / `/v/.../wellbeing` / panneau ALERTE GRAVE (4 types)
- 044 / `/v/.../wellbeing` / "Alerte envoyée" succès
- 045 / `/v/.../feed` / annonces broadcast régie

## Mobile (resize 412×915)
- 046 / mobile homepage
- 047 / mobile /v/.../planning sticky chips bar
- 048 / mobile /v/.../planning tap menu d'équipes
- 049 / mobile /regie/.../planning DnD sur chip

## Cycle ALERTE GRAVE (déjà couvert via 043, 044, 032-035)

## RGPD
- 050 / `/account/privacy` / boutons Exporter/Restaurer/Supprimer + warning rouge

