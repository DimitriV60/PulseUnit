/**
 * Cloud Functions PulseUnit.
 *
 * scanPlanning : Callable function recevant une image de planning + l'identité
 * de l'utilisateur connecté, appelle Claude Vision pour extraire UNIQUEMENT
 * la ligne du planning correspondant à cet utilisateur, retourne un mapping
 * { 'YYYY-MM-DD': stateId } prêt à merger dans Firestore PLANS_DOC.
 *
 * Sécurité : auth Firebase obligatoire (request.auth), clé API Anthropic
 * stockée dans Firebase Secret Manager (jamais côté client).
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

// États PulseUnit (alignés sur src/features/planning-ca/config.js)
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
  "states": { "YYYY-MM-DD": "jour", "YYYY-MM-DD": "nuit", ... }
}

Si le nom n'est pas trouvé sur le planning :
{ "found": false, "reason": "Nom non trouvé sur la photo" }

Si la photo est illisible ou ce n'est pas un planning :
{ "found": false, "reason": "Image non exploitable comme planning" }

Aucune autre clé, aucun texte hors JSON.`;

exports.scanPlanning = onCall({
  region: 'europe-west1',
  secrets: [ANTHROPIC_API_KEY],
  cors: true,
  memory: '512MiB',
  timeoutSeconds: 60
}, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Connexion requise pour scanner un planning.');
  }

  const { imageBase64, mimeType, firstName, lastName, year, month } = request.data || {};

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new HttpsError('invalid-argument', 'Image manquante.');
  }
  if (imageBase64.length > 7_000_000) {
    throw new HttpsError('invalid-argument', 'Image trop volumineuse (>5 Mo).');
  }
  if (!firstName || !lastName) {
    throw new HttpsError('invalid-argument', 'Identité utilisateur manquante.');
  }

  const userPrompt = `Utilisateur connecté : ${firstName} ${lastName} (variantes attendues : "${firstName} ${lastName}", "${lastName.toUpperCase()} ${firstName}", "${lastName.toUpperCase()} ${firstName.charAt(0)}.", "${firstName.charAt(0)}. ${lastName.toUpperCase()}").

Contexte temporel : ${month && year ? `mois ${month}/${year}` : `année ${year || new Date().getFullYear()}`}. Si la photo couvre un mois différent, déduis-le des en-têtes de colonnes.

Extrais uniquement la ligne de cet agent. Retourne le JSON.`;

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

  let resp;
  try {
    resp = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: imageBase64 } },
          { type: 'text', text: userPrompt }
        ]
      }]
    });
  } catch (e) {
    console.error('Anthropic API error', e);
    throw new HttpsError('internal', 'Erreur de communication avec le service de scan.');
  }

  const textBlock = (resp.content || []).find(b => b.type === 'text');
  if (!textBlock) {
    throw new HttpsError('internal', 'Réponse Vision invalide.');
  }

  let parsed;
  try {
    const txt = textBlock.text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    parsed = JSON.parse(txt);
  } catch (e) {
    console.error('JSON parse error, raw:', textBlock.text);
    throw new HttpsError('internal', 'Format de réponse Vision non parsable.');
  }

  if (!parsed.found) {
    return { found: false, reason: parsed.reason || 'Ligne utilisateur non identifiée.' };
  }

  // Sanitize : ne garder que les dates valides + états valides
  const cleanStates = {};
  let dropped = 0;
  for (const [date, state] of Object.entries(parsed.states || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { dropped++; continue; }
    if (!VALID_STATES.includes(state)) { dropped++; continue; }
    cleanStates[date] = state;
  }

  return {
    found: true,
    states: cleanStates,
    count: Object.keys(cleanStates).length,
    dropped
  };
});
