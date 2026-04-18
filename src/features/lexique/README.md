# lexique

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#6-lexique) (section 6).

## Fichiers de ce dossier

- [`data.js`](./data.js) — **260+ termes** (13 catégories). Chargé via `<script src="src/features/lexique/data.js">` dans `index.html`. Expose `window.LEXIQUE_DATA`.

## Dans `index.html`

- HTML vue : lignes ~1177–1193 (`#lexique-view`).
- CSS : lignes ~234–255.
- JS handlers : lignes ~2740–2804 (`openLexique`, `closeLexique`, `setLexiqueFilter`, `toggleLexCard`, `renderLexique`).
- Référence : `const LEXIQUE_DATA = window.LEXIQUE_DATA;` (ligne ~1787).

## État store

- `currentLexiqueFilter` (catégorie active).

## Prochaine étape migration

Extraire les handlers (`renderLexique`, `toggleLexCard`, `setLexiqueFilter`) vers `handlers.js` dans ce dossier.
