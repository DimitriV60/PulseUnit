# gestures

Gestes tactiles globaux pour mobile.

## Fichiers de ce dossier

- [`handlers.js`](./handlers.js) — Deux listeners globaux (pas de fonctions exposées).

## Listeners installés

### 1. Drag-to-paint (planning annuel)

`touchmove` + `touchend` — permet de peindre les cases du planning CA/RCN
par glissement. Si le geste se résume à un tap, délègue à `cyclePlanDay`.

Dépend de : `planDrag`, `planLockedMonths`, `planYear`, `getPlanDayState`,
`applyPlanStateDrag`, `cyclePlanDay`, `savePlanData`, `updatePlanStats`.

### 2. Swipe gauche = retour / fermeture

`touchstart` + `touchend` (IIFE). Un swipe gauche ≥ 60 px ferme, par ordre de
priorité, modales → vues plein écran (normes, planning, tasks, lexique…) →
side menu. Vue Normes : swipe horizontal navigue entre catégories (≥ 250 px ferme).

## Exclusions

Zones avec scroll horizontal (filtres, planning-scroll) — le swipe y est ignoré
pour ne pas interférer avec le scroll natif.
