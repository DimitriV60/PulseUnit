# PulseUnit — Changelog sessions dev

Auto-généré par git hook post-commit. Lu par `/ingest` pour enrichir `wiki/Context/PulseUnit.md`.

---

## Historique récent (pré-hook)

- `3824e2e` — feat: planning — états calendrier HP, RCV, Frac (régulier + N-1)
- `6425aea` — feat: planning CA — N-1 différencié, RH auto, dates limite
- `31f2048` — refactor: planning CA — UI minimaliste épurée

---

## 2026-04-14 18:13 — `3824e2e`
- **Branch** : HEAD
- **Message** : feat: planning — états calendrier HP, RCV, Frac (régulier + N-1) - 6 nouveaux états : hp, hpn1, rcv, rcvn1, frac, fracn1 (couleurs distinctes) - Cycle de cases étendu avec tous les nouveaux types 
- **Fichiers** : index.html,


## 2026-04-15 10:02 — `8517981`
- **Branch** : main
- **Message** : feat: menu Services — numéros GHPSO format (61) XXXX + 2 nouvelles catégories 
- **Fichiers** : index.html,


## 2026-04-15 10:07 — `f611ab0`
- **Branch** : main
- **Message** : feat: réa — cadre (61)6082, RDG 1862/1822, services de nuit (61)6062 
- **Fichiers** : index.html,


## 2026-04-15 10:09 — `17542b9`
- **Branch** : main
- **Message** : feat: annuaire complet GHPSO — 11 catégories, 60+ entrées, Creil + Senlis 
- **Fichiers** : index.html,


## 2026-04-15 10:10 — `d2e20f0`
- **Branch** : main
- **Message** : fix: annuaire — (61) partout, Creil et Senlis 
- **Fichiers** : index.html,


## 2026-04-15 10:12 — `886ae4c`
- **Branch** : main
- **Message** : fix: Senlis → (21) XXXX, Creil → (61) XXXX 
- **Fichiers** : index.html,


## 2026-04-15 10:16 — `62dfde5`
- **Branch** : main
- **Message** : feat: recherche — barre filtre Services + recherche globale dashboard (Services/Lexique/Protocoles) 
- **Fichiers** : index.html,


## 2026-04-15 13:32 — `402ef4c`
- **Branch** : main
- **Message** : feat: normes — température + référentiel biologie & oxygénothérapie - Température : 8ème paramètre interactif (tile + slider + zones + analyse)   · Zones : hypothermie sévère / normale / subfébrile / fièvre / hyperthermie critique 
- **Fichiers** : index.html,


## 2026-04-15 13:35 — `c4b4206`
- **Branch** : main
- **Message** : feat: normes — Oxygénothérapie, Bactériologie, VNI/Optiflow depuis wiki Depuis wiki/Intelligence/Normes Réanimation.md : - Ventilation : +2 nouveaux groupes 
- **Fichiers** : index.html,


## 2026-04-26 18:08 — `801600f`
- **Branch** : main
- **Message** : fix(bed-notes): scope les notes par date du shift Bug : les notes apparaissaient sur les jours antérieurs à leur création, car la clé slot_X:bedId ne contenait pas de date. Le rond ● sur les 
- **Fichiers** : src/features/bed-notes/handlers.js,src/features/beds/handlers.js,


## 2026-04-26 18:13 — `40812a5`
- **Branch** : main
- **Message** : fix(bed-notes): continuité forward — notes visibles à partir de leur date de création Suite : le commit précédent (801600f) scopait strictement par date du shift, ce qui supprimait la continuité de garde — une note prise hier n'apparaissait 
- **Fichiers** : src/features/bed-notes/handlers.js,


## 2026-04-26 18:21 — `767df17`
- **Branch** : main
- **Message** : feat(bed-notes): refonte avec grille de surveillance horaire Refonte du modal des notes de lit pour intégrer une grille de surveillance horaire structurée, en complément du champ d'observations libres. 
- **Fichiers** : index.html,src/features/bed-notes/handlers.js,src/features/lexique/data.js,

