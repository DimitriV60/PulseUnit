# shift

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#3-shift) (section 3).

## Fichiers de ce dossier

- [`handlers.js`](./handlers.js) — Gestion d'une garde (J/N) : effectif, assignations, locks, recherche, historique. Chargé avant `beds/handlers.js`.

## Fonctions exposées sur `window`

`initShiftData`, `saveData`, `hardResetApp`, `clearSelection`, `updateStickyBanner`, `toggleSelection`, `isShiftLocked`, `isOnCurrentShift`, `canEditBeds`, `initDates`, `doSearch`, `selectSuggestion`, `triggerCreateNew`, `assignSpecDirect`, `openModalSpec`, `createNewStaff`, `clearShift`, `clearCurrentShift`, `getStaffTargets`, `confirmClearShift`, `executeClearShift`.

## Dépendances (state inline)

- `roster`, `shiftHistory`, `currentShiftKey`, `selectedStaffForTap`, `pendingSpecType`, `currentUser`
- `CONFIG`, `PULSEUNIT_DOC` (Firestore)
- `renderApp()` (défini dans `beds/handlers.js`), `escapeHTML`, `checkWorkStatus`, `showToast`, `isAdmin`, `_savePending`

## Persistance

- Firestore : `PULSEUNIT_DOC` (champ `shiftHistory`, `roster`).
- localStorage : `pulseunit_shift_history`, `pulseunit_roster` (fallback hors ligne).
