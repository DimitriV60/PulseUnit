/**
 * Presence handlers — Heartbeat Firebase (statut utilisateur connecté).
 * Dépend de :
 *   - PRESENCE_DOC, currentUser (let/const inline)
 *   - firebase.firestore.FieldValue (global Firebase)
 * Le listener `PRESENCE_DOC.onSnapshot` et la variable `onlineUsers`
 * restent inline (mutés par listener + lus par admin).
 */

let _presenceInterval = null;
let _lastTypingWrite = 0;

window.setPresence = async function setPresence(online, extra) {
    if (!PRESENCE_DOC || !currentUser) return;
    try {
        if (online) {
            const data = {
                firstName: currentUser.firstName,
                lastName:  currentUser.lastName,
                role:      currentUser.role,
                lastSeen:  Date.now()
            };
            if (extra && typeof extra === 'object') Object.assign(data, extra);
            await PRESENCE_DOC.set({ [currentUser.id]: data }, { merge: true });
        } else {
            await PRESENCE_DOC.set(
                { [currentUser.id]: firebase.firestore.FieldValue.delete() },
                { merge: true }
            );
        }
    } catch(e) { console.warn('Presence error:', e); }
};

// Indique que l'utilisateur tape dans la conversation cid (DM ou groupe).
// Throttle : 1 écriture max toutes les 4 secondes.
window.setTyping = function setTyping(cid) {
    if (!cid || !currentUser) return;
    const now = Date.now();
    if (now - _lastTypingWrite < 4000) return;
    _lastTypingWrite = now;
    window.setPresence(true, { typing: { cid, until: now + 7000 } });
};

// Stoppe le statut "en train d'écrire" si présent.
window.clearTyping = function clearTyping() {
    if (!currentUser) return;
    _lastTypingWrite = 0;
    window.setPresence(true, { typing: null });
};

// Renvoie la liste des utilisateurs en train d'écrire dans la conv cid (hors soi).
window.getTypingUsers = function getTypingUsers(cid) {
    if (!cid || !window.onlineUsers) return [];
    const now = Date.now();
    return Object.entries(window.onlineUsers || {})
        .filter(([uid, data]) => {
            if (!data || !data.typing) return false;
            if (uid === (currentUser && currentUser.id)) return false;
            return data.typing.cid === cid && (data.typing.until || 0) > now;
        })
        .map(([uid, data]) => ({ uid, firstName: data.firstName, lastName: data.lastName }));
};

// Renvoie true si l'utilisateur est en ligne (heartbeat < 90 s).
window.isUserOnline = function isUserOnline(userId) {
    if (!userId || !window.onlineUsers) return false;
    const u = window.onlineUsers[userId];
    if (!u || !u.lastSeen) return false;
    return (Date.now() - u.lastSeen) < 90000;
};

window.startPresenceHeartbeat = function startPresenceHeartbeat() {
    window.stopPresenceHeartbeat();
    window.setPresence(true);
    _presenceInterval = setInterval(() => window.setPresence(true), 60000);
};

window.stopPresenceHeartbeat = function stopPresenceHeartbeat() {
    if (_presenceInterval) { clearInterval(_presenceInterval); _presenceInterval = null; }
};
