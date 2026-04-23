# planning-ca

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#12-planning-ca) (section 12).

## Fichiers de ce dossier

- [`config.js`](./config.js) — `PLAN_WORK_STATES` (Set des états "travaillés") + `PLAN_LABELS` (libellés courts). Expose `window.PLAN_WORK_STATES` et `window.PLAN_LABELS`.
- [`handlers.js`](./handlers.js) — Simulateur planning FPH (localStorage + Firebase). Chargé après `conges-calendar/handlers.js`.

## Fonctions exposées sur `window`

`openPlanningCA`, `closePlanningCA`, `cyclePlanDay`, `planCellTouchStart`, `togglePlanMonthLock`, `setPlanRegime`, `changePlanYear`, `resetPlanningCA`, `resetPlanMonth`, `updatePlanSolde`, `reportSolde`, `togglePlanLegend`, `togglePlanSoldes`.

## État local au module (partagé script scope)

- `planYear`, `planRegime`, `planStates`, `planLockedMonths`, `planDrag`, `planSoldes`, `planLegendOpen`, `planSoldesOpen`.
- Fonctions partagées script scope : `getPlanDayState`, `savePlanData`, `loadUserPlan`, `applyPlanStateDrag`, `cyclePlanDay`, `updatePlanStats`.

## Dans `index.html`

- HTML vue : lignes ~4144+ (`#planning-ca-view`).
- CSS : lignes ~490–647.
- JS : **migré vers `handlers.js`**.
- Point d'entrée : `onclick="openPlanningCA()"` dans les calculators.

## Accès externes (inline cross-module)

- Auth flow : appelle `loadUserPlan`, écrit `planStates`/`planRegime`.
- Bed-grid : lit `planStates[dateOnly]`.
- Global touch handlers : utilise `planDrag`, `applyPlanStateDrag`, `planLockedMonths`, `getPlanDayState`.
- Bourse : utilise `getPlanDayState`.

## Dépendances externes

- `window.PLAN_WORK_STATES`, `window.PLAN_LABELS` (config.js).
- `getJoursFeries` (conges-calendar/handlers.js — exposé `window.getJoursFeries`).
- `PLANS_DOC`, `currentUser` (let/const inline — accédés via `typeof PLANS_DOC !== 'undefined'`).
- `triggerHaptic` (inline).

## Persistance

- `localStorage` clés : `pulseunit_plan_states`, `pulseunit_plan_regime`, `pulseunit_plan_locked`, `pulseunit_plan_soldes`.
- Firebase : `PLANS_DOC.set({ [currentUser.id]: { states, regime } }, { merge: true })`.

## Règles

- **21 jours consécutifs** max (agents de jour).
- **22 jours consécutifs** max (fixes de nuit — CA + RCN).
- Drag-to-paint (touchstart/touchmove/touchend) pour appliquer un état sur plusieurs cases.
