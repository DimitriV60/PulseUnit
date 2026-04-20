# ANNUAIRE PulseUnit — Index des features

> **À lire en premier** avant toute modification de `index.html` (9000 lignes).
> Ce fichier est la carte : il pointe, pour chaque feature, les lignes exactes à ouvrir dans `index.html` et le dossier `src/features/<nom>/` correspondant.
>
> **État actuel** : `index.html` reste le fichier unique déployé. `src/` contient le scaffolding de la future architecture modulaire (store global + stubs + données extractibles). La migration se fait progressivement par PR.

---

## Comment utiliser cet annuaire

1. Identifie la feature concernée dans le tableau ci-dessous.
2. Ouvre `index.html` aux lignes indiquées (HTML / CSS / JS).
3. Consulte `src/features/<nom>/README.md` pour les fonctions et l'état utilisé.
4. Modifie `index.html` directement (pour l'instant). Le jour où une feature est migrée, son README pointera vers les fichiers `src/features/<nom>/*.js`.

---

## Table des features (index principal)

| # | Feature | Dossier `src/` | HTML | CSS | JS |
|---|---------|----------------|------|-----|----|
| 1 | [auth](#1-auth) | `features/auth/` | 8851–8927 | 282–322 | 7111–7455 |
| 2 | [settings](#2-settings) | `features/settings/` | 940–994 | 36–82, 381–397 | 18–34, 1551–1596 |
| 3 | [shift](#3-shift) | `features/shift/` | 895–914, 1245–1254 | 85–152 | 3349–3760 |
| 4 | [beds](#4-beds) | `features/beds/` | 1245–1248 | 131–209 | 3760–4046 |
| 5 | [checklist](#5-checklist) | `features/checklist/` ✅ data migrée | 1155–1175 | 341–379 | 4080–4167 (items dans `data.js`) |
| 6 | [lexique](#6-lexique) | `features/lexique/` ✅ data migrée | 1177–1193 | 234–255 | 2744–2804 (données dans `data.js`) |
| 7 | [calculators](#7-calculators) | `features/calculators/` ✅ data migrée | 1195–1222 | 256–328 | 2814–3349 (données dans `data.js`) |
| 8 | [protocols](#8-protocols) | `features/protocols/` ✅ data migrée | 8090–8120 | 398–430 | 4467–4839 (données dans `data.js`) |
| 9 | [tasks](#9-tasks) | `features/tasks/` ✅ data migrée | 1224–1243 | 264–277 | 2860–2948 (tâches dans `data.js`) |
| 10 | [norms](#10-norms) | `features/norms/` ✅ data migrée | 8431–8450 | 648–685 | 6107–6604 (données dans `data.js`) |
| 11 | [respirator](#11-respirator) | `features/respirator/` ✅ **JS migré** | ~4644+ | 709–854 | `handlers.js` (Canvas/RAF, oscilloscope 5 cycles) |
| 12 | [planning-ca](#12-planning-ca) | `features/planning-ca/` ✅ **JS migré** | ~4144+ | 490–647 | `handlers.js` (validation FPH 21/22 j, drag-to-paint) |
| 13 | [conges-calendar](#13-conges-calendar) | `features/conges-calendar/` | 8123–8199 | 432–486 | 5343–5750 |
| 14 | [swap-shifts](#14-swap-shifts) | `features/swap-shifts/` | 8930–8986 | 548–607 | 6146–6549 |
| 15 | [services](#15-services) | `features/services/` ✅ data migrée | inline | — | 4620–4680 (données dans `data.js`) |
| 16 | [admin](#16-admin) | `features/admin/` | 996–1087 | — | 1603–1720, 7582–7891 |
| 17 | [presence](#17-presence) | `features/presence/` | — | — | 7125–7167 |
| 18 | [search](#18-search) | `features/search/` | 908–912 | — | 3545–3680 |
| 19 | [sidemenu](#19-sidemenu) | `features/sidemenu/` | 916–938 | 215–224 | 2720–2744 |
| 20 | [projet](#20-projet) | `features/projet/` ✅ **JS migré** | lexique-projet-view, securite-view | — | `handlers.js` (3 fonctions) |
| 21 | [work-status](#21-work-status) | `features/work-status/` ✅ **JS migré** | work-status-modal | — | `handlers.js` (modale travail/lecture) |
| 22 | [gestures](#22-gestures) | `features/gestures/` ✅ **JS migré** | — | — | `handlers.js` (drag-to-paint + swipe) |

---

## Éléments transverses

| Zone | Lignes | Description |
|------|--------|-------------|
| `<head>` meta + manifest | 1–9 | Viewport, manifest.json, theme-color, Google Fonts |
| Init thème (inline) | 10–34 | localStorage theme, media query dark |
| CSS variables `:root` | 35–82 | Palette, typo, spacing — variables centrales |
| Header sticky | 895–914 | Titre, user info, recherche globale, shift-nav |
| Side menu | 916–938 | Drawer de navigation |
| Sticky banner | 1250–1253 | Validation sélection staff |
| CDN | 857–860 | QRCode, Firebase App, Firebase Firestore |
| Firebase init | 861–890 | Config + initializeApp |
| `DOMContentLoaded` | 1587 | Point d'entrée app |
| `renderApp()` | 3760 | Rendu principal grille lits |
| Service worker reg | 8989–8992 | Enregistrement PWA |
| Données lexique | `src/features/lexique/data.js` ✅ | ~260 termes (extrait d'index.html) — chargé via `<script src>` ligne 1507 |

---

## Firebase — documents Firestore

| Constante | Doc | Utilisé par |
|-----------|-----|-------------|
| `PULSEUNIT_DOC` | `pulseunit/main` | shift, beds, checklist, tasks |
| `AUTH_DOC` | `pulseunit/auth` | auth, admin |
| `RESETS_DOC` | `pulseunit/resets` | auth (reset PIN), admin |
| `PRESENCE_DOC` | `pulseunit/presence` | presence, admin |
| `SWAP_DOC` | `pulseunit/swap` | swap-shifts |

---

## Store global (`src/core/store.js`)

Clés d'état centralisées, regroupées par feature :

```
currentUser, authUsers, resetRequests, adminSessionActive, selectedRole, onlineUsers    → auth/admin
savedTheme, appSettings                                                                  → settings
currentShiftKey, roster, shiftHistory, selectedStaffForTap                               → shift/beds
currentLexiqueFilter, currentProtoId, normesCurrentCat, currentChecklistBed              → UI / filtres
planYear, planRegime, planStates, planLockedMonths, planSoldes                           → planning-ca
calYear, calRegime, calSelectedCA, calWorkedDJF                                          → conges-calendar
respiValues, respiMode, respiScenario                                                    → respirator
swapRequests                                                                             → swap-shifts
```

Voir `src/core/store.js` pour l'API (`store.get`, `store.set`, `store.subscribe`, `store.persist`, `store.hydrate`).

---

## Graphe de dépendances

```
auth ────→ admin, shift, presence, settings
shift ───→ beds, checklist, tasks, planning-ca
beds ────→ protocols, search, sidemenu
search ──→ lexique, protocols, services
planning-ca ──→ conges-calendar
respirator ───→ norms
admin ───→ auth, presence
settings ──→ theme, auth
```

---

## Détails par feature

### 1. auth

- **Rôle** : connexion, inscription, reset PIN, sessions admin, gestion admin utilisateurs, toast, alpha/WhatsApp.
- ✅ **JS migré** : [`src/features/auth/handlers.js`](src/features/auth/handlers.js) — chargé après `admin/handlers.js`.
- **index.html** : HTML (modales auth) · CSS 282–322 · JS extrait vers handlers.js.
- **État inline** : `currentUser`, `authUsers`, `resetRequests`, `onlineUsers`, `selectedRole`, `_savePending`, `AUTH_DOC`, `RESETS_DOC`, `PRESENCE_DOC`, `SWAP_DOC`, `PLANS_DOC` + listeners Firebase.
- **Exposé window** : `hashPin`, `showAuthView`, `selectRole`, `filterAuthUsers`, `selectAuthUser`, `clearSelectedAuthUser`, `filterForgotUsers`, `selectForgotUser`, `showAuthModal`, `checkAutoLogin`, `registerUser`, `loginUser`, `loginAdminFromAuth`, `changeTempPin`, `logoutUser`, `updateHeaderUser`, `openAlphaModal`, `copyAlphaLink`, `sendWhatsAppBug`, `showToast`, `sendResetRequest`, `adminSetTempPin`, `renderAdminResets`, `adminSelectNewRole`, `adminCreateUser`, `adminUnlockUser`, `adminDeleteUser`, `openAdminUsersList`, `renderAdminUsers`, `changeMyPin`, `loadAuth`.
- **Dépendances** : Firebase AUTH_DOC/RESETS_DOC, SHA-256, localStorage/sessionStorage, `admin/handlers.js` (`setAdminSession`, `verifyAdminCredentials`), `presence/handlers.js` (`setPresence`), `planning-ca/handlers.js` (`loadUserPlan`).

### 2. settings

- **Rôle** : thème (auto/light/dark), son, haptic, changement PIN.
- ✅ **JS migré** : [`src/features/settings/handlers.js`](src/features/settings/handlers.js) — chargé après `auth/handlers.js`.
- **index.html** : HTML 940–994 · CSS 36–82, 381–397 · JS modal migré.
- **État inline** (reste dans `<head>` anti-FOUC) : `savedTheme`, `appSettings`, `getAutoTheme`, `applyTheme`.
- **Exposé window** : `openSettings`, `setTheme`, `updateThemeBtns`, `toggleAppSetting`.
- **Hors périmètre** : `changeMyPin` → `auth/handlers.js` (dépend du hash PIN).

### 3. shift

- **Rôle** : garde courante (jour/nuit), allocation soignants → lits, sérialisation.
- **index.html** : HTML 895–914, 1245–1254 · CSS 85–152.
- **Handlers** ✅ migrés : [`src/features/shift/handlers.js`](src/features/shift/handlers.js) — `window.initShiftData`, `window.saveData`, `window.hardResetApp`, `window.clearSelection`, `window.updateStickyBanner`, `window.toggleSelection`, `window.isShiftLocked`, `window.isOnCurrentShift`, `window.canEditBeds`, `window.initDates`, `window.doSearch`, `window.selectSuggestion`, `window.triggerCreateNew`, `window.assignSpecDirect`, `window.openModalSpec`, `window.createNewStaff`, `window.clearShift`, `window.clearCurrentShift`, `window.getStaffTargets`, `window.confirmClearShift`, `window.executeClearShift`.
- **État** : `currentShiftKey`, `shiftHistory`, `roster`, `selectedStaffForTap` (inline, partagés via portée lexicale).

### 4. beds

- **Rôle** : grille principale (RÉA + USIP), affectations IDE/AS/MED/TECH, marqueurs BMR/dialyse/critique.
- **index.html** : HTML 1245–1248 · CSS 131–209.
- **Handlers** ✅ migrés : [`src/features/beds/handlers.js`](src/features/beds/handlers.js) — `window.toggleMedBed`, `window.assignLit`, `window.toggleLit`, `window.getAllBedIds`, `window.renderApp`.
- **État** : `selectedStaffForTap`, `shiftHistory[key].assignments`.
- **Config** : `CONFIG` (structure 2 secteurs).

### 5. checklist

- **Rôle** : 10 items de vérification par chambre, traçabilité par garde.
- **index.html** : HTML 1155–1175 · CSS 341–379.
- **Données** ✅ migrées : [`src/features/checklist/data.js`](src/features/checklist/data.js) — `window.CHECKLIST_ITEMS`.
- **Handlers** ✅ migrés : [`src/features/checklist/handlers.js`](src/features/checklist/handlers.js) — `window.openChecklist`, `window.closeChecklist`, `window.selectChecklistBed`, `window.toggleChecklistItem`, `window.renderChecklistView`.
- **État** : `currentChecklistBed` local au module. Persistance Firebase : `shiftHistory[key].checklistChambre[bedId]`.

### 6. lexique

- **Rôle** : 260+ termes médicaux, 13 catégories, recherche + filtrage.
- **index.html** : HTML 1177–1193 · CSS 234–255.
- **Données** ✅ migrées : [`src/features/lexique/data.js`](src/features/lexique/data.js) — `window.LEXIQUE_DATA`.
- **Handlers** ✅ migrés : [`src/features/lexique/handlers.js`](src/features/lexique/handlers.js) — `window.openLexique`, `window.closeLexique`, `window.setLexiqueFilter`, `window.toggleLexCard`, `window.renderLexique`.
- **État** : `currentLexiqueFilter` local au module handlers.

### 7. calculators

- **Rôle** : 16 calculateurs (IBW, PAM, P/F, ΔP, PSE, GCS, RASS, Waterlow, congés…).
- **index.html** : HTML 1195–1222 · CSS 256–328.
- **Données** ✅ migrées : [`src/features/calculators/data.js`](src/features/calculators/data.js) — `window.CALCULATORS_DATA`.
- **Handlers** ✅ migrés : [`src/features/calculators/handlers.js`](src/features/calculators/handlers.js) — `window.openCalculateurs`, `window.closeCalculateurs`, `window.openCalcModal`, `window.closeCalcModal`, `window.execCalc`, `window.execCalcLive`.
- **État** : aucun (calculs purs, sans persistance).

### 8. protocols

- **Rôle** : protocoles lecture seule, accordéon par sections.
- **index.html** : HTML 8090–8120 · CSS 398–430.
- **Données** ✅ migrées : [`src/features/protocols/data.js`](src/features/protocols/data.js) — `window.PROTOCOLS_DATA`.
- **Handlers** ✅ migrés : [`src/features/protocols/handlers.js`](src/features/protocols/handlers.js) — `window.openProtocoles`, `window.closeProtocoles`, `window.renderProtoList`, `window.openProtocoleDetail`, `window.closeProtocoleDetail`, `window.renderProtoDetail`, `window.toggleProtoSection`.
- **État** : aucun (lecture seule).

### 9. tasks

- **Rôle** : tâches IDE tech quotidiennes (jour/nuit), cochage, traçabilité.
- **index.html** : HTML 1224–1243 · CSS 264–277 · JS migré.
- **Données** ✅ migrées : [`src/features/tasks/data.js`](src/features/tasks/data.js) — `window.TECH_TASKS`.
- **Handlers** ✅ migrés : [`src/features/tasks/handlers.js`](src/features/tasks/handlers.js) — `window.openTasks`, `window.closeTasks`, `window.toggleTask`, `window.renderTasks`.
- **État** : `shiftHistory[key].techTasks`, `shiftHistory[key].congratsShown`.

### 10. norms

- **Rôle** : 6 catégories de normes de référence (vitaux, GDS, ventilation, biologie, dialyse, urines).
- **index.html** : HTML 8431–8450 · CSS 648–685.
- **Données** ✅ migrées : [`src/features/norms/data.js`](src/features/norms/data.js) — `window.NORMES_REF`.
- **Handlers** ✅ migrés : [`src/features/norms/handlers.js`](src/features/norms/handlers.js) — `window.openNormes`, `window.closeNormes`, `window.setNormesCat`, `window.renderNormes`. Helpers partagés avec respirator : `window.normesGetActiveZone`, `window.normesZoneBarHTML`.
- **État** : `normesCurrentCat` local au module.

### 11. respirator

- **Rôle** : simulateur ventilatoire — 4 modes (PC/VC/VS-AI/VNI), 8 scénarios, waveforms animées.
- **index.html** : HTML ~8700+ · CSS 709–854 · JS 6656–7108.
- **Config** ✅ migrée : [`src/features/respirator/config.js`](src/features/respirator/config.js) (expose `window.RV_SCENARIOS`, `window.RV_CFG`, `window.RV_ZONES`, chargé via `<script src>` ligne 1510).
- **État** : `respiValues`, `respiMode`, `respiScenario`, `_rvAnimId`, `_rvModalParam`, `_rvRepeatTimer`, `_rvSimTime`.
- **Fonctions** : `openNormesRespi`, `closeNormesRespi`, `setRespiMode`, `applyRvScenario`, `openRvModal`, `closeRvModal`, `rvModalSlide`, `updatePhysiology`, `rvDrawScope`, `rvAnimLoop`, `rvGetAnalysis`.
- **Config inline restante** : `BADGE`, `CH` (dans la fonction `renderNormesRespi`).

### 12. planning-ca

- **Rôle** : planning annuel garde/CA/RCV/HS avec drag-drop + soldes.
- **index.html** : HTML 8202–8429 · CSS 490–647 · JS 4857–5261.
- **État** : `planYear`, `planRegime`, `planStates`, `planLockedMonths`, `planSoldes`, `planDrag`.
- **Fonctions** : `openPlanningCA`, `closePlanningCA`, `renderPlanMonth`, `renderPlanCalendrier`, `savePlanData`, `savePlanLocked`, `calcPlanStats`, `updatePlanStats`.
- **Config** : `PLAN_LABELS`.

### 13. conges-calendar

- **Rôle** : simulateur CA (hors saison vs estival, fractionnement, bonus HS/RCV).
- **index.html** : HTML ~4500+ · CSS 432–486 · JS migré.
- **Handlers** ✅ migrés : [`src/features/conges-calendar/handlers.js`](src/features/conges-calendar/handlers.js) — 11 fonctions exposées sur `window` (open/close/render/toggle/set/calc). État `calYear`, `calRegime`, `calSelectedCA`, `calWorkedDJF` local au module.
- **Persistance** : `localStorage` (`pulseunit_cal_ca`, `pulseunit_cal_djf`).

### 14. bourse

- **Rôle** : bourse d'échange de gardes temps réel (Firebase).
- **index.html** : HTML ~5862–5928 · CSS 548–607 · JS migré.
- **Handlers** ✅ migrés : [`src/features/bourse/handlers.js`](src/features/bourse/handlers.js) — 17 fonctions exposées sur `window` (voir [README](src/features/bourse/README.md)).
- **État local au module** : calendriers (`_offCalY/M/Date`, `_wantCalY/M/Date`, `_wantType`, `_wantShift`, `_propReqId`, `_propCalY/M`, `_propDate`).
- **État partagé inline** : `swapRequests` (let ~4046, mutué par listener Firebase `SWAP_DOC.onSnapshot` + tous les handlers d'écriture).

### 15. services

- **Rôle** : annuaire services externes (urgences, SAMU…).
- **Données** ✅ migrées : [`src/features/services/data.js`](src/features/services/data.js) — `window.SERVICES_DATA`.
- **Handlers** ✅ migrés : [`src/features/services/handlers.js`](src/features/services/handlers.js) — `window.openServices`, `window.closeServices`, `window.renderServices`.

### 16. admin

- **Rôle** : panel admin (authentification SHA-256, verrouillage USIP).
- ✅ **JS migré** : [`src/features/admin/handlers.js`](src/features/admin/handlers.js) — chargé **avant** `auth/handlers.js`.
- **index.html** : HTML 996–1087 · JS extrait vers handlers.js.
- **État** (script scope) : `adminSessionActive`, `ADMIN_USER`, `ADMIN_PASS_HASH`.
- **Exposé window** : `openAdmin`, `checkAdmin`, `togglePass`, `updateAdminPanelBtn`, `toggleAdminUsipLock`.
- **Partagé script scope** : `isAdmin`, `setAdminSession`, `verifyAdminCredentials`.
- **Dépendances** : `currentUser` (auth inline), `shiftHistory`, `currentShiftKey`, `initShiftData`, `saveData`, `renderApp` (inline) ; `renderAdminResets`, `renderAdminUsers` (auth/handlers.js).
- La gestion des utilisateurs admin (adminCreateUser, adminDeleteUser, renderAdminUsers, etc.) est dans [`auth/handlers.js`](src/features/auth/handlers.js) (section 1).

### 17. presence

- **Rôle** : heartbeat 60s + affichage utilisateurs connectés.
- **index.html** : JS migré.
- **Handlers** ✅ migrés : [`src/features/presence/handlers.js`](src/features/presence/handlers.js) — `window.setPresence`, `window.startPresenceHeartbeat`, `window.stopPresenceHeartbeat`.
- **Inline restant** : variable `onlineUsers` + listener `PRESENCE_DOC.onSnapshot` (mutés par Firebase, lus par admin).

### 18. search

- **Rôle** : recherche globale dashboard (Services + Lexique + Protocoles).
- **index.html** : HTML 908–912 · JS migré.
- **Handlers** ✅ migrés : [`src/features/search/handlers.js`](src/features/search/handlers.js) — `window.renderGlobalSearch`.
- **Hors périmètre** : `doSearch` + `openModalSpec` restent inline (couplés au roster/bed-grid — recherche soignant).

### 19. sidemenu

- **Rôle** : drawer latéral, navigation principale.
- **index.html** : HTML 916–938 · CSS 215–224.
- **Handlers extraits** → [`src/features/sidemenu/handlers.js`](src/features/sidemenu/handlers.js) (chargé ligne 1516).
- **Fonctions** : `window.openSideMenu`, `window.closeSideMenu`.

### 20. projet

- **Rôle** : vues "Lexique Projet" (rôles, états planning, terminologies) et "Sécurité & Données" (corrections appliquées, données stockées).
- **index.html** : HTML `#lexique-projet-view`, `#securite-view` · CSS inline.
- **Handlers** ✅ migrés : [`src/features/projet/handlers.js`](src/features/projet/handlers.js) — `window.openLexiqueProjet`, `window.openSecurite`, `window.toggleProjetSection`.
- **Dépendances** : `triggerHaptic` (core/helpers.js).

### 21. work-status

- **Rôle** : demande « Travaillez-vous ? » au login, assignation auto selon le planning.
- **index.html** : HTML `#work-status-modal`.
- **Handlers** ✅ migrés : [`src/features/work-status/handlers.js`](src/features/work-status/handlers.js) — `window.checkWorkStatus`, `window.handleWorkChoice`.
- **Persistance** : `localStorage.pu_ws_<shiftKey>_<userId>` (purge 4 j).
- **Dépendances** : `currentUser`, `currentShiftKey`, `shiftHistory`, `planStates`, `isShiftLocked`, `isAdmin`, `initShiftData`, `saveData`, `toggleSelection`, `renderApp`, `showToast`, `getPlanDefaultState`.

### 22. gestures

- **Rôle** : gestes tactiles globaux (drag-to-paint planning + swipe-back).
- **index.html** : listeners globaux, pas de HTML dédié.
- **Handlers** ✅ migrés : [`src/features/gestures/handlers.js`](src/features/gestures/handlers.js) — deux listeners installés à l'import.
- **Dépendances** : `planDrag`, `planLockedMonths`, `planYear`, `cyclePlanDay`, `savePlanData`, `updatePlanStats`, `applyPlanStateDrag`, `getPlanDayState`, `NORMES_REF`, `setNormesCat`, `getNormesCurrentCat`, `closeNormes`, `closeNormesRespi`, `closeProtocoleDetail`, `closeProtocoles`, `closeCalendrierConges`, `closePlanningCA`, `closeTasks`, `closeCalculateurs`, `closeLexique`, `closeCalcModal`, `closeSideMenu`.

---

## Core — helpers transverses

- **[`src/core/helpers.js`](src/core/helpers.js)** ✅ — `window.escapeHTML`, `window.triggerHaptic`, `window.playSound`. Chargé **en premier** (avant toutes les features) pour être disponible partout. Dépend de `appSettings` (init inline anti-FOUC).
- **[`src/core/app-init.js`](src/core/app-init.js)** ✅ — `window.appInit`. Chargé **en dernier**, invoqué inline par `appInit()`. Orchestre : `loadAuth` → Firebase (PULSEUNIT_DOC + PLANS_DOC + SWAP_DOC onSnapshot) → `initDates` → auto-login ou modale d'auth.
- **[`src/core/firebase-init.js`](src/core/firebase-init.js)** ✅ — Bootstrap Firebase. Chargé juste après la CDN Firebase dans `<head>`. Expose `window.db`, `window.PULSEUNIT_DOC`, `window.AUTH_DOC`, `window.RESETS_DOC`, `window.PRESENCE_DOC`, `window.SWAP_DOC`, `window.PLANS_DOC`.
- **[`src/core/constants.js`](src/core/constants.js)** ✅ — Constantes statiques : `window.ICONS` (SVG lits), `window.CONFIG` (structure RÉA+USIP), `window.reaBedsList`. Chargé dans `<head>` avant tous les handlers.

---

## Stratégie de migration (proposition)

Priorité décroissante pour extraire vers `src/features/` sans risque :

1. **Données pures** (LEXIQUE_DATA, PROTOCOLS_DATA, NORMES_REF, RV_CFG, PLAN_LABELS) — gros volume, zéro logique, parfait candidat.
2. **Features isolées** (lexique, norms, calculators, conges-calendar) — peu de dépendances transverses.
3. **Features semi-isolées** (protocols, tasks, services, sidemenu, search).
4. **Features avec état** (settings, auth, presence).
5. **Features critiques / couplées** (shift, beds, checklist, planning-ca, admin) — en dernier, migration prudente.

Chaque étape = 1 PR, dev sur sa branche dédiée, fusion sur `main` (déclenche déploiement Firebase auto).

---

*Dernière mise à jour de la cartographie : 2026-04-18.*
