/**
 * Bed notes — 7 emplacements par lit, étiquetés par date+heure de création.
 * Clé : slot_X:bedId — bed-scopée, persistante jusqu'au TTL.
 *
 * Deux niveaux de visibilité :
 *   - text (observations) : PRIVÉ par utilisateur — bedNotesData[userId][slotKey]
 *   - survey (surveillance horaire) : PARTAGÉ entre les agents assignés au lit
 *     bedNotesData['__shared_survey__'][bedId]['slot_X'] = { survey, createdAt,
 *     updatedAt, lastEditorId }
 *
 * Sync Firestore (BEDNOTES_DOC) + cache localStorage offline.
 * Snapshot temps réel multi-appareils. Continuité forward : la note apparaît
 * sur la carte lit dès la date de création et tous les jours suivants
 * (createdAt ≤ shiftDate), jamais avant.
 * Double-tap carte lit → ouvre la note.
 */

var _lastBedTapTime = {};
var _currentNotesBed = null;
var _activeNoteSlot = 0;
const BED_NOTE_TTL = 7 * 24 * 60 * 60 * 1000;
// 2026-05-03 — passé de 5 à 7 slots (demande Dimitri pour la case IDE Tech).
const NOTE_SLOTS = 7;
const SHARED_KEY = 'sharedSurvey';
const TECH_KEY = 'techNotes'; // notes techniques chambres : visibles uniquement par l'IDE Tech courant
const LEGACY_SHARED_KEYS = ['__shared_survey__']; // anciennes versions — Firestore rejette __.*__
const TECH_BED_ID = 'tech_ide'; // bedId virtuel pour les notes personnelles de l'IDE Tech

const SURVEY_ROWS = [
    { id: 'temp',    label: 'Température',       unit: '°C',       group: 'hemo'  },
    { id: 'ta',      label: 'TA',                unit: 'mmHg',     group: 'hemo'  },
    { id: 'pam',     label: 'PAM',               unit: 'mmHg',     group: 'hemo'  },
    { id: 'pouls',   label: 'Pouls',             unit: '/min',     group: 'hemo'  },
    { id: 'sat',     label: 'Saturation',        unit: '%',        group: 'hemo'  },
    { id: 'dextro',  label: 'Dextro / Insuline', unit: 'g/L · UI', group: 'hemo'  },
    { id: 'hemocu',  label: 'Hémocu',            unit: 'g/dL',     group: 'hemo'  },
    { id: 'diurese', label: 'Diurèse',           unit: 'ml/h',     group: 'hemo'  },
    { id: 'eva',     label: 'EVA',               unit: '/10',      group: 'hemo'  },
    { id: 'o2',      label: 'O₂ V/min',          unit: 'L/min',    group: 'venti' },
    { id: 'iot',     label: 'Repère IOT',        unit: 'cm',       group: 'venti' },
    { id: 'vi',      label: 'VI',                unit: 'ml',       group: 'venti' },
    { id: 've',      label: 'Ve',                unit: 'ml',       group: 'venti' },
    { id: 'vm',      label: 'Vm',                unit: 'L/min',    group: 'venti' },
    { id: 'fio2',    label: 'FIO₂',              unit: '%',        group: 'venti' },
    { id: 'fr',      label: 'FR',                unit: '/min',     group: 'venti' },
    { id: 'pep',     label: 'Pep',               unit: 'cmH₂O',    group: 'venti' },
    { id: 'pp',      label: 'Pp',                unit: 'cmH₂O',    group: 'venti' },
    { id: 'pt',      label: 'Pcrête',            unit: 'cmH₂O',    group: 'venti' },
    { id: 'ai',      label: 'AI',                unit: 'cmH₂O',    group: 'venti' },
    { id: 'no',      label: 'NO',                unit: 'ppm',      group: 'venti' }
];

const SURVEY_HOURS_JOUR = ['10h', '14h', '18h'];
const SURVEY_HOURS_NUIT = ['22h', '02h', '06h'];

window.bedNotesData = {};
window._bedNotesSavePending = false;

function _dateOnlyFromShiftKey(shiftKey) {
    if (!shiftKey) return null;
    return shiftKey.split('-').slice(0, 3).join('-');
}

function _shiftTypeFromShiftKey(shiftKey) {
    if (!shiftKey) return 'jour';
    return shiftKey.includes('-nuit') ? 'nuit' : 'jour';
}

function _surveyHoursForCurrentShift() {
    const t = _shiftTypeFromShiftKey(typeof currentShiftKey !== 'undefined' ? currentShiftKey : null);
    return t === 'nuit' ? SURVEY_HOURS_NUIT : SURVEY_HOURS_JOUR;
}

function _dateOnlyFromTimestamp(ts) {
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function _slotKey(slot, bedId) {
    return 'slot_' + slot + ':' + bedId;
}

function _isSurveyEmpty(survey) {
    if (!survey || typeof survey !== 'object') return true;
    return !Object.values(survey).some(arr => Array.isArray(arr) && arr.some(v => (v || '').toString().trim() !== ''));
}

function _isTextOnlyNoteEmpty(n) {
    if (!n) return true;
    return (n.text || '').trim() === '';
}

function _migrateLegacyKeys(notes) {
    const migrated = {};
    let changed = false;
    Object.keys(notes).forEach(k => {
        const parts = k.split(':');
        // v2 (date-scopée) : slot_X:YYYY-MM-DD:bedId → slot_X:bedId, garder la plus récente en cas de conflit
        if (parts.length === 3 && parts[0].startsWith('slot_')) {
            const newKey = parts[0] + ':' + parts[2];
            const incoming = notes[k];
            const existing = migrated[newKey];
            if (!existing) {
                migrated[newKey] = incoming;
            } else {
                const incTs = incoming.updatedAt || incoming.createdAt || 0;
                const exTs = existing.updatedAt || existing.createdAt || 0;
                if (incTs > exTs) migrated[newKey] = incoming;
            }
            changed = true;
        } else {
            migrated[k] = notes[k];
        }
    });
    return { notes: migrated, changed };
}

function _pruneExpired(notes) {
    const cutoff = Date.now() - BED_NOTE_TTL;
    Object.keys(notes).forEach(k => { if (notes[k].createdAt < cutoff) delete notes[k]; });
    return notes;
}

function _pruneExpiredShared(shared) {
    const cutoff = Date.now() - BED_NOTE_TTL;
    Object.keys(shared).forEach(bedId => {
        const slots = shared[bedId];
        Object.keys(slots).forEach(slotKey => {
            if ((slots[slotKey].createdAt || 0) < cutoff) delete slots[slotKey];
        });
        if (Object.keys(slots).length === 0) delete shared[bedId];
    });
    return shared;
}

// --- Survey partagé ----------------------------------------------------------

function _migrateLegacySharedKeys() {
    if (!window.bedNotesData) return false;
    let migrated = false;
    LEGACY_SHARED_KEYS.forEach(legacy => {
        const old = window.bedNotesData[legacy];
        if (!old || typeof old !== 'object') return;
        if (!window.bedNotesData[SHARED_KEY]) window.bedNotesData[SHARED_KEY] = {};
        const cur = window.bedNotesData[SHARED_KEY];
        for (const [bedId, slots] of Object.entries(old)) {
            if (!cur[bedId]) cur[bedId] = {};
            for (const [slotKey, data] of Object.entries(slots)) {
                const existing = cur[bedId][slotKey];
                const incTs = (data && data.updatedAt) || (data && data.createdAt) || 0;
                const exTs = existing ? ((existing.updatedAt) || (existing.createdAt) || 0) : 0;
                if (!existing || incTs > exTs) cur[bedId][slotKey] = data;
            }
        }
        delete window.bedNotesData[legacy];
        migrated = true;
    });
    return migrated;
}

function _getSharedAll() {
    if (!window.bedNotesData) window.bedNotesData = {};
    if (_migrateLegacySharedKeys()) {
        try { localStorage.setItem('pu_bn_shared', JSON.stringify(window.bedNotesData[SHARED_KEY] || {})); } catch (e) {}
    }
    if (!window.bedNotesData[SHARED_KEY]) window.bedNotesData[SHARED_KEY] = {};
    return _pruneExpiredShared(window.bedNotesData[SHARED_KEY]);
}

function _getSharedSurvey(bedId, slot) {
    const all = _getSharedAll();
    const bed = all[bedId];
    if (!bed) return null;
    return bed['slot_' + slot] || null;
}

// 2026-05-03 — Helper Firestore : REMPLACE la valeur d'un champ top-level
// (pas de deep-merge). Indispensable pour que les suppressions locales de
// slots soient répliquées côté serveur — sinon le snapshot rapatrie les
// clés supprimées (bug "la note revient après suppression" — Dimitri).
// Fallback set si le document n'existe pas encore.
function _bedNotesFirestoreReplace(fieldKey, value) {
    if (typeof BEDNOTES_DOC === 'undefined' || !BEDNOTES_DOC) return Promise.resolve();
    window._bedNotesSavePending = true;
    return BEDNOTES_DOC.update({ [fieldKey]: value })
        .then(() => { window._bedNotesSavePending = false; })
        .catch(e => {
            if (e && (e.code === 'not-found' || /No document/i.test(e.message || ''))) {
                return BEDNOTES_DOC.set({ [fieldKey]: value })
                    .then(() => { window._bedNotesSavePending = false; });
            }
            window._bedNotesSavePending = false;
            console.warn('Bed notes Firestore replace error', e);
        });
}

function _persistSharedAll(shared) {
    if (!window.bedNotesData) window.bedNotesData = {};
    window.bedNotesData[SHARED_KEY] = shared;
    try { localStorage.setItem('pu_bn_shared', JSON.stringify(shared)); } catch (e) {}
    _bedNotesFirestoreReplace(SHARED_KEY, shared);
}

function _saveSharedSurvey(bedId, slot, survey, prevCreatedAt) {
    if (!currentUser) return;
    const all = _getSharedAll();
    if (!all[bedId]) all[bedId] = {};
    const slotKey = 'slot_' + slot;
    if (_isSurveyEmpty(survey)) {
        delete all[bedId][slotKey];
        if (Object.keys(all[bedId]).length === 0) delete all[bedId];
    } else {
        const now = Date.now();
        all[bedId][slotKey] = {
            survey,
            createdAt: prevCreatedAt || now,
            updatedAt: now,
            lastEditorId: currentUser.id
        };
    }
    _persistSharedAll(all);
}

// --- Tech notes par chambre (visibles uniquement par l'IDE Tech courant) ---
// Schéma : bedNotesData[TECH_KEY][bedId]['slot_X'] = {
//   text, createdAt, updatedAt, lastEditorId, lastEditorName,
//   editLog: [ { at, byId, byName, preview }, ... ]  (capé à 20 entrées)
// }
// Demande Dimitri 2026-05-03 — heurodatage log + accès restreint au tech IDE.

function _getTechAll() {
    if (!window.bedNotesData) window.bedNotesData = {};
    if (!window.bedNotesData[TECH_KEY]) window.bedNotesData[TECH_KEY] = {};
    // Purge entries > TTL
    const cutoff = Date.now() - BED_NOTE_TTL;
    const all = window.bedNotesData[TECH_KEY];
    Object.keys(all).forEach(bedId => {
        const slots = all[bedId];
        Object.keys(slots).forEach(slotKey => {
            if ((slots[slotKey].createdAt || 0) < cutoff) delete slots[slotKey];
        });
        if (Object.keys(slots).length === 0) delete all[bedId];
    });
    return all;
}

function _getTechNote(bedId, slot) {
    const all = _getTechAll();
    const bed = all[bedId];
    if (!bed) return null;
    return bed['slot_' + slot] || null;
}

function _persistTechAll(all) {
    if (!window.bedNotesData) window.bedNotesData = {};
    window.bedNotesData[TECH_KEY] = all;
    try { localStorage.setItem('pu_bn_tech', JSON.stringify(all)); } catch (e) {}
    _bedNotesFirestoreReplace(TECH_KEY, all);
}

function _saveTechNote(bedId, slot, text) {
    if (!currentUser) return;
    const all = _getTechAll();
    if (!all[bedId]) all[bedId] = {};
    const slotKey = 'slot_' + slot;
    const trimmed = (text || '').trim();
    if (!trimmed) {
        // Supprime la note si vide
        delete all[bedId][slotKey];
        if (Object.keys(all[bedId]).length === 0) delete all[bedId];
    } else {
        const now = Date.now();
        const prev = all[bedId][slotKey];
        const editLog = (prev && Array.isArray(prev.editLog)) ? prev.editLog.slice() : [];
        // Append nouvelle entrée si le texte a changé
        if (!prev || prev.text !== trimmed) {
            editLog.push({
                at: now,
                byId: currentUser.id,
                byName: `${currentUser.firstName || ''} ${(currentUser.lastName || '').toUpperCase()}`.trim(),
                preview: trimmed.slice(0, 80)
            });
            // Cap à 20 dernières entrées pour éviter croissance sans limite
            if (editLog.length > 20) editLog.splice(0, editLog.length - 20);
        }
        all[bedId][slotKey] = {
            text: trimmed,
            createdAt: prev ? prev.createdAt : now,
            updatedAt: now,
            lastEditorId: currentUser.id,
            lastEditorName: `${currentUser.firstName || ''} ${(currentUser.lastName || '').toUpperCase()}`.trim(),
            editLog
        };
    }
    _persistTechAll(all);
}

/**
 * Indique si un lit (bedId réel, pas TECH_BED_ID) possède au moins une tech
 * note non vide (dans ses 7 slots, dans le TTL). Utilisé pour la pastille
 * "🛠" sur les cartes lit côté IDE Tech.
 */
window.hasTechNotesForBed = function hasTechNotesForBed(bedId) {
    if (!bedId || bedId === TECH_BED_ID) return false;
    const all = _getTechAll();
    const bed = all[bedId];
    if (!bed) return false;
    return Object.values(bed).some(n => n && (n.text || '').trim() !== '');
};

/**
 * Liste les chambres possédant au moins une tech note (label lisible).
 * Format : [{ bedId, label }, ...].  Utilisé pour la notification de bienvenue
 * de l'IDE Tech au login / à la prise de slot.
 */
window.getRoomsWithTechNotes = function getRoomsWithTechNotes() {
    const all = _getTechAll();
    const out = [];
    Object.keys(all).forEach(bedId => {
        if (bedId === TECH_BED_ID) return;
        const slots = all[bedId];
        const hasContent = Object.values(slots).some(n => n && (n.text || '').trim() !== '');
        if (!hasContent) return;
        const parts = bedId.split('-');
        const label = parts[0] === 'rea' ? `RÉA ${parts[1]}` : (parts[0] === 'usip' ? `USIP ${parts[1]}` : bedId);
        out.push({ bedId, label });
    });
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
};

/**
 * Notifie l'IDE Tech qu'il y a des tech notes dans certaines chambres.
 * Appelée au moment où un IDE prend le slot tech, ou après login si déjà tech.
 * Utilise un toast (immédiat, visible) + un push notif local (fond / OS).
 * Idempotent par garde : ne re-notifie pas pour la même garde tant que rien
 * n'a changé (clé pu_techn_notif:<shiftKey>).
 */
window.notifyTechIdeOfPendingNotes = function notifyTechIdeOfPendingNotes() {
    if (!currentUser) return;
    if (typeof shiftHistory === 'undefined' || typeof currentShiftKey === 'undefined') return;
    const h = shiftHistory[currentShiftKey];
    if (!h || h.techIdeId !== currentUser.id) return;
    const rooms = window.getRoomsWithTechNotes();
    if (!rooms || rooms.length === 0) return;
    const stamp = rooms.map(r => r.bedId).sort().join('|');
    const cacheKey = 'pu_techn_notif:' + currentShiftKey + ':' + currentUser.id;
    try {
        if (localStorage.getItem(cacheKey) === stamp) return;
        localStorage.setItem(cacheKey, stamp);
    } catch (e) {}
    const labels = rooms.map(r => r.label).join(', ');
    const title = '🛠 Notes tech en attente';
    const body = rooms.length === 1
        ? `Note tech présente : ${labels}`
        : `Notes tech présentes : ${labels}`;
    if (typeof window.showLocalPushNotif === 'function') {
        window.showLocalPushNotif(title, body, { type: 'tech_notes' });
    } else if (typeof showToast === 'function') {
        showToast('🛠 ' + body);
    }
};

// --- Migration des survey privés vers le partagé ----------------------------

function _migratePrivateSurveysToShared(userNotes) {
    const shared = _getSharedAll();
    let userChanged = false;
    let sharedChanged = false;
    Object.keys(userNotes).forEach(k => {
        const n = userNotes[k];
        if (!n || !n.survey || _isSurveyEmpty(n.survey)) return;
        // Extraire bedId depuis la clé slot_X:bedId
        const parts = k.split(':');
        if (parts.length !== 2 || !parts[0].startsWith('slot_')) return;
        const slotIdx = parts[0].slice(5); // après 'slot_'
        const bedId = parts[1];
        if (!shared[bedId]) shared[bedId] = {};
        const slotKey = 'slot_' + slotIdx;
        const existingShared = shared[bedId][slotKey];
        const incomingTs = n.updatedAt || n.createdAt || 0;
        const existingTs = existingShared ? (existingShared.updatedAt || existingShared.createdAt || 0) : 0;
        if (!existingShared || incomingTs > existingTs) {
            shared[bedId][slotKey] = {
                survey: n.survey,
                createdAt: existingShared ? existingShared.createdAt : (n.createdAt || Date.now()),
                updatedAt: incomingTs || Date.now(),
                lastEditorId: currentUser ? currentUser.id : null
            };
            sharedChanged = true;
        }
        // Retire le survey du privé pour éviter doublon
        delete n.survey;
        // Si la note privée n'a plus de texte non plus, la supprimer
        if (_isTextOnlyNoteEmpty(n)) {
            delete userNotes[k];
        }
        userChanged = true;
    });
    if (sharedChanged) _persistSharedAll(shared);
    return userChanged;
}

// --- Notes utilisateur (texte uniquement après migration) -------------------

function _getBedNotes() {
    if (!currentUser) return {};
    let notes = (window.bedNotesData && window.bedNotesData[currentUser.id]) ? { ...window.bedNotesData[currentUser.id] } : null;
    if (!notes) {
        try {
            const raw = localStorage.getItem('pu_bn_' + currentUser.id);
            notes = raw ? JSON.parse(raw) : {};
        } catch (e) { notes = {}; }
    }
    const mig = _migrateLegacyKeys(notes);
    let dirty = mig.changed;
    if (_migratePrivateSurveysToShared(mig.notes)) dirty = true;
    if (dirty) {
        window.bedNotesData[currentUser.id] = mig.notes;
        try { localStorage.setItem('pu_bn_' + currentUser.id, JSON.stringify(mig.notes)); } catch (e) {}
        _bedNotesFirestoreReplace(currentUser.id, mig.notes);
    }
    return _pruneExpired(mig.notes);
}

function _saveBedNotes(notes) {
    if (!currentUser) return;
    window.bedNotesData[currentUser.id] = notes;
    try { localStorage.setItem('pu_bn_' + currentUser.id, JSON.stringify(notes)); } catch (e) {}
    _bedNotesFirestoreReplace(currentUser.id, notes);
}

window.loadBedNotes = async function loadBedNotes() {
    if (typeof BEDNOTES_DOC === 'undefined' || !BEDNOTES_DOC) return;
    try {
        const doc = await BEDNOTES_DOC.get({ source: 'server' });
        if (doc.exists && doc.data()) {
            window.bedNotesData = doc.data();
            if (currentUser && window.bedNotesData[currentUser.id]) {
                try { localStorage.setItem('pu_bn_' + currentUser.id, JSON.stringify(window.bedNotesData[currentUser.id])); } catch (e) {}
            }
            if (window.bedNotesData[SHARED_KEY]) {
                try { localStorage.setItem('pu_bn_shared', JSON.stringify(window.bedNotesData[SHARED_KEY])); } catch (e) {}
            }
            if (window.bedNotesData[TECH_KEY]) {
                try { localStorage.setItem('pu_bn_tech', JSON.stringify(window.bedNotesData[TECH_KEY])); } catch (e) {}
            }
        }
    } catch (e) { console.warn('loadBedNotes error', e); }
};

window.applyBedNotesSnapshot = function applyBedNotesSnapshot(data) {
    if (!data) return;
    window.bedNotesData = data;
    if (currentUser && data[currentUser.id]) {
        try { localStorage.setItem('pu_bn_' + currentUser.id, JSON.stringify(data[currentUser.id])); } catch (e) {}
    }
    if (data[SHARED_KEY]) {
        try { localStorage.setItem('pu_bn_shared', JSON.stringify(data[SHARED_KEY])); } catch (e) {}
    }
    if (data[TECH_KEY]) {
        try { localStorage.setItem('pu_bn_tech', JSON.stringify(data[TECH_KEY])); } catch (e) {}
    }
    if (_currentNotesBed) {
        _renderNoteTabsUI();
        const notes = _getBedNotes();
        const existing = notes[_slotKey(_activeNoteSlot, _currentNotesBed)];
        const textarea = document.getElementById('bed-note-text');
        if (textarea && document.activeElement !== textarea) {
            textarea.value = existing ? (existing.text || '') : '';
        }
        const ae = document.activeElement;
        const inSurvey = ae && ae.id && ae.id.startsWith('survey-cell-');
        if (!inSurvey) {
            const sharedSlot = _getSharedSurvey(_currentNotesBed, _activeNoteSlot);
            _populateSurveyValues(sharedSlot ? sharedSlot.survey : null);
            _renderSurveyMetaUI(sharedSlot);
        }
    }
    if (typeof renderApp === 'function') renderApp();
};

function _slotHasContent(slotIdx, bedId, userNotes) {
    const own = userNotes[_slotKey(slotIdx, bedId)];
    if (own && !_isTextOnlyNoteEmpty(own)) return true;
    const shared = _getSharedSurvey(bedId, slotIdx);
    if (shared && !_isSurveyEmpty(shared.survey)) return true;
    // 2026-05-03 — inclut les tech notes pour activer le bouton Supprimer
    // côté IDE Tech (sans tech note préexistante).
    const tech = (typeof _getTechNote === 'function') ? _getTechNote(bedId, slotIdx) : null;
    if (tech && (tech.text || '').trim() !== '') return true;
    return false;
}

/**
 * Cherche le createdAt du contenu d'un slot, en testant les 3 sources
 * (notes privées, survey partagé, tech notes). Retourne 0 si vide.
 */
function _slotEarliestCreatedAt(slotIdx, bedId, userNotes) {
    let ts = 0;
    const own = userNotes[_slotKey(slotIdx, bedId)];
    if (own && own.createdAt) ts = ts ? Math.min(ts, own.createdAt) : own.createdAt;
    const shared = _getSharedSurvey(bedId, slotIdx);
    if (shared && shared.createdAt) ts = ts ? Math.min(ts, shared.createdAt) : shared.createdAt;
    const tech = (typeof _getTechNote === 'function') ? _getTechNote(bedId, slotIdx) : null;
    if (tech && tech.createdAt) ts = ts ? Math.min(ts, tech.createdAt) : tech.createdAt;
    return ts;
}

function _formatTabStamp(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mn = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}\n${hh}h${mn}`;
}

function _renderNoteTabsUI() {
    const container = document.getElementById('bed-note-tabs');
    if (!container || !_currentNotesBed) return;
    const notes = _getBedNotes();
    let html = '';
    for (let i = 0; i < NOTE_SLOTS; i++) {
        const hasNote = _slotHasContent(i, _currentNotesBed, notes);
        const isActive = _activeNoteSlot === i;
        // 2026-05-03 — label = date+heure de création si la note existe,
        // sinon '+ Vide' (pour permettre la création d'une nouvelle note).
        let label;
        if (hasNote) {
            const ts = _slotEarliestCreatedAt(i, _currentNotesBed, notes);
            label = ts ? _formatTabStamp(ts) : '●';
        } else {
            label = '+ Vide';
        }
        html += `<button data-action="switchBedNoteTab:${i}" style="flex:1; min-width:62px; padding:6px 3px; border-radius:8px; border:1px solid ${isActive ? 'var(--brand-aqua)' : 'var(--border)'}; background:${isActive ? 'rgba(64,206,234,0.12)' : 'transparent'}; color:${isActive ? 'var(--brand-aqua)' : (hasNote ? 'var(--text)' : 'var(--text-muted)')}; font-weight:${isActive ? '900' : '700'}; font-size:0.7rem; cursor:pointer; transition:all 0.15s; line-height:1.15; white-space:pre;">${label}</button>`;
    }
    container.innerHTML = html;
}

function _renderSurveyGridUI() {
    const container = document.getElementById('bed-note-survey');
    if (!container) return;
    const hours = _surveyHoursForCurrentShift();
    let html = '';
    html += `<div style="display:grid; grid-template-columns: minmax(0, 1.1fr) repeat(3, minmax(0, 1fr)); gap:3px; align-items:stretch; width:100%;">`;
    html += `<div style="font-weight:800; color:var(--text-muted); padding:6px 2px; font-size:0.72rem;">Paramètre</div>`;
    hours.forEach(h => {
        html += `<div style="font-weight:900; color:var(--brand-aqua); padding:6px 2px; text-align:center; font-size:0.78rem;">${h}</div>`;
    });
    let lastGroup = null;
    SURVEY_ROWS.forEach(row => {
        if (lastGroup && lastGroup !== row.group) {
            html += `<div style="grid-column:1 / -1; height:1px; background:var(--border); margin:3px 0;"></div>`;
        }
        lastGroup = row.group;
        const groupColor = row.group === 'venti' ? 'var(--brand-purple, #9b6dff)' : 'var(--text)';
        html += `<div style="padding:4px 2px; font-weight:700; color:${groupColor}; line-height:1.15; min-width:0; overflow:hidden;">
            <div style="font-size:0.78rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${row.label} (${row.unit})">${row.label}</div>
            <div style="font-size:0.62rem; color:var(--text-muted); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${row.unit}</div>
        </div>`;
        for (let c = 0; c < 3; c++) {
            html += `<input type="text" id="survey-cell-${row.id}-${c}" inputmode="decimal" autocomplete="off" style="width:100%; padding:6px 2px; border-radius:6px; border:1px solid var(--border); background:var(--surface-sec); color:var(--text); font-size:0.88rem; font-weight:700; text-align:center; box-sizing:border-box; outline:none; min-width:0;" />`;
        }
    });
    html += `</div>`;
    container.innerHTML = html;
}

function _renderSurveyMetaUI(sharedSlot) {
    const el = document.getElementById('bed-note-survey-meta');
    if (!el) return;
    if (!sharedSlot || _isSurveyEmpty(sharedSlot.survey)) {
        el.style.display = 'none';
        el.textContent = '';
        return;
    }
    const ts = sharedSlot.updatedAt || sharedSlot.createdAt;
    const dt = new Date(ts);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    const mn = String(dt.getMinutes()).padStart(2, '0');
    let editorLabel = '—';
    const editorId = sharedSlot.lastEditorId;
    if (editorId && typeof roster !== 'undefined' && Array.isArray(roster)) {
        const p = roster.find(r => r.id === editorId);
        if (p) editorLabel = `${p.firstName} ${(p.lastName || '').charAt(0)}.`;
        else if (currentUser && currentUser.id === editorId) editorLabel = 'vous';
    }
    el.textContent = `🤝 Partagé — dernière modif. par ${editorLabel} le ${dd}/${mm} à ${hh}h${mn}`;
    el.style.display = 'block';
}

function _populateSurveyValues(survey) {
    SURVEY_ROWS.forEach(row => {
        const vals = (survey && Array.isArray(survey[row.id])) ? survey[row.id] : ['', '', ''];
        for (let c = 0; c < 3; c++) {
            const el = document.getElementById('survey-cell-' + row.id + '-' + c);
            if (el && document.activeElement !== el) el.value = vals[c] || '';
        }
    });
}

function _readSurveyValuesFromUI() {
    const survey = {};
    SURVEY_ROWS.forEach(row => {
        const cells = [];
        let any = false;
        for (let c = 0; c < 3; c++) {
            const el = document.getElementById('survey-cell-' + row.id + '-' + c);
            const v = el ? (el.value || '').trim() : '';
            if (v !== '') any = true;
            cells.push(v);
        }
        if (any) survey[row.id] = cells;
    });
    return survey;
}

function _loadNoteSlot(slot) {
    _activeNoteSlot = slot;
    const notes = _getBedNotes();
    const existing = notes[_slotKey(slot, _currentNotesBed)];
    const sharedSlot = _getSharedSurvey(_currentNotesBed, slot);
    const textarea = document.getElementById('bed-note-text');
    if (textarea) textarea.value = existing ? (existing.text || '') : '';
    _populateSurveyValues(sharedSlot ? sharedSlot.survey : null);
    _renderSurveyMetaUI(sharedSlot);
    const hasAny = _slotHasContent(slot, _currentNotesBed, notes);
    const deleteBtn = document.getElementById('bed-note-delete-btn');
    if (deleteBtn) deleteBtn.style.display = hasAny ? 'block' : 'none';
    const tsEl = document.getElementById('bed-note-timestamp');
    if (tsEl) {
        const ts = existing ? (existing.updatedAt || existing.createdAt) : null;
        if (ts) {
            const dt = new Date(ts);
            const dd = String(dt.getDate()).padStart(2, '0');
            const mm = String(dt.getMonth() + 1).padStart(2, '0');
            const hh = String(dt.getHours()).padStart(2, '0');
            const mn = String(dt.getMinutes()).padStart(2, '0');
            tsEl.textContent = `Observations modifiées le ${dd}/${mm} à ${hh}h${mn}`;
            tsEl.style.display = 'block';
        } else {
            tsEl.style.display = 'none';
        }
    }
    // 2026-05-03 — Tech notes : visible uniquement si user est l'IDE Tech courant
    // (ou admin) ET on est sur une chambre (pas TECH_BED_ID).
    const techSection = document.getElementById('bed-note-tech-section');
    if (techSection) {
        const isTechIde = currentUser && shiftHistory[currentShiftKey] &&
                          shiftHistory[currentShiftKey].techIdeId === currentUser.id;
        const showTech = (_currentNotesBed !== TECH_BED_ID) && (isTechIde || (typeof isAdmin === 'function' && isAdmin()));
        techSection.style.display = showTech ? '' : 'none';
        if (showTech) {
            const tArea = document.getElementById('bed-note-tech-text');
            const tLog = document.getElementById('bed-note-tech-editlog');
            const tn = _getTechNote(_currentNotesBed, slot);
            if (tArea) tArea.value = tn ? (tn.text || '') : '';
            if (tLog) {
                const log = (tn && Array.isArray(tn.editLog)) ? tn.editLog : [];
                if (log.length === 0) {
                    tLog.style.display = 'none';
                } else {
                    tLog.style.display = '';
                    const reversed = log.slice().reverse(); // plus récent en haut
                    tLog.innerHTML = '<div style="font-weight:900; color:var(--tech); margin-bottom:4px;">📜 Historique modifications</div>' +
                        reversed.slice(0, 10).map(e => {
                            const dt = new Date(e.at || 0);
                            const stamp = `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}h${String(dt.getMinutes()).padStart(2,'0')}`;
                            const by = (e.byName || e.byId || '?').toString().slice(0, 30);
                            return `<div style="padding:3px 0; border-top:1px dashed var(--border);">⏱ ${stamp} · <strong>${by}</strong></div>`;
                        }).join('');
                }
            }
        }
    }
    _renderNoteTabsUI();
}

window.switchBedNoteTab = function switchBedNoteTab(slot) {
    _loadNoteSlot(slot);
};

window.getBedNoteForCurrentUser = function getBedNoteForCurrentUser(bedId, dateOnly, canSeeShared) {
    if (!currentUser) return null;
    const date = dateOnly || _dateOnlyFromShiftKey(typeof currentShiftKey !== 'undefined' ? currentShiftKey : null);
    const notes = _getBedNotes();
    for (let i = 0; i < NOTE_SLOTS; i++) {
        const own = notes[_slotKey(i, bedId)];
        if (own && !_isTextOnlyNoteEmpty(own)) {
            if (!date || _dateOnlyFromTimestamp(own.createdAt) <= date) return own;
        }
        if (canSeeShared) {
            const shared = _getSharedSurvey(bedId, i);
            if (shared && !_isSurveyEmpty(shared.survey)) {
                if (!date || _dateOnlyFromTimestamp(shared.createdAt) <= date) return shared;
            }
        }
    }
    return null;
};

var _pendingAssignTimeout = {};
window.handleBedTap = function handleBedTap(bedId) {
    const now = Date.now();
    const last = _lastBedTapTime[bedId] || 0;
    if (now - last < 400) {
        // 2026-05-03 — double-tap détecté : on annule l'assign différé pour
        // éviter le toast "Sélectionnez-vous d'abord" parasite (Dimitri).
        _lastBedTapTime[bedId] = 0;
        if (_pendingAssignTimeout[bedId]) {
            clearTimeout(_pendingAssignTimeout[bedId]);
            _pendingAssignTimeout[bedId] = null;
        }
        openBedNote(bedId);
        return;
    }
    _lastBedTapTime[bedId] = now;
    // Différer l'assign de 400ms : si un second tap arrive entretemps, on
    // cancel et on ouvre la note à la place (sans toast intermédiaire).
    if (_pendingAssignTimeout[bedId]) clearTimeout(_pendingAssignTimeout[bedId]);
    _pendingAssignTimeout[bedId] = setTimeout(() => {
        _pendingAssignTimeout[bedId] = null;
        assignLit(bedId);
    }, 400);
};

window.openBedNote = function openBedNote(bedId) {
    if (!currentUser) { showToast('Connectez-vous pour laisser une note'); return; }
    initShiftData(currentShiftKey);
    const h = shiftHistory[currentShiftKey];
    const dateOnly = currentShiftKey.split('-').slice(0, 3).join('-');
    const meds = shiftHistory[dateOnly + '-meds'] || [];
    const isActive = (h.activeStaffIds || []).includes(currentUser.id)
                  || h.techIdeId === currentUser.id
                  || meds.includes(currentUser.id);
    if (!isActive && !isAdmin()) { showToast('⛔ Vous devez être de garde pour laisser une note'); return; }

    // 2026-05-03 — bedId virtuel TECH_BED_ID = case IDE Tech : seul l'IDE Tech
    // assigné à la garde (ou admin) peut ouvrir.
    if (bedId === TECH_BED_ID) {
        if (currentUser.id !== h.techIdeId && !isAdmin()) {
            showToast('⛔ Réservé à l\'IDE Tech de cette garde');
            return;
        }
    } else {
        const d = h.assignments?.[bedId] || {};
        const isAssigned = d.ide === currentUser.id || d.as === currentUser.id;
        const isTechIde = h.techIdeId === currentUser.id;  // IDE Tech voit les chambres en mode tech
        if (!isAssigned && !isTechIde) { showToast('⛔ Vous ne pouvez noter que les lits où vous êtes affecté'); return; }
    }
    _currentNotesBed = bedId;
    let label;
    if (bedId === TECH_BED_ID) {
        label = 'IDE TECH — Mes notes';
    } else {
        const parts = bedId.split('-');
        label = parts[0] === 'rea' ? `RÉA ${parts[1]}` : `USIP ${parts[1]}`;
    }
    document.getElementById('bed-note-bed-label').textContent = label;

    // 2026-05-03 — Visibilité conditionnelle :
    //  • tech_ide : seules les Observations privées (7 gardes perso) — pas survey/tech.
    //  • Chambre + currentUser est IDE/AS assigné(e) à ce lit : tout (survey + obs + tech si tech IDE).
    //  • Chambre + currentUser est IDE Tech non-assigné au lit : seulement Tech Notes,
    //    avec toggle 'Voir paramètres vitaux' pour révéler la surveillance.
    //    Les Observations privées sont CACHÉES car elles appartiennent à l'IDE/AS du lit.
    const _dInfo = (h.assignments || {})[bedId] || {};
    const _isAssignedToBed = currentUser && (_dInfo.ide === currentUser.id || _dInfo.as === currentUser.id);
    const _isTechIde = currentUser && h.techIdeId === currentUser.id;
    const isTechIdeOnly = (bedId !== TECH_BED_ID) && _isTechIde && !_isAssignedToBed;

    const surveyHeader = document.getElementById('bed-note-survey-section');
    const surveyGrid   = document.getElementById('bed-note-survey');
    const surveyMeta   = document.getElementById('bed-note-survey-meta');
    const surveyToggle = document.getElementById('bed-note-survey-toggle');
    const obsSection   = document.getElementById('bed-note-obs-section');
    const textarea     = document.getElementById('bed-note-text');

    let showSurvey, showObs, showSurveyToggle = false;
    if (bedId === TECH_BED_ID) {
        // Notes perso de l'IDE Tech (sa case) : observations only
        showSurvey = false;
        showObs = true;
    } else if (isTechIdeOnly) {
        // IDE Tech qui regarde une chambre où elle n'est pas IDE/AS : tech-only,
        // avec bouton optionnel pour voir vitals
        showSurvey = false;
        showObs = false;
        showSurveyToggle = true;
    } else {
        // Cas normal : IDE/AS assigné(e) au lit, ou admin
        showSurvey = true;
        showObs = true;
    }
    if (surveyHeader) surveyHeader.style.display = showSurvey ? '' : 'none';
    if (surveyGrid)   surveyGrid.style.display   = showSurvey ? '' : 'none';
    if (surveyMeta && !showSurvey) surveyMeta.style.display = 'none';
    if (surveyToggle) {
        surveyToggle.style.display = showSurveyToggle ? '' : 'none';
        surveyToggle.textContent = '📋 Voir paramètres vitaux';
    }
    if (obsSection) obsSection.style.display = showObs ? '' : 'none';
    if (textarea)   textarea.style.display   = showObs ? '' : 'none';
    _renderSurveyGridUI();
    _loadNoteSlot(_activeNoteSlot);
    document.getElementById('bed-note-modal').style.display = 'flex';
};

/**
 * Toggle surveillance horaire pour l'IDE Tech (qui n'est pas assignée au lit).
 * Permet d'accéder ponctuellement aux paramètres vitaux sans les avoir par défaut.
 */
window.toggleBedNoteSurvey = function toggleBedNoteSurvey() {
    const surveyHeader = document.getElementById('bed-note-survey-section');
    const surveyGrid = document.getElementById('bed-note-survey');
    const toggle = document.getElementById('bed-note-survey-toggle');
    if (!surveyHeader || !surveyGrid || !toggle) return;
    const isHidden = surveyHeader.style.display === 'none';
    if (isHidden) {
        surveyHeader.style.display = '';
        surveyGrid.style.display = '';
        toggle.textContent = '🔼 Masquer paramètres vitaux';
        // Repopule la grille avec les valeurs courantes
        const sharedSlot = _getSharedSurvey(_currentNotesBed, _activeNoteSlot);
        _populateSurveyValues(sharedSlot ? sharedSlot.survey : null);
        _renderSurveyMetaUI(sharedSlot);
    } else {
        surveyHeader.style.display = 'none';
        surveyGrid.style.display = 'none';
        toggle.textContent = '📋 Voir paramètres vitaux';
    }
};

window.closeBedNote = function closeBedNote() {
    document.getElementById('bed-note-modal').style.display = 'none';
    _currentNotesBed = null;
};

window.saveBedNote = function saveBedNote() {
    if (!_currentNotesBed) return;
    // 2026-05-03 — Save scoped : ne sauvegarde que les sections visibles.
    // Évite que l'IDE Tech (mode tech-only) écrase des données qu'elle ne devrait
    // pas voir/modifier.
    const obsSection = document.getElementById('bed-note-obs-section');
    const surveyGrid = document.getElementById('bed-note-survey');
    const techSection = document.getElementById('bed-note-tech-section');
    const obsVisible = obsSection && obsSection.style.display !== 'none';
    const surveyVisible = surveyGrid && surveyGrid.style.display !== 'none';
    const techVisible = techSection && techSection.style.display !== 'none';

    let savedObs = false, savedSurvey = false, savedTech = false, surveyCount = 0;

    // 1. Observations privées (textarea)
    if (obsVisible) {
        const text = document.getElementById('bed-note-text').value.trim();
        const notes = _getBedNotes();
        const key = _slotKey(_activeNoteSlot, _currentNotesBed);
        if (!text) {
            delete notes[key];
        } else {
            const prev = notes[key];
            const now = Date.now();
            notes[key] = { text, createdAt: prev ? prev.createdAt : now, updatedAt: now };
            savedObs = true;
        }
        _saveBedNotes(notes);
    }

    // 2. Surveillance partagée (uniquement chambres, pas tech_ide)
    if (surveyVisible && _currentNotesBed !== TECH_BED_ID) {
        const survey = _readSurveyValuesFromUI();
        surveyCount = Object.values(survey).reduce((n, arr) => n + arr.filter(v => (v || '').toString().trim() !== '').length, 0);
        const hasSurvey = !_isSurveyEmpty(survey);
        const prevShared = _getSharedSurvey(_currentNotesBed, _activeNoteSlot);
        _saveSharedSurvey(_currentNotesBed, _activeNoteSlot, survey, prevShared ? prevShared.createdAt : null);
        if (hasSurvey) savedSurvey = true;
    }

    // 3. Tech notes (uniquement chambres, pour IDE Tech courant)
    if (techVisible && _currentNotesBed !== TECH_BED_ID) {
        const techArea = document.getElementById('bed-note-tech-text');
        if (techArea) {
            const techText = (techArea.value || '').trim();
            const prevTech = _getTechNote(_currentNotesBed, _activeNoteSlot);
            const prevTechText = prevTech ? (prevTech.text || '') : '';
            if (techText !== prevTechText) {
                _saveTechNote(_currentNotesBed, _activeNoteSlot, techText);
                savedTech = true;
            }
        }
    }

    _loadNoteSlot(_activeNoteSlot);
    if (typeof renderApp === 'function') renderApp();
    const parts = [];
    if (savedObs)    parts.push('📝 obs.');
    if (savedSurvey) parts.push(`📋 ${surveyCount}v`);
    if (savedTech)   parts.push('🛠 tech');
    showToast(parts.length > 0 ? '✅ Enregistré — ' + parts.join(' · ') : '🧹 Note vidée');
};

window.deleteBedNote = function deleteBedNote() {
    if (!_currentNotesBed) return;
    _renderDeleteChooserUI();
    const el = document.getElementById('bed-note-delete-chooser');
    if (el) el.style.display = 'flex';
};

window.cancelDeleteBedNote = function cancelDeleteBedNote() {
    const el = document.getElementById('bed-note-delete-chooser');
    if (el) el.style.display = 'none';
};

function _renderDeleteChooserUI() {
    const el = document.getElementById('bed-note-delete-chooser');
    if (!el || !_currentNotesBed) return;
    const notes = _getBedNotes();
    const own = notes[_slotKey(_activeNoteSlot, _currentNotesBed)];
    const hasText = own && !_isTextOnlyNoteEmpty(own);
    const sharedSlot = _getSharedSurvey(_currentNotesBed, _activeNoteSlot);
    const hasSurvey = sharedSlot && !_isSurveyEmpty(sharedSlot.survey);
    const h = (typeof shiftHistory !== 'undefined' && currentShiftKey) ? shiftHistory[currentShiftKey] : null;
    const _isTechIde = !!(currentUser && h && h.techIdeId === currentUser.id);
    const _isAdmin = (typeof isAdmin === 'function') && isAdmin();
    const techNote = (_currentNotesBed !== TECH_BED_ID && (_isTechIde || _isAdmin))
        ? _getTechNote(_currentNotesBed, _activeNoteSlot) : null;
    const hasTech = techNote && (techNote.text || '').trim() !== '';
    const _assigned = (h && h.assignments && h.assignments[_currentNotesBed]) || {};
    const _isAssignedToBed = !!(currentUser && (_assigned.ide === currentUser.id || _assigned.as === currentUser.id));
    const canDeleteSurvey = _isAdmin || _isAssignedToBed;

    // Style commun pour cohérence visuelle (cartes uniformes, accent gauche par couleur)
    const _row = (accent, icon, title, sub, scope, disabled) => {
        const bg = disabled ? 'var(--surface-sec)' : 'var(--surface)';
        const opacity = disabled ? '0.55' : '1';
        const cursor = disabled ? 'default' : 'pointer';
        const click = disabled ? '' : `data-action="confirmDeleteBedNote:${scope}"`;
        const lock = disabled ? '<span style="margin-left:auto; font-size:0.95rem;">🔒</span>' : '';
        return `<div ${click} style="display:flex; align-items:center; gap:12px; padding:12px 14px; border:1px solid var(--border); border-left:4px solid ${accent}; border-radius:10px; background:${bg}; cursor:${cursor}; opacity:${opacity}; text-align:left;">
            <span style="font-size:1.2rem; line-height:1;">${icon}</span>
            <div style="flex:1; min-width:0;">
                <div style="font-weight:900; color:var(--text); font-size:0.9rem; line-height:1.25;">${title}</div>
                <div style="font-weight:700; color:var(--text-muted); font-size:0.72rem; line-height:1.3; margin-top:2px;">${sub}</div>
            </div>
            ${lock}
        </div>`;
    };

    let html = `<div style="font-weight:900; color:#fff; font-size:1.05rem; margin-bottom:14px; text-align:center; letter-spacing:0.3px;">Que supprimer ?</div>`;

    if (hasText) {
        html += _row('var(--brand-aqua)', '📝', 'Observations privées', 'Visibles par vous seul', 'text', false);
    }
    if (hasSurvey) {
        html += _row('var(--ide)', '📋', 'Surveillance partagée',
            canDeleteSurvey ? 'Paramètres vitaux — IDE + AS du lit' : 'Suppression réservée à l\'IDE/AS du lit',
            'survey', !canDeleteSurvey);
    }
    if (hasTech) {
        html += _row('var(--tech)', '🛠', 'Note IDE TECH', 'Visible par l\'IDE Tech', 'tech', false);
    }

    const _multi = [hasText, hasSurvey && canDeleteSurvey, hasTech].filter(Boolean).length >= 2;
    if (_multi) {
        html += `<div data-action="confirmDeleteBedNote:all" style="display:flex; align-items:center; justify-content:center; gap:8px; padding:12px 14px; border-radius:10px; background:var(--crit); color:#fff; font-weight:900; font-size:0.92rem; cursor:pointer; margin-top:4px; border:1px solid var(--crit);">
            <span style="font-size:1.1rem;">🗑️</span>
            <span>Tout supprimer</span>
        </div>`;
    }

    if (!hasText && !hasSurvey && !hasTech) {
        html += `<div style="color:rgba(255,255,255,0.7); font-size:0.85rem; text-align:center; padding:14px; background:rgba(255,255,255,0.05); border-radius:10px;">Rien à supprimer dans cette garde.</div>`;
    }

    html += `<button data-action="cancelDeleteBedNote" style="padding:10px; border-radius:10px; border:none; background:transparent; color:rgba(255,255,255,0.7); font-weight:700; font-size:0.85rem; cursor:pointer; margin-top:6px;">Annuler</button>`;
    el.innerHTML = html;
}

window.confirmDeleteBedNote = function confirmDeleteBedNote(scope) {
    if (!_currentNotesBed) return;
    // 2026-05-03 — Étape de confirmation avant suppression effective.
    const labels = {
        text:   'les Observations privées',
        survey: 'la Surveillance partagée (paramètres vitaux)',
        tech:   'la Note IDE TECH',
        all:    'TOUT le contenu de cette note (obs, surveillance, tech)'
    };
    const lbl = labels[scope] || 'cette note';
    if (!confirm(`⚠️ Supprimer ${lbl} ?\n\nCette action est définitive.`)) {
        return;
    }
    const h = (typeof shiftHistory !== 'undefined' && currentShiftKey) ? shiftHistory[currentShiftKey] : null;
    const _isAdmin = (typeof isAdmin === 'function') && isAdmin();
    const _assigned = (h && h.assignments && h.assignments[_currentNotesBed]) || {};
    const _isAssignedToBed = !!(currentUser && (_assigned.ide === currentUser.id || _assigned.as === currentUser.id));
    const canDeleteSurvey = _isAdmin || _isAssignedToBed;
    if (scope === 'text' || scope === 'all') {
        const notes = _getBedNotes();
        delete notes[_slotKey(_activeNoteSlot, _currentNotesBed)];
        _saveBedNotes(notes);
    }
    if ((scope === 'survey' || scope === 'all') && canDeleteSurvey) {
        _saveSharedSurvey(_currentNotesBed, _activeNoteSlot, {}, null);
    }
    if (scope === 'tech' || scope === 'all') {
        // _saveTechNote('') supprime la note (texte vide)
        if (typeof _saveTechNote === 'function') _saveTechNote(_currentNotesBed, _activeNoteSlot, '');
    }
    cancelDeleteBedNote();
    _loadNoteSlot(_activeNoteSlot);
    renderApp();
    const msg = scope === 'text'   ? '🗑️ Observations supprimées'
              : scope === 'survey' ? '🗑️ Surveillance supprimée'
              : scope === 'tech'   ? '🗑️ Note IDE TECH supprimée'
              :                      '🗑️ Tout supprimé';
    showToast(msg);
};
