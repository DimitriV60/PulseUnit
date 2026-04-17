# Compte-rendu de session — PulseUnit
**Date :** 17 avril 2026  
**Branche de dev :** `claude/audit-project-files-2zyi8`

---

## 1. Fix — Blocage assignation lits pour les non-affectés

**Problème :** Un utilisateur non affecté à la garde pouvait attribuer des lits aux réanimateurs.

**Correction :** `toggleMedBed()` vérifie désormais `isOnCurrentShift()` avant toute modification. Toast ⛔ affiché si l'utilisateur n'est pas dans la garde courante.

---

## 2. Planning — Distinction Heures Sup Jour / Nuit

**Ajouts :**
- Deux nouveaux états : `hs_j` (HSJ, jaune/ambre) et `hs_n` (HSN, indigo)
- Intégrés dans `PLAN_WORK_STATES`, `PLAN_LABELS`, le cycle de `cyclePlanDay()`, et le comptage DJF dans `calcPlanStats()`
- Positionnés après `hs` dans le cycle : `… → hs → hs_j → hs_n → formation`

---

## 3. Nouvelle fonctionnalité — Bourse d'échange

Système de permutation de gardes entre collègues, synchronisé en temps réel via Firebase.

### Architecture
- Firebase Firestore : `db.collection('pulseunit').doc('swaps')` — champ `requests: [...]`
- Listener `onSnapshot` pour mise à jour temps réel chez tous les utilisateurs connectés
- Accès via Menu ☰ → **ORGANISATION → 🔄 Bourse d'échange**

### Données d'une demande
| Champ | Contenu |
|-------|---------|
| `userId` / `userName` | Identité du demandeur |
| `userRole` | Fonction (ide / as / med / tech) |
| `offeredDate` / `offeredShift` | Garde cédée (date + jour/nuit) |
| `offeredPlanState` | État planning du demandeur pour cette date |
| `wantedDate` / `wantedShift` | Garde souhaitée (optionnel / indiff) |
| `note` | Commentaire libre (200 car. max) |
| `status` | `open` → `accepted` |
| `acceptedBy` / `acceptedByName` | Qui a accepté |

### Fonctionnalités
- **Proposer** : formulaire avec calendrier planning intégré pour la garde souhaitée
- **Filtrage par fonction** : un IDE ne voit que les demandes IDE, un AS que les AS, etc.
- **Badge fonction** coloré (IDE bleu / AS vert / MED ambre / TECH violet) sur chaque carte
- **Indicateur planning** (case colorée J/N/CA…) sur la garde cédée
- **Accepter** → statut "Accepté par X — à valider avec le cadre"
- **Supprimer** sa propre demande

### Calendrier planning intégré (garde souhaitée)
- Mini calendrier mensuel avec navigation mois ‹ ›
- Jours colorés selon états planning (`getPlanDayState`)
- Tap → sélectionne la date + auto-détecte JOUR/NUIT selon l'état planning
- Jours passés grisés, footer "✕ Effacer" pour revenir à indifférent

---

## 4. Fix — Modal de garde unique par tranche de 12h

**Problème :** La modal OUI/NON apparaissait à chaque rechargement de l'app dans la même garde, même après avoir répondu NON.

**Correction :**
- Réponse mémorisée dans `localStorage` : clé `pu_ws_{shiftKey}_{userId}` → `'1'` (oui) ou `'0'` (non)
- Nettoyage automatique des entrées > 4 jours à chaque lancement
- **Bonus planning** : si le jour est marqué non travaillé (CA, RH, maladie, ferie…), la modal est skippée silencieusement

---

## 5. Divers

- **Cartes RÉA 1 / RÉA 2** : numéros affichés sans préfixe `(61)` → `1862` / `1822`
- **Guide in-app** : 
  - Section Planning mise à jour avec description de HSJ / HSN
  - Nouvelle section **🔄 Bourse d'échange** (3 étapes : proposer, consulter, accepter)

---

## Commits de la session

| Hash | Message |
|------|---------|
| `8e0e2ef` | feat: bloque assignation lits si non affecté, HSJ/HSN planning, bourse d'échange |
| `733a680` | fix: corrige le fond transparent de la bourse d'échange et redesigne les cards |
| `d9c58de` | fix: retire le 61 des cartes réanimateurs, mja guide HSJ/HSN + bourse d'échange |
| `81f3d59` | fix: la modal de garde ne s'affiche qu'une fois par tranche de 12h |
| `aaa1370` | feat: mini calendrier planning dans la sélection de garde souhaitée (bourse) |
| `5c216a9` | feat: bourse d'échange filtrée par fonction + état planning intégré |

---

*Déploiement automatique Firebase sur chaque push `main` → `https://pulseunit-c9c5c.web.app`*
