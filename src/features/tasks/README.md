# tasks

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#9-tasks) (section 9).

## Fichiers de ce dossier

- [`data.js`](./data.js) — liste des tâches IDE tech (id, titre, shifts). Chargé via `<script src>` ligne 1512 d'`index.html`. Expose `window.TECH_TASKS`.

## Dans `index.html`

- HTML vue : lignes ~1224–1243.
- CSS : lignes ~264–277.
- JS handlers : lignes ~2860–2948.
- Référence : `const TECH_TASKS = window.TECH_TASKS;`.

## État store

- `shiftHistory[key].techTasks`.

## Note

Les tâches affichées dépendent du numéro de jour et du shift (jour/nuit) via `shifts: ['ALL', '1-J', ...]`.
