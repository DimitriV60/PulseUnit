/**
 * Bed notes — 5 notes libres par lit par jour de garde (Garde 1 à 5), 7 jours TTL.
 * Clé : slot_X:YYYY-MM-DD:bedId — scopée par date du shift pour éviter que
 * les notes d'aujourd'hui apparaissent sur les jours antérieurs.
 * Stockage Firestore (BEDNOTES_DOC) + cache localStorage offline.
 * Sync multi-appareils via onSnapshot. Visible uniquement par l'auteur.
 * Double-tap carte lit → ouvre la note.
 */

var _lastBedTapTime = {};
var _currentNotesBed = null;
var _currentNotesDate = null;
var _activeNoteSlot = 0;
const BED_NOTE_TTL = 7 * 24 * 60 * 60 * 1000;
const NOTE_SLOTS = 5;

window.bedNotesData = {};
window._bedNotesSavePending = false;

function _dateOnlyFromShiftKey(shiftKey) {
    if (!shiftKey) return null;
    return shiftKey.split('-').slice(0, 3).join('-');
}

function _dateOnlyFromTimestamp(ts) {
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function _slotKey(slot, dateOnly, bedId) {
    return 'slot_' + slot + ':' + dateOnly + ':' + bedId;
}

function _migrateLegacyKeys(notes) {
    const migrated = {};
    let changed = false;
    Object.keys(notes).forEach(k => {
        const parts = k.split(':');
        if (parts.length === 2 && parts[0].startsWith('slot_')) {
            const ts = notes[k].createdAt || Date.now();
            const newKey = parts[0] + ':' + _dateOnlyFromTimestamp(ts) + ':' + parts[1];
            if (!migrated[newKey]) migrated[newKey] = notes[k];
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
    if (mig.changed) {
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
        }
    } catch (e) { console.warn('loadBedNotes error', e); }
};

window.applyBedNotesSnapshot = function applyBedNotesSnapshot(data) {
    if (!data) return;
    window.bedNotesData = data;
    if (currentUser && data[currentUser.id]) {
        try { localStorage.setItem('pu_bn_' + currentUser.id, JSON.stringify(data[currentUser.id])); } catch (e) {}
    }
    if (_currentNotesBed && _currentNotesDate) {
        _renderNoteTabsUI();
        const notes = _getBedNotes();
        const existing = notes[_slotKey(_activeNoteSlot, _currentNotesDate, _currentNotesBed)];
        const textarea = document.getElementById('bed-note-text');
        if (textarea && document.activeElement !== textarea) {
            textarea.value = existing ? existing.text : '';
        }
    }
    if (typeof renderApp === 'function') renderApp();
};

function _renderNoteTabsUI() {
    const container = document.getElementById('bed-note-tabs');
    if (!container || !_currentNotesBed || !_currentNotesDate) return;
    const notes = _getBedNotes();
    let html = '';
    for (let i = 0; i < NOTE_SLOTS; i++) {
        const hasNote = !!notes[_slotKey(i, _currentNotesDate, _currentNotesBed)];
        const isActive = _activeNoteSlot === i;
        const dot = hasNote ? ' ●' : '';
        html += `<button onclick="switchBedNoteTab(${i})" style="flex:1; padding:8px 4px; border-radius:8px; border:1px solid ${isActive ? 'var(--brand-aqua)' : 'var(--border)'}; background:${isActive ? 'rgba(64,206,234,0.12)' : 'transparent'}; color:${isActive ? 'var(--brand-aqua)' : 'var(--text-muted)'}; font-weight:${isActive ? '900' : '700'}; font-size:0.85rem; cursor:pointer; transition:all 0.15s;">Garde ${i + 1}${dot}</button>`;
    }
    container.innerHTML = html;
}

function _loadNoteSlot(slot) {
    _activeNoteSlot = slot;
    const notes = _getBedNotes();
    const existing = notes[_slotKey(slot, _currentNotesDate, _currentNotesBed)];
    const textarea = document.getElementById('bed-note-text');
    textarea.value = existing ? existing.text : '';
    const deleteBtn = document.getElementById('bed-note-delete-btn');
    if (deleteBtn) deleteBtn.style.display = existing ? 'block' : 'none';
    const tsEl = document.getElementById('bed-note-timestamp');
    if (tsEl) {
        if (existing) {
            const ts = existing.updatedAt || existing.createdAt;
            const dt = new Date(ts);
            const dd = String(dt.getDate()).padStart(2, '0');
            const mm = String(dt.getMonth() + 1).padStart(2, '0');
            const hh = String(dt.getHours()).padStart(2, '0');
            const mn = String(dt.getMinutes()).padStart(2, '0');
            tsEl.textContent = `Dernière modification : ${dd}/${mm} à ${hh}h${mn}`;
            tsEl.style.display = 'block';
        } else {
            tsEl.style.display = 'none';
        }
    }
    _renderNoteTabsUI();
}

window.switchBedNoteTab = function switchBedNoteTab(slot) {
    _loadNoteSlot(slot);
};

window.getBedNoteForCurrentUser = function getBedNoteForCurrentUser(bedId, dateOnly) {
    if (!currentUser) return null;
    const date = dateOnly || _dateOnlyFromShiftKey(typeof currentShiftKey !== 'undefined' ? currentShiftKey : null);
    if (!date) return null;
    const notes = _getBedNotes();
    for (let i = 0; i < NOTE_SLOTS; i++) {
        if (notes[_slotKey(i, date, bedId)]) return notes[_slotKey(i, date, bedId)];
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
    const d = h.assignments?.[bedId] || {};
    const isAssigned = d.ide === currentUser.id || d.as === currentUser.id;
    if (!isAssigned && !isAdmin()) { showToast('⛔ Vous ne pouvez noter que les lits où vous êtes affecté'); return; }
    _currentNotesBed = bedId;
    _currentNotesDate = dateOnly;
    const parts = bedId.split('-');
    const label = parts[0] === 'rea' ? `RÉA ${parts[1]}` : `USIP ${parts[1]}`;
    document.getElementById('bed-note-bed-label').textContent = label;
    _loadNoteSlot(_activeNoteSlot);
    document.getElementById('bed-note-modal').style.display = 'flex';
};

window.closeBedNote = function closeBedNote() {
    document.getElementById('bed-note-modal').style.display = 'none';
    _currentNotesBed = null;
    _currentNotesDate = null;
};

window.saveBedNote = function saveBedNote() {
    const text = document.getElementById('bed-note-text').value.trim();
    if (!_currentNotesBed || !_currentNotesDate) return;
    const notes = _getBedNotes();
    const key = _slotKey(_activeNoteSlot, _currentNotesDate, _currentNotesBed);
    if (!text) {
        delete notes[key];
    } else {
        const prev = notes[key];
        const now = Date.now();
        notes[key] = { text, createdAt: prev ? prev.createdAt : now, updatedAt: now };
    }
    _saveBedNotes(notes);
    closeBedNote();
    renderApp();
    if (text) showToast('📝 Note enregistrée');
};

window.deleteBedNote = function deleteBedNote() {
    if (!_currentNotesBed || !_currentNotesDate) return;
    const notes = _getBedNotes();
    delete notes[_slotKey(_activeNoteSlot, _currentNotesDate, _currentNotesBed)];
    _saveBedNotes(notes);
    _loadNoteSlot(_activeNoteSlot);
    renderApp();
};
