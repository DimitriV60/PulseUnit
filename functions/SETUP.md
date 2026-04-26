# Cloud Functions PulseUnit — Setup

## Prérequis

1. **Plan Firebase Blaze** (pay-as-you-go) — les Cloud Functions ne tournent pas sur Spark.
   Le tier gratuit Blaze couvre largement l'usage : 2M invocations/mois gratuites.
2. **Compte Anthropic** — créer une clé API sur https://console.anthropic.com/settings/keys
   (compte avec crédit minimum, ~5 € suffit pour tester ; ~0.003 €/scan).

## Installation

```bash
cd functions
npm install
```

## Configuration de la clé API

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
# (colle ta clé sk-ant-... quand prompté)
```

## Déploiement

```bash
firebase deploy --only functions
```

Le déploiement peut prendre 2–5 minutes la première fois (création du Secret,
build, push). Les déploiements suivants prennent ~30s.

## Vérifier que ça marche

```bash
firebase functions:log --only scanPlanning
```

## Mise à jour du workflow GitHub Actions

Pour que les futurs `git push` sur main déploient aussi les Functions,
ajouter dans `.github/workflows/deploy.yml` après le déploiement hosting :

```yaml
- name: Deploy Functions
  run: firebase deploy --only functions --token $FIREBASE_TOKEN
```

## Coût estimatif

| Élément | Coût |
|---|---|
| Invocation Function | gratuit jusqu'à 2M/mois |
| Vision Claude Sonnet 4.6 | ~0.003 € par scan d'un planning A4 |
| Egress | négligeable (réponse JSON < 5 KB) |

100 scans = ~0.30 € — un agent fait son planning 1 fois par mois donc ~30 scans
mensuels pour 30 agents = ~0.10 €/mois.
