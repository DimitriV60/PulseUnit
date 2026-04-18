# norms

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#10-norms) (section 10).

## Fichiers de ce dossier

- [`data.js`](./data.js) — tables de normes (vitaux, GDS, ventilation, biologie, dialyse, urines). Chargé via `<script src="src/features/norms/data.js">` dans `index.html`. Expose `window.NORMES_REF`.

## Dans `index.html`

- HTML vue : lignes ~8431–8450.
- CSS : lignes ~648–685.
- JS handlers : lignes ~6107–6604.
- Référence : `const NORMES_REF = window.NORMES_REF;`.

## État store

- `normesCurrentCat` (catégorie active).
