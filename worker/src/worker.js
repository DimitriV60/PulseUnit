/**
 * Cloudflare Worker — PulseUnit Scan Planning.
 *
 * POST /  body JSON : { imageBase64, mimeType, firstName, lastName, year, month? }
 * → appelle Google Gemini 2.0 Flash en vision
 * → retourne { found, states: { 'YYYY-MM-DD': stateId }, count, dropped } ou { found:false, reason }
 *
 * Sécurité :
 *  - Origin allowlist (Pulseunit Firebase Hosting + localhost dev)
 *  - Clé GEMINI_API_KEY en Cloudflare Worker secret (pas de fuite client)
 *  - Retry exponentiel + jitter sur 429/503 pour absorber les pics
 *
 * Quotas Gemini Flash 2.0 free tier :
 *  - 15 RPM (rate limit) — absorbé par retry
 *  - 1 500 RPD — largement suffisant pour 100 agents × 1 scan/mois
 *  - 1M tokens/min input — limit théorique non atteint
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
  'jour', 'nuit', 'ca', 'can1', 'rcn', 'rh', 'hs', 'hs_j', 'hs_n', 'rc',
  'formation', 'ferie', 'maladie', 'hp', 'hpn1', 'rcv', 'rcvn1', 'frac', 'fracn1', 'travail'
];

const SYSTEM_PROMPT = `Tu es un assistant qui extrait des plannings hospitaliers (réanimation GHPSO Creil) à partir d'une photo.

Le planning est un tableau qui liste plusieurs agents (lignes) sur plusieurs jours (colonnes). Chaque cellule contient un code court : J, N, CA, RC, RCV, HP, HS, HSJ, HSN, FO, AM, JF, ou vide.

Tu dois :
1. Trouver la ligne correspondant à l'utilisateur (variantes possibles du nom : "Prénom Nom", "NOM Prénom", "NOM P.", "P. NOM").
2. Pour chaque cellule de cette ligne uniquement, retourner la date et l'état mappé.
3. Ignorer toutes les autres lignes.

Mapping des codes vers les états PulseUnit :
- J = jour
- N = nuit
- CA = ca
- CA-1 ou CAN1 = can1
- RC = rc
- RCN = rcn
- RH = rh
- HS = hs
- HSJ = hs_j
- HSN = hs_n
- HP = hp
- HP-1 = hpn1
- RCV = rcv
- RCV-1 = rcvn1
- FR ou Frac = frac
- FR-1 = fracn1
- FO ou Form = formation
- AM ou Mal = maladie
- JF = ferie
- vide ou - = (ne pas inclure)

Réponds UNIQUEMENT avec un JSON strict de cette forme :
{
  "found": true,
  "states": { "YYYY-MM-DD": "jour", "YYYY-MM-DD": "nuit" }
}

Si le nom n'est pas trouvé sur le planning :
{ "found": false, "reason": "Nom non trouvé sur la photo" }

Si la photo est illisible ou ce n'est pas un planning :
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

async function callGeminiWithRetry({ apiKey, systemPrompt, userPrompt, imageBase64, mimeType, attempt = 0 }) {
  const MAX_ATTEMPTS = 2;
  // gemini-2.0-flash-lite : meilleur free tier disponible (30 RPM, 1500 RPD)
  // et capacités vision suffisantes pour OCR de planning hospitalier.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;
  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: userPrompt }
          ]
        }],
        generationConfig: {
          temperature: 0.0,
          responseMimeType: 'application/json',
          maxOutputTokens: 4096
        }
      })
    });
  } catch (e) {
    return { error: 'network', message: String(e && e.message || e) };
  }

  if ((resp.status === 429 || resp.status === 503) && attempt < MAX_ATTEMPTS - 1) {
    const baseDelay = 1500 * Math.pow(2, attempt); // 1.5s, 3s, 6s
    const jitter = Math.random() * 2000;
    await new Promise(r => setTimeout(r, baseDelay + jitter));
    return callGeminiWithRetry({ apiKey, systemPrompt, userPrompt, imageBase64, mimeType, attempt: attempt + 1 });
  }

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    let parsedMsg = '';
    try {
      const j = JSON.parse(errBody);
      parsedMsg = (j && j.error && (j.error.message || j.error.status)) || '';
    } catch (e) { parsedMsg = errBody.slice(0, 200); }
    return { error: 'gemini_error', status: resp.status, message: parsedMsg, body: errBody.slice(0, 400) };
  }

  let data;
  try { data = await resp.json(); }
  catch (e) { return { error: 'unparsable_json' }; }

  const text = data && data.candidates && data.candidates[0]
    && data.candidates[0].content && data.candidates[0].content.parts
    && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
  if (!text) return { error: 'empty_response' };
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
    if (!env.GEMINI_API_KEY) {
      return jsonResponse({ error: 'server_misconfigured', detail: 'GEMINI_API_KEY missing' }, 500, origin);
    }

    let body;
    try { body = await request.json(); }
    catch (e) { return jsonResponse({ error: 'invalid_json' }, 400, origin); }

    const { imageBase64, mimeType, firstName, lastName, year, month } = body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return jsonResponse({ error: 'missing_image' }, 400, origin);
    }
    if (imageBase64.length > 7_000_000) {
      return jsonResponse({ error: 'image_too_large' }, 413, origin);
    }
    if (!firstName || !lastName) {
      return jsonResponse({ error: 'missing_identity' }, 400, origin);
    }

    const userPrompt = `Utilisateur connecté : ${firstName} ${lastName} (variantes attendues : "${firstName} ${lastName}", "${String(lastName).toUpperCase()} ${firstName}", "${String(lastName).toUpperCase()} ${firstName.charAt(0)}.", "${firstName.charAt(0)}. ${String(lastName).toUpperCase()}").

Contexte temporel : ${month && year ? `mois ${month}/${year}` : `année ${year || new Date().getFullYear()}`}. Si la photo couvre un mois différent, déduis-le des en-têtes de colonnes.

Extrais uniquement la ligne de cet agent. Retourne le JSON strict.`;

    const result = await callGeminiWithRetry({
      apiKey: env.GEMINI_API_KEY,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      imageBase64,
      mimeType: mimeType || 'image/jpeg'
    });

    if (result.error) {
      const status = result.error === 'rate_limit' ? 429 : 502;
      return jsonResponse({
        error: result.error,
        status: result.status,
        message: result.message || 'Service Vision indisponible',
        body: result.body
      }, status, origin);
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

    return jsonResponse({
      found: true,
      states: cleanStates,
      count: Object.keys(cleanStates).length,
      dropped
    }, 200, origin);
  }
};
