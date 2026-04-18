# protocols

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#8-protocols) (section 8).

## Fichiers de ce dossier

- [`data.js`](./data.js) — protocoles (sections, steps, notes). Chargé via `<script src="src/features/protocols/data.js">` dans `index.html`. Expose `window.PROTOCOLS_DATA`.

## Dans `index.html`

- HTML vue : lignes ~8090–8120.
- CSS : lignes ~398–430.
- JS handlers : lignes ~4467–4839.
- Référence : `const PROTOCOLS_DATA = window.PROTOCOLS_DATA;`.

## État store

- `currentProtoId` (protocole ouvert).
