/**
 * Bed notes — Notes temporaires 72h par lit, visibles uniquement par l'auteur.
 * Stockage localStorage (personnel, non partagé Firestore).
 * Double-tap sur une carte lit → ouvre/édite la note.
 *
 * Dépend de : currentUser, renderApp, showToast, assignLit.
 * Expose sur window : handleBedTap, openBedNote, closeBedNote,
 *   saveBedNote, deleteBedNote, getBedNoteForCurrentUser, switchBedNoteTab.
 */

var _lastBedTapTime = {};
var _currentNotesBed = null;
var _bedNoteTabKeys = [];
var _bedNoteActiveTab = 0;
const BED_NOTE_TTL = 72 * 60 * 60 * 1000;

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

function _getPrev3ShiftKeys(key) {
    const parts = key.split('-');
    const toDS = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const keys = [key];
    let d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    let p = parts[3];
    for (let i = 1; i < 3; i++) {
        if (p === 'nuit') { p = 'jour'; }
        else { d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1); p = 'nuit'; }
        keys.push(`${toDS(d)}-${p}`);
    }
    return keys;
}

function _renderBedNoteTabs() {
    const container = document.getElementById('bed-note-tabs');
    if (!container) return;
    const notes = _getBedNotes();
    const daysArr = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    let html = '';
    _bedNoteTabKeys.forEach((key, i) => {
        const hasNote = !!notes[key + ':' + _currentNotesBed];
        const kParts = key.split('-');
        const period = kParts[3] === 'jour' ? 'J' : 'N';
        const kd = new Date(parseInt(kParts[0]), parseInt(kParts[1]) - 1, parseInt(kParts[2]));
        const dayLabel = i === 0 ? 'Auj.' : daysArr[kd.getDay()] + ' ' + kd.getDate();
        const isActive = _bedNoteActiveTab === i;
        const dot = hasNote ? ' ●' : '';
        html += `<button onclick="switchBedNoteTab(${i})" style="padding:6px 14px; border-radius:8px; border:1px solid ${isActive ? 'var(--brand-aqua)' : 'var(--border)'}; background:${isActive ? 'rgba(64,206,234,0.12)' : 'transparent'}; color:${isActive ? 'var(--brand-aqua)' : 'var(--text-muted)'}; font-weight:${isActive ? '900' : '700'}; font-size:0.82rem; cursor:pointer; transition:all 0.15s;">${dayLabel} ${period}${dot}</button>`;
    });
    container.innerHTML = html;
}

function _loadBedNoteTab(idx) {
    _bedNoteActiveTab = idx;
    const key = _bedNoteTabKeys[idx];
    const isCurrentGarde = (key === currentShiftKey);
    const notes = _getBedNotes();
    const existing = notes[key + ':' + _currentNotesBed];
    const textarea = document.getElementById('bed-note-text');
    textarea.value = existing ? existing.text : '';
    textarea.readOnly = !isCurrentGarde;
    textarea.style.opacity = isCurrentGarde ? '1' : '0.65';
    textarea.style.cursor = isCurrentGarde ? '' : 'default';
    const notice = document.getElementById('bed-note-readonly-notice');
    if (notice) notice.style.display = isCurrentGarde ? 'none' : 'flex';
    const saveBtn = document.getElementById('bed-note-save-btn');
    if (saveBtn) saveBtn.style.display = isCurrentGarde ? '' : 'none';
    const deleteBtn = document.getElementById('bed-note-delete-btn');
    if (deleteBtn) deleteBtn.style.display = (existing && isCurrentGarde) ? 'block' : 'none';
    _renderBedNoteTabs();
    if (isCurrentGarde) setTimeout(() => textarea.focus(), 50);
}

window.switchBedNoteTab = function switchBedNoteTab(idx) {
    _loadBedNoteTab(idx);
};

window.getBedNoteForCurrentUser = function getBedNoteForCurrentUser(bedId) {
    if (!currentUser) return null;
    const notes = _getBedNotes();
    return notes[currentShiftKey + ':' + bedId] || null;
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
    _bedNoteTabKeys = _getPrev3ShiftKeys(currentShiftKey);
    const parts = bedId.split('-');
    const label = parts[0] === 'rea' ? `RÉA ${parts[1]}` : `USIP ${parts[1]}`;
    document.getElementById('bed-note-bed-label').textContent = label;
    _loadBedNoteTab(0);
    document.getElementById('bed-note-modal').style.display = 'flex';
};

window.closeBedNote = function closeBedNote() {
    document.getElementById('bed-note-modal').style.display = 'none';
    _currentNotesBed = null;
};

window.saveBedNote = function saveBedNote() {
    const text = document.getElementById('bed-note-text').value.trim();
    if (!_currentNotesBed) return;
    if (_bedNoteActiveTab !== 0) return;
    if (!text) { deleteBedNote(); return; }
    const notes = _getBedNotes();
    notes[currentShiftKey + ':' + _currentNotesBed] = { text, createdAt: Date.now() };
    _saveBedNotes(notes);
    closeBedNote();
    renderApp();
    showToast('📝 Note enregistrée — visible 72h');
};

window.deleteBedNote = function deleteBedNote() {
    if (!_currentNotesBed || _bedNoteActiveTab !== 0) return;
    const notes = _getBedNotes();
    delete notes[currentShiftKey + ':' + _currentNotesBed];
    _saveBedNotes(notes);
    closeBedNote();
    renderApp();
};
