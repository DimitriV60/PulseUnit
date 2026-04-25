/**
 * Bed notes — 5 notes libres par lit (Garde 1 à 5), 7 jours TTL.
 * Stockage localStorage, visible uniquement par l'auteur.
 * Double-tap carte lit → ouvre la note.
 */

var _lastBedTapTime = {};
var _currentNotesBed = null;
var _activeNoteSlot = 0;
const BED_NOTE_TTL = 7 * 24 * 60 * 60 * 1000;
const NOTE_SLOTS = 5;

function _slotKey(slot, bedId) {
    return 'slot_' + slot + ':' + bedId;
}

function _getBedNotes() {
    if (!currentUser) return {};
    try {
        const raw = localStorage.getItem('pu_bn_' + currentUser.id);
        const notes = raw ? JSON.parse(raw) : {};
        const cutoff = Date.now() - BED_NOTE_TTL;
        Object.keys(notes).forEach(k => { if (notes[k].createdAt < cutoff) delete notes[k]; });
        return notes;
    } catch (e) { return {}; }
}

function _saveBedNotes(notes) {
    if (!currentUser) return;
    localStorage.setItem('pu_bn_' + currentUser.id, JSON.stringify(notes));
}

function _renderNoteTabsUI() {
    const container = document.getElementById('bed-note-tabs');
    if (!container || !_currentNotesBed) return;
    const notes = _getBedNotes();
    let html = '';
    for (let i = 0; i < NOTE_SLOTS; i++) {
        const hasNote = !!notes[_slotKey(i, _currentNotesBed)];
        const isActive = _activeNoteSlot === i;
        const dot = hasNote ? ' ●' : '';
        html += `<button onclick="switchBedNoteTab(${i})" style="flex:1; padding:8px 4px; border-radius:8px; border:1px solid ${isActive ? 'var(--brand-aqua)' : 'var(--border)'}; background:${isActive ? 'rgba(64,206,234,0.12)' : 'transparent'}; color:${isActive ? 'var(--brand-aqua)' : 'var(--text-muted)'}; font-weight:${isActive ? '900' : '700'}; font-size:0.85rem; cursor:pointer; transition:all 0.15s;">Garde ${i + 1}${dot}</button>`;
    }
    container.innerHTML = html;
}

function _loadNoteSlot(slot) {
    _activeNoteSlot = slot;
    const notes = _getBedNotes();
    const existing = notes[_slotKey(slot, _currentNotesBed)];
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

window.getBedNoteForCurrentUser = function getBedNoteForCurrentUser(bedId) {
    if (!currentUser) return null;
    const notes = _getBedNotes();
    for (let i = 0; i < NOTE_SLOTS; i++) {
        if (notes[_slotKey(i, bedId)]) return notes[_slotKey(i, bedId)];
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
    const isTech = h.techIdeId === currentUser.id;
    if (!isAssigned && !isTech && !isAdmin()) { showToast('⛔ Vous ne pouvez noter que vos propres lits'); return; }
    _currentNotesBed = bedId;
    const parts = bedId.split('-');
    const label = parts[0] === 'rea' ? `RÉA ${parts[1]}` : `USIP ${parts[1]}`;
    document.getElementById('bed-note-bed-label').textContent = label;
    _loadNoteSlot(_activeNoteSlot);
    document.getElementById('bed-note-modal').style.display = 'flex';
};

window.closeBedNote = function closeBedNote() {
    document.getElementById('bed-note-modal').style.display = 'none';
    _currentNotesBed = null;
};

window.saveBedNote = function saveBedNote() {
    const text = document.getElementById('bed-note-text').value.trim();
    if (!_currentNotesBed) return;
    const notes = _getBedNotes();
    if (!text) {
        delete notes[_slotKey(_activeNoteSlot, _currentNotesBed)];
    } else {
        const key = _slotKey(_activeNoteSlot, _currentNotesBed);
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
    if (!_currentNotesBed) return;
    const notes = _getBedNotes();
    delete notes[_slotKey(_activeNoteSlot, _currentNotesBed)];
    _saveBedNotes(notes);
    _loadNoteSlot(_activeNoteSlot);
    renderApp();
};
