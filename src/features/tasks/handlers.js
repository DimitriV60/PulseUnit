/**
 * Tasks handlers — Tâches IDE Technique (stateful Firebase).
 * Dépend de :
 *   - window.TECH_TASKS
 *   - shiftHistory, currentShiftKey, currentUser, roster (scope script partagé)
 *   - initShiftData, saveData, playSound, showAuthModal, escapeHTML, ICONS
 * Expose les fonctions sur window pour onclick inline.
 *
 * 2026-05-04 — Sélecteur 8 dernières gardes (pattern vérif chambres).
 *   _activeTaskShiftKey = garde affichée. toggleTask refuse si l'utilisateur
 *   n'est pas l'IDE Tech de cette garde.
 */

window._activeTaskShiftKey = null;

function _toDS(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function _listLastShiftKeys(n) {
    // Génère les n dernières gardes en remontant 12h par 12h depuis la garde
    // courante. Mêmes règles que initDates : nuit → jour du même jour → nuit
    // précédente → … La garde courante (currentShiftKey) est toujours la 1re.
    const out = [];
    if (!currentShiftKey) return out;
    const parts = currentShiftKey.split('-');
    if (parts.length < 4) return out;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    let period = parts[3];
    for (let i = 0; i < n; i++) {
        out.push(`${_toDS(d)}-${period}`);
        if (period === 'nuit') period = 'jour';
        else { d.setDate(d.getDate() - 1); period = 'nuit'; }
    }
    return out;
}

function _todayTasksFor(shiftKey) {
    const TECH_TASKS = window.TECH_TASKS || [];
    const parts = shiftKey.split('-');
    if (parts.length < 4) return [];
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayOfWeek = dateObj.getDay();
    const shiftType = parts[3] === 'jour' ? 'J' : 'N';
    return TECH_TASKS.filter(t => t.shifts.some(s =>
        s === 'ALL' || s === 'ALL-' + shiftType || s === dayOfWeek + '-' + shiftType
    ));
}

function _shiftLabel(shiftKey) {
    const parts = shiftKey.split('-');
    if (parts.length < 4) return shiftKey;
    const sd = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const period = parts[3];
    const today = new Date();
    const todayDS = _toDS(today);
    const yest = new Date(today); yest.setDate(yest.getDate() - 1);
    const yestDS = _toDS(yest);
    const ds = _toDS(sd);
    let lbl;
    if (shiftKey === currentShiftKey) lbl = 'AUJ.';
    else if (ds === todayDS)          lbl = 'AUJ.';
    else if (ds === yestDS)           lbl = 'HIER';
    else {
        const days = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
        lbl = `${days[sd.getDay()]} ${sd.getDate()}/${sd.getMonth() + 1}`;
    }
    return `${lbl} ${period[0].toUpperCase()}`;
}

window.openTasks = function openTasks() {
    const h = shiftHistory[currentShiftKey];
    if (h && h.techIdeId) {
        if (!currentUser) {
            alert('Connectez-vous pour accéder à vos tâches.');
            showAuthModal();
            return;
        }
        if (currentUser.id !== h.techIdeId) {
            const techP = roster.find(r => r.id === h.techIdeId);
            const nom = techP ? `${techP.firstName} ${techP.lastName}` : 'l\'IDE Technique';
            alert(`Ces tâches sont réservées à ${nom} pour cette garde.`);
            return;
        }
    }
    window._activeTaskShiftKey = currentShiftKey;
    document.getElementById('tasks-view').style.display = 'flex';
    window.renderTasks();
};

window.closeTasks = function closeTasks() {
    document.getElementById('tasks-view').style.display = 'none';
};

window.selectTaskShift = function selectTaskShift(shiftKey) {
    window._activeTaskShiftKey = shiftKey;
    window.renderTasks();
};

window.toggleTask = function toggleTask(id) {
    const key = window._activeTaskShiftKey || currentShiftKey;
    initShiftData(key);
    const h = shiftHistory[key];
    if (h && h.techIdeId && h.techIdeId !== currentUser?.id) {
        const techP = roster.find(r => r.id === h.techIdeId);
        const nom = techP ? `${techP.firstName} ${techP.lastName}` : 'l\'IDE Technique';
        showToast(`⛔ Tâches réservées à ${nom} pour cette garde`);
        return;
    }
    let tasks = h.techTasks || [];
    if (tasks.includes(id)) {
        tasks = tasks.filter(t => t !== id);
    } else {
        tasks.push(id);
    }
    h.techTasks = tasks;
    saveData();
    window.renderTasks();
    if (typeof renderApp === 'function') renderApp();
};

window.renderTasks = function renderTasks() {
    const TECH_TASKS = window.TECH_TASKS;
    if (!window._activeTaskShiftKey) window._activeTaskShiftKey = currentShiftKey;
    const activeKey = window._activeTaskShiftKey;
    initShiftData(activeKey);

    // Sélecteur 8 dernières gardes (pattern vérif chambres .cl-bed-selector)
    const keys = _listLastShiftKeys(8);
    let selectorHTML = '';
    keys.forEach(k => {
        const todayT = _todayTasksFor(k);
        const total = todayT.length;
        const completed = (shiftHistory[k]?.techTasks || []).filter(id => todayT.some(t => t.id === id));
        const done = completed.length;
        const stateClass = total > 0 && done === total ? 'done' : done > 0 ? 'partial' : '';
        const isActive = k === activeKey ? 'active' : '';
        selectorHTML += `<div class="cl-bed-btn ${isActive} ${stateClass}" data-action="selectTaskShift:${k}">${_shiftLabel(k)} <span style="opacity:0.8;">${done}/${total}</span></div>`;
    });
    const selEl = document.getElementById('task-shift-selector');
    if (selEl) selEl.innerHTML = selectorHTML;

    // Sous-titre header avec icône shift
    const isNight = activeKey.includes('-nuit');
    const subtitleEl = document.getElementById('tasks-subtitle');
    if (subtitleEl) {
        subtitleEl.textContent = `${isNight ? '🌙' : '☀️'} ${_shiftLabel(activeKey)}`;
    }

    const todayTasks = _todayTasksFor(activeKey);
    const completed = (shiftHistory[activeKey].techTasks || []).filter(id => todayTasks.some(t => t.id === id));
    const listEl = document.getElementById('task-list');

    if (todayTasks.length === 0) {
        if (listEl) listEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">Aucune tâche spécifique pour ce shift.</div>`;
        document.getElementById('task-progress').style.width = '0%';
        document.getElementById('task-progress-text').textContent = '0%';
        const labelEl = document.getElementById('task-progress-label');
        if (labelEl) labelEl.textContent = '0 / 0 tâches';
        return;
    }

    const progress = Math.round((completed.length / todayTasks.length) * 100);
    document.getElementById('task-progress').style.width = progress + '%';
    document.getElementById('task-progress-text').textContent = progress + '%';
    const labelEl = document.getElementById('task-progress-label');
    if (labelEl) labelEl.textContent = `${completed.length} / ${todayTasks.length} tâches validées`;

    todayTasks.sort((a, b) => {
        if (a.time && !b.time) return -1;
        if (!a.time && b.time) return 1;
        return 0;
    });

    let html = '';
    todayTasks.forEach(t => {
        const isDone = completed.includes(t.id);
        html += `
        <div class="task-item ${isDone ? 'done' : ''}" data-action="toggleTask:${t.id}">
            <div class="task-checkbox">${isDone ? ICONS.check : ''}</div>
            <div class="task-title">${escapeHTML(t.title)}</div>
            ${t.time ? `<div class="task-time">${t.time}</div>` : ''}
        </div>`;
    });

    // Modale congrats — uniquement sur la garde courante (sinon on spammerait
    // au switch de garde passée).
    if (progress === 100 && activeKey === currentShiftKey) {
        if (!shiftHistory[activeKey].congratsShown) {
            const msgs = [
                "🎉 Félicitations, tu as tout validé !",
                "☕ Tu as bien travaillé, tu mérites une petite pause café !",
                "🚀 Machine de guerre ! Tout est coché.",
                "🏆 Mission accomplie, chef ! Repos.",
                "✨ Impressionnant ! Il ne reste plus rien à faire."
            ];
            const msg = msgs[Math.floor(Math.random() * msgs.length)];
            document.getElementById('congrats-msg').textContent = msg;
            document.getElementById('congrats-modal').style.display = 'flex';
            playSound('success');
            shiftHistory[activeKey].congratsShown = true;
            saveData();
        }
    } else if (activeKey === currentShiftKey) {
        shiftHistory[activeKey].congratsShown = false;
        saveData();
    }

    listEl.innerHTML = html;
};
