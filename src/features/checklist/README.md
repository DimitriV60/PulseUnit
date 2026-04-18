# checklist

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#5-checklist) (section 5).

## Fichiers de ce dossier

- [`data.js`](./data.js) — 10 items de vérification chambre (id, label, icon). Chargé ligne ~1513 d'`index.html`. Expose `window.CHECKLIST_ITEMS`.
- [`handlers.js`](./handlers.js) — handlers stateful avec persistance Firebase. Chargé ligne ~1522 d'`index.html`. Expose `window.openChecklist`, `window.closeChecklist`, `window.selectChecklistBed`, `window.toggleChecklistItem`, `window.renderChecklistView`.

## Dans `index.html`

- HTML vue : lignes ~1155–1175.
- CSS : lignes ~341–379.
- JS : **migré vers `handlers.js`**.

## Dépendances du module

- Globales partagées (script scope) : `shiftHistory`, `currentShiftKey`, `initShiftData`, `saveData`, `getAllBedIds`, `renderApp`.
- Le rendu de la mini-barre checklist sur chaque lit (bed-grid, ligne ~2577) accède directement à `shiftHistory[currentShiftKey].checklistChambre` — pas via les handlers.

## État

- `currentChecklistBed` local au module handlers.
- Persistance : `shiftHistory[key].checklistChambre[bedId]` via Firestore `PULSEUNIT_DOC`.
