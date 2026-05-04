# PulseUnit — Règles Claude

## Déploiement des changements

**OBLIGATOIRE** : Chaque modification apportée à `index.html` (ou tout autre fichier du projet) doit être commitée et poussée sur **les deux branches simultanément** :
- `main`
- `claude/pulseunit-investigation-lbPR8`

Ne jamais laisser un changement sur une seule branche. Après chaque commit sur la branche de développement, faire immédiatement un `git push` sur `main` également.

## Déploiement automatique Firebase

**Chaque push sur `main` déclenche automatiquement un déploiement** via GitHub Actions (`.github/workflows/deploy.yml`).

- URL de production : `https://pulseunit-c9c5c.web.app`
- Le déploiement prend ~1 minute après le push
- Token CI stocké dans le secret GitHub `FIREBASE_TOKEN` (compte julia.tablette60@gmail.com)
- **Aucune action manuelle requise** — ne jamais demander à l'utilisateur de faire `firebase deploy`

## Langue & Style de réponse

- **Toujours répondre en français**, sans exception.
- **Réponses courtes** : pas de détail exhaustif sur ce qui a été fait. Un message de synthèse à la fin suffit.
- **Toujours proposer les meilleures options** disponibles (librairies, patterns, UX) avant d'implémenter.

## Coût des solutions proposées

**Toujours présenter les options gratuites en premier**, puis comparer avec les alternatives payantes (si pertinentes). Pour chaque techno / service / API évoqué :
1. Citer **d'abord** la solution gratuite (Firebase Spark, Web Speech API, librairies open-source, etc.).
2. **Ensuite** seulement, mentionner les options payantes en précisant le tarif et le bénéfice par rapport au gratuit.
3. Si le gratuit suffit pour le besoin, le dire explicitement et ne pas pousser le payant.

## Modifications visuelles — accord obligatoire

**INTERDIT** : Aucune modification visuelle (layout, taille, position, couleur, espacement, structure HTML d'un composant existant) sans accord explicite de Dimitri au préalable.

Si une demande implique une modification visuelle non explicitement demandée :
1. **Décrire** ce qui va changer visuellement avant d'agir.
2. **Attendre l'accord** explicite (« ok », « vas-y », « valide »).
3. Ne **jamais** réorganiser, redimensionner ou re-styler un élément existant pour « optimiser » sans demande.

S'applique en particulier à : cartes lit, carte IDE TECH, cartes médecins, barres de progression, pills d'effectif, header, sidemenu, modales.

## Maintenance du Guide et du Lexique in-app

À chaque **nouvelle fonctionnalité ou changement important** dans PulseUnit, mettre à jour :
1. Le **Guide** intégré (section tuto/aide dans `index.html`)
2. Le **Lexique** intégré si un terme ou concept nouveau est introduit
