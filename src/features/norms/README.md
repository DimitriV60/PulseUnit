# norms

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#10-norms) (section 10).

## Fichiers de ce dossier

- [`data.js`](./data.js) — tables de normes (vitaux, GDS, ventilation, biologie, dialyse, urines). Chargé ligne ~1510 d'`index.html`. Expose `window.NORMES_REF`.
- [`handlers.js`](./handlers.js) — handlers UI + helpers partagés. Chargé ligne ~1521 d'`index.html`. Expose `window.openNormes`, `window.closeNormes`, `window.setNormesCat`, `window.renderNormes`, `window.normesGetActiveZone`, `window.normesZoneBarHTML`, `window.getNormesCurrentCat`, `window.setNormesCurrentCat`.

## Dans `index.html`

- HTML vue : lignes ~8431–8450.
- CSS : lignes ~648–685.
- JS : **migré vers `handlers.js`**.
- Le swipe nav (lignes ~5720) lit l'état via `window.getNormesCurrentCat()`.

## Helpers partagés

`normesGetActiveZone` et `normesZoneBarHTML` sont aussi utilisés par `src/features/respirator/` (via `window.*`).

## État

`normesCurrentCat` local au module handlers (pas de store global requis).
