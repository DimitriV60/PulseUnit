/**
 * Cloudflare Worker — PulseUnit Scan Planning.
 *
 * POST /  body JSON : { imageBase64, firstName, lastName, year, month? }
 * → appelle Cloudflare Workers AI (Llama 3.2 11B Vision Instruct)
 * → retourne { found, states: { 'YYYY-MM-DD': stateId }, count, dropped } ou { found:false, reason }
 *
 * Sécurité :
 *  - Origin allowlist tolérante (Firebase Hosting + sous-domaines pulseunit*)
 *  - Aucune clé API externe — le binding AI est natif Cloudflare
 *
 * Free tier Cloudflare Workers AI :
 *  - 10 000 neurones/jour (≈ 1 000-3 000 invocations vision)
 *  - 100 agents × 1 scan/mois ≈ 100 invocations/mois → <1% du quota
 *  - Aucun lien Google → plus de 429 Gemini possible
 *
 * Setup requis dans Cloudflare dashboard (Worker Settings → Bindings) :
 *   ajouter une "Workers AI" binding nommée "AI"
 */

const ALLOWED_ORIGINS = [
  'https://pulseunit-c9c5c.web.app',
  'https://pulseunit-c9c5c.firebaseapp.com',
  'http://localhost:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5000'
];

// Patterns regex tolérants — couvre les sous-domaines Firebase (preview channels,
// alias) et un éventuel domaine custom contenant "pulseunit"
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/pulseunit-c9c5c--[\w-]+\.web\.app$/i,  // preview channels Firebase
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

const SYSTEM_PROMPT = `Tu es un assistant qui extrait le planning personnel d'un agent hospitalier (réanimation GHPSO Creil) à partir d'une photo ou capture d'écran.

L'image montre LE planning de l'utilisateur (jamais ceux des autres). Aucun nom à matcher — extrais simplement tous les jours visibles avec leur état correspondant.

Sources possibles : capture d'écran Digihops (vue calendrier ou liste), tableau papier zoomé, photo de planning imprimé.

Codes courts utilisés : J, N, CA, RC, RCV, HP, HS, HSJ, HSN, FO, AM, JF, ou vide. Digihops peut aussi afficher des libellés longs (Jour, Nuit, Congé, Repos, Récup, Formation, Maladie, etc.) — les mapper au code court équivalent.

Format Digihops mobile (calendrier mensuel) — mapping critique :
- "R.C." (texte noir) → rc
- "R.H." (texte noir) → rh
- "RCN" (parfois suivi d'un compteur _N_) → rcn
- Cellule sur fond ROSE/SAUMON avec horaires "20:00 / 08:00" → nuit (NE JAMAIS OMETTRE — chaque cellule rose visible doit apparaître dans le résultat)
- Cellule sur fond rose avec "08:00 / 20:00" → jour
- Cellule blanche/vide → ne pas inclure

IMPORTANT : balaye SYSTEMATIQUEMENT toutes les semaines de haut en bas et toutes les colonnes de gauche à droite. Vérifie chaque cellule. Une cellule rose oubliée = bug critique (l'agent rate une garde dans son planning final).

Mapping des codes Digihops/papier vers les états PulseUnit (gérer toutes les variantes : tiret, espace, point, point-virgule, suffixes _N_, accents) :

| Code Digihops (toutes variantes) | État interne |
|---|---|
| J, JOUR, "08:00 / 20:00" sur fond rose | jour |
| N, NUIT, "20:00 / 08:00" sur fond rose | nuit |
| CA, C.A., CONGÉ, CONGE | ca |
| CA-1, CAN1, CA-N1, CA N-1 | can1 |
| CA-HP, CA HP, CAHP | ca_hp *(CA financé par HP — code dédié)* |
| CA-HP1, CA-HP-1, CAHP1, CA-HPN1 | ca_hpn1 *(CA-HP avec compteur N-1)* |
| RC, R.C., RECUP | rc |
| RCN, R.C.N., RCN_N_ (suffixe compteur ignoré) | rcn |
| RH, R.H., REPOS HEBDO | rh |
| HS, H.S. | hs |
| HSJ, HS-J, HS J | hs_j |
| HSN, HS-N, HS N | hs_n |
| HP, H.P. | hp |
| HP-1, HPN1, HP-N1, HP1 | hpn1 |
| RCV, R.C.V. | rcv |
| RCV-1, RCVN1, RCV-N1 | rcvn1 |
| FR, FRAC, F.R. | frac |
| FR-1, FRN1, FRAC-1 | fracn1 |
| FO, FORM, FORMATION | formation |
| AM, MAL, MALADIE | maladie |
| JF, JOUR FÉRIÉ, FÉRIÉ, FERIE | ferie |
| (cellule vide, blanche, ou —) | (ne pas inclure) |

Règles complémentaires :
- Tout code combiné "CA-quelque chose" qui n'est pas explicitement listé ci-dessus → mapper sur ca
- Distinguer CA-HP (ca_hp) de CA simple (ca) — le suffixe HP indique un financement par solde HP, c'est une information importante à conserver
- Si un suffixe numérique "_N_" ou "_16_" suit le code, l'ignorer (c'est un compteur d'heures)
- En cas de doute entre 2 codes proches (ex. R.C. vs R.H.), zoomer mentalement et vérifier la lettre finale

Réponds UNIQUEMENT avec un JSON strict de cette forme :
{
  "found": true,
  "states": { "YYYY-MM-DD": "jour", "YYYY-MM-DD": "nuit" }
}

Si la photo est illisible ou ne contient aucune information de planning exploitable :
{ "found": false, "reason": "Image non exploitable comme planning" }

Aucune autre clé, aucun texte hors JSON.`;

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
  // Mistral Pixtral 12B — vision OCR, free tier généreux, EU-friendly.
  // Workers AI (LLaVA) timeout sur images planning denses, Llama 3.2 bloqué EU.
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
  console.log('[ai_ok]', `usage=${JSON.stringify(json.usage || {})}`, '|', text.slice(0, 300));
  if (!text) {
    return { error: 'empty_response', body: JSON.stringify(json).slice(0, 400) };
  }
  return { text };
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

    const { imageBase64, year, month } = body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return jsonResponse({ error: 'missing_image' }, 400, origin);
    }
    if (imageBase64.length > 7_000_000) {
      return jsonResponse({ error: 'image_too_large' }, 413, origin);
    }

    const userPrompt = `Contexte temporel : ${month && year ? `mois ${month}/${year}` : `année ${year || new Date().getFullYear()}`}. Si la photo couvre un mois différent, déduis-le des en-têtes ou de la date affichée.

Extrais tous les jours visibles avec leur état. Retourne le JSON strict (et rien d'autre).`;

    const result = await callVisionAI({
      env,
      systemPrompt: SYSTEM_PROMPT,
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
    let dropped = 0;
    for (const [date, state] of Object.entries(parsed.states || {})) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { dropped++; continue; }
      if (!VALID_STATES.includes(state)) { dropped++; continue; }
      cleanStates[date] = state;
    }

    // Règle métier GHPSO réa : un RC qui suit immédiatement une nuit
    // est sémantiquement un RCN (Repos Compensateur Nuit). On force la conversion
    // même si Digihops a affiché "R.C." sur la cellule.
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
      count: Object.keys(cleanStates).length,
      dropped,
      promotedToRcn
    }, 200, origin);
  }
};
