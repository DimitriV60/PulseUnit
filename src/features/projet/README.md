# projet

Petites fonctions d'affichage pour les vues "Lexique Projet" et "Sécurité & Données" accessibles depuis le side menu.

## Fichiers de ce dossier

- [`handlers.js`](./handlers.js) — Ouverture des vues + toggle des sections pliables.

## Fonctions exposées sur `window`

`openLexiqueProjet`, `openSecurite`, `toggleProjetSection`.

## Dépendances

- `triggerHaptic` (via `src/core/helpers.js`).
- DOM : `#lexique-projet-view`, `#securite-view`, `#body-*`, `#chev-*`.

## Vues associées dans `index.html`

- Lexique Projet : détail des rôles, états planning, terminologies.
- Sécurité & Données : corrections appliquées, données stockées (Firestore, localStorage).
