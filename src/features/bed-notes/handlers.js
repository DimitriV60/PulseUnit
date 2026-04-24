/**
 * Bed notes — Notes temporaires 72h par lit, visibles uniquement par l'auteur.
 * Stockage localStorage (personnel, non partagé Firestore).
 * Double-tap sur une carte lit → ouvre/édite la note.
 *
 * Dépend de : currentUser, renderApp, showToast, assignLit.
 * Expose sur window : handleBedTap, openBedNote, closeBedNote,
 *   saveBedNote, deleteBedNote, getBedNoteForCurrentUser.
 */

var _lastBedTapTime = {};
var _currentNotesBed = null;
const BED_NOTE_TTL = 72 * 60 * 60 * 1000; // 72h en ms

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

window.getBedNoteForCurrentUser = function getBedNoteForCurrentUser(bedId) {
    if (!currentUser) return null;
    const notes = _getBedNotes();
    return notes[bedId] || null;
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
    _currentNotesBed = bedId;
    const parts = bedId.split('-');
    const label = parts[0] === 'rea' ? `RÉA ${parts[1]}` : `USIP ${parts[1]}`;
    document.getElementById('bed-note-bed-label').textContent = label;
    const notes = _getBedNotes();
    const existing = notes[bedId];
    document.getElementById('bed-note-text').value = existing ? existing.text : '';
    document.getElementById('bed-note-delete-btn').style.display = existing ? 'block' : 'none';
    document.getElementById('bed-note-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('bed-note-text').focus(), 50);
};

window.closeBedNote = function closeBedNote() {
    document.getElementById('bed-note-modal').style.display = 'none';
    _currentNotesBed = null;
};

window.saveBedNote = function saveBedNote() {
    const text = document.getElementById('bed-note-text').value.trim();
    if (!_currentNotesBed) return;
    if (!text) { deleteBedNote(); return; }
    const notes = _getBedNotes();
    notes[_currentNotesBed] = { text, createdAt: Date.now() };
    _saveBedNotes(notes);
    closeBedNote();
    renderApp();
    showToast('\uD83D\uDCDD Note enregistr\u00E9e \u2014 visible 72h');
};

window.deleteBedNote = function deleteBedNote() {
    if (!_currentNotesBed) return;
    const notes = _getBedNotes();
    delete notes[_currentNotesBed];
    _saveBedNotes(notes);
    closeBedNote();
    renderApp();
};
