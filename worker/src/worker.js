/**
 * Cloudflare Worker — PulseUnit Scan (Planning + Débit/Crédit Digihops).
 *
 * POST /  body JSON :
 *   - { imageBase64, year, month, kind?:'planning' }   → extraction calendrier mensuel
 *   - { imageBase64, year, kind:'debit-credit' }       → extraction tableau débit/crédit annuel
 *
 * Réponses :
 *   - planning      : { found, states, labels, count, dropped, promotedToRcn }
 *   - debit-credit  : { found, year, months: { 1:{dc, cumul, rtt}, ... }, dropped }
 *
 * Modèle : Mistral Pixtral Large via api.mistral.ai (free tier, EU friendly).
 * Secret Cloudflare : MISTRAL_API_KEY (npx wrangler secret put MISTRAL_API_KEY).
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

RÈGLE NUMÉROTATION (très importante) :
Les CA sont souvent NUMÉROTÉS dans Digihops avec un espace + chiffre (ex. "CA 1", "CA 2", "CA-HP 1", "CA-HP 2"). Ce chiffre est juste un numéro d'ordre dans la séquence de CA, à IGNORER pour le mapping.
- "CA 1", "CA 2", "CA 3"... → ca (jamais can1 — pas de compteur N-1 ici)
- "CA-HP 1", "CA-HP 2", "CA-HP 3"... → ca_hp (jamais ca_hpn1)
À l'inverse, un TIRET + 1 (sans espace) signifie le compteur N-1 :
- "CA-1" → can1
- "CA-HP-1" → ca_hpn1
- "HP-1" → hpn1

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
  console.log('[ai_ok]', `usage=${JSON.stringify(json.usage || {})}`, '|', text.slice(0, 2000));
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
    promotedToRcn
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

export default {
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
    let body;
    try { body = await request.json(); }
    catch (e) { return jsonResponse({ error: 'invalid_json' }, 400, origin); }

    const { imageBase64, kind } = body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return jsonResponse({ error: 'missing_image' }, 400, origin);
    }
    if (imageBase64.length > 7_000_000) {
      return jsonResponse({ error: 'image_too_large' }, 413, origin);
    }

    if (kind === 'debit-credit') return handleDebitCredit({ env, body, origin });
    return handlePlanning({ env, body, origin });
  }
};
