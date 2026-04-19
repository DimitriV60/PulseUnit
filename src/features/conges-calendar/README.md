# conges-calendar

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#13-conges-calendar) (section 13).

## Fichiers de ce dossier

- [`handlers.js`](./handlers.js) — simulateur CA annuel complet (localStorage). Chargé ligne ~1527 d'`index.html`. Expose sur `window` : `openCalendrierConges`, `closeCalendrierConges`, `renderCalendrier`, `renderCalMonth`, `setCalRegime`, `changeCalYear`, `resetCalendrier`, `toggleCADay`, `toggleDJFDay`, `calcCongesStats`, `getJoursFeries`.

## Dans `index.html`

- HTML vue : lignes ~4500+ (`#calendrier-conges-view`).
- CSS : lignes ~432–486.
- JS : **migré vers `handlers.js`**.
- Point d'entrée : `onclick="openCalendrierConges()"` dans `src/features/calculators/data.js` (carte "conges").

## État local au module

- `calYear` (année en cours), `calRegime` ('fixes' | 'variable' | 'nuit').
- `calSelectedCA` (Set de dates ISO) — jours CA cochés.
- `calWorkedDJF` (Set de dates ISO) — DJF travaillés (régime variable).

## Dépendances externes

- Fonction partagée : `triggerHaptic` (inline).

## Persistance

- `localStorage` clés : `pulseunit_cal_ca`, `pulseunit_cal_djf`.

## Règles

- **Décret 2002-8** : bonus hors saison (+1 si ≥3 HS, +2 si ≥6 HS) + bonus fractionnement (+1 si ≥3 périodes de ≥5 j).
- **Décret 2002-9 Art. 3** : RCV (+2 si ≥20 DJF travaillés en régime variable).
- **Décret 2002-9 Art. 4** : nuit exclusive → RCV = 0.
