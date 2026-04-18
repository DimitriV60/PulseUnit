# checklist

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#5-checklist) (section 5).

## Fichiers de ce dossier

- [`data.js`](./data.js) — 10 items de vérification chambre (id, label, icon). Chargé via `<script src>` ligne 1513 d'`index.html`. Expose `window.CHECKLIST_ITEMS`.

## Dans `index.html`

- HTML vue : lignes ~1155–1175.
- CSS : lignes ~341–379.
- JS handlers : lignes ~4080–4167.
- Référence : `const CHECKLIST_ITEMS = window.CHECKLIST_ITEMS;`.

## État store

- `currentChecklistBed`, `shiftHistory[key].checklistData`.
