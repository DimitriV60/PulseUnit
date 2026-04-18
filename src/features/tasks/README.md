# tasks

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#9-tasks) (section 9).

## Fichiers de ce dossier

- [`data.js`](./data.js) — liste des tâches IDE tech (id, titre, shifts). Chargé ligne ~1512 d'`index.html`. Expose `window.TECH_TASKS`.
- [`handlers.js`](./handlers.js) — handlers stateful avec persistance Firebase. Chargé ligne ~1523 d'`index.html`. Expose `window.openTasks`, `window.closeTasks`, `window.toggleTask`, `window.renderTasks`.

## Dans `index.html`

- HTML vue : lignes ~1224–1243.
- CSS : lignes ~264–277.
- JS : **migré vers `handlers.js`**.
- Référence partagée : `const TECH_TASKS = window.TECH_TASKS;` (ligne ~1812), utilisée aussi par bed-grid (ligne ~2385) pour la mini-barre de progression par lit.

## Dépendances du module

- Globales partagées (script scope) : `shiftHistory`, `currentShiftKey`, `currentUser`, `roster`, `initShiftData`, `saveData`, `playSound`, `showAuthModal`, `escapeHTML`, `ICONS`.

## État

- `shiftHistory[key].techTasks` (array d'IDs de tâches validées).
- `shiftHistory[key].congratsShown` (bool, modale félicitations à 100%).
- Persistance : Firestore `PULSEUNIT_DOC` via `saveData()`.

## Note

Les tâches affichées dépendent du numéro de jour de la semaine et du type de shift (jour/nuit) via `shifts: ['ALL', '1-J', ...]`.
