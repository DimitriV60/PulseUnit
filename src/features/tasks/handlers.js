/**
 * Tasks handlers — Tâches IDE Technique (stateful Firebase).
 * Dépend de :
 *   - window.TECH_TASKS
 *   - shiftHistory, currentShiftKey, currentUser, roster (scope script partagé)
 *   - initShiftData, saveData, playSound, showAuthModal, escapeHTML, ICONS
 * Expose les fonctions sur window pour onclick inline.
 */

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
    document.getElementById('tasks-view').style.display = 'flex';
    window.renderTasks();
};

window.closeTasks = function closeTasks() {
    document.getElementById('tasks-view').style.display = 'none';
};

window.toggleTask = function toggleTask(id) {
    initShiftData(currentShiftKey);
    let tasks = shiftHistory[currentShiftKey].techTasks || [];
    if (tasks.includes(id)) {
        tasks = tasks.filter(t => t !== id);
    } else {
        tasks.push(id);
    }
    shiftHistory[currentShiftKey].techTasks = tasks;
    saveData();
    window.renderTasks();
    // 2026-05-03 — Rafraîchit la carte IDE TECH (barre / "✓ OK") immédiatement
    // sans attendre un autre événement (Dimitri).
    if (typeof renderApp === 'function') renderApp();
};

window.renderTasks = function renderTasks() {
    const TECH_TASKS = window.TECH_TASKS;
    initShiftData(currentShiftKey);
    const shiftParts = currentShiftKey.split('-');
    if (shiftParts.length < 4) return;
    const dateObj = new Date(shiftParts[0], shiftParts[1] - 1, shiftParts[2]);
    const dayOfWeek = dateObj.getDay();
    const shiftType = shiftParts[3] === 'jour' ? 'J' : 'N';

    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const shiftLabel = shiftType === 'J' ? 'Jour' : 'Nuit';

    document.getElementById('tasks-subtitle').textContent = `Shift actuel : ${dayNames[dayOfWeek]} ${shiftLabel}`;

    const todayTasks = TECH_TASKS.filter(t => {
        let show = false;
        t.shifts.forEach(s => {
            if (s === 'ALL') show = true;
            if (s === 'ALL-' + shiftType) show = true;
            if (s === dayOfWeek + '-' + shiftType) show = true;
        });
        return show;
    });

    const completed = shiftHistory[currentShiftKey].techTasks || [];
    const listEl = document.getElementById('task-list');

    if (todayTasks.length === 0) {
        listEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">Aucune tâche spécifique pour ce shift.</div>`;
        document.getElementById('task-progress').style.width = '0%';
        document.getElementById('task-progress-text').textContent = '0%';
        return;
    }

    const progress = Math.round((completed.length / todayTasks.length) * 100);
    document.getElementById('task-progress').style.width = progress + '%';
    document.getElementById('task-progress-text').textContent = progress + '%';

    todayTasks.sort((a, b) => {
        if (a.time && !b.time) return -1;
        if (!a.time && b.time) return 1;
        return 0;
    });

    let html = '';
    todayTasks.forEach(t => {
        const isDone = completed.includes(t.id);
        html += `
        <div class="task-item ${isDone ? 'done' : ''}" onclick="toggleTask('${t.id}')">
            <div class="task-checkbox">${isDone ? ICONS.check : ''}</div>
            <div class="task-title">${escapeHTML(t.title)}</div>
            ${t.time ? `<div class="task-time">${t.time}</div>` : ''}
        </div>`;
    });

    if (progress === 100) {
        if (!shiftHistory[currentShiftKey].congratsShown) {
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

            shiftHistory[currentShiftKey].congratsShown = true;
            saveData();
        }
    } else {
        shiftHistory[currentShiftKey].congratsShown = false;
        saveData();
    }

    listEl.innerHTML = html;
};
