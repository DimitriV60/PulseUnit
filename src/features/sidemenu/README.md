# sidemenu

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#19-sidemenu) (section 19).

## Fichiers de ce dossier

- [`handlers.js`](./handlers.js) — `openSideMenu` et `closeSideMenu`. Chargé via `<script src>` ligne 1516 d'`index.html`. Expose `window.openSideMenu` et `window.closeSideMenu` (utilisés par `onclick=` inline).

## Dans `index.html`

- HTML vue : lignes ~916–938.
- CSS : lignes ~215–224.
- JS : handlers migrés vers `handlers.js`.

## État store

Aucun — le menu utilise directement le DOM (styles inline `display` / `opacity` / `transform`).
