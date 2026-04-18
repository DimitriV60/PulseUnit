# respirator

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#11-respirator) (section 11).

- **index.html** — HTML ~8700+ · CSS 709–854 · JS 6656–7108.
- **État store** : `respiValues`, `respiMode`, `respiScenario` (+ internes `_rvAnimId`, `_rvModalParam`, `_rvRepeatTimer`, `_rvSimTime`).
- **Config** : `RV_CFG`, `RV_ZONES`, `RV_SCENARIOS`, `BADGE`, `CH`.
- **Fonctions clés** : `openNormesRespi`, `closeNormesRespi`, `setRespiMode`, `applyRvScenario`, `openRvModal`, `closeRvModal`, `rvModalSlide`, `updatePhysiology`, `rvDrawScope`, `rvAnimLoop`, `rvGetAnalysis`.
- **Dépendances** : Canvas API, requestAnimationFrame.
