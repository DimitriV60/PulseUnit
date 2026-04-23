# work-status

Détermine si l'utilisateur travaille sur la garde courante et gère la modale
« Bonjour, travaillez-vous ? » au démarrage de l'app.

## Fichiers de ce dossier

- [`handlers.js`](./handlers.js) — `checkWorkStatus`, `handleWorkChoice`.

## Fonctions exposées sur `window`

- `checkWorkStatus()` — appelé par `appInit()` après login. Trois branches :
  1. Déjà actif sur la garde → rien.
  2. État planning dans `{jour, nuit, formation, hs_j, hs_n, hs}` → assignation silencieuse.
  3. État `travail` (jour de semaine non renseigné) → ouvre la modale.
- `handleWorkChoice(isWorking)` — onclick de la modale. Mémorise la réponse
  dans `localStorage` et ajoute l'utilisateur à la garde (ou bascule en lecture).

## Persistance

- `localStorage.pu_ws_<shiftKey>_<userId>` = `'1'` ou `'0'` — purge auto > 4 j.

## Dépendances (inline)

- État : `currentUser`, `currentShiftKey`, `shiftHistory`, `planStates`.
- Fonctions : `isShiftLocked`, `isAdmin`, `initShiftData`, `saveData`,
  `toggleSelection`, `renderApp`, `showToast`, `getPlanDefaultState`.
