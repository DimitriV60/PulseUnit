# `src/` — Architecture feature-based (en construction)

> Voir [`ANNUAIRE.md`](../ANNUAIRE.md) à la racine pour l'index complet des features.

## Organisation

```
src/
├── core/          → Code transverse (store, utils, firebase)
├── features/      → 1 dossier par feature fonctionnelle (19 au total)
└── styles/        → CSS modulaire (à extraire depuis index.html)
```

## État de la migration

La grosse majorité du code vit encore dans `index.html` (déployé en prod via Firebase Hosting). `src/` contient :

- `core/store.js` — store global pub/sub, exposé aussi en `window.PulseStore` pour la transition.
- `core/utils.js` — helpers (escape, hash SHA-256, debounce, shiftKey).
- `core/firebase.js` — références documents Firestore (init encore dans index.html).
- `features/<nom>/README.md` — fiche de chaque feature avec plages de lignes dans `index.html`.

## Workflow

1. Avant toute modif : lire [`ANNUAIRE.md`](../ANNUAIRE.md) pour trouver la feature.
2. Ouvrir `src/features/<nom>/README.md` pour le détail fonctions/état.
3. Modifier `index.html` aux lignes indiquées.
4. Quand une feature est migrée, créer `handlers.js` / `components.js` / `data.js` dans son dossier et mettre à jour le README.

## Ordre de migration recommandé

1. Données pures (LEXIQUE_DATA, PROTOCOLS_DATA, NORMES_REF).
2. Features isolées (lexique, norms, calculators, conges-calendar).
3. Features semi-isolées (protocols, tasks, services, sidemenu, search).
4. Features avec état (settings, auth, presence).
5. Features critiques (shift, beds, checklist, planning-ca, admin).
