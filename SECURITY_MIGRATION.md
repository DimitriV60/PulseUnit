# Migration Sécurité PulseUnit — Audit 2026-04-30 / Plan P1

Ce document trace la migration sécurité issue de l'audit complet du 2026-04-30. La branche `claude/audit-p1-security-hardening` ajoute le code nécessaire **sans casser l'app existante** (fallback sur l'auth anonyme actuelle si les nouveaux composants ne sont pas configurés).

## TL;DR — ce qui doit être fait par toi

Le code est en place. Il manque 3 actions humaines pour activer la sécurité :

1. **Révoquer le token Cloudflare leaké** (P1.1) — https://dash.cloudflare.com/profile/api-tokens — supprime `cfut_sMQuLg...`, regénère un nouveau token avec scope `Workers:Edit` projet `pulseunit-scan` + expiration 30j.

2. **Restreindre l'apiKey Firebase** (P1.2) — Google Cloud Console → APIs & Services → Credentials → la clé `AIzaSyBtzRiQmNe4HWRsxJp_hexxOOCDjmPBCrs` → Application restrictions → HTTP referrers → ajoute :
   - `https://pulseunit-c9c5c.web.app/*`
   - `https://pulseunit-c9c5c.firebaseapp.com/*`
   - `https://pulse-unit.vercel.app/*`
   - `http://localhost:*`

3. **Configurer le Service Account dans Cloudflare** (active P1.4 + P1.6) :
   ```
   # 1. Télécharge la clé JSON SA (Firebase Console → ⚙ → Service Accounts → Generate new private key)
   # 2. Pose-la en secret sur le Worker :
   cd worker
   npx wrangler secret put FIREBASE_SA_KEY
   # → colle le contenu JSON complet quand demandé
   # 3. Redeploie
   npx wrangler deploy
   ```
   Tant que ce secret n'est pas en place, `/login` et `/admin-login` renvoient 503 et le client fallback automatiquement sur l'auth anonyme actuelle (compat préservée).

Une fois les 3 actions faites, l'app utilise des Custom Tokens Firebase avec uid réel et claim admin. Étape suivante : activer les nouvelles `firestore.rules` (voir P1.3 ci-dessous).

---

## Détail par item P1

### ✅ P1.1 Révoquer token CF leaké
**À faire toi-même.** Le token apparait dans `wiki/Daily/2026-04-29.md` et n'a jamais été révoqué.

### ✅ P1.2 Restreindre apiKey Firebase
**À faire toi-même.** L'apiKey est par design exposée mais doit être bridée par référent HTTP.

### ✅ P1.3 firestore.rules.next (draft, NON déployé)
**Fichier** : `firestore.rules.next` (à côté de l'actuel `firestore.rules`).

Cible un modèle ownership par-uid : chaque user ne lit/écrit que ses propres docs. Plus de lecture libre des PIN hashes ni des messages d'autrui.

**Déploiement bloqué** tant que :
- (a) Le Worker `/login` est fonctionnel (P1.4) → OK avec FIREBASE_SA_KEY
- (b) Tous les clients en circulation utilisent `customAuth.loginWithPin` → OK après push de cette branche
- (c) Migration data model (split `pulseunit/auth` → `users_public` + `users_private/{uid}`) → script à écrire (voir P1.3-bis ci-dessous)

**Commande de déploiement (quand prêt)** :
```
cp firestore.rules.next firestore.rules
firebase deploy --only firestore:rules --project pulseunit-c9c5c
```

#### P1.3-bis — Script de migration data model (FAIT 2026-05-02)

Implémenté comme endpoint Worker `POST /migrate-auth-split` (P3.0). Idempotent.
Sécurisé par `X-Migrate-Token` header (vaut `env.MIGRATE_SECRET` côté CF Worker).

**Schéma cible** :
- `pulseunit/users_public` (doc unique avec map `users.{uid} = {firstName, lastName, role}`)
  → lecture par tout user authentifié (login screen list).
- `users_private/{uid}` (collection top-level, un doc par user) avec
  `{pinHash, pinHashV2, pinSalt, tempPin, tempPinExpiry, failedAttempts, blocked, blockedAt, createdAt, migratedAt}`
  → lecture restreinte à `auth.uid == uid` ou admin. Écriture interdite client (Worker via SA only).

**Exécution (validé 2026-05-02)** :
```bash
curl -X POST https://pulseunit-scan.dimitri-valentin.workers.dev/migrate-auth-split \
  -H "Origin: https://pulseunit-c9c5c.web.app" \
  -H "X-Migrate-Token: <MIGRATE_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{}'
# → {"ok":true,"totalUsers":8,"privateWritten":8,"publicWritten":true,"errors":[]}
```

**Après migration**, faire tourner les deux schémas en parallèle :
- Client legacy continue à lire/écrire `pulseunit/auth` (read+write OK rules actuelles)
- Worker `/login` lit `pulseunit/auth.users.{uid}` (path inchangé pour compat)
- Worker `/register`, `/change-pin` écrivent dans `pulseunit/auth.users.{uid}` (legacy path)
- À chaque write Worker, idéalement aussi sync vers `users_private/{uid}` (à faire en P3.1)

**Quand on est prêt à couper le cordon** :
1. Re-run `/migrate-auth-split` une dernière fois (sync final)
2. Switcher Worker `/login` pour lire `users_private/{uid}` direct (plus efficace que la map dans pulseunit/auth)
3. Déployer `firestore.rules.next` qui interdit lectures `pulseunit/auth`
4. Surveiller pendant 7 jours
5. Supprimer `pulseunit/auth` (backup avant)

### ✅ P1.4 Worker /login (Custom Token Firebase)
**Fait** dans `worker/src/worker.js`. Endpoint `POST /login` :
- Body : `{ userId, pin }`
- Lit `pulseunit/auth` via Firestore REST + SA OAuth
- Vérifie pinHashV2 (PBKDF2) puis fallback pinHash (SHA-256 legacy) puis tempPin
- Signe un Custom Token RS256 avec `uid: userId`, `claims: { role, admin: false }`
- Retourne `{ token, uid, role, requirePinChange? }`

Le client (`src/core/custom-auth.js`) appelle `signInWithCustomToken(token)` puis fallback anonyme si Worker indispo.

### ✅ P1.5 Client PIN PBKDF2 + dual-write migration
**Fait** dans `src/features/auth/handlers.js` :
- Nouvelle fonction `hashPinV2(pin, salt)` = PBKDF2-SHA256 100k itérations
- `buildPinHashes(pin)` génère salt + V2 + legacy
- `registerUser`, `adminCreateUser`, `changeMyPin`, `changeTempPin` écrivent les 3 champs `pinHash + pinHashV2 + pinSalt`
- `loginUser` vérifie V2 prioritairement, fallback legacy. Si user n'a pas encore V2 (compte ancien), migration transparente à la 1ère connexion réussie.

**Effet** : à mesure que les agents se connectent, leurs comptes basculent en V2. Au bout de quelques semaines, on peut supprimer le code legacy `pinHash`.

### ✅ P1.6 Worker /admin-login (Custom Claim admin:true)
**Fait** dans `worker/src/worker.js`. Endpoint `POST /admin-login` :
- Body : `{ user, pass }`
- Lit `config/admin.passHash` via Firestore REST + SA OAuth
- Vérifie SHA-256(pass) === passHash
- Signe Custom Token avec `uid: 'admin_view'`, `claims: { admin: true, role: 'ide' }`

Le client (`loginAdminFromAuth` + `checkAdmin`) appelle `customAuth.loginAdmin` qui pose le claim Firebase. À terme, les rules Firestore vérifient `request.auth.token.admin == true`.

`adminSessionActive` côté client reste pour la cohérence UI mais n'est plus la source de vérité de sécurité — la source devient le claim signé serveur.

### ✅ P1.7 Worker rate limit
**Fait** dans `worker/src/worker.js` : sliding window 60s, 30 req max par (origin + path + ip approximée via CF-Connecting-IP). Stockage in-memory par isolate (pas KV → reste 100% gratuit). Sur dépassement → 429.

Logs payload OCR retirés (`text.slice(0, 2000)` → juste `text_len`).

### ✅ P1.8 Worker validation entrées
**Fait** dans `worker/src/worker.js` : `_validateScanParams` impose :
- `kind ∈ {planning, debit-credit}` ou absent
- `imageBase64` string ≤ 7 Mo
- `year ∈ [2020, 2050]`
- `month ∈ [1, 12]` (sauf debit-credit)

Bloque les prompt injections via `month: "01\nIGNORE..."`.

---

## Backward compatibility & rollback

| Composant nouveau | Si KO | Comportement |
|---|---|---|
| Worker `/login` 503 (SA pas configuré) | client fallback `signInAnonymously` | App fonctionne, niveau sécurité = avant |
| Worker `/admin-login` 503 | admin reste `adminSessionActive` côté client | UI admin OK, sécurité = avant |
| `pinHashV2` absent (compte ancien) | `loginUser` fallback `pinHash` | Migration transparente au prochain login |
| `firestore.rules.next` non déployé | rules actuelles `if request.auth != null` | OK avec custom token ET avec anonyme |
| Custom Token expiré (1h) | client refait `signInAnonymously` ou re-login | Pas de coupure utilisateur |

**Rollback complet** si problème :
```bash
git revert <merge-commit-de-cette-branche>
git push origin main
# Le secret FIREBASE_SA_KEY peut rester côté CF — sans effet si le code ne l'appelle plus.
```

---

## Restant après P1 (audit P2-P4)

| ID audit | Description | Effort |
|---|---|---|
| P2.1 | Audit logging via sub-collection `auditlog/` | 2 j |
| P2.2 | Retirer `'unsafe-inline'` de la CSP (extraire `<script>` inline) | 1 j |
| P2.3 | TTL serveur sur présence (Cloud Scheduler — sera Blaze, à voir) | 0,5 j |
| P2.4 | Cascade delete RGPD (`adminDeleteUser` purge tous les docs) | 1 j |
| P2.5 | Validation regex inscription `firstName/lastName` | 0,5 j |
| P2.6 | Retirer `index.backup.*.html` des assets servis | 5 min |
| P2.7 | SRI sur tous les CDN (jsPDF, Firebase, etc.) | 1 h |

Voir [[Audit Complet PulseUnit 2026-04-30]] pour le plan complet P3 + P4.
