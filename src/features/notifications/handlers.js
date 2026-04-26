/**
 * Notifications — centre de notifications par utilisateur (cloche header).
 * Stockage Firestore (NOTIFS_DOC) + cache localStorage offline.
 * Sync multi-appareils via onSnapshot. Web Push (Notification API) si permission.
 *
 * Types : 'bourse', 'reset', 'shift', 'message', 'info'
 *
 * Expose sur window :
 *   pushNotif, openNotifsCenter, closeNotifsCenter, renderNotifsCenter,
 *   markNotifRead, markAllNotifsRead, deleteNotif, clearAllNotifs,
 *   loadNotifs, applyNotifsSnapshot, getUnreadCount, requestNotifPermission
 */

window.notifsData = {};
window._notifsSavePending = false;

const NOTIF_TTL = 30 * 24 * 60 * 60 * 1000; // 30 jours

function _genNotifId() {
    return 'n_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function _pruneExpiredNotifs(notifs) {
    const cutoff = Date.now() - NOTIF_TTL;
    Object.keys(notifs).forEach(k => { if ((notifs[k].createdAt || 0) < cutoff) delete notifs[k]; });
    return notifs;
}

function _getNotifsForUser(userId) {
    if (!userId) return {};
    const all = (window.notifsData && window.notifsData[userId]) ? { ...window.notifsData[userId] } : {};
    return _pruneExpiredNotifs(all);
}

function _persistNotifsForUser(userId, notifs) {
    if (!userId) return;
    if (!window.notifsData) window.notifsData = {};
    window.notifsData[userId] = notifs;
    try { localStorage.setItem('pu_notifs_' + userId, JSON.stringify(notifs)); } catch (e) {}
    if (typeof NOTIFS_DOC !== 'undefined' && NOTIFS_DOC) {
        window._notifsSavePending = true;
        NOTIFS_DOC.set({ [userId]: notifs }, { merge: true })
            .then(() => { window._notifsSavePending = false; })
            .catch(e => { window._notifsSavePending = false; console.warn('Notifs sync error', e); });
    }
}

window.pushNotif = function pushNotif(targetUserId, type, title, body, action) {
    if (!targetUserId || !type) return;
    const notifs = _getNotifsForUser(targetUserId);
    const id = _genNotifId();
    notifs[id] = {
        id, type,
        title: title || '',
        body: body || '',
        action: action || null,
        createdAt: Date.now(),
        read: false
    };
    _persistNotifsForUser(targetUserId, notifs);
    // Trigger Web Push local si c'est pour l'utilisateur courant + permission accordée
    if (currentUser && currentUser.id === targetUserId && typeof window.showLocalPushNotif === 'function') {
        window.showLocalPushNotif(title || 'PulseUnit', body || '', { type, action });
    }
};

window.pushNotifToMany = function pushNotifToMany(userIds, type, title, body, action) {
    (userIds || []).forEach(uid => window.pushNotif(uid, type, title, body, action));
};

window.getUnreadCount = function getUnreadCount() {
    if (!currentUser) return 0;
    const notifs = _getNotifsForUser(currentUser.id);
    return Object.values(notifs).filter(n => !n.read).length;
};

window.markNotifRead = function markNotifRead(notifId) {
    if (!currentUser) return;
    const notifs = _getNotifsForUser(currentUser.id);
    if (notifs[notifId]) {
        notifs[notifId].read = true;
        _persistNotifsForUser(currentUser.id, notifs);
        renderNotifsBell();
        renderNotifsCenter();
    }
};

window.markAllNotifsRead = function markAllNotifsRead() {
    if (!currentUser) return;
    const notifs = _getNotifsForUser(currentUser.id);
    Object.values(notifs).forEach(n => { n.read = true; });
    _persistNotifsForUser(currentUser.id, notifs);
    renderNotifsBell();
    renderNotifsCenter();
};

window.deleteNotif = function deleteNotif(notifId) {
    if (!currentUser) return;
    const notifs = _getNotifsForUser(currentUser.id);
    delete notifs[notifId];
    _persistNotifsForUser(currentUser.id, notifs);
    renderNotifsBell();
    renderNotifsCenter();
};

window.clearAllNotifs = function clearAllNotifs() {
    if (!currentUser) return;
    if (!confirm('Effacer toutes les notifications ?')) return;
    _persistNotifsForUser(currentUser.id, {});
    renderNotifsBell();
    renderNotifsCenter();
};

window.loadNotifs = async function loadNotifs() {
    if (typeof NOTIFS_DOC === 'undefined' || !NOTIFS_DOC) return;
    try {
        const doc = await NOTIFS_DOC.get({ source: 'server' });
        if (doc.exists && doc.data()) {
            window.notifsData = doc.data();
            if (currentUser && window.notifsData[currentUser.id]) {
                try { localStorage.setItem('pu_notifs_' + currentUser.id, JSON.stringify(window.notifsData[currentUser.id])); } catch (e) {}
            }
        }
    } catch (e) { console.warn('loadNotifs error', e); }
    renderNotifsBell();
};

window.applyNotifsSnapshot = function applyNotifsSnapshot(data) {
    if (!data) return;
    const previousForCurrent = currentUser ? Object.keys(_getNotifsForUser(currentUser.id)) : [];
    window.notifsData = data;
    if (currentUser && data[currentUser.id]) {
        try { localStorage.setItem('pu_notifs_' + currentUser.id, JSON.stringify(data[currentUser.id])); } catch (e) {}
        // Détecter les nouvelles notifs et déclencher push local
        const currentNotifs = _getNotifsForUser(currentUser.id);
        Object.values(currentNotifs).forEach(n => {
            if (!previousForCurrent.includes(n.id) && !n.read && typeof window.showLocalPushNotif === 'function') {
                window.showLocalPushNotif(n.title || 'PulseUnit', n.body || '', { type: n.type, action: n.action });
            }
        });
    }
    renderNotifsBell();
    renderNotifsCenter();
};

function renderNotifsBell() {
    const btn = document.getElementById('notif-bell-btn');
    if (!btn) return;
    const count = window.getUnreadCount();
    const badge = document.getElementById('notif-bell-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}
window.renderNotifsBell = renderNotifsBell;

window.openNotifsCenter = function openNotifsCenter() {
    const m = document.getElementById('notifs-center-modal');
    if (!m) return;
    m.style.display = 'flex';
    renderNotifsCenter();
};

window.closeNotifsCenter = function closeNotifsCenter() {
    const m = document.getElementById('notifs-center-modal');
    if (m) m.style.display = 'none';
};

const _NOTIF_ICONS = {
    bourse: '🔄',
    reset: '🔑',
    shift: '⏰',
    message: '💬',
    info: 'ℹ️'
};

function renderNotifsCenter() {
    const container = document.getElementById('notifs-list');
    if (!container) return;
    if (!currentUser) { container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:24px;">Connectez-vous pour voir vos notifications</p>'; return; }
    const notifs = _getNotifsForUser(currentUser.id);
    const list = Object.values(notifs).sort((a, b) => b.createdAt - a.createdAt);
    if (list.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:24px; font-size:0.85rem;">Aucune notification</p>';
        return;
    }
    container.innerHTML = list.map(n => {
        const icon = _NOTIF_ICONS[n.type] || 'ℹ️';
        const dt = new Date(n.createdAt);
        const now = new Date();
        const sameDay = dt.toDateString() === now.toDateString();
        const dateStr = sameDay
            ? `${String(dt.getHours()).padStart(2,'0')}h${String(dt.getMinutes()).padStart(2,'0')}`
            : `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}h${String(dt.getMinutes()).padStart(2,'0')}`;
        const bg = n.read ? 'var(--surface-sec)' : 'rgba(64,206,234,0.10)';
        const border = n.read ? 'var(--border)' : 'var(--brand-aqua)';
        const actionBtn = n.action
            ? `<button onclick="event.stopPropagation();handleNotifAction(${JSON.stringify(n.action).replace(/"/g, '&quot;')}, '${n.id}')" style="background:var(--brand-aqua); color:#fff; border:none; border-radius:6px; padding:5px 10px; font-size:0.7rem; font-weight:800; cursor:pointer; margin-top:6px;">Ouvrir</button>`
            : '';
        return `
        <div onclick="markNotifRead('${n.id}')" style="background:${bg}; border:1px solid ${border}; border-radius:10px; padding:11px 13px; margin-bottom:8px; cursor:pointer; position:relative;">
          <div style="display:flex; align-items:flex-start; gap:10px;">
            <span style="font-size:1.3rem; flex-shrink:0; line-height:1;">${icon}</span>
            <div style="flex:1; min-width:0;">
              <div style="font-weight:900; font-size:0.85rem; color:var(--text); margin-bottom:2px;">${escapeHTML(n.title)}</div>
              <div style="font-size:0.78rem; color:var(--text-muted); line-height:1.35;">${escapeHTML(n.body)}</div>
              <div style="font-size:0.68rem; color:var(--text-muted); margin-top:4px; opacity:0.7;">${dateStr}</div>
              ${actionBtn}
            </div>
            <button onclick="event.stopPropagation();deleteNotif('${n.id}')" style="background:none; border:none; color:var(--crit); font-size:1rem; cursor:pointer; padding:0 4px; line-height:1; opacity:0.6;" title="Supprimer">×</button>
          </div>
        </div>`;
    }).join('');
}
window.renderNotifsCenter = renderNotifsCenter;

window.handleNotifAction = function handleNotifAction(action, notifId) {
    if (!action || !action.kind) return;
    if (notifId) window.markNotifRead(notifId);
    window.closeNotifsCenter();
    if (action.kind === 'openBourse' && typeof window.openBourse === 'function') {
        window.openBourse();
    } else if (action.kind === 'openAdminResets' && typeof window.openAdmin === 'function') {
        window.openAdmin();
    } else if (action.kind === 'openMessage' && typeof window.openMessagesWith === 'function') {
        window.openMessagesWith(action.userId);
    } else if (action.kind === 'positionShift') {
        if (typeof window.checkWorkStatus === 'function') window.checkWorkStatus();
    }
};

// ── Web Push local (Notification API) ───────────────────────────────────────
window.requestNotifPermission = async function requestNotifPermission() {
    if (!('Notification' in window)) { showToast('Ce navigateur ne supporte pas les notifications'); return false; }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
        alert('Notifications bloquées dans le navigateur.\nActivez-les dans les paramètres du site.');
        return false;
    }
    const result = await Notification.requestPermission();
    const granted = result === 'granted';
    if (granted) {
        showToast('🔔 Notifications activées');
        try { localStorage.setItem('pu_notif_perm_asked', '1'); } catch (e) {}
    }
    return granted;
};

window.showLocalPushNotif = function showLocalPushNotif(title, body, opts) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    // Pas de notif système si la page est visible et l'app au premier plan — toast suffit
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        showToast('🔔 ' + title + (body ? ' — ' + body : ''));
        if (typeof window.playNotifSound === 'function') window.playNotifSound();
        if (navigator.vibrate) navigator.vibrate([180, 70, 180]);
        return;
    }
    try {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(reg => {
                reg.showNotification(title, {
                    body,
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    vibrate: [200, 80, 200],
                    tag: 'pulseunit-' + (opts?.type || 'info'),
                    renotify: true,
                    data: opts || {}
                });
            }).catch(() => { new Notification(title, { body, icon: '/icon-192.png' }); });
        } else {
            new Notification(title, { body, icon: '/icon-192.png' });
        }
        if (typeof window.playNotifSound === 'function') window.playNotifSound();
        if (navigator.vibrate) navigator.vibrate([200, 80, 200]);
    } catch (e) { console.warn('showLocalPushNotif error', e); }
};

// ── Son de notification (WebAudio, pas de fichier externe) ──────────────────
let _notifAudioCtx = null;
window.playNotifSound = function playNotifSound() {
    try {
        if (!_notifAudioCtx) _notifAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = _notifAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const t0 = ctx.currentTime;
        // 2 bips ascendants
        [880, 1320].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, t0 + i * 0.18);
            gain.gain.linearRampToValueAtTime(0.18, t0 + i * 0.18 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.18 + 0.16);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(t0 + i * 0.18);
            osc.stop(t0 + i * 0.18 + 0.18);
        });
    } catch (e) {}
};

// ── Rappels positionnement garde 08h05/08h20 et 20h05/20h20 ─────────────────
const SHIFT_REMINDERS = [
    { hour: 8,  minute: 5,  type: 'jour', tag: 'morning_1' },
    { hour: 8,  minute: 20, type: 'jour', tag: 'morning_2' },
    { hour: 20, minute: 5,  type: 'nuit', tag: 'evening_1' },
    { hour: 20, minute: 20, type: 'nuit', tag: 'evening_2' }
];

function _todayDateStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function _isUserOnShift(shiftKey) {
    if (!currentUser) return false;
    if (typeof window.shiftHistory === 'undefined') return false;
    const h = window.shiftHistory[shiftKey] || {};
    const dateOnly = shiftKey.split('-').slice(0, 3).join('-');
    const meds = window.shiftHistory[dateOnly + '-meds'] || [];
    return (h.activeStaffIds || []).includes(currentUser.id)
        || h.techIdeId === currentUser.id
        || meds.includes(currentUser.id);
}

window.checkShiftReminders = function checkShiftReminders() {
    if (!currentUser) return;
    if (typeof isAdmin === 'function' && isAdmin()) return;
    const now = new Date();
    const hh = now.getHours();
    const mm = now.getMinutes();
    const today = _todayDateStr();
    SHIFT_REMINDERS.forEach(r => {
        // Fenêtre de tolérance : on déclenche entre l'heure prévue et +10 min après
        const startMin = r.hour * 60 + r.minute;
        const nowMin = hh * 60 + mm;
        const diff = nowMin - startMin;
        if (diff < 0 || diff > 10) return;
        const shiftKey = `${today}-${r.type}`;
        const tagKey = `pu_shift_remind_${today}_${r.tag}`;
        if (localStorage.getItem(tagKey)) return;
        if (_isUserOnShift(shiftKey)) { localStorage.setItem(tagKey, '1'); return; }
        // Vérifier que l'utilisateur n'a pas déjà refusé via la modale work-status
        const wsKey = `pu_ws_${shiftKey}_${currentUser.id}`;
        if (localStorage.getItem(wsKey) === '1') { localStorage.setItem(tagKey, '1'); return; }
        const periodLbl = r.type === 'jour' ? 'JOUR' : 'NUIT';
        const second = r.tag.endsWith('_2');
        const title = second ? `⚠️ Rappel garde ${periodLbl}` : `⏰ Garde ${periodLbl} commencée`;
        const body = second
            ? `Vous n'êtes toujours pas positionné. Confirmez si vous travaillez.`
            : `N'oubliez pas de vous positionner si vous travaillez aujourd'hui.`;
        window.pushNotif(currentUser.id, 'shift', title, body, { kind: 'positionShift' });
        localStorage.setItem(tagKey, '1');
    });
};

// Vérification périodique des rappels (toutes les 60s)
window.startShiftReminderLoop = function startShiftReminderLoop() {
    if (window._shiftReminderInterval) return;
    window.checkShiftReminders();
    window._shiftReminderInterval = setInterval(window.checkShiftReminders, 60 * 1000);
};

// Demande de permission au premier login (une seule fois — l'utilisateur peut refuser)
window.maybePromptNotifPermission = function maybePromptNotifPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem('pu_notif_perm_asked')) return;
    // Délai pour ne pas spammer dès l'ouverture
    setTimeout(() => {
        try { localStorage.setItem('pu_notif_perm_asked', '1'); } catch (e) {}
        const ok = confirm('🔔 Activer les notifications ?\n\nReçois les annonces de bourse, demandes admin, rappels de garde et messages — même app fermée.');
        if (ok) window.requestNotifPermission();
    }, 4000);
};
