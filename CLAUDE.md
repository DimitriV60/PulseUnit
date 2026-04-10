# PulseUnit — Règles Claude

## Déploiement des changements

**OBLIGATOIRE** : Chaque modification apportée à `index.html` (ou tout autre fichier du projet) doit être commitée et poussée sur **les deux branches simultanément** :
- `main`
- `claude/pulseunit-investigation-lbPR8`

Ne jamais laisser un changement sur une seule branche. Après chaque commit sur la branche de développement, faire immédiatement un `git push` sur `main` également.

## Langue & Style de réponse

- **Toujours répondre en français**, sans exception.
- **Réponses courtes** : pas de détail exhaustif sur ce qui a été fait. Un message de synthèse à la fin suffit.
- **Toujours proposer les meilleures options** disponibles (librairies, patterns, UX) avant d'implémenter.

## Maintenance du Guide et du Lexique in-app

À chaque **nouvelle fonctionnalité ou changement important** dans PulseUnit, mettre à jour :
1. Le **Guide** intégré (section tuto/aide dans `index.html`)
2. Le **Lexique** intégré si un terme ou concept nouveau est introduit
