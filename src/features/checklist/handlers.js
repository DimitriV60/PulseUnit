/**
 * Checklist handlers — Vérification chambre par lit (stateful Firebase).
 * Dépend de :
 *   - window.CHECKLIST_ITEMS
 *   - shiftHistory, currentShiftKey (déclarés inline dans index.html, scope script partagé)
 *   - initShiftData, saveData, getAllBedIds, renderApp (définis inline dans index.html)
 * Expose les fonctions sur window pour onclick inline.
 */

let currentChecklistBed = null;

function getChecklistForBed(bedId) {
    initShiftData(currentShiftKey);
    if (!shiftHistory[currentShiftKey].checklistChambre[bedId]) {
        shiftHistory[currentShiftKey].checklistChambre[bedId] = {};
    }
    return shiftHistory[currentShiftKey].checklistChambre[bedId];
}

function checklistDoneCount(bedId) {
    const cl = getChecklistForBed(bedId);
    return window.CHECKLIST_ITEMS.filter(i => cl[i.id]).length;
}

window.openChecklist = function openChecklist(bedId) {
    if (!isAdmin()) {
        initShiftData(currentShiftKey);
        const h = shiftHistory[currentShiftKey];
        const dateOnly = currentShiftKey.split('-').slice(0, 3).join('-');
        const meds = shiftHistory[dateOnly + '-meds'] || [];
        const isActive = (h.activeStaffIds || []).includes(currentUser?.id)
                      || h.techIdeId === currentUser?.id
                      || meds.includes(currentUser?.id);
        if (!isActive) { showToast('\u26D4 Vous devez \u00EAtre de garde pour acc\u00E9der \u00E0 la v\u00E9rif chambre'); return; }
    }
    initShiftData(currentShiftKey);
    const el = document.getElementById('checklist-view');
    el.style.display = 'flex';
    const isNight = currentShiftKey.includes('-nuit');
    document.getElementById('cl-shift-icon').textContent = isNight ? '🌙' : '☀️';
    document.getElementById('cl-shift-text').textContent = isNight ? 'NUIT' : 'JOUR';
    const allBeds = getAllBedIds();
    if (bedId) {
        currentChecklistBed = bedId;
    } else {
        const firstIncomplete = allBeds.find(b => checklistDoneCount(b) < window.CHECKLIST_ITEMS.length);
        currentChecklistBed = firstIncomplete || allBeds[0];
    }
    window.renderChecklistView();
};

window.closeChecklist = function closeChecklist() {
    document.getElementById('checklist-view').style.display = 'none';
    renderApp();
};

window.selectChecklistBed = function selectChecklistBed(bedId) {
    currentChecklistBed = bedId;
    window.renderChecklistView();
};

window.toggleChecklistItem = function toggleChecklistItem(itemId) {
    if (!currentChecklistBed) return;
    initShiftData(currentShiftKey);
    const assigned = (shiftHistory[currentShiftKey].assignments || {})[currentChecklistBed] || {};
    if (assigned.ide && currentUser?.id !== assigned.ide && currentUser?.id !== assigned.as) {
        showToast('\u26D4 Seul l\u2019IDE ou l\u2019AS de ce lit peut cocher les items');
        return;
    }
    const cl = getChecklistForBed(currentChecklistBed);
    cl[itemId] = !cl[itemId];
    saveData();
    window.renderChecklistView();
};

window.renderChecklistView = function renderChecklistView() {
    const CHECKLIST_ITEMS = window.CHECKLIST_ITEMS;
    const allBeds = getAllBedIds();
    const h = shiftHistory[currentShiftKey];
    let selectorHTML = '';
    allBeds.forEach(bid => {
        const done = checklistDoneCount(bid);
        const total = CHECKLIST_ITEMS.length;
        const isClosed = h.assignments[bid] && h.assignments[bid].closed;
        const isAdmin = bid.startsWith('usip') && h.adminLockUsip;
        if (isClosed || isAdmin) return;
        const stateClass = done === total ? 'done' : done > 0 ? 'partial' : '';
        const isActive = bid === currentChecklistBed ? 'active' : '';
        const parts = bid.split('-');
        const label = parts[0] === 'rea' ? `RÉA ${parts[1]}` : `USIP ${parts[1]}`;
        selectorHTML += `<div class="cl-bed-btn ${isActive} ${stateClass}" onclick="selectChecklistBed('${bid}')">${label} <span style="opacity:0.8;">${done}/${total}</span></div>`;
    });
    document.getElementById('cl-bed-selector').innerHTML = selectorHTML;

    if (!currentChecklistBed) return;
    const cl = getChecklistForBed(currentChecklistBed);
    const done = CHECKLIST_ITEMS.filter(i => cl[i.id]).length;
    const total = CHECKLIST_ITEMS.length;
    const pct = Math.round((done/total)*100);
    document.getElementById('cl-progress-fill').style.width = `${pct}%`;
    document.getElementById('cl-progress-label').textContent = `${done} / ${total} items vérifiés`;
    document.getElementById('cl-progress-pct').textContent = `${pct}%`;

    const parts = currentChecklistBed.split('-');
    const bedLabel = parts[0] === 'rea' ? `RÉA ${parts[1]}` : `USIP ${parts[1]}`;

    let itemsHTML = `<div style="font-size:0.75rem; color:var(--text-muted); font-weight:900; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">${bedLabel} — ${done}/${total} items validés</div>`;
    CHECKLIST_ITEMS.forEach(item => {
        const checked = !!cl[item.id];
        itemsHTML += `
        <div class="cl-item ${checked ? 'checked' : ''}" onclick="toggleChecklistItem('${item.id}')">
          <div class="cl-item-box">${checked ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}</div>
          <span class="cl-item-icon">${item.icon}</span>
          <span class="cl-item-label">${item.label}</span>
        </div>`;
    });

    if (done === total) {
        itemsHTML += `<div style="text-align:center; padding:24px 20px; background:var(--as-glow); border:1px solid rgba(64,206,92,0.3); border-radius:12px; margin-top:8px;">
          <div style="font-size:2rem; margin-bottom:8px;">✅</div>
          <div style="font-weight:900; font-size:1rem; color:var(--as);">Chambre ${bedLabel} validée !</div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; font-weight:700;">Tous les points ont été vérifiés</div>
        </div>`;
    }

    document.getElementById('cl-items-list').innerHTML = itemsHTML;
};
