# respirator

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#11-respirator) (section 11).

## Fichiers de ce dossier

- [`config.js`](./config.js) — `RV_SCENARIOS` (8 scénarios cliniques), `RV_CFG` (bornes paramètres), `RV_ZONES` (zones cliniques). Expose `window.RV_SCENARIOS`, `window.RV_CFG`, `window.RV_ZONES`.
- [`handlers.js`](./handlers.js) — Simulateur oscilloscope 5 cycles (Canvas/requestAnimationFrame). Chargé après `respirator/config.js`.

## Fonctions exposées sur `window`

`openNormesRespi`, `closeNormesRespi`, `applyRvScenario`, `setRespiMode`, `openRvModal`, `closeRvModal`, `rvModalSlide`, `startRvRepeat`, `stopRvRepeat`.

## État local au module

- `respiValues` (objet paramètres : vt, peep, fio2, fr, pcabove, comp, res, pplat, pcrete, ie, poids).
- `respiMode` ('PC' | 'VC' | 'VSAI' | 'VNI'), `respiScenario`.
- `_rvAnimId`, `_rvModalParam`, `_rvRepeatTimer`, `_rvSimTime`, `_rvLastTS`.
- `_rv_scope` : état oscilloscope par canal (paw, flow, vol).

## Dans `index.html`

- HTML vue : lignes ~4644+ (`#normes-respi-view`).
- CSS : lignes ~709–854.
- JS : **migré vers `handlers.js`**.
- Point d'entrée : `onclick="openNormesRespi()"` dans le sidemenu + calculators.

## Dépendances externes

- `window.RV_SCENARIOS`, `window.RV_CFG`, `window.RV_ZONES` (config.js).
- `window.normesZoneBarHTML` (norms/handlers.js).
- `getAutoTheme`, `triggerHaptic` (inline).
- Canvas API, `requestAnimationFrame`.

## Physique

- **Modèle RC pulmonaire** : compliance C (mL/cmH₂O), résistance R (cmH₂O/L/s), τ = R×C.
- Modes : PC-AC, VC-CMV, VS-AI (trigger patient), VNI (fuite constante).
- Oscilloscope style scope : trace défilante avec effaceur, 5 cycles complets (TIME_WINDOW = 5 × T_cycle).
