# calculators

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#7-calculators) (section 7).

## Fichiers de ce dossier

- [`data.js`](./data.js) — définitions des calculateurs (labels, champs, formules HTML). Chargé ligne ~1507 d'`index.html`. Expose `window.CALCULATORS_DATA`.
- [`handlers.js`](./handlers.js) — handlers UI (open/close/render/modal/exec). Chargé ligne ~1517 d'`index.html`. Expose `window.openCalculateurs`, `window.closeCalculateurs`, `window.openCalcModal`, `window.closeCalcModal`, `window.execCalc`, `window.execCalcLive`.

## Dans `index.html`

- HTML vue : lignes ~1195–1222.
- CSS : lignes ~256–328.
- JS : **migré vers `handlers.js`** (plus de code inline hormis le commentaire de référence).

## État store

Aucun — calculs purs, sans persistance. `window.escapeHTML` doit être disponible au moment de l'appel (défini dans le script inline).

## Calculs couverts

Glasgow (GCS), RASS, Waterlow, Sevrage alcoolique, IBW/VT, P/F SDRA, Driving Pressure, PAM, PSE débit, Dose/kg, Conversion mg↔mL, Diurèse, IMC, Pourcentage, Transmission, Congés hors-saison, Congés été.
