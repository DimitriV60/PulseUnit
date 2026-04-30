/**
 * Messages internes — DM 1-to-1 persistants entre n'importe quels utilisateurs du roster.
 * Stockage Firestore (MESSAGES_DOC) + cache localStorage offline.
 * Sync multi-appareils via onSnapshot. Notif sur réception.
 *
 * Structure : { "userA__userB": [ { id, from, to, text, createdAt, read } ] }
 *   Clé de conversation = ids triés alphabétiquement joints par '__'
 *
 * Expose sur window :
 *   loadMessages, applyMessagesSnapshot,
 *   openMessages, closeMessages, openMessagesWith, sendMessage,
 *   renderConvList, renderConvView, deleteMessage, deleteConversation
 */

window.messagesData = {};
window._messagesSavePending = false;

let _activeConvId = null;
let _activeConvUserId = null;

function _convId(a, b) {
    if (!a || !b) return null;
    return [a, b].sort().join('__');
}

function _otherUserId(convId, selfId) {
    if (!convId) return null;
    const parts = convId.split('__');
    return parts.find(p => p !== selfId) || parts[0];
}

function _genMsgId() {
    return 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

window.loadMessages = async function loadMessages() {
    // Hydratation immédiate depuis le cache local (offline-first)
    try {
        const cached = localStorage.getItem('pu_messages_cache');
        if (cached) window.messagesData = JSON.parse(cached) || {};
    } catch (e) {}
    window.renderMessagesBadge();
    if (typeof MESSAGES_DOC === 'undefined' || !MESSAGES_DOC) return;
    try {
        const doc = await MESSAGES_DOC.get({ source: 'server' });
        if (doc.exists && doc.data()) {
            window.messagesData = doc.data();
            try { localStorage.setItem('pu_messages_cache', JSON.stringify(window.messagesData)); } catch (e) {}
        }
    } catch (e) { console.warn('loadMessages error', e); }
    window.renderMessagesBadge();
};

window.totalUnreadMessages = function totalUnreadMessages() {
    if (!currentUser || !window.messagesData) return 0;
    let n = 0;
    Object.keys(window.messagesData).forEach(cid => {
        if (!cid.split('__').includes(currentUser.id)) return;
        const arr = window.messagesData[cid] || [];
        arr.forEach(m => { if (m.to === currentUser.id && !m.read) n++; });
    });
    return n;
};

window.renderMessagesBadge = function renderMessagesBadge() {
    const badge = document.getElementById('msg-side-badge');
    if (!badge) return;
    const count = window.totalUnreadMessages();
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
};

window.applyMessagesSnapshot = function applyMessagesSnapshot(data) {
    if (!data) return;
    const previousByConv = {};
    Object.keys(window.messagesData || {}).forEach(cid => {
        previousByConv[cid] = (window.messagesData[cid] || []).map(m => m.id);
    });
    window.messagesData = data;
    try { localStorage.setItem('pu_messages_cache', JSON.stringify(data)); } catch (e) {}
    // Détecter nouveaux messages reçus (pas envoyés par soi) et créer une notif
    if (currentUser) {
        Object.keys(data).forEach(cid => {
            const arr = data[cid] || [];
            const prevIds = previousByConv[cid] || [];
            arr.forEach(m => {
                if (prevIds.includes(m.id)) return;
                if (m.from === currentUser.id) return;
                if (m.to !== currentUser.id) return;
                // Récupérer le nom de l'expéditeur depuis roster
                const sender = (window.roster || []).find(r => r.id === m.from);
                const senderName = sender ? `${sender.firstName} ${sender.lastName.toUpperCase()}` : 'Utilisateur';
                const preview = (m.text || '').slice(0, 80);
                if (typeof window.pushNotif === 'function') {
                    window.pushNotif(currentUser.id, 'message',
                        `💬 ${senderName}`,
                        preview,
                        { kind: 'openMessage', userId: m.from });
                }
            });
        });
    }
    // Re-render UI si visible
    if (document.getElementById('messages-modal')?.style.display === 'flex') {
        renderConvList();
        if (_activeConvId) renderConvView();
    }
    window.renderMessagesBadge();
};

function _persistConversation(convId, msgs) {
    if (!convId) return;
    if (!window.messagesData) window.messagesData = {};
    window.messagesData[convId] = msgs;
    try { localStorage.setItem('pu_messages_cache', JSON.stringify(window.messagesData)); } catch (e) {}
    window.renderMessagesBadge();
    if (typeof MESSAGES_DOC !== 'undefined' && MESSAGES_DOC) {
        window._messagesSavePending = true;
        MESSAGES_DOC.set({ [convId]: msgs }, { merge: true })
            .then(() => { window._messagesSavePending = false; })
            .catch(e => { window._messagesSavePending = false; console.warn('Messages sync error', e); });
    }
}

window.sendMessage = async function sendMessage(toUserId, textOverride) {
    if (!currentUser) { showToast('Connectez-vous pour envoyer un message'); return; }
    if (!toUserId) { showToast('Destinataire manquant'); return; }
    const input = document.getElementById('msg-input');
    const text = (textOverride !== undefined ? textOverride : (input ? input.value : '')).trim();
    if (!text) return;
    const cid = _convId(currentUser.id, toUserId);
    const arr = (window.messagesData[cid] || []).slice();
    const msg = {
        id: _genMsgId(),
        from: currentUser.id,
        to: toUserId,
        text: text.slice(0, 2000),
        createdAt: Date.now(),
        read: false
    };
    arr.push(msg);
    _persistConversation(cid, arr);
    if (input) input.value = '';
    renderConvView();
    renderConvList();
};

window.deleteMessage = function deleteMessage(convId, msgId) {
    if (!currentUser || !convId) return;
    if (!confirm('Supprimer ce message ?')) return;
    const arr = (window.messagesData[convId] || []).filter(m => m.id !== msgId);
    _persistConversation(convId, arr);
    renderConvView();
    renderConvList();
};

window.deleteConversation = function deleteConversation(convId) {
    if (!convId) return;
    if (!confirm('Supprimer toute la conversation ?\n\nIrréversible — visible par les deux interlocuteurs.')) return;
    if (!window.messagesData) window.messagesData = {};
    window.messagesData[convId] = [];
    if (typeof MESSAGES_DOC !== 'undefined' && MESSAGES_DOC) {
        window._messagesSavePending = true;
        MESSAGES_DOC.set({ [convId]: [] }, { merge: true })
            .then(() => { window._messagesSavePending = false; })
            .catch(e => { window._messagesSavePending = false; });
    }
    if (_activeConvId === convId) { _activeConvId = null; _activeConvUserId = null; }
    renderConvList();
    renderConvView();
};

function _markConvRead(convId) {
    if (!currentUser || !convId) return;
    const arr = (window.messagesData[convId] || []).slice();
    let changed = false;
    arr.forEach(m => { if (m.to === currentUser.id && !m.read) { m.read = true; changed = true; } });
    if (changed) _persistConversation(convId, arr);
}

window.openMessages = function openMessages() {
    if (!currentUser) { showToast('Connectez-vous pour accéder aux messages'); return; }
    const m = document.getElementById('messages-modal');
    if (!m) return;
    m.style.display = 'flex';
    _activeConvId = null;
    _activeConvUserId = null;
    document.getElementById('msg-list-view').style.display = 'flex';
    document.getElementById('msg-conv-view').style.display = 'none';
    renderConvList();
};

window.closeMessages = function closeMessages() {
    const m = document.getElementById('messages-modal');
    if (m) m.style.display = 'none';
};

window.openMessagesWith = function openMessagesWith(userId) {
    if (!currentUser) { showToast('Connectez-vous pour accéder aux messages'); return; }
    if (!userId || userId === currentUser.id) return;
    const m = document.getElementById('messages-modal');
    if (!m) return;
    m.style.display = 'flex';
    _activeConvId = _convId(currentUser.id, userId);
    _activeConvUserId = userId;
    _markConvRead(_activeConvId);
    document.getElementById('msg-list-view').style.display = 'none';
    document.getElementById('msg-conv-view').style.display = 'flex';
    renderConvView();
};

window.backToConvList = function backToConvList() {
    _activeConvId = null;
    _activeConvUserId = null;
    document.getElementById('msg-list-view').style.display = 'flex';
    document.getElementById('msg-conv-view').style.display = 'none';
    renderConvList();
};

function renderConvList() {
    const container = document.getElementById('msg-conv-list');
    if (!container || !currentUser) return;

    // Filtrer destinataires recherchés (nouveau message)
    const searchEl = document.getElementById('msg-new-search');
    const q = (searchEl?.value || '').toLowerCase().trim();
    if (q.length >= 1) {
        const matches = (window.roster || [])
            .filter(r => r.id !== currentUser.id)
            .filter(r => (r.firstName + ' ' + r.lastName).toLowerCase().includes(q))
            .slice(0, 30);
        if (matches.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:24px; font-size:0.85rem;">Aucun utilisateur trouvé</p>';
            return;
        }
        container.innerHTML = matches.map(r => `
          <div onclick="openMessagesWith('${r.id}')" style="display:flex; align-items:center; gap:10px; padding:11px 13px; border:1px solid var(--border); border-radius:10px; margin-bottom:7px; cursor:pointer; background:var(--surface-sec);">
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:var(--${r.role || 'ide'}); flex-shrink:0;"></span>
            <div style="flex:1;">
              <div style="font-weight:800; font-size:0.85rem;">${escapeHTML(r.firstName)} ${escapeHTML(r.lastName.toUpperCase())}</div>
              <div style="font-size:0.7rem; color:var(--text-muted);">${(r.role || 'ide').toUpperCase()}</div>
            </div>
            <span style="color:var(--brand-aqua); font-size:1.1rem;">›</span>
          </div>`).join('');
        return;
    }

    // Liste des conversations existantes
    const convs = Object.entries(window.messagesData || {})
        .filter(([cid, arr]) => Array.isArray(arr) && arr.length > 0 && cid.split('__').includes(currentUser.id))
        .map(([cid, arr]) => {
            const last = arr[arr.length - 1];
            const otherId = _otherUserId(cid, currentUser.id);
            const other = (window.roster || []).find(r => r.id === otherId);
            const unread = arr.filter(m => m.to === currentUser.id && !m.read).length;
            return { cid, otherId, other, last, unread };
        })
        .sort((a, b) => (b.last?.createdAt || 0) - (a.last?.createdAt || 0));

    if (convs.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:24px; font-size:0.85rem;">Aucune conversation.<br>Cherchez un collègue ci-dessus pour commencer.</p>';
        return;
    }

    container.innerHTML = convs.map(c => {
        const name = c.other ? `${c.other.firstName} ${c.other.lastName.toUpperCase()}` : 'Utilisateur supprimé';
        const role = c.other?.role || 'ide';
        const dt = new Date(c.last.createdAt);
        const now = new Date();
        const sameDay = dt.toDateString() === now.toDateString();
        const dateStr = sameDay
            ? `${String(dt.getHours()).padStart(2,'0')}h${String(dt.getMinutes()).padStart(2,'0')}`
            : `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`;
        const preview = (c.last.text || '').slice(0, 60);
        const lastFromMe = c.last.from === currentUser.id;
        const unreadBadge = c.unread > 0
            ? `<span style="background:var(--crit); color:#fff; min-width:18px; height:18px; border-radius:9px; padding:0 5px; font-size:0.65rem; font-weight:900; display:inline-flex; align-items:center; justify-content:center; line-height:1; flex-shrink:0;">${c.unread}</span>`
            : '';
        return `
          <div onclick="openMessagesWith('${c.otherId}')" style="display:flex; align-items:center; gap:10px; padding:11px 13px; border:1px solid var(--border); border-radius:10px; margin-bottom:7px; cursor:pointer; background:${c.unread > 0 ? 'rgba(64,206,234,0.10)' : 'var(--surface-sec)'};">
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:var(--${role}); flex-shrink:0;"></span>
            <div style="flex:1; min-width:0;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                <span style="font-weight:800; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(name)}</span>
                <span style="font-size:0.68rem; color:var(--text-muted); flex-shrink:0;">${dateStr}</span>
              </div>
              <div style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">
                ${lastFromMe ? '<span style="color:var(--brand-aqua);">Vous : </span>' : ''}${escapeHTML(preview)}
              </div>
            </div>
            ${unreadBadge}
          </div>`;
    }).join('');
}
window.renderConvList = renderConvList;

function renderConvView() {
    const headerEl = document.getElementById('msg-conv-header');
    const bodyEl = document.getElementById('msg-conv-body');
    if (!headerEl || !bodyEl || !currentUser || !_activeConvId) return;

    const other = (window.roster || []).find(r => r.id === _activeConvUserId);
    const name = other ? `${other.firstName} ${other.lastName.toUpperCase()}` : 'Utilisateur';
    const role = other?.role || 'ide';
    headerEl.innerHTML = `
      <button onclick="backToConvList()" style="background:none; border:none; font-size:1.4rem; cursor:pointer; color:var(--text); padding:0 8px;">‹</button>
      <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:var(--${role}); flex-shrink:0;"></span>
      <div style="flex:1; min-width:0;">
        <div style="font-weight:900; font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(name)}</div>
        <div style="font-size:0.68rem; color:var(--text-muted);">${role.toUpperCase()}</div>
      </div>
      <button onclick="deleteConversation('${_activeConvId}')" title="Supprimer la conversation" style="background:none; border:none; font-size:1.1rem; cursor:pointer; color:var(--crit); padding:0 8px;">🗑️</button>
    `;

    const msgs = (window.messagesData[_activeConvId] || []).slice().sort((a, b) => a.createdAt - b.createdAt);
    if (msgs.length === 0) {
        bodyEl.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:30px; font-size:0.85rem;">Aucun message — écrivez le premier !</p>';
    } else {
        bodyEl.innerHTML = msgs.map(m => {
            const mine = m.from === currentUser.id;
            const dt = new Date(m.createdAt);
            const dateStr = `${String(dt.getHours()).padStart(2,'0')}h${String(dt.getMinutes()).padStart(2,'0')}`;
            const align = mine ? 'flex-end' : 'flex-start';
            const bg = mine ? 'var(--brand-aqua)' : 'var(--surface-sec)';
            const color = mine ? '#fff' : 'var(--text)';
            return `
              <div style="display:flex; justify-content:${align}; margin-bottom:8px;">
                <div style="max-width:78%; background:${bg}; color:${color}; padding:8px 12px; border-radius:14px; ${mine ? 'border-bottom-right-radius:4px;' : 'border-bottom-left-radius:4px;'} position:relative;">
                  <div style="font-size:0.85rem; line-height:1.35; white-space:pre-wrap; word-wrap:break-word;">${escapeHTML(m.text)}</div>
                  <div style="font-size:0.62rem; color:${mine ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)'}; margin-top:3px; text-align:right;">${dateStr}${mine && m.read ? ' ✓✓' : (mine ? ' ✓' : '')}</div>
                  ${mine ? `<button onclick="deleteMessage('${_activeConvId}', '${m.id}')" style="position:absolute; top:-6px; right:-6px; background:var(--crit); color:#fff; border:none; border-radius:50%; width:18px; height:18px; font-size:0.7rem; cursor:pointer; display:none; line-height:1;" class="msg-del-btn">×</button>` : ''}
                </div>
              </div>`;
        }).join('');
        bodyEl.scrollTop = bodyEl.scrollHeight;
    }
    _markConvRead(_activeConvId);
    if (typeof window.renderNotifsBell === 'function') window.renderNotifsBell();
}
window.renderConvView = renderConvView;

window.handleMsgInputKey = function handleMsgInputKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (_activeConvUserId) window.sendMessage(_activeConvUserId);
    }
};

window.submitCurrentMessage = function submitCurrentMessage() {
    if (_activeConvUserId) window.sendMessage(_activeConvUserId);
};
