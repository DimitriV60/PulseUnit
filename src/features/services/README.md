# services

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#15-services) (section 15).

## Fichiers de ce dossier

- [`data.js`](./data.js) — annuaire services externes (urgences, SAMU, etc.). Chargé ligne ~1511 d'`index.html`. Expose `window.SERVICES_DATA`.
- [`handlers.js`](./handlers.js) — handlers UI avec recherche. Chargé ligne ~1520 d'`index.html`. Expose `window.openServices`, `window.closeServices`, `window.renderServices`.

## Dans `index.html`

- HTML vue : `#services-view`.
- JS : **migré vers `handlers.js`**.

## État

Aucun — lecture seule + recherche locale.
