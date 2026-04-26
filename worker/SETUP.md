# Cloudflare Worker — Scan Planning PulseUnit

Proxy 100% gratuit entre PulseUnit et l'API Google Gemini Flash 2.0 vision.
Aucune carte bancaire, aucun engagement.

## Prérequis (gratuits)

1. **Compte Cloudflare** — https://dash.cloudflare.com/sign-up (free, pas de carte)
2. **Clé API Google Gemini** — https://aistudio.google.com/apikey (free, pas de carte, login Google)

## Installation

```bash
cd worker
npm install
npx wrangler login    # ouvre le navigateur pour authentifier Cloudflare
```

## Configuration de la clé Gemini

```bash
npx wrangler secret put GEMINI_API_KEY
# (colle ta clé AIzaSy... quand prompté)
```

## Déploiement

```bash
npx wrangler deploy
```

À la fin du déploiement, Wrangler affiche l'URL du Worker, par exemple :
```
https://pulseunit-scan.<ton-compte>.workers.dev
```

**Copie cette URL** : tu dois la coller dans `src/features/planning-ca/handlers.js`,
constante `SCAN_WORKER_URL` au début du fichier.

## Vérification

Logs en direct (utile pendant un scan test) :
```bash
npx wrangler tail
```

## Quotas free (largement suffisants)

| Composant | Quota gratuit | Usage estimé 100 agents |
|---|---|---|
| Cloudflare Workers | 100 000 req/jour | <100 req/mois |
| Gemini Flash 2.0 | 1 500 req/jour, 15 RPM | <100 req/mois |

Le Worker absorbe les pics de simultanéité (15 RPM Gemini) avec un retry
exponentiel + jitter (1.5s, 3s, 6s + 0-2s aléatoire). 100 personnes
scannant dans la même minute → tous servis en ~7 minutes max.

## Sécurité

- Clé API stockée en Cloudflare Worker secret (jamais exposée côté client)
- Origin allowlist : seules les requêtes venant de `pulseunit-c9c5c.web.app`
  (et localhost dev) sont acceptées
- Auth Firebase : présente côté client mais non vérifiée par le Worker
  (le coût de la fraude reste = quota gratuit Gemini, donc à 0€)
