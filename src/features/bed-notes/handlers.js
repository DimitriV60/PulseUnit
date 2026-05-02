/**
 * Bed notes — 5 notes par lit (Garde 1 à 5), 7 jours TTL.
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

function _persistSharedAll(shared) {
    if (!window.bedNotesData) window.bedNotesData = {};
    window.bedNotesData[SHARED_KEY] = shared;
    try { localStorage.setItem('pu_bn_shared', JSON.stringify(shared)); } catch (e) {}
    if (typeof BEDNOTES_DOC !== 'undefined' && BEDNOTES_DOC) {
        window._bedNotesSavePending = true;
        BEDNOTES_DOC.set({ [SHARED_KEY]: shared }, { merge: true })
            .then(() => { window._bedNotesSavePending = false; })
            .catch(e => { window._bedNotesSavePending = false; console.warn('Bed shared survey sync error', e); });
    }
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
    if (typeof BEDNOTES_DOC !== 'undefined' && BEDNOTES_DOC) {
        window._bedNotesSavePending = true;
        BEDNOTES_DOC.set({ [TECH_KEY]: all }, { merge: true })
            .then(() => { window._bedNotesSavePending = false; })
            .catch(e => { window._bedNotesSavePending = false; console.warn('Bed tech notes sync error', e); });
    }
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
        if (typeof BEDNOTES_DOC !== 'undefined' && BEDNOTES_DOC) {
            window._bedNotesSavePending = true;
            BEDNOTES_DOC.set({ [currentUser.id]: mig.notes }, { merge: true })
                .then(() => { window._bedNotesSavePending = false; })
                .catch(e => { window._bedNotesSavePending = false; console.warn('Bed notes migration sync error', e); });
        }
    }
    return _pruneExpired(mig.notes);
}

function _saveBedNotes(notes) {
    if (!currentUser) return;
    window.bedNotesData[currentUser.id] = notes;
    try { localStorage.setItem('pu_bn_' + currentUser.id, JSON.stringify(notes)); } catch (e) {}
    if (typeof BEDNOTES_DOC !== 'undefined' && BEDNOTES_DOC) {
        window._bedNotesSavePending = true;
        BEDNOTES_DOC.set({ [currentUser.id]: notes }, { merge: true })
            .then(() => { window._bedNotesSavePending = false; })
            .catch(e => { window._bedNotesSavePending = false; console.warn('Bed notes sync error', e); });
    }
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
    return false;
}

function _renderNoteTabsUI() {
    const container = document.getElementById('bed-note-tabs');
    if (!container || !_currentNotesBed) return;
    const notes = _getBedNotes();
    let html = '';
    for (let i = 0; i < NOTE_SLOTS; i++) {
        const hasNote = _slotHasContent(i, _currentNotesBed, notes);
        const isActive = _activeNoteSlot === i;
        const dot = hasNote ? ' ●' : '';
        html += `<button onclick="switchBedNoteTab(${i})" style="flex:1; padding:8px 4px; border-radius:8px; border:1px solid ${isActive ? 'var(--brand-aqua)' : 'var(--border)'}; background:${isActive ? 'rgba(64,206,234,0.12)' : 'transparent'}; color:${isActive ? 'var(--brand-aqua)' : 'var(--text-muted)'}; font-weight:${isActive ? '900' : '700'}; font-size:0.85rem; cursor:pointer; transition:all 0.15s;">Garde ${i + 1}${dot}</button>`;
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

window.handleBedTap = function handleBedTap(bedId) {
    const now = Date.now();
    const last = _lastBedTapTime[bedId] || 0;
    _lastBedTapTime[bedId] = now;
    if (now - last < 400) {
        _lastBedTapTime[bedId] = 0;
        openBedNote(bedId);
        return;
    }
    assignLit(bedId);
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
    // 2026-05-03 — pour tech_ide on cache la section surveillance horaire
    // (vitals n'ont pas de sens sur la case IDE Tech). Pour les chambres on
    // l'affiche normalement.
    const surveyHeader = document.getElementById('bed-note-survey-section');
    const surveyGrid = document.getElementById('bed-note-survey');
    const surveyMeta = document.getElementById('bed-note-survey-meta');
    const showSurvey = bedId !== TECH_BED_ID;
    if (surveyHeader) surveyHeader.style.display = showSurvey ? '' : 'none';
    if (surveyGrid)   surveyGrid.style.display   = showSurvey ? '' : 'none';
    if (surveyMeta && !showSurvey) surveyMeta.style.display = 'none';
    _renderSurveyGridUI();
    _loadNoteSlot(_activeNoteSlot);
    document.getElementById('bed-note-modal').style.display = 'flex';
};

window.closeBedNote = function closeBedNote() {
    document.getElementById('bed-note-modal').style.display = 'none';
    _currentNotesBed = null;
};

window.saveBedNote = function saveBedNote() {
    if (!_currentNotesBed) return;
    const text = document.getElementById('bed-note-text').value.trim();
    const survey = _readSurveyValuesFromUI();
    const hasText = text !== '';
    const hasSurvey = !_isSurveyEmpty(survey);
    const surveyCount = Object.values(survey).reduce((n, arr) => n + arr.filter(v => (v || '').toString().trim() !== '').length, 0);
    // 1. Texte privé
    const notes = _getBedNotes();
    const key = _slotKey(_activeNoteSlot, _currentNotesBed);
    if (!hasText) {
        delete notes[key];
    } else {
        const prev = notes[key];
        const now = Date.now();
        notes[key] = { text, createdAt: prev ? prev.createdAt : now, updatedAt: now };
    }
    _saveBedNotes(notes);
    // 2. Survey partagé (uniquement pour les vraies chambres, pas tech_ide)
    let savedTech = false;
    if (_currentNotesBed !== TECH_BED_ID) {
        const prevShared = _getSharedSurvey(_currentNotesBed, _activeNoteSlot);
        _saveSharedSurvey(_currentNotesBed, _activeNoteSlot, survey, prevShared ? prevShared.createdAt : null);
        // 3. Tech note — uniquement si IDE Tech courant + section visible
        const techSection = document.getElementById('bed-note-tech-section');
        if (techSection && techSection.style.display !== 'none') {
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
    }
    // Refresh in-place sans fermer le modal — l'utilisateur reste dans la note
    _loadNoteSlot(_activeNoteSlot);
    if (typeof renderApp === 'function') renderApp();
    let msg;
    const parts = [];
    if (hasText) parts.push('📝 obs.');
    if (hasSurvey) parts.push(`📋 ${surveyCount}v`);
    if (savedTech) parts.push('🛠 tech');
    if (parts.length > 0) msg = '✅ Enregistré — ' + parts.join(' · ');
    else msg = '🧹 Note vidée';
    showToast(msg);
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
    let html = `<div style="font-weight:900; color:var(--text); font-size:1rem; margin-bottom:14px; text-align:center;">Que supprimer ?</div>`;
    if (hasText) {
        html += `<button onclick="confirmDeleteBedNote('text')" style="padding:12px; border-radius:10px; border:1px solid var(--border); background:var(--surface-sec); color:var(--text); font-weight:800; cursor:pointer; text-align:left;">📝 Observations privées <span style="color:var(--text-muted); font-weight:700; font-size:0.8rem;">(visible par vous seul)</span></button>`;
    }
    if (hasSurvey) {
        html += `<button onclick="confirmDeleteBedNote('survey')" style="padding:12px; border-radius:10px; border:1px solid var(--border); background:var(--surface-sec); color:var(--text); font-weight:800; cursor:pointer; text-align:left;">📋 Surveillance partagée <span style="color:var(--text-muted); font-weight:700; font-size:0.8rem;">(IDE + AS)</span></button>`;
    }
    if (hasText && hasSurvey) {
        html += `<button onclick="confirmDeleteBedNote('both')" style="padding:12px; border-radius:10px; border:1px solid var(--crit); background:var(--crit); color:white; font-weight:900; cursor:pointer;">🗑️ Tout supprimer</button>`;
    }
    if (!hasText && !hasSurvey) {
        html += `<div style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding:8px;">Rien à supprimer dans cette garde.</div>`;
    }
    html += `<button onclick="cancelDeleteBedNote()" style="padding:10px; border-radius:10px; border:none; background:transparent; color:var(--text-muted); font-weight:700; cursor:pointer; margin-top:6px;">Annuler</button>`;
    el.innerHTML = html;
}

window.confirmDeleteBedNote = function confirmDeleteBedNote(scope) {
    if (!_currentNotesBed) return;
    if (scope === 'text' || scope === 'both') {
        const notes = _getBedNotes();
        delete notes[_slotKey(_activeNoteSlot, _currentNotesBed)];
        _saveBedNotes(notes);
    }
    if (scope === 'survey' || scope === 'both') {
        _saveSharedSurvey(_currentNotesBed, _activeNoteSlot, {}, null);
    }
    cancelDeleteBedNote();
    _loadNoteSlot(_activeNoteSlot);
    renderApp();
    const msg = scope === 'text'   ? '🗑️ Observations supprimées'
              : scope === 'survey' ? '🗑️ Surveillance supprimée'
              : '🗑️ Note supprimée (texte + surveillance)';
    showToast(msg);
};
