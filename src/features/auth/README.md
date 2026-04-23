# auth

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#1-auth) (section 1).

## Fichiers de ce dossier

- [`handlers.js`](./handlers.js) — Authentification PIN 6 chiffres (SHA-256), sessions 3 mois, demandes reset, gestion admin utilisateurs, toast, modale alpha/WhatsApp. Chargé **après** `admin/handlers.js`.

## Fonctions exposées sur `window`

`hashPin`, `showAuthView`, `selectRole`, `filterAuthUsers`, `selectAuthUser`, `clearSelectedAuthUser`, `filterForgotUsers`, `selectForgotUser`, `showAuthModal`, `checkAutoLogin`, `registerUser`, `loginUser`, `loginAdminFromAuth`, `changeTempPin`, `logoutUser`, `updateHeaderUser`, `openAlphaModal`, `copyAlphaLink`, `sendWhatsAppBug`, `showToast`, `sendResetRequest`, `adminSetTempPin`, `renderAdminResets`, `adminSelectNewRole`, `adminCreateUser`, `adminUnlockUser`, `adminDeleteUser`, `openAdminUsersList`, `renderAdminUsers`, `changeMyPin`, `loadAuth`.

## Constantes (script scope)

- `ROLE_COLORS` = mapping rôle → var CSS (ide/as/med/tech).
- `ALPHA_URL`, `WHATSAPP_NUM` — URL production et numéro WhatsApp.
- `_qrGenerated`, `_adminNewRole` — flags internes.

## État (reste inline dans `index.html`)

- `currentUser`, `authUsers`, `resetRequests`, `onlineUsers`, `selectedRole`, `_savePending`.
- `AUTH_DOC`, `RESETS_DOC`, `PRESENCE_DOC`, `SWAP_DOC`, `PLANS_DOC` (consts Firebase).
- Listeners `PRESENCE_DOC.onSnapshot`, `RESETS_DOC.onSnapshot`, `beforeunload`.

Raison : mutation croisée Firebase ↔ handlers.js. Les handlers écrivent dans ces variables via le script scope partagé (classic scripts).

## Dans `index.html`

- HTML : `#auth-modal`, `#auth-login-view`, `#auth-register-view`, `#auth-forgot-view`, `#auth-admin-view`, `#auth-change-pin-modal`, `#admin-users-modal`, `#alpha-modal`, `#app-toast`.
- JS : **migré vers `handlers.js`**.
- Points d'entrée : `onclick="showAuthModal()"`, `onclick="loginUser()"`, `onclick="registerUser()"`, `onclick="logoutUser()"`, etc.

## Dépendances externes

- `admin/handlers.js` : `setAdminSession`, `verifyAdminCredentials`, `updateAdminPanelBtn`.
- `presence/handlers.js` : `setPresence`, `startPresenceHeartbeat`, `stopPresenceHeartbeat`.
- `planning-ca/handlers.js` : `loadUserPlan`.
- Inline : `roster`, `saveData`, `renderApp`, `escapeHTML`, `checkWorkStatus`.
- Web Crypto API (`crypto.subtle.digest`), `QRCode` (lib externe pour modale alpha).

## Persistance

- `sessionStorage.pulseunit_current_user` — utilisateur courant (nettoyé à la déconnexion).
- `localStorage.pulseunit_autologin` — auto-login 3 mois (case cochée).
- Firebase `AUTH_DOC.users`, `RESETS_DOC.requests`.

## Sécurité

- PIN 6 chiffres hashé SHA-256 côté client.
- **3 tentatives max** → compte bloqué, déblocage admin uniquement.
- Code provisoire (6 chiffres) fourni par l'admin → force le changement au prochain login.
