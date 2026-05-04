/**
 * Cloudflare Worker — PulseUnit (Scan Digihops + Auth Firebase Custom Token).
 *
 * Endpoints :
 *   - POST /                                       (legacy, alias de /scan)
 *   - POST /scan       { imageBase64, year, month, kind?: 'planning' | 'debit-credit' }
 *   - POST /login      { userId, pin }             → Custom Token Firebase (uid=userId)
 *   - POST /admin-login { user, pass }             → Custom Token (uid='admin_view', claim admin:true)
 *
 * Réponses scan :
 *   - planning      : { found, states, labels, count, dropped, promotedToRcn }
 *   - debit-credit  : { found, year, months: { 1:{dc, cumul, rtt}, ... }, dropped }
 *
 * Modèle Vision : Mistral Pixtral Large via api.mistral.ai (free tier, EU friendly).
 * Auth Firebase : Service Account JSON signe un Custom Token RS256 via Web Crypto.
 *
 * Secrets Cloudflare (npx wrangler secret put XXX) :
 *   - MISTRAL_API_KEY   : clé API Mistral (obligatoire pour /scan)
 *   - FIREBASE_SA_KEY   : JSON complet du service account (obligatoire pour /login,
 *                         /admin-login). Si absent, ces endpoints renvoient 503 et
 *                         le client doit fallback sur signInAnonymously.
 *
 * Sécurité hardening (audit 2026-04-30) :
 *   - P1.8 validation stricte year (2020-2050), month (1-12), kind whitelist
 *   - P1.7 rate limit en mémoire (sliding window 60s, 30 req max par origin+ip)
 *   - P1.4 endpoint /login signe Firebase Custom Token avec uid réel (pas anonyme)
 *   - P1.6 endpoint /admin-login attache claim {admin:true} pour Firestore Rules
 */

const ALLOWED_ORIGINS = [
  'https://pulseunit-c9c5c.web.app',
  'https://pulseunit-c9c5c.firebaseapp.com',
  'http://localhost:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5000'
];

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/pulseunit-c9c5c--[\w-]+\.web\.app$/i,
  /^https:\/\/[\w-]*pulseunit[\w-]*\.(web\.app|firebaseapp\.com)$/i
];

function _isOriginAllowed(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some(re => re.test(origin));
}

const VALID_STATES = [
  'jour', 'nuit', 'ca', 'can1', 'ca_hp', 'ca_hpn1', 'rcn', 'rh', 'hs', 'hs_j', 'hs_n', 'rc',
  'formation', 'ferie', 'maladie', 'hp', 'hpn1', 'rcv', 'rcvn1', 'frac', 'fracn1', 'travail'
];

const SYSTEM_PROMPT_PLANNING = `Tu extrais le planning personnel d'un agent hospitalier (réa GHPSO Creil) depuis une capture Digihops mobile.

L'image montre LE planning de l'utilisateur connecté (calendrier mensuel ou liste). Aucun nom à matcher.

RÈGLE CRITIQUE — balayage systématique :
Pour CHAQUE jour numéroté visible dans le calendrier (du 1 au 28/30/31), examine la cellule sous le numéro. Si elle contient un texte ou un horaire, ajoute une entrée. N'omets aucun jour. Les cellules vides ne sont pas ajoutées, mais doivent être vérifiées une à une.

RÈGLE NUMÉROTATION (TRÈS IMPORTANTE — lecture sur 2 lignes) :
Sur Digihops mobile, les CA sont écrits sur DEUX LIGNES dans la cellule :
- Ligne 1 : le code (CA, CA-HP, HP, HS, RCV, FR…)
- Ligne 2 : le numéro de séquence (1, 2, 3 … 25, 26 …)
Tu DOIS lire ces deux lignes et les concaténer avec un espace dans le label.
Exemples sur 2 lignes :
  CA          CA          CA-HP        HP
  22          25          3            7
→ labels = "CA 22", "CA 25", "CA-HP 3", "HP 7" — JAMAIS juste "CA" sans le numéro.

Le numéro est TOUJOURS visible juste en dessous du code (parfois en rouge ou plus petit). Ne JAMAIS l'omettre.

Mapping état (ignore le numéro pour le state, garde-le pour le label) :
- "CA N" (espace + chiffre, ex CA 22) → state=ca, label="CA 22"
- "CA-HP N" → state=ca_hp, label="CA-HP N"
- TIRET + 1 sans espace = compteur N-1 explicite : "CA-1" → can1, "CA-HP-1" → ca_hpn1, "HP-1" → hpn1

Mapping codes → état JSON :
- "20:00 / 08:00" (cellule rose saumon) → nuit
- "08:00 / 20:00" (cellule rose saumon) → jour
- R.C. ou RC → rc
- R.H. ou RH → rh
- RCN (avec ou sans suffixe _16_/_N_) → rcn
- CA, CA 1, CA 2, CA 3... → ca
- CA-1 ou CAN1 → can1
- CA-HP, CAHP, CA-HP 1, CA-HP 2... → ca_hp
- CA-HP-1 ou CA-HPN1 → ca_hpn1
- HP, HP 1, HP 2... → hp
- HP-1 ou HPN1 → hpn1
- HS, HS 1, HS 2... → hs
- HSJ → hs_j
- HSN → hs_n
- RCV, RCV 1, RCV 2... → rcv
- RCV-1 ou RCVN1 → rcvn1
- FR, FRAC, FR 1, FR 2... → frac
- FR-1 ou FRN1 → fracn1
- FO ou FORM → formation
- AM ou MAL → maladie
- JF ou FERIÉ → ferie
- vide ou — → ne pas inclure

Réponds UNIQUEMENT avec un JSON strict de cette forme :
{
  "found": true,
  "states": { "YYYY-MM-DD": "ca_hp", ... },
  "labels": { "YYYY-MM-DD": "CA-HP 1", ... }
}

Le champ "labels" est OBLIGATOIRE pour TOUS les codes "comptables" : CA, CA-1, CA-HP, CA-HP-1, HP, HP-1, RCV, RCV-1, HS, FR, FR-1. À chaque fois qu'un de ces codes apparaît dans states, tu DOIS ajouter une entrée labels[date] avec le texte EXACT lu sur le planning (incluant le numéro de séquence si visible). Pour les autres états (jour, nuit, rh, rc, rcn, ferie, etc.), N'AJOUTE PAS d'entrée dans "labels".

Exemples (NE JAMAIS OMETTRE le label si présent dans l'image) :
- Cellule "CA 5" → states[date]="ca", labels[date]="CA 5"  ✓
- Cellule "CA 22" → states[date]="ca", labels[date]="CA 22"  ✓ (le numéro est CRITIQUE)
- Cellule "CA-HP 2" → states[date]="ca_hp", labels[date]="CA-HP 2"  ✓
- Cellule "HP-1 3" → states[date]="hpn1", labels[date]="HP-1 3"  ✓
- Cellule "20:00 / 08:00" → states[date]="nuit" (PAS d'entrée labels)
- Cellule "R.C." → states[date]="rc" (PAS d'entrée labels)
- Cellule "R.H." → states[date]="rh" (PAS d'entrée labels — JAMAIS confondre R.H. avec une nuit)
- Cellule "JF" ou "J.F." → states[date]="ferie" (PAS d'entrée labels)

Si la photo est illisible ou ne contient aucune information de planning exploitable :
{ "found": false, "reason": "Image non exploitable comme planning" }

Aucune autre clé, aucun texte hors JSON.`;

const SYSTEM_PROMPT_DEBIT_CREDIT = `Tu extrais le tableau "Débit et crédit" annuel d'un agent hospitalier (GHPSO) depuis une capture Digihops mobile.

L'image montre une page intitulée "Débit et crédit" avec :
- Un sélecteur d'année en haut (ex. "Année 2026")
- Un tableau à 4 colonnes : "Mois" | "Débit/crédit" | "Cumul Débit/crédit" | "Cumul Reste RTT"
- 12 lignes (Janvier → Décembre), une par mois

Format des valeurs horaires :
- "03h45" = 3 heures 45 minutes (crédit)
- "-02h30" = -2 heures 30 minutes (débit)
- "00h00" = zéro
- Le signe "-" est CRITIQUE — un débit affiché "−02h30" ou "-02h30" doit conserver le signe négatif.
- Tous les nombres sont à 2 chiffres : "03h45" pas "3h45", "-17h39" pas "-17:39".
- Les minutes sont sur 2 chiffres : "03h05", "00h09".

RÈGLE CRITIQUE — extraction exhaustive :
- Tous les 12 mois doivent être présents si lisibles. Si certains sont sous le pli/tronqués, retourne uniquement ceux que tu vois clairement, n'invente JAMAIS.
- Le cumul de chaque mois est PROPRE à ce mois (pas une somme à recalculer côté serveur).
- "Cumul Reste RTT" est souvent à "00h00" — c'est OK, conserver tel quel.

Mapping mois → numéro :
Janvier=1, Février=2, Mars=3, Avril=4, Mai=5, Juin=6, Juillet=7, Août=8, Septembre=9, Octobre=10, Novembre=11, Décembre=12.

Réponds UNIQUEMENT avec un JSON strict :
{
  "found": true,
  "year": 2026,
  "months": {
    "1": { "dc": "03h45", "cumul": "-17h39", "rtt": "00h00" },
    "2": { "dc": "-02h30", "cumul": "-20h09", "rtt": "00h00" },
    ...
  }
}

Si la photo n'est pas un tableau Débit/crédit Digihops :
{ "found": false, "reason": "Image non exploitable comme tableau Débit/crédit" }

Aucune autre clé, aucun texte hors JSON. Format strict HHhMM (signe optionnel) — ne convertis PAS en décimal.`;

function corsHeaders(origin) {
  const allowed = _isOriginAllowed(origin) ? origin : 'null';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

// ── Rate limit (P1.7) ───────────────────────────────────────────────────────
// Sliding window in-memory par isolate Worker. Pas KV (free tier économisé).
// Reset chaque restart d'isolate (~quelques minutes d'inactivité). Effet : 30
// requêtes max sur une fenêtre 60s par (origin + endpoint + ip approximée via
// CF-Connecting-IP). Suffisant pour bloquer un script qui spam, sans pénaliser
// l'usage normal (1 scan = ~quelques requêtes).
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const _rateLimitBuckets = new Map(); // key → number[] (timestamps)

function _rateLimitCheck(key) {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  let arr = _rateLimitBuckets.get(key);
  if (!arr) { arr = []; _rateLimitBuckets.set(key, arr); }
  // purge anciens
  while (arr.length && arr[0] < cutoff) arr.shift();
  if (arr.length >= RATE_LIMIT_MAX) return false;
  arr.push(now);
  // GC : empêche la Map de gonfler à l'infini
  if (_rateLimitBuckets.size > 1000) {
    for (const [k, v] of _rateLimitBuckets) {
      while (v.length && v[0] < cutoff) v.shift();
      if (v.length === 0) _rateLimitBuckets.delete(k);
    }
  }
  return true;
}

// ── Validation entrées scan (P1.8) ──────────────────────────────────────────
const VALID_KINDS = new Set(['planning', 'debit-credit']);

function _validateScanParams(body) {
  const { kind, year, month, imageBase64 } = body || {};
  if (kind !== undefined && !VALID_KINDS.has(kind)) return 'invalid_kind';
  if (!imageBase64 || typeof imageBase64 !== 'string') return 'missing_image';
  if (imageBase64.length > 7_000_000) return 'image_too_large';
  const y = parseInt(year, 10);
  if (!(y >= 2020 && y <= 2050)) return 'invalid_year';
  if (kind !== 'debit-credit') {
    const m = parseInt(month, 10);
    if (!(m >= 1 && m <= 12)) return 'invalid_month';
  }
  return null;
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin) }
  });
}

async function callVisionAI({ env, systemPrompt, userPrompt, imageBase64 }) {
  if (!env.MISTRAL_API_KEY) {
    return { error: 'config_missing', message: 'Secret MISTRAL_API_KEY non configuré' };
  }

  const dataUrl = `data:image/jpeg;base64,${imageBase64}`;

  let resp, json;
  try {
    resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: 'pixtral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: dataUrl }
          ]}
        ],
        max_tokens: 4096,
        temperature: 0.0,
        response_format: { type: 'json_object' }
      })
    });
  } catch (e) {
    const msg = String(e && e.message || e);
    console.error('[mistral_fetch_error]', msg);
    return { error: 'mistral_fetch_error', message: msg };
  }

  const bodyText = await resp.text();
  if (!resp.ok) {
    console.error('[mistral_http_error]', resp.status, bodyText.slice(0, 500));
    return { error: 'mistral_http_error', message: `HTTP ${resp.status}`, body: bodyText.slice(0, 500) };
  }

  try { json = JSON.parse(bodyText); }
  catch (e) {
    console.error('[mistral_invalid_json]', bodyText.slice(0, 300));
    return { error: 'mistral_invalid_json', body: bodyText.slice(0, 500) };
  }

  const text = json?.choices?.[0]?.message?.content || '';
  // P1.7 — n'pas logguer le contenu (planning personnel) en clair, juste l'usage
  console.log('[ai_ok]', `usage=${JSON.stringify(json.usage || {})}`, '| text_len=', text.length);
  if (!text) {
    return { error: 'empty_response', body: JSON.stringify(json).slice(0, 400) };
  }
  return { text };
}

// ── Handlers par mode ───────────────────────────────────────────────────────

async function handlePlanning({ env, body, origin }) {
  const { imageBase64, year, month } = body;

  const userPrompt = `Mois cible IMPÉRATIF : ${String(month).padStart(2,'0')}/${year}. Toutes les dates retournées DOIVENT être au format ${year}-${String(month).padStart(2,'0')}-DD (uniquement ce mois). Ignore les jours grisés du mois précédent ou suivant qui peuvent apparaître en marge du calendrier Digihops.

ATTENTION SPÉCIALE — première et dernière semaine du calendrier :
Le calendrier Digihops affiche aussi les derniers jours du mois précédent (en gris, en haut à gauche) et les premiers du mois suivant (en gris, en bas à droite). Ces cellules grisées NE DOIVENT PAS être attribuées au mois cible. Le 1er du mois cible est la PREMIÈRE cellule en numéros NOIR ou ROUGE (rouge = dimanche/férié) du calendrier. Ne confonds JAMAIS le 1er du mois cible avec une cellule grisée du mois précédent qui aurait un horaire 20:00/08:00.

Si le 1er du mois est un dimanche/jour férié, il sera typiquement un R.H., R.C. ou JF (PAS une nuit). Vérifie attentivement.

Extrais tous les jours du mois cible visibles avec leur état. Retourne le JSON strict (et rien d'autre).`;

  const result = await callVisionAI({
    env,
    systemPrompt: SYSTEM_PROMPT_PLANNING,
    userPrompt,
    imageBase64
  });

  if (result.error) {
    return jsonResponse({
      error: result.error,
      message: result.message || 'Service Vision indisponible',
      body: result.body
    }, 502, origin);
  }

  let parsed;
  try {
    const txt = String(result.text).trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    parsed = JSON.parse(txt);
  } catch (e) {
    return jsonResponse({ error: 'unparsable_response', raw: String(result.text).slice(0, 400) }, 502, origin);
  }

  if (!parsed.found) {
    return jsonResponse({ found: false, reason: parsed.reason || 'Ligne non identifiée' }, 200, origin);
  }

  const cleanStates = {};
  const cleanLabels = {};
  let dropped = 0;
  const targetPrefix = (year && month) ? `${year}-${String(month).padStart(2,'0')}-` : null;
  for (const [date, state] of Object.entries(parsed.states || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { dropped++; continue; }
    if (!VALID_STATES.includes(state)) { dropped++; continue; }
    if (targetPrefix && !date.startsWith(targetPrefix)) { dropped++; continue; }
    cleanStates[date] = state;
  }
  const COUNTABLE_STATES = new Set(['ca', 'can1', 'ca_hp', 'ca_hpn1', 'hp', 'hpn1', 'rcv', 'rcvn1', 'hs', 'hs_j', 'hs_n', 'frac', 'fracn1']);
  for (const [date, label] of Object.entries(parsed.labels || {})) {
    if (!cleanStates[date]) continue;
    if (!COUNTABLE_STATES.has(cleanStates[date])) continue;
    if (typeof label !== 'string') continue;
    cleanLabels[date] = label.trim().slice(0, 16);
  }

  // Règle Digihops/FPH : un CA labellisé ≥25 et tombant avant le 31/03 est
  // un reliquat N-1 (les CA recommencent à 1 sur la nouvelle année).
  // → ca → can1, ca_hp → ca_hpn1.
  let promotedToN1 = 0;
  for (const [date, st] of Object.entries(cleanStates)) {
    if (st !== 'ca' && st !== 'ca_hp') continue;
    const month = parseInt(date.slice(5, 7), 10);
    if (!month || month > 3) continue;
    const lbl = cleanLabels[date];
    if (!lbl) continue;
    const m = lbl.match(/(\d+)\s*$/);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (!Number.isFinite(n) || n < 25) continue;
    cleanStates[date] = (st === 'ca') ? 'can1' : 'ca_hpn1';
    promotedToN1++;
  }

  let promotedToRcn = 0;
  const sortedDates = Object.keys(cleanStates).sort();
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = sortedDates[i - 1];
    const curr = sortedDates[i];
    const prevDate = new Date(prev + 'T00:00:00Z');
    const currDate = new Date(curr + 'T00:00:00Z');
    const daysDiff = Math.round((currDate - prevDate) / 86400000);
    if (daysDiff === 1 && cleanStates[prev] === 'nuit' && cleanStates[curr] === 'rc') {
      cleanStates[curr] = 'rcn';
      promotedToRcn++;
    }
  }

  return jsonResponse({
    found: true,
    states: cleanStates,
    labels: cleanLabels,
    count: Object.keys(cleanStates).length,
    dropped,
    promotedToRcn,
    promotedToN1
  }, 200, origin);
}

// Format strict HHhMM (signe optionnel). Tolère "−" (U+2212), "h", "H", " : ".
function _normalizeHourValue(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().replace(/−/g, '-').replace(/\s+/g, '');
  // Match : ([-+]?)(\d{1,3})(h|:)(\d{1,2})
  const m = s.match(/^([+-]?)(\d{1,3})[hH:](\d{1,2})$/);
  if (!m) {
    // Cas "0h" ou "0" → traité comme 00h00 si vide ou nombre seul ? On reste strict.
    return null;
  }
  const sign = m[1] === '-' ? '-' : '';
  const h = String(parseInt(m[2], 10)).padStart(2, '0');
  const minNum = parseInt(m[3], 10);
  if (minNum < 0 || minNum > 59) return null;
  const mm = String(minNum).padStart(2, '0');
  return `${sign}${h}h${mm}`;
}

async function handleDebitCredit({ env, body, origin }) {
  const { imageBase64, year } = body;

  const userPrompt = `Année cible : ${year}. Extrais l'intégralité du tableau "Débit et crédit" visible. Conserve les valeurs au format strict HHhMM (signe négatif si présent), ne convertis pas en décimal. Retourne le JSON strict (et rien d'autre).`;

  const result = await callVisionAI({
    env,
    systemPrompt: SYSTEM_PROMPT_DEBIT_CREDIT,
    userPrompt,
    imageBase64
  });

  if (result.error) {
    return jsonResponse({
      error: result.error,
      message: result.message || 'Service Vision indisponible',
      body: result.body
    }, 502, origin);
  }

  let parsed;
  try {
    const txt = String(result.text).trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    parsed = JSON.parse(txt);
  } catch (e) {
    return jsonResponse({ error: 'unparsable_response', raw: String(result.text).slice(0, 400) }, 502, origin);
  }

  if (!parsed.found) {
    return jsonResponse({ found: false, reason: parsed.reason || 'Tableau non identifié' }, 200, origin);
  }

  const cleanMonths = {};
  let dropped = 0;
  for (const [k, v] of Object.entries(parsed.months || {})) {
    const m = parseInt(k, 10);
    if (!(m >= 1 && m <= 12)) { dropped++; continue; }
    if (!v || typeof v !== 'object') { dropped++; continue; }
    const dc    = _normalizeHourValue(v.dc);
    const cumul = _normalizeHourValue(v.cumul);
    const rtt   = _normalizeHourValue(v.rtt);
    if (dc === null && cumul === null && rtt === null) { dropped++; continue; }
    cleanMonths[m] = {
      dc:    dc    !== null ? dc    : '00h00',
      cumul: cumul !== null ? cumul : '00h00',
      rtt:   rtt   !== null ? rtt   : '00h00'
    };
  }

  // Validation année (Pixtral peut halluciner) — préfère l'année passée par le client
  const responseYear = (typeof parsed.year === 'number' && parsed.year > 2000) ? parsed.year : year;

  return jsonResponse({
    found: true,
    year: responseYear,
    months: cleanMonths,
    dropped
  }, 200, origin);
}

// ── Firebase Custom Token Signer (P1.4) ─────────────────────────────────────
// Signe un JWT RS256 avec la clé privée du Service Account Firebase.
// Compat Web Crypto API — pas de dépendance Admin SDK (qui ne tourne pas dans
// un Worker Cloudflare).
//
// Spec : https://firebase.google.com/docs/auth/admin/create-custom-tokens#using_a_third-party_jwt_library

const FIREBASE_AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

let _saKeyCache = null; // { clientEmail, cryptoKey }

function _b64urlEncode(bytes) {
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function _b64urlEncodeStr(s) {
  return _b64urlEncode(new TextEncoder().encode(s));
}

function _pemToDer(pem) {
  const body = pem.replace(/-----BEGIN [^-]+-----/, '')
                  .replace(/-----END [^-]+-----/, '')
                  .replace(/\s+/g, '');
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function _getSaCryptoKey(env) {
  if (_saKeyCache) return _saKeyCache;
  if (!env.FIREBASE_SA_KEY) return null;
  let sa;
  try { sa = JSON.parse(env.FIREBASE_SA_KEY); }
  catch (e) { console.error('[sa_invalid_json]', e.message); return null; }
  if (!sa.private_key || !sa.client_email) {
    console.error('[sa_missing_fields]');
    return null;
  }
  try {
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      _pemToDer(sa.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
    _saKeyCache = { clientEmail: sa.client_email, cryptoKey };
    return _saKeyCache;
  } catch (e) {
    console.error('[sa_import_fail]', e && e.message);
    return null;
  }
}

async function _signFirebaseCustomToken({ env, uid, claims }) {
  const sa = await _getSaCryptoKey(env);
  if (!sa) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.clientEmail,
    sub: sa.clientEmail,
    aud: FIREBASE_AUDIENCE,
    iat: now,
    exp: now + 3600,
    uid: String(uid)
  };
  if (claims && typeof claims === 'object' && Object.keys(claims).length > 0) {
    payload.claims = claims;
  }
  const headerEnc  = _b64urlEncodeStr(JSON.stringify(header));
  const payloadEnc = _b64urlEncodeStr(JSON.stringify(payload));
  const signingInput = headerEnc + '.' + payloadEnc;
  const sig = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    sa.cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  return signingInput + '.' + _b64urlEncode(new Uint8Array(sig));
}

// ── OAuth2 access token pour Firestore REST (lecture AUTH_DOC + config/admin)
let _accessTokenCache = null; // { token, expiry }

async function _getFirestoreAccessToken(env) {
  if (_accessTokenCache && _accessTokenCache.expiry > Date.now() + 60_000 && _accessTokenCache.token) {
    return _accessTokenCache.token;
  }
  const sa = await _getSaCryptoKey(env);
  if (!sa) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };
  const headerEnc  = _b64urlEncodeStr(JSON.stringify(header));
  const payloadEnc = _b64urlEncodeStr(JSON.stringify(payload));
  const signingInput = headerEnc + '.' + payloadEnc;
  let sig;
  try {
    sig = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      sa.cryptoKey,
      new TextEncoder().encode(signingInput)
    );
  } catch (e) {
    console.error('[oauth_sign_fail]', e && e.message);
    return null;
  }
  const assertion = signingInput + '.' + _b64urlEncode(new Uint8Array(sig));
  let resp;
  try {
    resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}`
    });
  } catch (e) {
    console.error('[oauth_fetch_fail]', e && e.message);
    return null;
  }
  if (!resp.ok) {
    const bodyText = await resp.text();
    console.error('[oauth_token_error]', resp.status, bodyText.slice(0, 200));
    return null;
  }
  const data = await resp.json();
  if (!data.access_token) return null;
  _accessTokenCache = {
    token: data.access_token,
    expiry: Date.now() + (data.expires_in * 1000)
  };
  return data.access_token;
}

// Lecture d'un document Firestore via REST API (sans SDK).
async function _firestoreGet(env, projectId, path) {
  const token = await _getFirestoreAccessToken(env);
  if (!token) return null;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`;
  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!resp.ok) {
    console.error('[firestore_get_error]', path, resp.status);
    return null;
  }
  const data = await resp.json();
  // Convertit le format Firestore (mapValue/stringValue/...) en JSON simple
  return _firestoreUnwrap(data.fields || {});
}

function _firestoreUnwrap(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields || {})) out[k] = _firestoreUnwrapValue(v);
  return out;
}
function _firestoreUnwrapValue(v) {
  if (!v) return null;
  if ('stringValue'  in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue'  in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue'    in v) return null;
  if ('mapValue'     in v) return _firestoreUnwrap(v.mapValue.fields || {});
  if ('arrayValue'   in v) return (v.arrayValue.values || []).map(_firestoreUnwrapValue);
  if ('timestampValue' in v) return v.timestampValue;
  return null;
}

// ── PIN hash compat (sha256 legacy + pbkdf2 v2) ────────────────────────────
async function _sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function _pbkdf2Hex(pin, saltHex, iterations = 100_000) {
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  const baseKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(pin), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── /login endpoint (P1.4) ─────────────────────────────────────────────────
async function handleLogin({ env, body, origin }) {
  const { userId, pin } = body || {};
  if (!userId || typeof userId !== 'string' || userId.length > 100) {
    return jsonResponse({ error: 'invalid_userId' }, 400, origin);
  }
  if (!pin || !/^\d{4,12}$/.test(String(pin))) {
    return jsonResponse({ error: 'invalid_pin' }, 400, origin);
  }
  if (!env.FIREBASE_SA_KEY) {
    return jsonResponse({ error: 'auth_not_configured', message: 'Service Account Firebase non configuré côté Worker' }, 503, origin);
  }
  const projectId = 'pulseunit-c9c5c';
  const auth = await _firestoreGet(env, projectId, 'pulseunit/auth');
  if (!auth || !auth.users || !auth.users[userId]) {
    return jsonResponse({ error: 'user_not_found' }, 404, origin);
  }
  const user = auth.users[userId];
  if (user.blocked) return jsonResponse({ error: 'account_blocked' }, 403, origin);
  // Vérification PIN : V2 prioritaire (PBKDF2 + salt), legacy en fallback
  let ok = false;
  if (user.pinHashV2 && user.pinSalt) {
    const computed = await _pbkdf2Hex(String(pin), user.pinSalt);
    ok = (computed === user.pinHashV2);
  }
  if (!ok && user.pinHash) {
    const legacy = await _sha256Hex(String(pin));
    ok = (legacy === user.pinHash);
  }
  // Code temporaire (tempPin déjà hashé SHA-256 côté client)
  if (!ok && user.tempPin) {
    if (user.tempPinExpiry && Date.now() > user.tempPinExpiry) {
      return jsonResponse({ error: 'temp_pin_expired' }, 403, origin);
    }
    const legacyTemp = await _sha256Hex(String(pin));
    if (legacyTemp === user.tempPin) ok = 'temp';
  }
  if (!ok) return jsonResponse({ error: 'invalid_credentials' }, 401, origin);

  const token = await _signFirebaseCustomToken({
    env,
    uid: userId,
    claims: { role: user.role || 'ide', admin: false }
  });
  if (!token) return jsonResponse({ error: 'token_signing_failed' }, 500, origin);

  return jsonResponse({
    token,
    uid: userId,
    role: user.role || 'ide',
    requirePinChange: ok === 'temp'
  }, 200, origin);
}

// ── /admin-login endpoint (P1.6) ───────────────────────────────────────────
async function handleAdminLogin({ env, body, origin }) {
  const { user, pass } = body || {};
  if (!user || !pass || typeof user !== 'string' || typeof pass !== 'string') {
    return jsonResponse({ error: 'invalid_credentials' }, 400, origin);
  }
  if (!env.FIREBASE_SA_KEY) {
    return jsonResponse({ error: 'auth_not_configured' }, 503, origin);
  }
  const projectId = 'pulseunit-c9c5c';
  const cfg = await _firestoreGet(env, projectId, 'config/admin');
  if (!cfg || !cfg.passHash) {
    return jsonResponse({ error: 'admin_not_configured' }, 500, origin);
  }
  const computed = await _sha256Hex(pass);
  if (user !== 'admin' || computed !== cfg.passHash) {
    return jsonResponse({ error: 'invalid_credentials' }, 401, origin);
  }
  const token = await _signFirebaseCustomToken({
    env,
    uid: 'admin_view',
    claims: { admin: true, role: 'admin' }
  });
  if (!token) return jsonResponse({ error: 'token_signing_failed' }, 500, origin);
  return jsonResponse({ token, uid: 'admin_view', admin: true }, 200, origin);
}

// ── /audit endpoint (P2.1 — RGPD Art. 32 traçabilité) ──────────────────────
// Append-only audit log dans pulseunit/auditlog/{autoId}. Écrit via SA (les
// rules empêchent toute écriture client). Le client envoie {actor, action,
// target?, details?}. Le Worker ajoute timestamp serveur, IP, UA.
//
// Note threat model : on fait confiance au client pour 'actor' — sinon il
// faudrait vérifier un Firebase ID Token via JWKS (overkill pour le périmètre
// alpha 50 agents). Si XSS sur le domaine, l'intégrité du log est compromise
// de toute façon ; ce log est destiné aux opérations normales.
async function _firestoreCreateAutoId(env, projectId, collectionPath, fields) {
  const token = await _getFirestoreAccessToken(env);
  if (!token) return { ok: false, err: 'no_token' };
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionPath}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });
  if (!resp.ok) {
    const bodyText = await resp.text();
    console.error('[firestore_create_error]', collectionPath, resp.status, bodyText.slice(0, 300));
    return { ok: false, err: 'http_' + resp.status, body: bodyText.slice(0, 300) };
  }
  return { ok: true };
}

function _firestoreWrap(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string')  return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(_firestoreWrap) } };
  if (typeof value === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(value)) fields[k] = _firestoreWrap(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

const VALID_AUDIT_ACTIONS = new Set([
  'login_ok', 'login_fail', 'login_blocked',
  'admin_login_ok', 'admin_login_fail',
  'register', 'pin_change', 'pin_reset_request', 'pin_reset_set',
  'user_unlock', 'user_delete', 'user_create',
  'usip_lock_toggle', 'admin_pass_change',
  'rgpd_export', 'rgpd_purge'
]);

async function handleAudit({ env, body, origin, request }) {
  if (!env.FIREBASE_SA_KEY) {
    return jsonResponse({ error: 'auth_not_configured' }, 503, origin);
  }
  const { actor, action, target, details } = body || {};
  if (!action || !VALID_AUDIT_ACTIONS.has(action)) {
    return jsonResponse({ error: 'invalid_action' }, 400, origin);
  }
  // Validation taille / types pour éviter pollution
  const safeActor = typeof actor === 'string' ? actor.slice(0, 100) : null;
  const safeTarget = typeof target === 'string' ? target.slice(0, 100) : null;
  const safeDetails = (details && typeof details === 'object')
    ? JSON.stringify(details).slice(0, 500)
    : (typeof details === 'string' ? details.slice(0, 500) : null);

  const fields = {
    actor:     _firestoreWrap(safeActor),
    action:    _firestoreWrap(action),
    target:    _firestoreWrap(safeTarget),
    details:   _firestoreWrap(safeDetails),
    ip:        _firestoreWrap(request.headers.get('CF-Connecting-IP') || 'unknown'),
    userAgent: _firestoreWrap((request.headers.get('User-Agent') || '').slice(0, 200)),
    at:        _firestoreWrap(new Date().toISOString())
  };

  // Collection top-level 'auditlog' — la doc-path 'pulseunit' est une collection,
  // pas un document, donc on ne peut pas créer un sub-collection auditlog dessous.
  const res = await _firestoreCreateAutoId(env, 'pulseunit-c9c5c', 'auditlog', fields);
  return jsonResponse(res, res.ok ? 200 : 500, origin);
}

// ── Read-modify-write de pulseunit/auth.users via SA ────────────────────────
// Fix bug dotted-paths Firestore REST (2026-05-03) : passer
// `{"users.uid": userObj}` en body fields ne crée PAS un nested update — la
// clé est traitée comme un champ littéral plat. Workaround : lire la map
// users complète, muter en JS, PATCH avec field `users` entier + updateMask
// `['users']`. Pas de race significatif sur ce volume (register/change-pin
// = quelques req/jour max).
async function _firestoreUpdateUsersMap(env, projectId, mutator) {
  const auth = await _firestoreGet(env, projectId, 'pulseunit/auth');
  const users = (auth && auth.users) || {};
  const newUsers = mutator(users);
  if (!newUsers || typeof newUsers !== 'object') {
    return { ok: false, err: 'mutator_invalid' };
  }
  return _firestoreUpdateDoc(env, projectId, 'pulseunit/auth',
    { users: newUsers }, ['users']);
}

// ── PATCH d'un doc Firestore (set/merge) via SA ─────────────────────────────
// Utilisé pour writes auth (register, change-pin) afin que les rules puissent
// bloquer les writes client direct sur pulseunit/auth (P3.0 audit 2026-04-30).
async function _firestoreUpdateDoc(env, projectId, path, fields, mergeFieldPaths) {
  const token = await _getFirestoreAccessToken(env);
  if (!token) return { ok: false, err: 'no_token' };
  const wrappedFields = {};
  for (const [k, v] of Object.entries(fields)) wrappedFields[k] = _firestoreWrap(v);
  let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`;
  if (mergeFieldPaths && mergeFieldPaths.length > 0) {
    const params = mergeFieldPaths.map(f => 'updateMask.fieldPaths=' + encodeURIComponent(f)).join('&');
    url += '?' + params;
  }
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: wrappedFields })
  });
  if (!resp.ok) {
    const bodyText = await resp.text();
    console.error('[firestore_update_doc_error]', path, resp.status, bodyText.slice(0, 200));
    return { ok: false, err: 'http_' + resp.status, body: bodyText.slice(0, 200) };
  }
  return { ok: true };
}

// ── /register endpoint (P3.0 — write auth via SA) ──────────────────────────
// Crée un compte côté serveur : valide les inputs, hash le PIN en PBKDF2, écrit
// dans pulseunit/auth (legacy compat). Retourne un Custom Token Firebase.
async function handleRegister({ env, body, origin }) {
  if (!env.FIREBASE_SA_KEY) {
    return jsonResponse({ error: 'auth_not_configured' }, 503, origin);
  }
  const { firstName, lastName, role, pin } = body || {};
  // Validation
  const NAME_RE = /^\p{L}[\p{L}\s'-]{0,49}$/u;
  if (typeof firstName !== 'string' || !NAME_RE.test(firstName)) {
    return jsonResponse({ error: 'invalid_firstname' }, 400, origin);
  }
  if (typeof lastName !== 'string' || !NAME_RE.test(lastName)) {
    return jsonResponse({ error: 'invalid_lastname' }, 400, origin);
  }
  if (!['ide', 'as', 'med', 'tech'].includes(role)) {
    return jsonResponse({ error: 'invalid_role' }, 400, origin);
  }
  if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
    return jsonResponse({ error: 'invalid_pin' }, 400, origin);
  }
  const projectId = 'pulseunit-c9c5c';
  // Vérifier doublon (case insensitive) en lisant pulseunit/auth
  const auth = await _firestoreGet(env, projectId, 'pulseunit/auth');
  const existingUsers = (auth && auth.users) || {};
  const fnLower = firstName.toLowerCase();
  const lnLower = lastName.toLowerCase();
  const existingId = Object.keys(existingUsers).find(id => {
    const u = existingUsers[id];
    return u && u.firstName && u.lastName &&
           u.firstName.toLowerCase() === fnLower &&
           u.lastName.toLowerCase()  === lnLower;
  });
  if (existingId) {
    return jsonResponse({ error: 'user_exists', existingId }, 409, origin);
  }
  // Génère uid + hashes
  const uid = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const [pinHashLegacy, pinHashV2] = await Promise.all([
    _sha256Hex(pin),
    _pbkdf2Hex(pin, saltHex)
  ]);
  // Update pulseunit/auth.users.{uid} via read-modify-write (fix dotted-paths)
  const userObj = {
    firstName, lastName, role,
    pinHash: pinHashLegacy,
    pinHashV2, pinSalt: saltHex,
    tempPin: null, tempPinExpiry: null,
    failedAttempts: 0, blocked: false, blockedAt: null,
    createdAt: Date.now()
  };
  const upd = await _firestoreUpdateUsersMap(env, projectId, (users) => {
    users[uid] = userObj;
    return users;
  });
  if (!upd.ok) {
    return jsonResponse({ error: 'firestore_write_failed', details: upd }, 500, origin);
  }
  // Custom Token
  const token = await _signFirebaseCustomToken({
    env, uid, claims: { role, admin: false }
  });
  if (!token) return jsonResponse({ error: 'token_signing_failed' }, 500, origin);
  return jsonResponse({ ok: true, token, uid, role }, 200, origin);
}

// ── /change-pin endpoint (P3.0 — write auth via SA) ────────────────────────
async function handleChangePin({ env, body, origin }) {
  if (!env.FIREBASE_SA_KEY) {
    return jsonResponse({ error: 'auth_not_configured' }, 503, origin);
  }
  const { userId, oldPin, newPin } = body || {};
  if (!userId || typeof userId !== 'string' || userId.length > 100) {
    return jsonResponse({ error: 'invalid_userId' }, 400, origin);
  }
  if (typeof oldPin !== 'string' || !/^\d{4,12}$/.test(oldPin)) {
    return jsonResponse({ error: 'invalid_old_pin' }, 400, origin);
  }
  if (typeof newPin !== 'string' || !/^\d{6}$/.test(newPin)) {
    return jsonResponse({ error: 'invalid_new_pin' }, 400, origin);
  }
  const projectId = 'pulseunit-c9c5c';
  const auth = await _firestoreGet(env, projectId, 'pulseunit/auth');
  if (!auth || !auth.users || !auth.users[userId]) {
    return jsonResponse({ error: 'user_not_found' }, 404, origin);
  }
  const user = auth.users[userId];
  if (user.blocked) return jsonResponse({ error: 'account_blocked' }, 403, origin);
  // Vérifier old pin (V2 prioritaire, fallback legacy)
  let ok = false;
  if (user.pinHashV2 && user.pinSalt) {
    ok = (await _pbkdf2Hex(oldPin, user.pinSalt)) === user.pinHashV2;
  }
  if (!ok && user.pinHash) {
    ok = (await _sha256Hex(oldPin)) === user.pinHash;
  }
  // Permettre aussi la validation par tempPin
  if (!ok && user.tempPin) {
    if (user.tempPinExpiry && Date.now() > user.tempPinExpiry) {
      return jsonResponse({ error: 'temp_pin_expired' }, 403, origin);
    }
    ok = (await _sha256Hex(oldPin)) === user.tempPin;
  }
  if (!ok) return jsonResponse({ error: 'invalid_old_pin' }, 401, origin);
  // Génère new hashes
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const [newLegacy, newV2] = await Promise.all([
    _sha256Hex(newPin),
    _pbkdf2Hex(newPin, saltHex)
  ]);
  // Update les 5 champs via read-modify-write (fix dotted-paths)
  const upd = await _firestoreUpdateUsersMap(env, projectId, (users) => {
    if (!users[userId]) return null;
    users[userId] = {
      ...users[userId],
      pinHash:        newLegacy,
      pinHashV2:      newV2,
      pinSalt:        saltHex,
      tempPin:        null,
      tempPinExpiry:  null,
      failedAttempts: 0
    };
    return users;
  });
  if (!upd.ok) return jsonResponse({ error: 'firestore_write_failed' }, 500, origin);
  return jsonResponse({ ok: true }, 200, origin);
}

// ── /migrate-auth-split endpoint (P3.0 — one-shot data migration) ──────────
// Idempotent : peut être appelé plusieurs fois, ne dupplique pas. Lit
// pulseunit/auth.users{} puis écrit pulseunit/users_public.users{firstName,
// lastName, role} + pulseunit/users_private/{uid} avec champs sensibles.
//
// Sécurité : header X-Migrate-Token requis (vaut env.MIGRATE_SECRET).
async function handleMigrateAuthSplit({ env, request, origin }) {
  if (!env.FIREBASE_SA_KEY) {
    return jsonResponse({ error: 'auth_not_configured' }, 503, origin);
  }
  const givenToken = request.headers.get('X-Migrate-Token') || '';
  if (!env.MIGRATE_SECRET || givenToken !== env.MIGRATE_SECRET) {
    return jsonResponse({ error: 'forbidden' }, 403, origin);
  }
  const projectId = 'pulseunit-c9c5c';
  const auth = await _firestoreGet(env, projectId, 'pulseunit/auth');
  if (!auth || !auth.users) {
    return jsonResponse({ error: 'no_auth_doc' }, 404, origin);
  }
  const users = auth.users;
  const publicUsers = {};
  let written = 0;
  const errors = [];
  for (const [uid, u] of Object.entries(users)) {
    if (!u || typeof u !== 'object') continue;
    publicUsers[uid] = {
      firstName: u.firstName || '',
      lastName:  u.lastName  || '',
      role:      u.role      || 'ide'
    };
    // Écriture du doc privé
    const privateFields = {
      pinHash:   u.pinHash   || null,
      pinHashV2: u.pinHashV2 || null,
      pinSalt:   u.pinSalt   || null,
      tempPin:   u.tempPin   || null,
      tempPinExpiry: u.tempPinExpiry || null,
      failedAttempts: u.failedAttempts || 0,
      blocked: !!u.blocked,
      blockedAt: u.blockedAt || null,
      createdAt: u.createdAt || null,
      // Trace migration
      migratedAt: new Date().toISOString()
    };
    // users_private = collection top-level (pulseunit est lui-même collection,
    // pas doc → pas de sub-collection sous pulseunit/users_private/)
    const r = await _firestoreUpdateDoc(env, projectId, 'users_private/' + uid, privateFields);
    if (!r.ok) errors.push({ uid, err: r.err });
    else written++;
  }
  // pulseunit/users_public reste un doc (collection pulseunit + doc users_public)
  const pubResult = await _firestoreUpdateDoc(env, projectId, 'pulseunit/users_public', { users: publicUsers });
  return jsonResponse({
    ok: errors.length === 0 && pubResult.ok,
    totalUsers: Object.keys(users).length,
    privateWritten: written,
    publicWritten: pubResult.ok,
    errors: errors.slice(0, 10)
  }, 200, origin);
}

// ── Cron handlers (P2.3 — TTL serveur présence) ────────────────────────────
// Cloudflare invoque scheduled() selon la cron du wrangler.toml. Pas d'impact
// sur les 100k req/jour free (720 invocations/jour à */2 min).

const PRESENCE_TTL_MS = 5 * 60 * 1000;  // 5 min — au-delà : utilisateur considéré offline

// PATCH d'un doc Firestore avec updateMask = liste de champs à supprimer.
// Pour supprimer (vs setter à null) : on liste le champ dans updateMask SANS
// le mettre dans body.fields → Firestore traite ça comme un "field reset".
async function _firestoreDeleteFields(env, projectId, path, fieldPaths) {
  if (!fieldPaths || fieldPaths.length === 0) return { ok: true, removed: 0 };
  const token = await _getFirestoreAccessToken(env);
  if (!token) return { ok: false, err: 'no_token' };
  const params = fieldPaths.map(f => 'updateMask.fieldPaths=' + encodeURIComponent(f)).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}?${params}`;
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: {} })
  });
  if (!resp.ok) {
    const bodyText = await resp.text();
    console.error('[firestore_delete_fields_error]', path, resp.status, bodyText.slice(0, 200));
    return { ok: false, err: 'http_' + resp.status };
  }
  return { ok: true, removed: fieldPaths.length };
}

async function _purgeStalePresence(env) {
  const projectId = 'pulseunit-c9c5c';
  const presence = await _firestoreGet(env, projectId, 'pulseunit/presence');
  if (!presence) return { skipped: 'no_doc' };
  const now = Date.now();
  const stale = [];
  for (const [uid, info] of Object.entries(presence)) {
    if (uid.startsWith('_')) continue;
    if (!info || typeof info !== 'object') { stale.push(uid); continue; }
    const ls = info.lastSeen;
    // lastSeen peut être : timestamp ms (number), ISO string, ou absent.
    let tsMs = null;
    if (typeof ls === 'number') tsMs = ls;
    else if (typeof ls === 'string') { const t = Date.parse(ls); if (!isNaN(t)) tsMs = t; }
    if (tsMs === null || (now - tsMs) > PRESENCE_TTL_MS) stale.push(uid);
  }
  if (stale.length === 0) return { ok: true, removed: 0 };
  const result = await _firestoreDeleteFields(env, projectId, 'pulseunit/presence', stale);
  return { ...result, staleIds: stale.slice(0, 10) };
}

// ── Routeur principal ───────────────────────────────────────────────────────
export default {
  async scheduled(event, env, ctx) {
    // event.cron = "*/2 * * * *"
    ctx.waitUntil((async () => {
      try {
        const res = await _purgeStalePresence(env);
        console.log('[cron_presence_purge]', JSON.stringify(res));
      } catch (e) {
        console.error('[cron_presence_purge_error]', e && e.message);
      }
    })());
  },

  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }
    if (!_isOriginAllowed(origin)) {
      return jsonResponse({ error: 'origin_forbidden', received: origin || '(empty)' }, 403, origin);
    }
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed' }, 405, origin);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    // P1.7 — rate limit (par origin + path + ip approximée)
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rlKey = origin + '|' + path + '|' + ip;
    if (!_rateLimitCheck(rlKey)) {
      return jsonResponse({ error: 'rate_limited', message: 'Trop de requêtes. Réessayez dans 1 min.' }, 429, origin);
    }

    let body;
    try { body = await request.json(); }
    catch (e) { return jsonResponse({ error: 'invalid_json' }, 400, origin); }

    // Routes
    if (path === '/login')        return handleLogin({ env, body, origin });
    if (path === '/admin-login')  return handleAdminLogin({ env, body, origin });
    if (path === '/audit')        return handleAudit({ env, body, origin, request });
    if (path === '/register')     return handleRegister({ env, body, origin });
    if (path === '/change-pin')   return handleChangePin({ env, body, origin });
    if (path === '/migrate-auth-split') return handleMigrateAuthSplit({ env, request, origin });

    // /scan ou / (legacy) → scan Vision
    const validationError = _validateScanParams(body);
    if (validationError) return jsonResponse({ error: validationError }, 400, origin);

    const { kind } = body || {};
    if (kind === 'debit-credit') return handleDebitCredit({ env, body, origin });
    return handlePlanning({ env, body, origin });
  }
};
