# calculators

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#7-calculators) (section 7).

## Fichiers de ce dossier

- [`data.js`](./data.js) — définitions des calculateurs (labels, champs, formules). Chargé via `<script src="src/features/calculators/data.js">` dans `index.html`. Expose `window.CALCULATORS_DATA`.

## Dans `index.html`

- HTML vue : lignes ~1195–1222.
- CSS : lignes ~256–328.
- JS handlers : lignes ~2814–3349.
- Référence : `const CALCULATORS_DATA = window.CALCULATORS_DATA;`.

## État store

- Aucun (calculs purs, pas de persistance).

## Calculs couverts

IBW, PAM, GCS, RASS, P/F, Driving Pressure, PSE, BMR, Glycémie, Diurèse, V/Fs, Lactatémie, DFG, Transmission, HS Bonus, Frac Bonus.
