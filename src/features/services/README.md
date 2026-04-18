# services

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#15-services) (section 15).

## Fichiers de ce dossier

- [`data.js`](./data.js) — annuaire services externes (urgences, SAMU, etc.). Chargé via `<script src="src/features/services/data.js">` dans `index.html`. Expose `window.SERVICES_DATA`.

## Dans `index.html`

- JS handlers : lignes ~4620–4680 (markup généré inline).
- Référence : `const SERVICES_DATA = window.SERVICES_DATA;`.

## Fonctions

`openServices`, `closeServices`, `renderServices`.
