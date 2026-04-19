# presence

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#17-presence) (section 17).

## Fichiers de ce dossier

- [`handlers.js`](./handlers.js) — heartbeat Firebase 60s. Chargé ligne ~1525 d'`index.html`. Expose `window.setPresence`, `window.startPresenceHeartbeat`, `window.stopPresenceHeartbeat`.

## Dans `index.html`

- JS handlers : **migrés vers `handlers.js`**.
- Listener `PRESENCE_DOC.onSnapshot` + variable `onlineUsers` : **restent inline** (ligne ~4050+) car mutés par Firebase et lus par le panel admin (`renderAdminUsers`).

## Dépendances du module

- Globales partagées (script scope) : `PRESENCE_DOC`, `currentUser`.
- Global Firebase : `firebase.firestore.FieldValue.delete()`.

## État local au module

- `_presenceInterval` (ID du setInterval 60s).

## Persistance

- Firestore `pulseunit/presence` : `{ [userId]: { firstName, lastName, role, lastSeen } }`.
