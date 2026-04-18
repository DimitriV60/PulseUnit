# respirator

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#11-respirator) (section 11).

## Fichiers de ce dossier

- [`config.js`](./config.js) — `RV_SCENARIOS` (8 scénarios cliniques), `RV_CFG` (bornes paramètres), `RV_ZONES` (zones cliniques). Chargé via `<script src="src/features/respirator/config.js">` dans `index.html`.

## Dans `index.html`

- HTML vue : lignes ~8700+.
- CSS : lignes ~709–854.
- JS handlers + physique : lignes ~6656–7108.
- Référence : `const RV_SCENARIOS = window.RV_SCENARIOS; const RV_CFG = window.RV_CFG; const RV_ZONES = window.RV_ZONES;`.

## État store

- `respiValues`, `respiMode`, `respiScenario`.
- Internes : `_rvAnimId`, `_rvModalParam`, `_rvRepeatTimer`, `_rvSimTime`.

## Config inline restante

- `BADGE`, `CH` : déclarées dans la fonction `renderNormesRespi` (pas extractibles sans refacto).

## Dépendances

- Canvas API, requestAnimationFrame.
