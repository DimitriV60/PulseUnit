# bourse

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#14-bourse) (section 14).

## Fichiers de ce dossier

- [`handlers.js`](./handlers.js) — handlers stateful avec persistance Firebase temps réel. Chargé ligne ~1524 d'`index.html`. Expose 17 fonctions sur `window` (voir ci-dessous).

## Dans `index.html`

- HTML vues : lignes ~5862–5928 (vue principale + modals create/propose).
- CSS : lignes ~548–607.
- JS : **migré vers `handlers.js`**.

## Fonctions exposées (window)

- Vue principale : `openBourse`, `closeBourse`, `renderBourseList`.
- Modal création : `openBourseCreate`, `closeBourseCreate`, `renderOfferedCal`, `renderWantedCal`, `selectWantedType`, `selectWantedShift`, `pickOffDate`, `clearOffDate`, `prevOffCal`, `nextOffCal`, `pickWantDate`, `clearWantDate`, `prevWantCal`, `nextWantCal`, `submitSwapRequest`.
- Modal proposition : `openBoursePropose`, `closeBoursePropose`, `pickPropDate`, `clearPropDate`, `prevPropCal`, `nextPropCal`, `submitPropose`.
- Actions : `acceptSwap`, `declineProposal`, `cancelSwap`.

## État local au module

- Calendriers : `_offCalY`, `_offCalM`, `_offDate`, `_wantCalY`, `_wantCalM`, `_wantDate`, `_wantShift`, `_wantType`.
- Proposition : `_propReqId`, `_propCalY`, `_propCalM`, `_propDate`.
- Helpers : `_MONTHS_FR`, `_isGardeState`, `_buildBourneCal`, `renderProposeCal`.

## État partagé (script scope, déclaré inline)

- **`swapRequests`** (let, ligne ~4046) — array des demandes, mutué par :
  - listener Firebase `SWAP_DOC.onSnapshot` (~ligne 4777)
  - tous les handlers d'écriture (`submitSwapRequest`, `submitPropose`, `acceptSwap`, `declineProposal`, `cancelSwap`)
- `currentUser`, `SWAP_DOC`, `planStates` — let/const inline.
- Fonctions partagées : `getPlanDayState`, `isAdmin`, `showToast`.

## Persistance

- Firestore `pulseunit/swaps` via `SWAP_DOC.set({ requests: updated })`.
- Synchronisation temps réel via `onSnapshot` (mise à jour automatique sur tous les clients connectés).
