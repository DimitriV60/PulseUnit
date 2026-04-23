# lexique

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#6-lexique) (section 6).

## Fichiers de ce dossier

- [`data.js`](./data.js) — **260+ termes** (13 catégories). Chargé ligne ~1507 d'`index.html`. Expose `window.LEXIQUE_DATA`.
- [`handlers.js`](./handlers.js) — handlers UI. Chargé ligne ~1518 d'`index.html`. Expose `window.openLexique`, `window.closeLexique`, `window.setLexiqueFilter`, `window.toggleLexCard`, `window.renderLexique`. État local `currentLexiqueFilter`.

## Dans `index.html`

- HTML vue : lignes ~1177–1193 (`#lexique-view`).
- CSS : lignes ~234–255.
- JS : **migré vers `handlers.js`** (plus de code inline).

## État

`currentLexiqueFilter` est désormais local au module handlers (pas de store global requis).
