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

async function callVisionAI({ env, systemPrompt, userPrompt, imageBase64 }) {
  // Cloudflare Workers AI — modèle vision Llama 3.2 11B
  // Free tier : 10 000 neurones/jour (≈ 1 000-3 000 invocations selon taille image)
  // Aucune clé API externe, aucun lien Google → plus de 429
  if (!env.AI) {
    return { error: 'ai_binding_missing', message: 'Liaison AI non configurée dans ce Worker' };
  }
  // Convertit base64 → Uint8Array (Workers AI accepte tableau d'octets)
  const binary = atob(imageBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  let resp;
  try {
    resp = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt }
      ],
      image: Array.from(bytes),
      max_tokens: 4096,
      temperature: 0.0
    });
  } catch (e) {
    return { error: 'workers_ai_error', message: String(e && e.message || e) };
  }

  // Réponse Workers AI : { response: "..." } ou { result: { response: "..." } }
  const text = (resp && (resp.response || (resp.result && resp.result.response))) || '';
  if (!text) {
    return { error: 'empty_response', message: 'Réponse Vision vide', body: JSON.stringify(resp).slice(0, 400) };
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

    const { imageBase64, firstName, lastName, year, month } = body || {};
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

Extrais uniquement la ligne de cet agent. Retourne le JSON strict (et rien d'autre).`;

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

    return jsonResponse({
      found: true,
      states: cleanStates,
      count: Object.keys(cleanStates).length,
      dropped
    }, 200, origin);
  }
};
