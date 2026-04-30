# 📋 Comparatif Google Form Pam vs Easyfest 5 étapes

> **Source** : Formulaire RDL réponses 2026 (extrait du PDF Pam, 23 inscrits)

## ✅ Champs déjà présents (parité OK)

| Google Form Pam | Easyfest étape | Statut |
|---|---|---|
| NOM Prénom | Étape 1 — `firstName` + `lastName` | ✓ |
| Photo (drive link) | Étape 1 — `photoFile` (ajouté commit 30c8f2d) | ✓ |
| Date de naissance | Étape 1 — `birthDate` | ✓ |
| Email | Étape 1 — `email` | ✓ |
| Téléphone | Étape 1 — `phone` | ✓ |
| Profession/expériences | Étape 1 — `profession` + Étape 4 — `bio` | ✓ |
| Disponibilités (X jours) | Étape 2 — `arrivalAt` + `departureAt` (déduit) | ✓ |
| Heure d'arrivée | Étape 2 — `arrivalAt` (datetime-local) | ✓ |
| Date arrivée / départ | Étape 2 — `arrivalAt` / `departureAt` | ✓ |
| 3 postes par ordre | Étape 3 — `preferred_position_slugs` (top N) | ✓ |
| Allergies alimentaires | Étape 2 — `dietNotes` (texte libre) | ✓ |
| Taille T-shirt | Étape 2 — `size` (XS-XXL) | ✓ |

## ❌ Manquants à ajouter (3 champs)

### 1. Équipe Montage/Démontage (Oui/Non par phase)

Pam demande à chaque bénévole s'il participe au montage et/ou démontage.

**Action** : ajouter 2 checkboxes dans étape 2 :
- `availableSetup` (boolean) — "Je suis dispo pour le **montage** (J-2 / J-1)"
- `availableTeardown` (boolean) — "Je suis dispo pour le **démontage** (J+1)"

### 2. Régime alimentaire structuré

Pam liste : "Repas végétarien / Non végétarien". Notre champ est texte libre.

**Action** : ajouter Select `dietType` dans étape 2 (en plus de `dietNotes` qui reste libre pour les détails) :
- Aucun / Végétarien / Végan / Sans gluten / Sans porc / Autre (préciser dans dietNotes)

### 3. Covoiturage Oui/Non

Pam : "Souhaites-tu faire du covoiturage ?"

**Action** : ajouter Select `carpool` dans étape 2 (notre champ `hasVehicle` est plus restrictif) :
- Pas concerné / Je propose un trajet / Je cherche un trajet

## 📊 Stats Pam (23 inscrits 2026)

- Photos uploadées : ~17/23 (74%)
- Postes les + demandés : Bar (8), Catering (6), Loge (4), Backline (4)
- Retours du Lac fidèles ("déjà fait") : ~9/23 (39%) → notre flag `is_returning` OK
- Bénévoles avec compétences techniques (sons/scène) : 4 → mettent en bio

## 🎯 Conclusion

3 ajouts mineurs dans étape 2 (Logistique) pour être 100% iso Google Form Pam.
Effort estimé : **20 min** (form + colonnes BDD via migration).
