/**
 * Presence handlers — Heartbeat Firebase (statut utilisateur connecté).
 * Dépend de :
 *   - PRESENCE_DOC, currentUser (let/const inline)
 *   - firebase.firestore.FieldValue (global Firebase)
 * Le listener `PRESENCE_DOC.onSnapshot` et la variable `onlineUsers`
 * restent inline (mutés par listener + lus par admin).
 */

let _presenceInterval = null;

window.setPresence = async function setPresence(online) {
    if (!PRESENCE_DOC || !currentUser) return;
    try {
        if (online) {
            await PRESENCE_DOC.set({
                [currentUser.id]: {
                    firstName: currentUser.firstName,
                    lastName:  currentUser.lastName,
                    role:      currentUser.role,
                    lastSeen:  Date.now()
                }
            }, { merge: true });
        } else {
            await PRESENCE_DOC.set(
                { [currentUser.id]: firebase.firestore.FieldValue.delete() },
                { merge: true }
            );
        }
    } catch(e) { console.warn('Presence error:', e); }
};

window.startPresenceHeartbeat = function startPresenceHeartbeat() {
    window.stopPresenceHeartbeat();
    window.setPresence(true);
    _presenceInterval = setInterval(() => window.setPresence(true), 60000);
};

window.stopPresenceHeartbeat = function stopPresenceHeartbeat() {
    if (_presenceInterval) { clearInterval(_presenceInterval); _presenceInterval = null; }
};
