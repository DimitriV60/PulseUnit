# beds

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#4-beds) (section 4).

## Fichiers de ce dossier

- [`handlers.js`](./handlers.js) — Rendu principal (`renderApp`) + gestion des lits RÉA/USIP (assignation, fermeture, BMR, dialyse, critique). Chargé après `shift/handlers.js`.

## Fonctions exposées sur `window`

`toggleMedBed`, `assignLit`, `toggleLit`, `getAllBedIds`, `renderApp`.

## Dépendances (state inline)

- `CONFIG`, `reaBedsList`, `ICONS`, `CHECKLIST_ITEMS`, `TECH_TASKS`
- `roster`, `shiftHistory`, `currentShiftKey`, `selectedStaffForTap`, `currentUser`
- `escapeHTML`, `saveData`, `initShiftData`, `isShiftLocked`, `isOnCurrentShift`, `canEditBeds`, `getStaffTargets`, `doSearch`, `clearShift`, `showToast`, `openTasks`, `openChecklist`

## Structure d'un lit (`shiftHistory[key].assignments[bedId]`)

- `ide: string | null` — ID du soignant IDE.
- `as: string | null` — ID de l'aide-soignant.
- `bmr: boolean` — Bactérie multi-résistante.
- `dialyse: boolean`.
- `crit: boolean` — Patient critique.
- `closed: boolean` — Lit fermé (efface IDE et AS).
