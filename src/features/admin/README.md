# admin

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#16-admin) (section 16).

## Fichiers de ce dossier

- [`handlers.js`](./handlers.js) — Panneau admin local (SHA-256, verrouillage USIP). Chargé après `planning-ca/handlers.js`.

## Fonctions exposées sur `window`

`openAdmin`, `togglePass`, `updateAdminPanelBtn`, `toggleAdminUsipLock`, `checkAdmin`.

## État local au module (partagé script scope)

- `adminSessionActive` (bool) — vrai si une session admin est ouverte.
- Fonctions partagées script scope : `isAdmin`, `setAdminSession`, `verifyAdminCredentials`.

## Constantes (script scope)

- `ADMIN_USER` = `'admin'`.
- `ADMIN_PASS_HASH` — hash SHA-256 du mot de passe admin (remplacer pour changer le mdp).

## Dans `index.html`

- HTML : `#admin-panel-modal`, `#admin-login-modal`, `#admin-usip-btn`, `#admin-pass`, `#toggle-pass-btn`.
- JS : **migré vers `handlers.js`**.
- Points d'entrée : `onclick="openAdmin()"`, `onclick="togglePass()"`, `onclick="checkAdmin()"`, `onclick="toggleAdminUsipLock()"`.

## Dépendances externes

- `currentUser` (auth) — bloque si non connecté.
- `shiftHistory`, `currentShiftKey`, `initShiftData`, `saveData`, `renderApp` (inline).
- `renderAdminResets`, `renderAdminUsers` (auth/handlers.js).
- Web Crypto API (`crypto.subtle.digest`).

## Changer le mdp admin

1. Ouvrir la console du navigateur (F12 → Console).
2. Exécuter (remplacer `"votre_mdp"`) :
   ```js
   crypto.subtle.digest('SHA-256', new TextEncoder().encode("votre_mdp"))
     .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('')))
   ```
3. Copier le hash et remplacer `ADMIN_PASS_HASH` dans `handlers.js`.
