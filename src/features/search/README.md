# search

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#18-search) (section 18).

## Fichiers de ce dossier

- [`handlers.js`](./handlers.js) — recherche globale dashboard (Services + Lexique + Protocoles). Chargé ligne ~1526 d'`index.html`. Expose `window.renderGlobalSearch`.

## Dans `index.html`

- HTML input : ligne ~908–912 (`#global-search`, `#global-search-results`).
- JS : **migré vers `handlers.js`**.

## Dépendances

- Données : `window.SERVICES_DATA`, `window.LEXIQUE_DATA`, `window.PROTOCOLS_DATA`.
- Fonction partagée : `escapeHTML` (inline).
- Handlers relayés (onclick dans les résultats) : `openServices`, `renderServices`, `openLexique`, `renderLexique`, `openProtocoles` — tous exposés sur `window` par leurs modules.

## Hors périmètre

Les fonctions `doSearch` (recherche soignant dans les barres main/sidebar/tech/med) et `openModalSpec` (modale création soignant) **restent inline** car elles sont couplées au roster/bed-grid (via `shiftHistory`, `isShiftLocked`, `pendingSpecType`, `assignSpecDirect`). Elles font partie du module roster/bed-grid.
