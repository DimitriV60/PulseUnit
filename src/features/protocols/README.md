# protocols

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#8-protocols) (section 8).

## Fichiers de ce dossier

- [`data.js`](./data.js) — protocoles (sections, steps, notes). Chargé ligne ~1509 d'`index.html`. Expose `window.PROTOCOLS_DATA`.
- [`handlers.js`](./handlers.js) — handlers UI (accordéon lecture seule). Chargé ligne ~1519 d'`index.html`. Expose `window.openProtocoles`, `window.closeProtocoles`, `window.renderProtoList`, `window.openProtocoleDetail`, `window.closeProtocoleDetail`, `window.renderProtoDetail`, `window.toggleProtoSection`.

## Dans `index.html`

- HTML vue : lignes ~8090–8120.
- CSS : lignes ~398–430.
- JS : **migré vers `handlers.js`** (plus de code inline).

## État

Aucun — lecture seule, aucune persistance.
