# 🎟️ Easyfest — Guide démo Pam (dimanche 4 mai 2026)

> Pour la réunion d'organes RDL 2026 avec Pam, Dorothée et 5-10 bénévoles testeurs.

---

## 🌐 URL de démo

**Production :** https://easyfest.netlify.app *(à confirmer après déploiement Netlify)*
**Local dev :** http://localhost:3000

---

## 🔑 Comptes test (mot de passe `easyfest-demo-2026`)

| Rôle | Email | Personnage | Ce qu'iel voit |
|---|---|---|---|
| Régie (direction) | `pam@easyfest.test` | Pam Morin | Vue complète : KPIs, validation candidatures, modération, broadcast, planning maître drag&drop |
| Resp. bénévoles | `dorothee@easyfest.test` | Dorothée Carlo | Validation candidatures, planning équipe, modération chat |
| Resp. de poste (Bar) | `mahaut@easyfest.test` | Mahaut Lefèvre | Son équipe Bar uniquement, scan prise de poste |
| Staff terrain | `antoine@easyfest.test` | Antoine Loiret | Scan QR : arrivée, repas, prise de poste |
| Bénévole | `lucas@easyfest.test` | Lucas Petit | Espace bénévole 5 onglets |
| Bénévole + médiateur·ice | `sandy@easyfest.test` | Sandy Berger | Espace bénévole + visibilité Safer Space |

> Pour démarrer, lancer `pnpm db:seed-users` après `pnpm bootstrap`.

---

## 🎬 Scénario de démo (15 minutes)

### Acte 1 — Inscription d'un nouveau bénévole (3 min)

1. Ouvre https://easyfest.netlify.app sur ton téléphone (ou desktop en mode mobile)
2. Clique **"Découvrir RDL 2026"** → page ICMPACA
3. Clique **"Voir le festival"** sur RDL 2026
4. Clique **"S'inscrire comme bénévole"**
5. Remplis le formulaire 5 étapes :
   - Identité (nom, prénom, email, tel, date de naissance)
   - Logistique (dates arrivée/départ, taille T-shirt, allergies)
   - Postes (top 3 max parmi les 18)
   - Compétences (skills + limitations + bio)
   - Engagements (charte, anti-harcèlement, RGPD)
6. Submit → page de confirmation "🎉 Candidature envoyée"

→ **Pam voit la candidature dans /regie/applications immédiatement.**

### Acte 2 — Pam valide la candidature (2 min)

1. Login `pam@easyfest.test` sur `/auth/login`
2. Picker home → clique **"Je suis régie"**
3. Tab **"Candidatures"** → on voit la candidature en `pending`
4. Clique **Valider** → la candidate reçoit un mail magic-link via Resend
5. La candidate clique le lien dans son mail → atterrit dans son espace bénévole

### Acte 3 — Le bénévole consulte son espace (3 min)

Login `lucas@easyfest.test` (déjà préparé dans le seed).

Naviguer dans les 5 onglets :
- **🏠 Accueil** : prochain shift, countdown, repas restants
- **🎟️ Mon QR** : QR code signé HMAC qui se renouvelle toutes les 10 min
- **🗓️ Planning** : tous les shifts par jour + statuts
- **💚 Bien-être** : 3 boutons (vert/jaune/rouge) + bouton ALERTE GRAVE
- **📣 Fil** : annonces régie en temps réel
- **📜 Charte** : rappel charte + anti-harcèlement + numéros urgence

### Acte 4 — Démo Safer Space (2 min)

Sur l'espace de Lucas (`/v/icmpaca/rdl-2026/wellbeing`) :
1. Clique sur **"Ça commence à être chaud"** (jaune) → toast "Merci, l'équipe est informée"
2. Sur l'espace Pam (`/regie/safer`), on voit le report bien-être en jaune
3. Reviens sur Lucas, clique **"🚨 ALERTE GRAVE"** → choisis "Harcèlement" + description courte
4. Sur l'espace Pam, l'alerte arrive en temps réel + mail aux responsables (Resend)

### Acte 5 — Démo Scan terrain (3 min)

Login `antoine@easyfest.test` (staff_scan + entry_scanner).

1. Picker home → **"Je suis staff terrain"**
2. Choisis le mode **"🚪 Arrivée"**
3. Ouvre l'espace QR de Lucas sur un autre device (ou copie le token)
4. Scanne via la caméra (BarcodeDetector API) ou colle le token dans le champ
5. Validation : profil de Lucas + prochain shift + repas restants
6. Re-scanne le même token → message **"⚠️ Déjà scanné"** (anti-rejouage HMAC + nonce)

### Acte 6 — Démo Régie planning drag&drop (2 min)

Sur l'espace Pam :
1. Tab **"Planning"** → vue par poste avec couverture en %
2. Drag&drop d'un bénévole entre 2 shifts → mise à jour temps réel + audit log immuable
3. Drop dans le pool "Bénévoles à placer" → désaffectation

---

## 🚦 État de finition par module

| Module | Statut | À garder à l'œil |
|---|---|---|
| Vitrine ICMPACA | ✅ 100% | — |
| Form inscription 5 étapes | ✅ 100% | Turnstile en prod nécessite vraies clés |
| Auth magic-link | ✅ 100% | Pour le test : password fonctionne aussi |
| Hub picker rôles | ✅ 100% | — |
| Module Bénévole 5 onglets | ✅ 100% | QR offline-cache à valider en 3G |
| Module Staff scan | ✅ 95% | Caméra : Chrome/Edge OK, Safari iOS = token manuel |
| Module Régie | ✅ 95% | Drag&drop fonctionne, Lighthouse à mesurer |
| Module Safer | ✅ 100% | Mail responsables → vérifier Resend domain DKIM |
| Module Resp. bénévoles | 🟡 Sous-set Régie | Pas de page dédiée V0 (réutilise /regie/) |
| Inscription manuelle admin | ✅ 100% | `/regie/applications/manual-signup` |
| Modération + ban 3-of-N | 🟡 Backend OK | UI front J3 |
| Carte du site | ❌ | Reportée (Pam : pas pour RDL) |
| Itinéraire | ❌ | Désactivé (Pam) |
| Cashless | ❌ | Hors V1 |
| iOS app native | ❌ | Hors V1 (Pam) |
| APK Android | 🟡 Configuré | `eas build` à lancer si besoin |

---

## ⚠️ Points d'attention pour la démo

1. **Connectivité 3G dégradée** : l'app a un service worker basique (cache des routes bénévole). Si réseau coupe, le QR reste affichable (token pré-généré).
2. **Mineurs** : si Pam veut tester avec une candidature mineure, le champ `parental_auth_url` reste vide → la validation est bloquée jusqu'à ajout d'une autorisation parentale (ou override admin).
3. **Mails Resend** : si le domaine n'est pas DKIM-verified, les mails partent en spam. Workaround démo : suivre Resend dashboard pour voir le rendu.
4. **PostHog opt-in** : par défaut, les analytics sont désactivés. Le bandeau cookies propose un opt-in.

---

## 🔧 Si quelque chose plante en live

| Symptôme | Diagnostic | Fix express |
|---|---|---|
| Form inscription échoue | Turnstile bloque | Mettre `TURNSTILE_SECRET_KEY=""` dans Netlify env (mode bypass dev) |
| Magic-link email pas reçu | DKIM Resend KO | Utiliser Inbucket http://127.0.0.1:54324 (Supabase local) ou copier le lien depuis le log Resend |
| Caméra QR refuse | Permissions browser | Mode token manuel (champ texte sous le viseur) |
| RLS bloque une query | Logs Supabase Studio | Désactiver temporairement RLS sur la table avec `alter table xxx disable row level security` (réactiver après !) |
| Sentry n'init pas | DSN vide | Pas grave en démo, juste pas de tracking |

---

## 📞 En cas d'urgence

- Logs Supabase : http://127.0.0.1:54323 (Studio) → Logs Explorer
- Logs Netlify : app.netlify.com → Site → Functions / Deploys
- Logs Resend : resend.com → Logs (recherche par email)
- Sentry : sentry.io → Issues
- En dernier recours : `MAINTENANCE_MODE=true` dans Netlify env → bypass front

---

*Bon test dimanche, Pam !* ☀️
