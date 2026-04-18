# planning-ca

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#12-planning-ca) (section 12).

## Fichiers de ce dossier

- [`config.js`](./config.js) — `PLAN_WORK_STATES` (Set des états "travaillés") + `PLAN_LABELS` (libellés courts). Chargé via `<script src>` ligne 1515 d'`index.html`. Expose `window.PLAN_WORK_STATES` et `window.PLAN_LABELS`.

## Dans `index.html`

- HTML vue : lignes ~8202–8429.
- CSS : lignes ~490–647.
- JS handlers : lignes ~4857–5261.
- Référence : `const PLAN_WORK_STATES = window.PLAN_WORK_STATES; const PLAN_LABELS = window.PLAN_LABELS;`.

## État store

- `planYear`, `planRegime`, `planStates`, `planLockedMonths`, `planSoldes`, `planDrag`.
