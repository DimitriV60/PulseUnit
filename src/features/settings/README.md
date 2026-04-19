# settings

Voir [`ANNUAIRE.md`](../../../ANNUAIRE.md#2-settings) (section 2).

## Fichiers de ce dossier

- [`handlers.js`](./handlers.js) — Modale Paramètres (thème, son, haptique). Chargé après `auth/handlers.js`.

## Fonctions exposées sur `window`

`openSettings`, `setTheme`, `updateThemeBtns`, `toggleAppSetting`.

## Resté inline (dans `<head>` d'`index.html`)

Pour éviter tout flash blanc (FOUC) en mode sombre, ces déclarations sont exécutées **avant** le CSS :

- `savedTheme` (localStorage `pulseunit_theme`).
- `getAutoTheme()` — sombre entre 20h et 8h.
- `applyTheme(t)` — applique `data-theme` sur `<html>`.
- `appSettings` (localStorage `pulseunit_settings`, `{ sound, haptic }`).

## Dans `index.html`

- HTML : `#settings-modal`, `#theme-btn-auto`, `#theme-btn-light`, `#theme-btn-dark`, `#setting-sound`, `#setting-haptic`, `#theme-desc-modal`.
- JS : fonctions modales **migrées vers `handlers.js`**.
- `DOMContentLoaded` (inline) : initialise `updateThemeBtns()` + checkboxes.
- Points d'entrée : `onclick="openSettings()"`, `onclick="setTheme('auto'|'light'|'dark')"`, `onchange="toggleAppSetting('sound'|'haptic')"`.

## Changer le PIN utilisateur

La fonction `changeMyPin` (ancien `chg-old/new/conf`) est exposée par `auth/handlers.js` — elle requiert l'ancien code et l'hash SHA-256.

## Persistance

- `localStorage.pulseunit_theme` — `'auto' | 'light' | 'dark'`.
- `localStorage.pulseunit_settings` — `{ sound: bool, haptic: bool }`.
