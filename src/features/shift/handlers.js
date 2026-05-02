/**
 * Shift handlers — gestion des gardes (jour/nuit), roster, sélection, verrouillage.
 *
 * Dépend (script scope inline) de :
 *   roster, shiftHistory, currentShiftKey, selectedStaffForTap, pendingSpecType,
 *   CONFIG, PULSEUNIT_DOC, currentUser, _savePending,
 *   renderApp, escapeHTML, checkWorkStatus, assignSpecDirect, showToast, isAdmin.
 *
 * Expose sur window : initShiftData, saveData, hardResetApp, clearSelection,
 *   updateStickyBanner, toggleSelection, isShiftLocked, isOnCurrentShift,
 *   canEditBeds, initDates, doSearch, selectSuggestion, triggerCreateNew,
 *   assignSpecDirect, openModalSpec, createNewStaff, clearShift, clearCurrentShift,
 *   getStaffTargets, confirmClearShift, executeClearShift.
 */

function initShiftData(key) {
    const globalUsipLock = !!shiftHistory._adminLockUsipGlobal;
    if (!shiftHistory[key]) shiftHistory[key] = { activeStaffIds: [], techIdeId: null, adminLockUsip: globalUsipLock, techTasks: [], assignments: {}, congratsShown: false };
    // Synchronise sur l'état global UNIQUEMENT pour les gardes en cours / à venir.
    // Les gardes passées gardent leur état historique (lecture seule).
    if (typeof isShiftLocked === 'function' && !isShiftLocked(key)) {
        shiftHistory[key].adminLockUsip = globalUsipLock;
    } else if (shiftHistory[key].adminLockUsip === undefined) {
        shiftHistory[key].adminLockUsip = false;
    }
    if (shiftHistory[key].medLocked === undefined) shiftHistory[key].medLocked = false;
    if (shiftHistory[key].congratsShown === undefined) shiftHistory[key].congratsShown = false;
    if (!shiftHistory[key].techTasks) shiftHistory[key].techTasks = [];
    if (!shiftHistory[key].assignments) shiftHistory[key].assignments = {};
    if (!shiftHistory[key].checklistChambre) shiftHistory[key].checklistChambre = {};
    if (!shiftHistory[key].activeStaffIds) shiftHistory[key].activeStaffIds = [];
    const dateOnly = key.split('-').slice(0, 3).join('-');
    if (!shiftHistory[dateOnly + '-meds']) shiftHistory[dateOnly + '-meds'] = [null, null, null];
    if (!shiftHistory[dateOnly + '-medsBeds']) shiftHistory[dateOnly + '-medsBeds'] = {};
}
window.initShiftData = initShiftData;

function saveData() {
    if (PULSEUNIT_DOC) {
        _savePending = true;
        PULSEUNIT_DOC.set({
            roster:       roster,
            shiftHistory: shiftHistory
        }).then(() => {
            _savePending = false;
        }).catch(e => {
            _savePending = false;
            console.error('Erreur Firestore :', e);
            try {
                localStorage.setItem('reapro_roster',  JSON.stringify(roster));
                localStorage.setItem('reapro_history', JSON.stringify(shiftHistory));
            } catch (le) {
                alert('\u26A0\uFE0F ERREUR DE SAUVEGARDE\n\nLes donn\u00E9es n\'ont pas pu \u00EAtre enregistr\u00E9es.\nV\u00E9rifiez votre connexion Internet.');
            }
        });
    } else {
        try {
            localStorage.setItem('reapro_roster',  JSON.stringify(roster));
            localStorage.setItem('reapro_history', JSON.stringify(shiftHistory));
        } catch (e) {
            console.error('Erreur de sauvegarde localStorage :', e);
            alert(
                '\u26A0\uFE0F ERREUR DE SAUVEGARDE\n\n' +
                'Les donn\u00E9es n\'ont pas pu \u00EAtre enregistr\u00E9es.\n' +
                'Cause possible : stockage du navigateur plein.\n\n' +
                'Action : contactez l\'administrateur ou utilisez "R\u00E9parer l\'App".'
            );
        }
    }
}
window.saveData = saveData;

window.hardResetApp = function hardResetApp() {
    if (confirm('R\u00E9initialiser l\'App ?\n\n\u26A0\uFE0F Toutes les donn\u00E9es seront perdues pour TOUS les coll\u00E8gues.')) {
        if (PULSEUNIT_DOC) {
            PULSEUNIT_DOC.delete().catch(e => console.error('Erreur suppression Firestore:', e));
        }
        const CLS_PULSEUNIT = [
            'reapro_roster', 'reapro_history',
            'pulseunit_theme', 'pulseunit_settings', 'pulseunit_cal'
        ];
        CLS_PULSEUNIT.forEach(key => localStorage.removeItem(key));
        location.reload();
    }
};

window.clearSelection = function clearSelection() {
    selectedStaffForTap = null;
    document.getElementById('sticky-banner').classList.remove('show');
    renderApp();
};

function updateStickyBanner() {
    const banner = document.getElementById('sticky-banner');
    if (selectedStaffForTap) {
        const p = roster.find(r => r.id === selectedStaffForTap);
        if (p) { document.getElementById('sticky-text').textContent = `${p.role.toUpperCase()} : ${p.firstName}`; banner.classList.add('show'); }
    } else { banner.classList.remove('show'); }
}
window.updateStickyBanner = updateStickyBanner;

window.toggleSelection = function toggleSelection(id) {
    if (!canEditBeds()) {
        if (!isOnCurrentShift() && currentUser) alert('Vous n\'\u00EAtes pas affect\u00E9 \u00E0 cette garde \u2014 acc\u00E8s en lecture seule.');
        return;
    }
    if (currentUser?.role === 'med') {
        showToast('\u26D4 Les m\u00E9decins ne g\u00E8rent pas les assignations IDE/AS');
        return;
    }
    if (id !== currentUser?.id) {
        showToast('\u26D4 Vous pouvez uniquement vous s\u00E9lectionner vous-m\u00EAme');
        return;
    }
    selectedStaffForTap = (selectedStaffForTap === id) ? null : id;
    updateStickyBanner();
    renderApp();
};

window.toggleMedLock = function toggleMedLock() {
    if (!isAdmin()) return;
    initShiftData(currentShiftKey);
    shiftHistory[currentShiftKey].medLocked = !shiftHistory[currentShiftKey].medLocked;
    saveData();
    renderApp();
    showToast(shiftHistory[currentShiftKey].medLocked ? '\uD83D\uDD12 Cartes r\u00E9a verrouill\u00E9es' : '\uD83D\uDD13 Cartes r\u00E9a d\u00E9verrouill\u00E9es');
};

function isShiftLocked(shiftKey) {
    if (!shiftKey) return false;
    const parts = shiftKey.split('-');
    const shiftDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const now = new Date();
    if (parts[3] === 'jour') shiftDate.setHours(20, 0, 0, 0);
    else { shiftDate.setDate(shiftDate.getDate() + 1); shiftDate.setHours(8, 0, 0, 0); }
    return now > shiftDate;
}
window.isShiftLocked = isShiftLocked;

function isOnCurrentShift() {
    if (!currentUser) return false;
    if (isAdmin()) return true;
    const h = shiftHistory[currentShiftKey] || {};
    const dateOnly = currentShiftKey.split('-').slice(0, 3).join('-');
    const meds = shiftHistory[dateOnly + '-meds'] || [];
    return (h.activeStaffIds || []).includes(currentUser.id) ||
           h.techIdeId === currentUser.id ||
           meds.includes(currentUser.id);
}
window.isOnCurrentShift = isOnCurrentShift;

function canEditBeds() {
    if (isShiftLocked(currentShiftKey)) return false;
    if (isAdmin()) return false;
    const h = shiftHistory[currentShiftKey] || {};
    return (h.activeStaffIds || []).includes(currentUser?.id) || h.techIdeId === currentUser?.id;
}
window.canEditBeds = canEditBeds;

window.initDates = function initDates() {
    const nav = document.getElementById('shift-nav'); nav.innerHTML = '';
    const today = new Date();
    const h = today.getHours();
    const daysArr = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
    const toDS = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    // Détermine la garde actuelle (date locale) — pas de garde future dans la nav
    const curDate = new Date(today);
    let curPeriod;
    if (h >= 8 && h < 20)    { curPeriod = 'jour'; }
    else if (h >= 20)         { curPeriod = 'nuit'; }
    else                      { curDate.setDate(curDate.getDate() - 1); curPeriod = 'nuit'; }
    currentShiftKey = `${toDS(curDate)}-${curPeriod}`;

    // Génère 16 gardes en remontant 12h par 12h depuis la garde actuelle (= 8 jours, 4J/N × 2)
    // Ordre : nuit → jour du même jour → nuit du jour précédent → …
    // En garde de jour, on affiche aussi la nuit à venir (même date) pour permettre la préparation
    const shifts = [];
    if (curPeriod === 'jour') {
        shifts.push({ ds: toDS(curDate), period: 'nuit' });
    }
    const d = new Date(curDate);
    let period = curPeriod;
    for (let i = 0; i < 16; i++) {
        shifts.push({ ds: toDS(d), period });
        if (period === 'nuit') { period = 'jour'; }
        else { d.setDate(d.getDate() - 1); period = 'nuit'; }
    }

    // Labels basés sur la date calendaire locale (sauf garde actuelle → toujours AUJ.)
    const todayDS = toDS(today);
    const yestDate = new Date(today); yestDate.setDate(yestDate.getDate() - 1);
    const yestDS = toDS(yestDate);

    shifts.forEach((shift, idx) => {
        const key = `${shift.ds}-${shift.period}`;
        let lbl;
        if (idx === 0)              lbl = 'AUJ.';
        else if (shift.ds === todayDS) lbl = 'AUJ.';
        else if (shift.ds === yestDS)  lbl = 'HIER';
        else {
            const sd = new Date(shift.ds + 'T12:00:00');
            lbl = `${daysArr[sd.getDay()]} ${sd.getDate()}/${sd.getMonth() + 1}`;
        }
        const btn = document.createElement('div');
        btn.className = `shift-tab ${key === currentShiftKey ? 'active' : ''}`;
        btn.textContent = `${lbl} ${shift.period[0].toUpperCase()}`;
        btn.setAttribute('data-key', key);
        btn.onclick = () => { currentShiftKey = key; clearSelection(); renderApp(); checkWorkStatus(); };
        nav.appendChild(btn);
    });

    const activeTab = nav.querySelector('.shift-tab.active');
    if (activeTab) activeTab.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' });
    initShiftData(currentShiftKey);
    renderApp();
};

window.doSearch = function doSearch(type, val) {
    initShiftData(currentShiftKey);
    let q = val.toLowerCase().trim();
    let boxId = (type === 'main') ? 'sugg-main' : (type === 'sidebar' ? 'sugg-sidebar' : `sugg-${type}`);
    let box = document.getElementById(boxId);
    if (!box) return;

    if (q.length < 2) { box.style.display = 'none'; return; }

    const shift = shiftHistory[currentShiftKey];
    let list = [];
    if (type === 'main' || type === 'sidebar') {
        list = roster.filter(p => !shift.activeStaffIds.includes(p.id) && p.role !== 'med' && (p.firstName + p.lastName).toLowerCase().includes(q));
    } else {
        list = roster.filter(p => (p.firstName + p.lastName).toLowerCase().includes(q));
        if (type === 'tech') list = list.filter(p => p.role === 'ide');
        if (type.startsWith('med')) list = list.filter(p => p.role === 'med');
    }

    let html = '';
    list.forEach(p => {
        let roleColor = `var(--${p.role})`;
        if (p.role === 'ide') roleColor = 'var(--ide)';
        html += `<div class="sugg-item" onclick="selectSuggestion('${type}', '${p.id}', event)">
            <span>${escapeHTML(p.firstName)} <strong>${escapeHTML(p.lastName)}</strong></span>
            <span style="color:${roleColor}; font-weight:800;">${p.role.toUpperCase()}</span>
        </div>`;
    });

    html += `<div class="sugg-item" style="color:var(--brand-aqua)" onclick="triggerCreateNew('${escapeHTML(val)}', '${type}', event)">
        + Cr\u00E9er : "${escapeHTML(val)}"...
    </div>`;

    box.innerHTML = html;
    box.style.display = 'block';
};

window.selectSuggestion = function selectSuggestion(type, id, e) {
    e.stopPropagation();
    initShiftData(currentShiftKey);
    const shift = shiftHistory[currentShiftKey];
    if (type === 'main' || type === 'sidebar') {
        shift.activeStaffIds.push(id);
    } else {
        assignSpecDirect(type, id);
    }
    if (document.getElementById(`search-${type}`)) document.getElementById(`search-${type}`).value = '';
    saveData();
    renderApp();
    document.querySelectorAll('.suggestions').forEach(el => el.style.display = 'none');
};

window.triggerCreateNew = function triggerCreateNew(val, type, e) {
    e.stopPropagation();
    if (document.getElementById(`search-${type}`)) document.getElementById(`search-${type}`).value = '';
    openModalSpec(val, type);
};

/**
 * Self-assign IDE Tech : un IDE clique son bouton et se positionne lui-même
 * dans le slot Tech (sans passer par la barre de recherche). Demandé 2026-05-03.
 * Si déjà assigné, ouvre les tâches directement.
 */
window.selfAssignTech = function selfAssignTech() {
    if (!currentUser) return showToast('Connectez-vous d\'abord');
    if (currentUser.role !== 'ide' && !isAdmin()) return showToast('⛔ Réservé aux IDE');
    initShiftData(currentShiftKey);
    if (isShiftLocked(currentShiftKey)) return showToast('🔒 Garde verrouillée');
    const h = shiftHistory[currentShiftKey];
    if (h.techIdeId === currentUser.id) {
        if (typeof window.openTasks === 'function') window.openTasks();
        return;
    }
    if (h.techIdeId) {
        const taken = roster.find(r => r.id === h.techIdeId);
        return showToast(`⛔ Slot déjà pris par ${taken ? taken.firstName : 'quelqu\'un'}`);
    }
    h.techIdeId = currentUser.id;
    if (!h.activeStaffIds.includes(currentUser.id)) h.activeStaffIds.push(currentUser.id);
    saveData();
    renderApp();
    showToast('✅ Vous êtes IDE Tech — checklist disponible');
    if (typeof window.openTasks === 'function') setTimeout(() => window.openTasks(), 250);
};

function assignSpecDirect(type, id) {
    initShiftData(currentShiftKey);
    if (isShiftLocked(currentShiftKey)) return;
    if (type === 'tech') {
        shiftHistory[currentShiftKey].techIdeId = id;
        if (!shiftHistory[currentShiftKey].activeStaffIds.includes(id)) shiftHistory[currentShiftKey].activeStaffIds.push(id);
    } else if (type.startsWith('med')) {
        const idx = type.split('-')[1];
        const dO = currentShiftKey.split('-').slice(0, 3).join('-');
        shiftHistory[dO + '-meds'][idx] = id;
    }
    saveData(); renderApp();
}
window.assignSpecDirect = assignSpecDirect;

window.openModalSpec = function openModalSpec(q, type) {
    if (isShiftLocked(currentShiftKey)) return;
    document.querySelectorAll('.suggestions').forEach(e => e.style.display = 'none');
    document.getElementById('new-firstname').value = q || '';
    document.getElementById('new-lastname').value = '';
    const roleSelect = document.getElementById('new-role');
    roleSelect.value = type.startsWith('med') ? 'med' : 'ide';
    pendingSpecType = type;
    document.getElementById('add-modal').style.display = 'flex';
};

window.createNewStaff = function createNewStaff() {
    initShiftData(currentShiftKey);
    const fn = document.getElementById('new-firstname').value.trim();
    const ln = document.getElementById('new-lastname').value.trim();
    const r  = document.getElementById('new-role').value;
    if (!fn || !ln) return;
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    roster.push({ id, firstName: fn, lastName: ln, role: r });
    if (pendingSpecType && pendingSpecType !== 'main' && pendingSpecType !== 'sidebar') assignSpecDirect(pendingSpecType, id);
    else if (r !== 'med') shiftHistory[currentShiftKey].activeStaffIds.push(id);

    document.getElementById('add-modal').style.display = 'none';
    document.getElementById('new-firstname').value = '';
    document.getElementById('new-lastname').value = '';
    saveData(); renderApp();
};

window.clearShift = function clearShift(id, type) {
    initShiftData(currentShiftKey);
    if (isShiftLocked(currentShiftKey)) return;
    if (type === 'med' && shiftHistory[currentShiftKey].medLocked && !isAdmin()) {
        showToast('🔒 Cartes réa verrouillées par l\'admin');
        return;
    }
    if (type === 'tech') shiftHistory[currentShiftKey].techIdeId = null;
    else if (type === 'med') {
        const dO = currentShiftKey.split('-').slice(0, 3).join('-');
        shiftHistory[dO + '-meds'][id] = null;
    } else {
        shiftHistory[currentShiftKey].activeStaffIds = shiftHistory[currentShiftKey].activeStaffIds.filter(x => x !== id);
    }
    saveData(); renderApp();
};

window.clearCurrentShift = function clearCurrentShift() {
    initShiftData(currentShiftKey);
    shiftHistory[currentShiftKey].activeStaffIds = [];
    shiftHistory[currentShiftKey].assignments = {};
    shiftHistory[currentShiftKey].techIdeId = null;
    // adminLockUsip n'est PAS effacé par "Vider la garde" — c'est un verrou global admin
    shiftHistory[currentShiftKey].adminLockUsip = !!shiftHistory._adminLockUsipGlobal;
    shiftHistory[currentShiftKey].techTasks = [];
    shiftHistory[currentShiftKey].congratsShown = false;
    shiftHistory[currentShiftKey].checklistChambre = {};
    const dO = currentShiftKey.split('-').slice(0, 3).join('-');
    shiftHistory[dO + '-meds'] = [null, null, null];
    shiftHistory[dO + '-medsBeds'] = {};
    clearSelection();
    saveData(); renderApp();
};

window.getStaffTargets = function getStaffTargets() {
    initShiftData(currentShiftKey);
    const shift = shiftHistory[currentShiftKey];
    const isNight = currentShiftKey.includes('-nuit');
    let rC = 0; CONFIG[0].beds.forEach(n => { if (shift.assignments[`rea-${n}`]?.closed) rC++; });
    let uC = 0; CONFIG[1].beds.forEach(n => { if (shift.adminLockUsip || shift.assignments[`usip-${n}`]?.closed) uC++; });
    const rIDE_T = rC >= 3 ? 5 : 6, rAS_T = rC >= 3 ? 3 : 4;

    const activeUsip = 5 - uC;
    const uIDE_T = Math.ceil(activeUsip / 3);
    const uAS_T  = isNight ? Math.ceil(activeUsip / 6) : Math.ceil(activeUsip / 3);

    let rI = shift.techIdeId ? 1 : 0, uI = 0, rA = 0, uA = 0;
    shift.activeStaffIds.forEach(id => {
        const p = roster.find(r => r.id === id); if (!p) return;
        let inU = false;
        CONFIG[1].beds.forEach(n => { if (shift.assignments[`usip-${n}`]?.[p.role] === id) inU = true; });
        if (p.role === 'ide') { if (inU) uI++; else if (id !== shift.techIdeId) rI++; }
        else { if (inU) uA++; else rA++; }
    });
    return { rIDE_T, rAS_T, uIDE_T, uAS_T, rI, rA, uI, uA, uAllC: uC === 5, rC, uC };
};

var _pendingRemoveStaffId = null;

window.showRemoveAgentConfirm = function showRemoveAgentConfirm(staffId) {
    const p = roster.find(r => r.id === staffId);
    if (!p) return;
    _pendingRemoveStaffId = staffId;
    const el = document.getElementById('remove-agent-name');
    if (el) el.textContent = `${p.firstName} ${p.lastName.charAt(0)}.`;
    document.getElementById('remove-agent-modal').style.display = 'flex';
};

window.keepAgent = function keepAgent() {
    document.getElementById('remove-agent-modal').style.display = 'none';
    _pendingRemoveStaffId = null;
};

window.removeAgent = function removeAgent() {
    document.getElementById('remove-agent-modal').style.display = 'none';
    if (_pendingRemoveStaffId) {
        clearShift(_pendingRemoveStaffId, 'staff');
        _pendingRemoveStaffId = null;
    }
};

window.confirmClearShift = function confirmClearShift() {
    if (isShiftLocked(currentShiftKey)) return alert('Garde verrouill\u00E9e. Impossible de vider.');
    document.getElementById('confirm-clear-modal').style.display = 'flex';
};

window.executeClearShift = function executeClearShift() {
    document.getElementById('confirm-clear-modal').style.display = 'none';
    clearCurrentShift();
};
