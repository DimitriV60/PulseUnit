# auth

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#1-auth) (section 1).

- **index.html** — HTML 8851–8927 · CSS 282–322 · JS 7111–7455.
- **État store** : `currentUser`, `authUsers`, `resetRequests`, `adminSessionActive`, `selectedRole`.
- **Fonctions clés** : `registerUser`, `loginUser`, `loginAdminFromAuth`, `changeTempPin`, `logoutUser`, `selectRole`, `filterAuthUsers`, `selectAuthUser`, `clearSelectedAuthUser`, `sendResetRequest`, `verifyAdminCredentials`.
- **Dépendances** : Firebase AUTH_DOC/RESETS_DOC, SHA-256, localStorage, sessionStorage.
