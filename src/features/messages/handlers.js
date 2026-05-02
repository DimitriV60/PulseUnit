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
let _convSearchQuery = '';
let _listFilter = 'all'; // 'all' | 'unread' | 'groups'

window.setMessagesListFilter = function setMessagesListFilter(f) {
    if (!['all', 'unread', 'groups'].includes(f)) return;
    _listFilter = f;
    document.querySelectorAll('.msg-filter-tab').forEach(b => {
        const sel = b.dataset.filter === f;
        b.style.background = sel ? 'var(--brand-aqua)' : 'transparent';
        b.style.color = sel ? '#fff' : 'var(--text-muted)';
        b.style.fontWeight = sel ? '900' : '700';
    });
    renderConvList();
};

const _PINS_KEY = 'pu_msg_pins';
function _loadPins() {
    try { return JSON.parse(localStorage.getItem(_PINS_KEY) || '{}') || {}; } catch (e) { return {}; }
}
function _isPinned(convId) {
    if (!convId) return false;
    return !!_loadPins()[convId];
}
// ============ RÉPONSE À UN MESSAGE (citation) ============
let _replyDraft = null; // { convId, msgId, fromName, textPreview }

window.startReplyTo = function startReplyTo(convId, msgId) {
    if (!convId || !msgId || !currentUser) return;
    const arr = window.messagesData[convId] || [];
    const m = arr.find(x => x.id === msgId);
    if (!m) return;
    const sender = (window.roster || []).find(r => r.id === m.from);
    const fromName = m.from === currentUser.id
        ? 'Vous'
        : (sender ? `${sender.firstName} ${sender.lastName.toUpperCase()}` : 'Utilisateur');
    _replyDraft = {
        convId, msgId, fromName,
        textPreview: (m.text || '').slice(0, 120)
    };
    _renderReplyBanner();
    const inp = document.getElementById('msg-input');
    if (inp) inp.focus();
};

window.cancelReply = function cancelReply() {
    _replyDraft = null;
    _renderReplyBanner();
};

function _renderReplyBanner() {
    const wrap = document.getElementById('msg-reply-banner');
    if (!wrap) return;
    if (!_replyDraft || _replyDraft.convId !== _activeConvId) {
        wrap.style.display = 'none';
        wrap.innerHTML = '';
        return;
    }
    wrap.style.display = 'flex';
    wrap.innerHTML = `
      <div style="flex:1; min-width:0; border-left:3px solid var(--brand-aqua); padding:4px 10px;">
        <div style="font-size:0.7rem; color:var(--brand-aqua); font-weight:900;">↩ ${escapeHTML(_replyDraft.fromName)}</div>
        <div style="font-size:0.78rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(_replyDraft.textPreview)}</div>
      </div>
      <button onclick="cancelReply()" title="Annuler" style="background:none; border:none; font-size:1.1rem; cursor:pointer; color:var(--text-muted); padding:0 6px;">×</button>
    `;
}

window.toggleConvPin = function toggleConvPin(convId) {
    if (!convId) return;
    const p = _loadPins();
    if (p[convId]) delete p[convId]; else p[convId] = Date.now();
    try { localStorage.setItem(_PINS_KEY, JSON.stringify(p)); } catch (e) {}
    if (typeof showToast === 'function') showToast(p[convId] ? '📌 Conversation épinglée' : 'Épinglage retiré');
    renderConvList();
    if (_activeConvId === convId) renderConvView();
};

const _DRAFTS_KEY = 'pu_msg_drafts';
function _loadDrafts() {
    try { return JSON.parse(localStorage.getItem(_DRAFTS_KEY) || '{}') || {}; } catch (e) { return {}; }
}
function _saveDraft(convId, text) {
    if (!convId) return;
    const d = _loadDrafts();
    if (text && text.trim()) d[convId] = text;
    else delete d[convId];
    try { localStorage.setItem(_DRAFTS_KEY, JSON.stringify(d)); } catch (e) {}
}
function _getDraft(convId) {
    if (!convId) return '';
    return _loadDrafts()[convId] || '';
}

function _convId(a, b) {
    if (!a || !b) return null;
    return [a, b].sort().join('__');
}

function _otherUserId(convId, selfId) {
    if (!convId) return null;
    const parts = convId.split('__');
    return parts.find(p => p !== selfId) || parts[0];
}

// ============ MENTIONS @nom ============
// Parse @<prénom> dans le texte → résout un userId si match unique parmi les membres
function _convMembers(convId) {
    if (!convId || !currentUser) return [];
    if (_isGroupConv(convId)) {
        const role = _groupRole(convId);
        if (role === 'all') return (window.roster || []).slice();
        return (window.roster || []).filter(r => r.role === role);
    }
    const otherId = _otherUserId(convId, currentUser.id);
    return (window.roster || []).filter(r => r.id === otherId || r.id === currentUser.id);
}

function _parseMentions(text, convId) {
    if (!text || !convId) return [];
    const members = _convMembers(convId);
    if (!members.length) return [];
    const mentions = new Set();
    // Match @ suivi de lettres (avec accents et tiret), s'arrête au premier espace
    const re = /@([\p{L}][\p{L}\-']{1,30})/gu;
    let m;
    while ((m = re.exec(text)) !== null) {
        const needle = m[1].toLowerCase();
        const matches = members.filter(r =>
            r.firstName.toLowerCase() === needle ||
            r.firstName.toLowerCase().startsWith(needle) ||
            (r.firstName + r.lastName).toLowerCase().replace(/[\s'-]/g, '').startsWith(needle)
        );
        if (matches.length === 1) mentions.add(matches[0].id);
    }
    return Array.from(mentions);
}

function _renderMentionsHTML(text) {
    if (!text) return '';
    return escapeHTML(text).replace(/@([\p{L}][\p{L}\-']{1,30})/gu,
        (full, name) => `<span style="background:rgba(64,206,234,0.18); color:var(--brand-aqua); font-weight:800; padding:0 3px; border-radius:3px;">${full}</span>`
    );
}

// ============ GROUPES PAR RÔLE ============
// Clé Firestore : "group__<role>" — role ∈ {ide, as, rea, usip, all}
const _GROUPS = [
    { key: 'group__all',  label: 'Toute l\'équipe',     icon: '👥', roleColor: 'brand-aqua' },
    { key: 'group__ide',  label: 'Équipe IDE',           icon: '💉', roleColor: 'ide'  },
    { key: 'group__as',   label: 'Équipe AS',            icon: '🩺', roleColor: 'as'   },
    { key: 'group__rea',  label: 'Équipe Réanimation',   icon: '🫀', roleColor: 'rea'  },
    { key: 'group__usip', label: 'Équipe USIP',          icon: '🏥', roleColor: 'usip' }
];
window.MESSAGE_GROUPS = _GROUPS;

function _isGroupConv(cid) { return typeof cid === 'string' && cid.startsWith('group__'); }
function _groupRole(cid) { return _isGroupConv(cid) ? cid.slice(7) : null; }
function _groupMeta(cid) { return _GROUPS.find(g => g.key === cid) || null; }

function _userCanAccessGroup(groupKey, user) {
    if (!user) return false;
    if (groupKey === 'group__all') return true;
    const role = _groupRole(groupKey);
    return user.role === role;
}

window.userAccessibleGroups = function userAccessibleGroups() {
    if (!currentUser) return [];
    return _GROUPS.filter(g => _userCanAccessGroup(g.key, currentUser));
};

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

function _convUnread(cid, arr) {
    if (!currentUser) return 0;
    if (_isGroupConv(cid)) {
        if (!_userCanAccessGroup(cid, currentUser)) return 0;
        return arr.filter(m => m.from !== currentUser.id && !(m.readBy || []).includes(currentUser.id)).length;
    }
    return arr.filter(m => m.to === currentUser.id && !m.read).length;
}

window.totalUnreadMessages = function totalUnreadMessages() {
    if (!currentUser || !window.messagesData) return 0;
    let n = 0;
    Object.keys(window.messagesData).forEach(cid => {
        if (_isGroupConv(cid)) {
            if (!_userCanAccessGroup(cid, currentUser)) return;
        } else if (!cid.split('__').includes(currentUser.id)) {
            return;
        }
        const arr = window.messagesData[cid] || [];
        n += _convUnread(cid, arr);
    });
    return n;
};

window.renderMessagesBadge = function renderMessagesBadge() {
    const badge = document.getElementById('msg-side-badge');
    const count = window.totalUnreadMessages();
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }
    // 2026-05-03 — la cloche affiche aussi les messages non lus
    if (typeof window.renderNotifsBell === 'function') window.renderNotifsBell();
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
            const isGroup = _isGroupConv(cid);
            if (isGroup && !_userCanAccessGroup(cid, currentUser)) return;
            if (!isGroup && !cid.split('__').includes(currentUser.id)) return;
            arr.forEach(m => {
                if (prevIds.includes(m.id)) return;
                if (m.from === currentUser.id) return;
                if (!isGroup && m.to !== currentUser.id) return;
                // Récupérer le nom de l'expéditeur depuis roster
                const sender = (window.roster || []).find(r => r.id === m.from);
                const senderName = sender ? `${sender.firstName} ${sender.lastName.toUpperCase()}` : 'Utilisateur';
                const preview = (m.text || '').slice(0, 80);
                const isMentioned = Array.isArray(m.mentions) && m.mentions.includes(currentUser.id);
                if (typeof window.pushNotif === 'function') {
                    if (isGroup) {
                        const meta = _groupMeta(cid);
                        const label = meta ? meta.label : 'Groupe';
                        const titleIcon = isMentioned ? '🔔 @vous' : (meta?.icon || '💬');
                        window.pushNotif(currentUser.id, isMentioned ? 'mention' : 'message',
                            `${titleIcon} ${label} — ${senderName}`,
                            preview,
                            { kind: 'openGroup', groupKey: cid, urgent: isMentioned });
                    } else {
                        window.pushNotif(currentUser.id, 'message',
                            `💬 ${senderName}`,
                            preview,
                            { kind: 'openMessage', userId: m.from });
                    }
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

window.sendMessage = async function sendMessage(target, textOverride) {
    if (!currentUser) { showToast('Connectez-vous pour envoyer un message'); return; }
    if (!target) { showToast('Destinataire manquant'); return; }
    const input = document.getElementById('msg-input');
    const text = (textOverride !== undefined ? textOverride : (input ? input.value : '')).trim();
    if (!text) return;
    const isGroup = _isGroupConv(target);
    if (isGroup && !_userCanAccessGroup(target, currentUser)) {
        showToast('Vous n\'êtes pas membre de ce groupe'); return;
    }
    const cid = isGroup ? target : _convId(currentUser.id, target);
    const arr = (window.messagesData[cid] || []).slice();
    const finalText = text.slice(0, 2000);
    const mentions = _parseMentions(finalText, cid).filter(uid => uid !== currentUser.id);
    const msg = isGroup ? {
        id: _genMsgId(),
        from: currentUser.id,
        to: cid,
        text: finalText,
        createdAt: Date.now(),
        readBy: [currentUser.id]
    } : {
        id: _genMsgId(),
        from: currentUser.id,
        to: target,
        text: finalText,
        createdAt: Date.now(),
        read: false
    };
    if (mentions.length) msg.mentions = mentions;
    if (_replyDraft && _replyDraft.convId === cid) {
        msg.replyTo = {
            id: _replyDraft.msgId,
            fromName: _replyDraft.fromName,
            textPreview: _replyDraft.textPreview
        };
    }
    arr.push(msg);
    _persistConversation(cid, arr);
    if (input) input.value = '';
    _saveDraft(cid, '');
    _replyDraft = null;
    _renderReplyBanner();
    renderConvView();
    renderConvList();
};

window.saveDraftFromInput = function saveDraftFromInput() {
    const input = document.getElementById('msg-input');
    if (!input || !_activeConvId) return;
    _saveDraft(_activeConvId, input.value);
    if (input.value && input.value.trim().length > 0 && typeof window.setTyping === 'function') {
        window.setTyping(_activeConvId);
    }
};

window.setConvSearchQuery = function setConvSearchQuery(q) {
    _convSearchQuery = (q || '').toLowerCase().trim();
    renderConvView();
};

window.toggleConvSearch = function toggleConvSearch() {
    const wrap = document.getElementById('msg-conv-search-wrap');
    if (!wrap) return;
    const visible = wrap.style.display === 'flex';
    wrap.style.display = visible ? 'none' : 'flex';
    if (!visible) {
        const inp = document.getElementById('msg-conv-search');
        if (inp) { inp.value = ''; setTimeout(() => inp.focus(), 30); }
    } else {
        _convSearchQuery = '';
        renderConvView();
    }
};

window.deleteMessage = function deleteMessage(convId, msgId) {
    if (!currentUser || !convId) return;
    if (!confirm('Supprimer ce message ?')) return;
    const arr = (window.messagesData[convId] || []).filter(m => m.id !== msgId);
    _persistConversation(convId, arr);
    renderConvView();
    renderConvList();
};

window.editMessage = function editMessage(convId, msgId) {
    if (!currentUser || !convId) return;
    const arr = (window.messagesData[convId] || []).slice();
    const idx = arr.findIndex(m => m.id === msgId);
    if (idx < 0) return;
    const m = arr[idx];
    if (m.from !== currentUser.id) { showToast('Vous ne pouvez éditer que vos propres messages'); return; }
    const next = prompt('Modifier le message :', m.text);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed) { showToast('Message vide — utilisez la croix pour supprimer'); return; }
    arr[idx] = { ...m, text: trimmed.slice(0, 2000), editedAt: Date.now() };
    _persistConversation(convId, arr);
    renderConvView();
    renderConvList();
};

const _REACTION_SET = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
window.MESSAGE_REACTIONS = _REACTION_SET;

window.toggleReaction = function toggleReaction(convId, msgId, emoji) {
    if (!currentUser || !convId || !emoji) return;
    if (!_REACTION_SET.includes(emoji)) return;
    const arr = (window.messagesData[convId] || []).slice();
    const idx = arr.findIndex(m => m.id === msgId);
    if (idx < 0) return;
    const m = { ...arr[idx] };
    const reactions = { ...(m.reactions || {}) };
    const users = (reactions[emoji] || []).slice();
    const pos = users.indexOf(currentUser.id);
    if (pos >= 0) users.splice(pos, 1); else users.push(currentUser.id);
    if (users.length > 0) reactions[emoji] = users; else delete reactions[emoji];
    m.reactions = reactions;
    arr[idx] = m;
    _persistConversation(convId, arr);
    _hideReactionPicker();
    renderConvView();
};

function _hideReactionPicker() {
    const p = document.getElementById('msg-react-picker');
    if (p) p.style.display = 'none';
}

window.openReactionPicker = function openReactionPicker(convId, msgId, anchorEl) {
    const picker = document.getElementById('msg-react-picker');
    if (!picker) return;
    // 2026-05-03 — emojis lisibles mais pas oversize (overflow viewport mobile)
    picker.innerHTML = _REACTION_SET.map(e =>
        `<button onclick="toggleReaction('${convId}','${msgId}','${e}')" style="background:none; border:none; font-size:1.4rem; cursor:pointer; padding:4px 7px; border-radius:8px; line-height:1; transition:transform 0.1s, background 0.1s; flex-shrink:0;" onmouseover="this.style.background='var(--surface-sec)';this.style.transform='scale(1.15)'" onmouseout="this.style.background='none';this.style.transform='scale(1)'">${e}</button>`
    ).join('');
    picker.style.display = 'flex';
    picker.style.position = 'fixed';
    // Auto-positionnement intelligent : essaye au-dessus, fallback en dessous si trop haut.
    // Centré horizontalement sur le message, contraint à la viewport.
    if (anchorEl) {
        const r = anchorEl.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        // Mesurer après display:flex + innerHTML pour avoir la vraie taille
        const pw = picker.offsetWidth || 320;
        const ph = picker.offsetHeight || 56;
        const margin = 12;
        // Position verticale : au-dessus si possible, sinon en dessous
        let top = r.top - ph - 10;
        if (top < margin) top = r.bottom + 10;
        if (top + ph > vh - margin) top = Math.max(margin, vh - ph - margin);
        // Position horizontale : centré sur le trigger, contraint à la viewport
        let left = r.left + (r.width / 2) - (pw / 2);
        left = Math.max(margin, Math.min(vw - pw - margin, left));
        picker.style.top = top + 'px';
        picker.style.left = left + 'px';
    } else {
        // Fallback : centré sur la viewport
        picker.style.top = '40%';
        picker.style.left = '50%';
        picker.style.transform = 'translate(-50%, -50%)';
    }
};

document.addEventListener('click', e => {
    const picker = document.getElementById('msg-react-picker');
    if (!picker || picker.style.display === 'none') return;
    if (picker.contains(e.target)) return;
    if (e.target.closest('.msg-react-trigger')) return;
    _hideReactionPicker();
});

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
    if (_isGroupConv(convId)) {
        if (!_userCanAccessGroup(convId, currentUser)) return;
        arr.forEach((m, i) => {
            if (m.from === currentUser.id) return;
            const readBy = m.readBy || [];
            if (!readBy.includes(currentUser.id)) {
                arr[i] = { ...m, readBy: [...readBy, currentUser.id] };
                changed = true;
            }
        });
    } else {
        arr.forEach(m => { if (m.to === currentUser.id && !m.read) { m.read = true; changed = true; } });
    }
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
    if (typeof window.clearTyping === 'function') window.clearTyping();
};

window.openGroupMessages = function openGroupMessages(groupKey) {
    if (!currentUser) { showToast('Connectez-vous pour accéder aux messages'); return; }
    if (!_isGroupConv(groupKey) || !_userCanAccessGroup(groupKey, currentUser)) {
        showToast('Groupe inaccessible'); return;
    }
    const m = document.getElementById('messages-modal');
    if (!m) return;
    m.style.display = 'flex';
    _activeConvId = groupKey;
    _activeConvUserId = null;
    _convSearchQuery = '';
    _replyDraft = null;
    _markConvRead(_activeConvId);
    document.getElementById('msg-list-view').style.display = 'none';
    document.getElementById('msg-conv-view').style.display = 'flex';
    const searchWrap = document.getElementById('msg-conv-search-wrap');
    if (searchWrap) searchWrap.style.display = 'none';
    const searchInp = document.getElementById('msg-conv-search');
    if (searchInp) searchInp.value = '';
    renderConvView();
    const input = document.getElementById('msg-input');
    if (input) input.value = _getDraft(_activeConvId) || '';
};

window.openMessagesWith = function openMessagesWith(userId) {
    if (!currentUser) { showToast('Connectez-vous pour accéder aux messages'); return; }
    if (!userId || userId === currentUser.id) return;
    const m = document.getElementById('messages-modal');
    if (!m) return;
    m.style.display = 'flex';
    _activeConvId = _convId(currentUser.id, userId);
    _activeConvUserId = userId;
    _convSearchQuery = '';
    _replyDraft = null;
    _markConvRead(_activeConvId);
    document.getElementById('msg-list-view').style.display = 'none';
    document.getElementById('msg-conv-view').style.display = 'flex';
    const searchWrap = document.getElementById('msg-conv-search-wrap');
    if (searchWrap) searchWrap.style.display = 'none';
    const searchInp = document.getElementById('msg-conv-search');
    if (searchInp) searchInp.value = '';
    renderConvView();
    // Restaurer le brouillon
    const input = document.getElementById('msg-input');
    if (input) input.value = _getDraft(_activeConvId) || '';
};

window.backToConvList = function backToConvList() {
    // Sauvegarde du brouillon avant de quitter
    const input = document.getElementById('msg-input');
    if (input && _activeConvId) _saveDraft(_activeConvId, input.value);
    _activeConvId = null;
    _activeConvUserId = null;
    _convSearchQuery = '';
    _replyDraft = null;
    _renderReplyBanner();
    if (typeof window.clearTyping === 'function') window.clearTyping();
    document.getElementById('msg-list-view').style.display = 'flex';
    document.getElementById('msg-conv-view').style.display = 'none';
    renderConvList();
};

function renderConvList() {
    const container = document.getElementById('msg-conv-list');
    if (!container || !currentUser) return;

    // Recherche : collègues + contenu des messages
    const searchEl = document.getElementById('msg-new-search');
    const q = (searchEl?.value || '').toLowerCase().trim();
    if (q.length >= 1) {
        const userMatches = (window.roster || [])
            .filter(r => r.id !== currentUser.id)
            .filter(r => (r.firstName + ' ' + r.lastName).toLowerCase().includes(q))
            .slice(0, 20);
        // Recherche dans les messages : trouver tous les messages qui matchent
        const msgMatches = [];
        Object.entries(window.messagesData || {}).forEach(([cid, arr]) => {
            if (!Array.isArray(arr) || arr.length === 0) return;
            const isGroup = _isGroupConv(cid);
            if (isGroup && !_userCanAccessGroup(cid, currentUser)) return;
            if (!isGroup && !cid.split('__').includes(currentUser.id)) return;
            arr.forEach(m => {
                if (!(m.text || '').toLowerCase().includes(q)) return;
                msgMatches.push({ cid, msg: m, isGroup });
            });
        });
        msgMatches.sort((a, b) => (b.msg.createdAt || 0) - (a.msg.createdAt || 0));
        const topMsgs = msgMatches.slice(0, 30);

        let html = '';
        if (userMatches.length > 0) {
            html += '<div style="font-size:0.7rem; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin:2px 0 6px;">Collègues</div>';
            html += userMatches.map(r => `
              <div onclick="openMessagesWith('${r.id}')" style="display:flex; align-items:center; gap:10px; padding:11px 13px; border:1px solid var(--border); border-radius:10px; margin-bottom:7px; cursor:pointer; background:var(--surface-sec);">
                <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:var(--${r.role || 'ide'}); flex-shrink:0;"></span>
                <div style="flex:1;">
                  <div style="font-weight:800; font-size:0.85rem;">${escapeHTML(r.firstName)} ${escapeHTML(r.lastName.toUpperCase())}</div>
                  <div style="font-size:0.7rem; color:var(--text-muted);">${(r.role || 'ide').toUpperCase()}</div>
                </div>
                <span style="color:var(--brand-aqua); font-size:1.1rem;">›</span>
              </div>`).join('');
        }
        if (topMsgs.length > 0) {
            html += '<div style="font-size:0.7rem; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin:14px 0 6px;">Dans les messages (' + msgMatches.length + ')</div>';
            html += topMsgs.map(({ cid, msg, isGroup }) => {
                let label, openCall, role = 'ide';
                if (isGroup) {
                    const meta = _groupMeta(cid);
                    label = meta ? meta.label : 'Groupe';
                    openCall = `openGroupMessages('${cid}')`;
                    role = meta?.roleColor || 'brand-aqua';
                } else {
                    const otherId = _otherUserId(cid, currentUser.id);
                    const other = (window.roster || []).find(r => r.id === otherId);
                    label = other ? `${other.firstName} ${other.lastName.toUpperCase()}` : 'Utilisateur';
                    openCall = `openMessagesWith('${otherId}')`;
                    role = other?.role || 'ide';
                }
                const dt = new Date(msg.createdAt);
                const dateStr = `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}h${String(dt.getMinutes()).padStart(2,'0')}`;
                // Highlight le terme recherché
                const text = msg.text || '';
                const idx = text.toLowerCase().indexOf(q);
                const start = Math.max(0, idx - 20);
                const end = Math.min(text.length, idx + q.length + 40);
                const before = (start > 0 ? '…' : '') + escapeHTML(text.slice(start, idx));
                const matched = '<mark style="background:rgba(64,206,234,0.35); color:var(--text); padding:0 2px; border-radius:2px;">' + escapeHTML(text.slice(idx, idx + q.length)) + '</mark>';
                const after = escapeHTML(text.slice(idx + q.length, end)) + (end < text.length ? '…' : '');
                return `
                  <div onclick="${openCall}" style="display:flex; align-items:flex-start; gap:10px; padding:10px 12px; border:1px solid var(--border); border-radius:10px; margin-bottom:7px; cursor:pointer; background:var(--surface-sec);">
                    <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:var(--${role}); flex-shrink:0; margin-top:6px;"></span>
                    <div style="flex:1; min-width:0;">
                      <div style="display:flex; justify-content:space-between; gap:6px; margin-bottom:3px;">
                        <span style="font-weight:800; font-size:0.82rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${isGroup ? '👥 ' : ''}${escapeHTML(label)}</span>
                        <span style="font-size:0.66rem; color:var(--text-muted); flex-shrink:0;">${dateStr}</span>
                      </div>
                      <div style="font-size:0.78rem; color:var(--text-muted); line-height:1.35;">${before}${matched}${after}</div>
                    </div>
                  </div>`;
            }).join('');
        }
        if (!html) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:24px; font-size:0.85rem;">Aucun résultat pour « ' + escapeHTML(q) + ' »</p>';
            return;
        }
        container.innerHTML = html;
        return;
    }

    // Application du filtre actif (Tous / Non-lus / Groupes)
    const drafts = _loadDrafts();
    const showGroups = (_listFilter === 'all' || _listFilter === 'groups' || _listFilter === 'unread');
    const showDMs    = (_listFilter === 'all' || _listFilter === 'unread');
    const onlyUnread = (_listFilter === 'unread');
    let groups = showGroups ? window.userAccessibleGroups() : [];
    if (onlyUnread) {
        groups = groups.filter(g => _convUnread(g.key, window.messagesData[g.key] || []) > 0);
    }
    let groupsHTML = '';
    if (groups.length > 0) {
        groupsHTML = '<div style="font-size:0.7rem; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin:2px 0 6px;">Groupes</div>';
        groupsHTML += groups.map(g => {
            const arr = (window.messagesData[g.key] || []);
            const unread = _convUnread(g.key, arr);
            const last = arr.length > 0 ? arr[arr.length - 1] : null;
            const draftText = drafts[g.key];
            let preview, dateStr = '';
            if (draftText) preview = draftText.slice(0, 60);
            else if (last) preview = (last.text || '').slice(0, 60);
            else preview = 'Aucun message — soyez le premier !';
            if (last) {
                const dt = new Date(last.createdAt);
                const sameDay = dt.toDateString() === new Date().toDateString();
                dateStr = sameDay
                    ? `${String(dt.getHours()).padStart(2,'0')}h${String(dt.getMinutes()).padStart(2,'0')}`
                    : `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`;
            }
            const unreadBadge = unread > 0
                ? `<span style="background:var(--crit); color:#fff; min-width:18px; height:18px; border-radius:9px; padding:0 5px; font-size:0.65rem; font-weight:900; display:inline-flex; align-items:center; justify-content:center; line-height:1; flex-shrink:0;">${unread}</span>`
                : '';
            const previewPrefix = draftText ? '<span style="color:var(--crit); font-weight:800;">Brouillon : </span>' : '';
            return `
              <div onclick="openGroupMessages('${g.key}')" style="display:flex; align-items:center; gap:10px; padding:11px 13px; border:1px solid var(--border); border-radius:10px; margin-bottom:7px; cursor:pointer; background:${unread > 0 ? 'rgba(64,206,234,0.10)' : 'var(--surface-sec)'};">
                <span style="display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:50%; background:var(--${g.roleColor}); color:#fff; flex-shrink:0; font-size:0.95rem;">${g.icon}</span>
                <div style="flex:1; min-width:0;">
                  <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                    <span style="font-weight:800; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(g.label)}</span>
                    <span style="font-size:0.68rem; color:var(--text-muted); flex-shrink:0;">${dateStr}</span>
                  </div>
                  <div style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">
                    ${previewPrefix}${escapeHTML(preview)}
                  </div>
                </div>
                ${unreadBadge}
              </div>`;
        }).join('');
        if (showDMs) groupsHTML += '<div style="font-size:0.7rem; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin:14px 0 6px;">Conversations privées</div>';
    }

    // Liste des conversations 1-à-1 existantes
    const pins = _loadPins();
    let convs = !showDMs ? [] : Object.entries(window.messagesData || {})
        .filter(([cid, arr]) => Array.isArray(arr) && arr.length > 0 && !_isGroupConv(cid) && cid.split('__').includes(currentUser.id))
        .map(([cid, arr]) => {
            const last = arr[arr.length - 1];
            const otherId = _otherUserId(cid, currentUser.id);
            const other = (window.roster || []).find(r => r.id === otherId);
            const unread = arr.filter(m => m.to === currentUser.id && !m.read).length;
            const pinned = !!pins[cid];
            return { cid, otherId, other, last, unread, pinned };
        })
        .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return (b.last?.createdAt || 0) - (a.last?.createdAt || 0);
        });
    if (onlyUnread) convs = convs.filter(c => c.unread > 0);

    if (convs.length === 0 && groups.length === 0) {
        const emptyMsg = onlyUnread
            ? 'Aucun message non-lu. ✨'
            : (_listFilter === 'groups' ? 'Aucun groupe accessible.' : 'Aucune conversation.<br>Cherchez un collègue ci-dessus pour commencer.');
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:24px; font-size:0.85rem;">' + emptyMsg + '</p>';
        return;
    }
    if (convs.length === 0) {
        container.innerHTML = groupsHTML;
        return;
    }

    container.innerHTML = groupsHTML + convs.map(c => {
        const name = c.other ? `${c.other.firstName} ${c.other.lastName.toUpperCase()}` : 'Utilisateur supprimé';
        const role = c.other?.role || 'ide';
        const dt = new Date(c.last.createdAt);
        const now = new Date();
        const sameDay = dt.toDateString() === now.toDateString();
        const dateStr = sameDay
            ? `${String(dt.getHours()).padStart(2,'0')}h${String(dt.getMinutes()).padStart(2,'0')}`
            : `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`;
        const draftText = drafts[c.cid];
        const preview = draftText ? draftText.slice(0, 60) : (c.last.text || '').slice(0, 60);
        const lastFromMe = c.last.from === currentUser.id;
        const unreadBadge = c.unread > 0
            ? `<span style="background:var(--crit); color:#fff; min-width:18px; height:18px; border-radius:9px; padding:0 5px; font-size:0.65rem; font-weight:900; display:inline-flex; align-items:center; justify-content:center; line-height:1; flex-shrink:0;">${c.unread}</span>`
            : '';
        const previewPrefix = draftText
            ? '<span style="color:var(--crit); font-weight:800;">Brouillon : </span>'
            : (lastFromMe ? '<span style="color:var(--brand-aqua);">Vous : </span>' : '');
        const pinIcon = c.pinned ? '<span style="font-size:0.85rem; flex-shrink:0;" title="Épinglée">📌</span>' : '';
        return `
          <div onclick="openMessagesWith('${c.otherId}')" style="display:flex; align-items:center; gap:10px; padding:11px 13px; border:1px solid ${c.pinned ? 'var(--brand-aqua)' : 'var(--border)'}; border-radius:10px; margin-bottom:7px; cursor:pointer; background:${c.unread > 0 ? 'rgba(64,206,234,0.10)' : 'var(--surface-sec)'};">
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:var(--${role}); flex-shrink:0;"></span>
            <div style="flex:1; min-width:0;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                <span style="font-weight:800; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(name)}</span>
                <div style="display:flex; align-items:center; gap:5px; flex-shrink:0;">
                  ${pinIcon}
                  <span style="font-size:0.68rem; color:var(--text-muted);">${dateStr}</span>
                </div>
              </div>
              <div style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">
                ${previewPrefix}${escapeHTML(preview)}
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
    _renderReplyBanner();

    const isGroup = _isGroupConv(_activeConvId);
    const pinned = _isPinned(_activeConvId);
    const pinBtn = `<button onclick="toggleConvPin('${_activeConvId}')" title="${pinned ? 'Désépingler' : 'Épingler'}" style="background:none; border:none; font-size:1.05rem; cursor:pointer; color:${pinned ? 'var(--brand-aqua)' : 'var(--text-muted)'}; padding:0 8px;">📌</button>`;
    if (isGroup) {
        const meta = _groupMeta(_activeConvId);
        const label = meta ? meta.label : 'Groupe';
        const icon = meta ? meta.icon : '💬';
        const roleColor = meta ? meta.roleColor : 'brand-aqua';
        headerEl.innerHTML = `
          <button onclick="backToConvList()" style="background:none; border:none; font-size:1.4rem; cursor:pointer; color:var(--text); padding:0 8px;">‹</button>
          <span style="display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:50%; background:var(--${roleColor}); color:#fff; flex-shrink:0; font-size:0.85rem;">${icon}</span>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:900; font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(label)}</div>
            <div style="font-size:0.68rem; color:var(--text-muted);">Groupe</div>
          </div>
          ${pinBtn}
          <button onclick="toggleConvSearch()" title="Rechercher dans la conversation" style="background:none; border:none; font-size:1.05rem; cursor:pointer; color:var(--text); padding:0 8px;">🔍</button>
        `;
    } else {
        const other = (window.roster || []).find(r => r.id === _activeConvUserId);
        const name = other ? `${other.firstName} ${other.lastName.toUpperCase()}` : 'Utilisateur';
        const role = other?.role || 'ide';
        const online = typeof window.isUserOnline === 'function' && window.isUserOnline(_activeConvUserId);
        const statusDot = online
            ? '<span title="En ligne" style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--ok); flex-shrink:0;"></span>'
            : '';
        const subLabel = online
            ? '<span style="color:var(--ok); font-weight:800;">● En ligne</span>'
            : `<span>${role.toUpperCase()}</span>`;
        headerEl.innerHTML = `
          <button onclick="backToConvList()" style="background:none; border:none; font-size:1.4rem; cursor:pointer; color:var(--text); padding:0 8px;">‹</button>
          <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:var(--${role}); flex-shrink:0;"></span>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:900; font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:6px;">${escapeHTML(name)}${statusDot}</div>
            <div style="font-size:0.68rem; color:var(--text-muted);">${subLabel}</div>
          </div>
          ${pinBtn}
          <button onclick="toggleConvSearch()" title="Rechercher dans la conversation" style="background:none; border:none; font-size:1.05rem; cursor:pointer; color:var(--text); padding:0 8px;">🔍</button>
          <button onclick="deleteConversation('${_activeConvId}')" title="Supprimer la conversation" style="background:none; border:none; font-size:1.1rem; cursor:pointer; color:var(--crit); padding:0 8px;">🗑️</button>
        `;
    }

    const allMsgs = (window.messagesData[_activeConvId] || []).slice().sort((a, b) => a.createdAt - b.createdAt);
    const q = _convSearchQuery;
    const msgs = q
        ? allMsgs.filter(m => (m.text || '').toLowerCase().includes(q))
        : allMsgs;
    if (allMsgs.length === 0) {
        bodyEl.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:30px; font-size:0.85rem;">Aucun message — écrivez le premier !</p>';
    } else if (msgs.length === 0) {
        bodyEl.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:30px; font-size:0.85rem;">Aucun résultat pour « ${escapeHTML(q)} »</p>`;
    } else {
        bodyEl.innerHTML = msgs.map(m => {
            const mine = m.from === currentUser.id;
            const dt = new Date(m.createdAt);
            const dateStr = `${String(dt.getHours()).padStart(2,'0')}h${String(dt.getMinutes()).padStart(2,'0')}`;
            const align = mine ? 'flex-end' : 'flex-start';
            const bg = mine ? 'var(--brand-aqua)' : 'var(--surface-sec)';
            const color = mine ? '#fff' : 'var(--text)';
            const editedTag = m.editedAt
                ? ` <span style="opacity:0.7; font-style:italic;">· modifié</span>`
                : '';
            // Nom de l'expéditeur dans les groupes (au-dessus de la bulle, pour les autres)
            let senderHeader = '';
            if (isGroup && !mine) {
                const sender = (window.roster || []).find(r => r.id === m.from);
                const senderName = sender ? `${sender.firstName} ${sender.lastName.toUpperCase()}` : 'Utilisateur';
                const senderRole = sender?.role || 'ide';
                senderHeader = `<div style="font-size:0.68rem; font-weight:800; color:var(--${senderRole}); margin:0 4px 2px; align-self:flex-start;">${escapeHTML(senderName)}</div>`;
            }
            const reactions = m.reactions || {};
            const reactionEntries = Object.entries(reactions).filter(([, users]) => Array.isArray(users) && users.length > 0);
            const reactionsHTML = reactionEntries.length > 0
                ? `<div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; justify-content:${align};">${reactionEntries.map(([e, users]) => {
                    const reacted = users.includes(currentUser.id);
                    return `<button onclick="toggleReaction('${_activeConvId}','${m.id}','${e}')" style="background:${reacted ? 'rgba(64,206,234,0.20)' : 'var(--surface-sec)'}; border:1px solid ${reacted ? 'var(--brand-aqua)' : 'var(--border)'}; border-radius:12px; padding:1px 8px; font-size:0.75rem; cursor:pointer; line-height:1.4;" title="${users.length} réaction${users.length>1?'s':''}">${e} <span style="font-weight:700; color:var(--text);">${users.length}</span></button>`;
                }).join('')}</div>`
                : '';
            const ownActions = mine ? `
                  <button onclick="editMessage('${_activeConvId}', '${m.id}')" title="Modifier" style="position:absolute; top:-8px; right:38px; background:var(--brand-aqua); color:#fff; border:none; border-radius:50%; width:20px; height:20px; font-size:0.65rem; cursor:pointer; display:none; line-height:1;" class="msg-act-btn">✏️</button>
                  <button onclick="deleteMessage('${_activeConvId}', '${m.id}')" title="Supprimer" style="position:absolute; top:-8px; right:14px; background:var(--crit); color:#fff; border:none; border-radius:50%; width:20px; height:20px; font-size:0.7rem; cursor:pointer; display:none; line-height:1;" class="msg-act-btn">×</button>` : '';
            const reactBtn = `<button onclick="openReactionPicker('${_activeConvId}','${m.id}', this)" title="Réagir" class="msg-react-trigger msg-act-btn" style="position:absolute; top:-8px; ${mine ? 'left:-8px' : 'right:-8px'}; background:var(--surface); color:var(--text); border:1px solid var(--border); border-radius:50%; width:20px; height:20px; font-size:0.7rem; cursor:pointer; display:none; line-height:1;">😊</button>`;
            const replyBtn = `<button onclick="startReplyTo('${_activeConvId}','${m.id}')" title="Répondre" class="msg-act-btn" style="position:absolute; top:-8px; ${mine ? 'left:18px' : 'right:18px'}; background:var(--surface); color:var(--text); border:1px solid var(--border); border-radius:50%; width:20px; height:20px; font-size:0.7rem; cursor:pointer; display:none; line-height:1;">↩</button>`;
            // Citation (replyTo) au-dessus de la bulle
            let replyQuote = '';
            if (m.replyTo && m.replyTo.fromName) {
                replyQuote = `<div onclick="(function(){const el=document.getElementById('msg-${escapeHTML(m.replyTo.id)}'); if(el){el.scrollIntoView({behavior:'smooth',block:'center'}); el.style.transition='background 0.5s'; el.style.background='rgba(64,206,234,0.25)'; setTimeout(()=>{el.style.background='';},1200);}})()" style="max-width:78%; margin-bottom:2px; border-left:3px solid var(--brand-aqua); padding:4px 8px; background:rgba(64,206,234,0.08); border-radius:0 8px 8px 0; cursor:pointer;">
                  <div style="font-size:0.68rem; color:var(--brand-aqua); font-weight:900;">↩ ${escapeHTML(m.replyTo.fromName)}</div>
                  <div style="font-size:0.74rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(m.replyTo.textPreview || '')}</div>
                </div>`;
            }
            // Indicateurs de lecture : DM utilise read:bool, groupes utilisent readBy:[]
            let readIndicator = '';
            if (mine) {
                if (isGroup) {
                    const others = (m.readBy || []).filter(uid => uid !== currentUser.id).length;
                    readIndicator = others > 0 ? ` ✓✓ ${others}` : ' ✓';
                } else {
                    readIndicator = m.read ? ' ✓✓' : ' ✓';
                }
            }
            return `
              <div id="msg-${m.id}" style="display:flex; flex-direction:column; align-items:${align}; margin-bottom:8px;">
                ${senderHeader}
                ${replyQuote}
                <div style="max-width:78%; background:${bg}; color:${color}; padding:8px 12px; border-radius:14px; ${mine ? 'border-bottom-right-radius:4px;' : 'border-bottom-left-radius:4px;'} position:relative;">
                  <div style="font-size:0.85rem; line-height:1.35; white-space:pre-wrap; word-wrap:break-word;">${_renderMentionsHTML(m.text)}</div>
                  <div style="font-size:0.62rem; color:${mine ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)'}; margin-top:3px; text-align:right;">${dateStr}${editedTag}${readIndicator}</div>
                  ${reactBtn}
                  ${replyBtn}
                  ${ownActions}
                </div>
                ${reactionsHTML}
              </div>`;
        }).join('');
        bodyEl.scrollTop = bodyEl.scrollHeight;
    }
    // Indicateur "en train d'écrire…" en bas du body
    const typingEl = document.getElementById('msg-typing-indicator');
    if (typingEl) {
        const typers = (typeof window.getTypingUsers === 'function') ? window.getTypingUsers(_activeConvId) : [];
        if (typers.length === 0) {
            typingEl.style.display = 'none';
            typingEl.innerHTML = '';
        } else {
            typingEl.style.display = 'block';
            const names = typers.map(t => t.firstName).join(', ');
            const verb = typers.length > 1 ? 'écrivent' : 'écrit';
            typingEl.innerHTML = `<span style="font-size:0.74rem; color:var(--text-muted); font-style:italic;"><span style="display:inline-block; animation:msgTypingPulse 1.4s infinite;">⋯</span> ${escapeHTML(names)} ${verb}…</span>`;
        }
    }
    _markConvRead(_activeConvId);
    if (typeof window.renderNotifsBell === 'function') window.renderNotifsBell();
}

// Re-render léger toutes les 5s pour rafraîchir typing/online (pas de re-fetch Firestore)
let _convViewRefreshInterval = null;
function _startConvViewRefresh() {
    if (_convViewRefreshInterval) return;
    _convViewRefreshInterval = setInterval(() => {
        if (_activeConvId && document.getElementById('messages-modal')?.style.display === 'flex') {
            // Re-render uniquement le header + zone typing pour éviter de scroller
            const typers = (typeof window.getTypingUsers === 'function') ? window.getTypingUsers(_activeConvId) : [];
            const typingEl = document.getElementById('msg-typing-indicator');
            if (typingEl) {
                if (typers.length === 0) {
                    typingEl.style.display = 'none';
                    typingEl.innerHTML = '';
                } else {
                    typingEl.style.display = 'block';
                    const names = typers.map(t => t.firstName).join(', ');
                    const verb = typers.length > 1 ? 'écrivent' : 'écrit';
                    typingEl.innerHTML = `<span style="font-size:0.74rem; color:var(--text-muted); font-style:italic;"><span style="display:inline-block; animation:msgTypingPulse 1.4s infinite;">⋯</span> ${escapeHTML(names)} ${verb}…</span>`;
                }
            }
        }
    }, 5000);
}
document.addEventListener('DOMContentLoaded', _startConvViewRefresh);
window.renderConvView = renderConvView;

function _activeSendTarget() {
    if (_activeConvUserId) return _activeConvUserId;
    if (_activeConvId && _isGroupConv(_activeConvId)) return _activeConvId;
    return null;
}

window.handleMsgInputKey = function handleMsgInputKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const target = _activeSendTarget();
        if (target) window.sendMessage(target);
    }
};

window.submitCurrentMessage = function submitCurrentMessage() {
    const target = _activeSendTarget();
    if (target) window.sendMessage(target);
};
