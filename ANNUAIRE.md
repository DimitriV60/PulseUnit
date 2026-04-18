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
| 5 | [checklist](#5-checklist) | `features/checklist/` | 1155–1175 | 341–379 | 4080–4167 |
| 6 | [lexique](#6-lexique) | `features/lexique/` | 1177–1193 | 234–255 | 2744–2804 + data 1783–8509 |
| 7 | [calculators](#7-calculators) | `features/calculators/` | 1195–1222 | 256–328 | 2814–3349 |
| 8 | [protocols](#8-protocols) | `features/protocols/` | 8090–8120 | 398–430 | 4467–4839 |
| 9 | [tasks](#9-tasks) | `features/tasks/` | 1224–1243 | 264–277 | 2860–2948 |
| 10 | [norms](#10-norms) | `features/norms/` | 8431–8450 | 648–685 | 6107–6604 |
| 11 | [respirator](#11-respirator) | `features/respirator/` | ~8700+ | 709–854 | 6656–7108 |
| 12 | [planning-ca](#12-planning-ca) | `features/planning-ca/` | 8202–8429 | 490–647 | 4857–5261 |
| 13 | [conges-calendar](#13-conges-calendar) | `features/conges-calendar/` | 8123–8199 | 432–486 | 5343–5750 |
| 14 | [swap-shifts](#14-swap-shifts) | `features/swap-shifts/` | 8930–8986 | 548–607 | 6146–6549 |
| 15 | [services](#15-services) | `features/services/` | inline | — | 4620–4680 |
| 16 | [admin](#16-admin) | `features/admin/` | 996–1087 | — | 1603–1720, 7582–7891 |
| 17 | [presence](#17-presence) | `features/presence/` | — | — | 7125–7167 |
| 18 | [search](#18-search) | `features/search/` | 908–912 | — | 3545–3680 |
| 19 | [sidemenu](#19-sidemenu) | `features/sidemenu/` | 916–938 | 215–224 | 2720–2744 |

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
| Données lexique (embedded) | 1783–8509 | `LEXIQUE_DATA` (~7000 lignes, ~260 termes) |

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

- **Rôle** : connexion, inscription, reset PIN, sessions admin.
- **index.html** : HTML 8851–8927 · CSS 282–322 · JS 7111–7455.
- **État** : `currentUser`, `authUsers`, `resetRequests`, `adminSessionActive`, `selectedRole`.
- **Fonctions** : `registerUser`, `loginUser`, `loginAdminFromAuth`, `changeTempPin`, `logoutUser`, `selectRole`, `filterAuthUsers`, `selectAuthUser`, `clearSelectedAuthUser`, `sendResetRequest`, `verifyAdminCredentials`.
- **Dépendances** : Firebase AUTH_DOC/RESETS_DOC, SHA-256, localStorage/sessionStorage.

### 2. settings

- **Rôle** : thème (auto/light/dark), son, haptic, changement PIN.
- **index.html** : HTML 940–994 · CSS 36–82, 381–397 · JS 18–34, 1551–1596.
- **État** : `savedTheme`, `appSettings`.
- **Fonctions** : `applyTheme`, `setTheme`, `updateThemeBtns`, `toggleAppSetting`, `getAutoTheme`, `changeMyPin`.

### 3. shift

- **Rôle** : garde courante (jour/nuit), allocation soignants → lits, sérialisation.
- **index.html** : HTML 895–914, 1245–1254 · CSS 85–152 · JS 3349–3760.
- **État** : `currentShiftKey`, `shiftHistory`, `roster`, `selectedStaffForTap`.
- **Fonctions** : `initShiftData`, `saveData`, `initDates`, `renderApp`, `toggleSelection`, `clearSelection`, `canEditBeds`, `isShiftLocked`.

### 4. beds

- **Rôle** : grille principale (RÉA + USIP), affectations IDE/AS/MED/TECH, marqueurs BMR/dialyse/critique.
- **index.html** : HTML 1245–1248 · CSS 131–209 · JS 3760–4046.
- **État** : `selectedStaffForTap`, `shiftHistory[key].assignments`.
- **Fonctions** : `assignLit`, `toggleLit`, `getAllBedIds`, `renderApp`.
- **Config** : `CONFIG` (structure 2 secteurs).

### 5. checklist

- **Rôle** : 10 items de vérification par chambre, traçabilité par garde.
- **index.html** : HTML 1155–1175 · CSS 341–379 · JS 4080–4167.
- **État** : `currentChecklistBed`, `shiftHistory[key].checklistData`.
- **Fonctions** : `openChecklist`, `closeChecklist`, `selectChecklistBed`, `toggleChecklistItem`, `renderChecklistView`, `checklistDoneCount`, `getChecklistForBed`.

### 6. lexique

- **Rôle** : 260+ termes médicaux, 13 catégories, recherche + filtrage.
- **index.html** : HTML 1177–1193 · CSS 234–255 · JS 2744–2804 · **données 1783–8509** (LEXIQUE_DATA).
- **État** : `currentLexiqueFilter`.
- **Fonctions** : `openLexique`, `closeLexique`, `setLexiqueFilter`, `toggleLexCard`, `renderLexique`.
- **Extractible** : `LEXIQUE_DATA` → `src/features/lexique/data.js` (priorité 1 pour migration car gros bloc isolé).

### 7. calculators

- **Rôle** : 15 calculateurs (IBW, PAM, P/F, ΔP, PSE, glycémie…).
- **index.html** : HTML 1195–1222 · CSS 256–328 · JS 2814–3349.
- **État** : aucun (calcul pur).
- **Fonctions** : `openCalculateurs`, `closeCalculateurs`, `renderCalculateurs`, `openCalcModal`, `closeCalcModal`, `execCalcLive`, `execCalc`.

### 8. protocols

- **Rôle** : protocoles lecture seule, accordéon par sections.
- **index.html** : HTML 8090–8120 · CSS 398–430 · JS 4467–4839.
- **État** : `currentProtoId`, `PROTOCOLS_DATA`.
- **Fonctions** : `openProtocoles`, `closeProtocoles`, `renderProtoList`, `openProtocoleDetail`, `closeProtocoleDetail`, `renderProtoDetail`, `toggleProtoSection`.

### 9. tasks

- **Rôle** : tâches IDE tech quotidiennes (jour/nuit), cochage, traçabilité.
- **index.html** : HTML 1224–1243 · CSS 264–277 · JS 2860–2948.
- **État** : `shiftHistory[key].techTasks`.
- **Fonctions** : `openTasks`, `closeTasks`, `toggleTask`, `renderTasks`.

### 10. norms

- **Rôle** : 6 catégories de normes de référence (vitaux, GDS, ventilation, biologie, dialyse, urines).
- **index.html** : HTML 8431–8450 · CSS 648–685 · JS 6107–6604.
- **État** : `normesCurrentCat`, `NORMES_REF`.
- **Fonctions** : `openNormes`, `closeNormes`, `renderNormes`, `setNormesCat`, `normesGetActiveZone`, `normesZoneBarHTML`.

### 11. respirator

- **Rôle** : simulateur ventilatoire — 4 modes (PC/VC/VS-AI/VNI), 8 scénarios, waveforms animées.
- **index.html** : HTML ~8700+ · CSS 709–854 · JS 6656–7108.
- **État** : `respiValues`, `respiMode`, `respiScenario`, `_rvAnimId`, `_rvModalParam`, `_rvRepeatTimer`, `_rvSimTime`.
- **Fonctions** : `openNormesRespi`, `closeNormesRespi`, `setRespiMode`, `applyRvScenario`, `openRvModal`, `closeRvModal`, `rvModalSlide`, `updatePhysiology`, `rvDrawScope`, `rvAnimLoop`, `rvGetAnalysis`.
- **Config** : `RV_CFG`, `RV_ZONES`, `RV_SCENARIOS`, `BADGE`, `CH`.

### 12. planning-ca

- **Rôle** : planning annuel garde/CA/RCV/HS avec drag-drop + soldes.
- **index.html** : HTML 8202–8429 · CSS 490–647 · JS 4857–5261.
- **État** : `planYear`, `planRegime`, `planStates`, `planLockedMonths`, `planSoldes`, `planDrag`.
- **Fonctions** : `openPlanningCA`, `closePlanningCA`, `renderPlanMonth`, `renderPlanCalendrier`, `savePlanData`, `savePlanLocked`, `calcPlanStats`, `updatePlanStats`.
- **Config** : `PLAN_LABELS`.

### 13. conges-calendar

- **Rôle** : simulateur CA (hors saison vs estival, fractionnement, bonus HS/RCV).
- **index.html** : HTML 8123–8199 · CSS 432–486 · JS 5343–5750.
- **État** : `calYear`, `calRegime`, `calSelectedCA`, `calWorkedDJF`.
- **Fonctions** : `openCalendrierConges`, `closeCalendrierConges`, `renderCalendrier`, `renderCalMonth`, `toggleCADay`, `toggleDJFDay`, `calcCongesStats`, `setCalRegime`, `getJoursFeries`.

### 14. swap-shifts

- **Rôle** : bourse d'échange de gardes temps réel (Firebase).
- **index.html** : HTML 8930–8986 · CSS 548–607 · JS 6146–6549.
- **État** : `swapRequests`, `_offDate`, `_wantType`, `_wantDate`, `_wantShift`, `_propReqId`.
- **Fonctions** : `openBourse`, `closeBourse`, `renderBourseList`, `openBourseCreate`, `submitSwapRequest`, `renderOfferedCal`, `renderWantedCal`, `submitPropose`.

### 15. services

- **Rôle** : annuaire services externes (urgences, SAMU…).
- **index.html** : JS 4620–4680.
- **Fonctions** : `openServices`, `closeServices`, `renderServices`.
- **Config** : `CONFIG.contacts`.

### 16. admin

- **Rôle** : panel admin (comptes, reset PIN, verrouillage USIP).
- **index.html** : HTML 996–1087 · JS 1603–1720, 7582–7891.
- **État** : `adminSessionActive`, `authUsers`, `resetRequests`, `onlineUsers`, `_adminNewRole`.
- **Fonctions** : `openAdmin`, `checkAdmin`, `setAdminSession`, `toggleAdminUsipLock`, `renderAdminResets`, `renderAdminUsers`, `adminSelectNewRole`.

### 17. presence

- **Rôle** : heartbeat 60s + affichage utilisateurs connectés.
- **index.html** : JS 7125–7167.
- **État** : `onlineUsers`.
- **Fonctions** : `startPresenceHeartbeat`, `stopPresenceHeartbeat`, `setPresence`.

### 18. search

- **Rôle** : recherche globale multi-source (lexique + protocoles + services).
- **index.html** : HTML 908–912 · JS 3545–3680.
- **Fonctions** : `renderGlobalSearch`, `doSearch`, `openModalSpec`.

### 19. sidemenu

- **Rôle** : drawer latéral, navigation principale.
- **index.html** : HTML 916–938 · CSS 215–224 · JS 2720–2744.
- **Fonctions** : `openSideMenu`, `closeSideMenu`.

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
