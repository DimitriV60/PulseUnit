/**
 * Auth handlers — Authentification (PIN 6 chiffres + SHA-256), sessions, rôles,
 *   demandes reset, modale alpha/WhatsApp, toast, gestion admin utilisateurs.
 *
 * Dépend (script scope inline) de :
 *   currentUser, authUsers, resetRequests, onlineUsers, selectedRole, roster,
 *   AUTH_DOC, RESETS_DOC, PRESENCE_DOC,
 *   saveData, renderApp, escapeHTML, triggerHaptic,
 *   startPresenceHeartbeat, stopPresenceHeartbeat, setPresence,
 *   loadUserPlan, checkWorkStatus,
 *   verifyAdminCredentials, setAdminSession, updateAdminPanelBtn.
 *
 * Expose sur window : showAuthView, selectRole, filterAuthUsers, selectAuthUser,
 *   clearSelectedAuthUser, filterForgotUsers, selectForgotUser, showAuthModal,
 *   registerUser, loginUser, loginAdminFromAuth, changeTempPin, logoutUser,
 *   updateHeaderUser, openAlphaModal, copyAlphaLink, sendWhatsAppBug, showToast,
 *   sendResetRequest, adminSetTempPin, renderAdminResets, adminSelectNewRole,
 *   adminCreateUser, adminUnlockUser, adminDeleteUser, openAdminUsersList,
 *   renderAdminUsers, changeMyPin, loadAuth, checkAutoLogin, hashPin.
 *
 * Partage script scope : _qrGenerated, _adminNewRole, ROLE_COLORS, ALPHA_URL, WHATSAPP_NUM.
 */

const ROLE_COLORS = { ide: 'var(--ide)', as: 'var(--as)', med: 'var(--med)', tech: 'var(--tech)' };
const ALPHA_URL    = 'https://pulseunit-c9c5c.web.app';
const WHATSAPP_NUM = '33666077493';
let   _qrGenerated = false;
let   _adminNewRole = '';

// Legacy SHA-256 — conservé pour compatibilité ascendante (lecture pinHash existant)
async function hashPin(pin) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
window.hashPin = hashPin;

// V2 — PBKDF2-SHA256 100k itérations + sel par user (P1.5 audit 2026-04-30).
// Beaucoup plus coûteux à brute-forcer : ~100ms/tentative au lieu de <1ms pour SHA-256 nu.
// Combiné au sel (16 octets random par user), bloque les rainbow tables.
function _genSalt() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPinV2(pin, saltHex) {
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
    const baseKey = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(pin),
        { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
        baseKey, 256
    );
    return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}
window.hashPinV2 = hashPinV2;
window._genPinSalt = _genSalt;

/** Crée un nouvel ensemble {pinHash, pinHashV2, pinSalt} pour un PIN clair.
 *  pinHash (legacy) reste écrit en parallèle pour permettre rollback rapide
 *  jusqu'à ce que tous les clients utilisent V2. */
async function buildPinHashes(pin) {
    const salt = _genSalt();
    const [legacy, v2] = await Promise.all([hashPin(pin), hashPinV2(pin, salt)]);
    return { pinHash: legacy, pinHashV2: v2, pinSalt: salt };
}
window.buildPinHashes = buildPinHashes;

window.showAuthView = function showAuthView(view) {
    ['login', 'register', 'forgot', 'admin'].forEach(v =>
        document.getElementById('auth-' + v + '-view').style.display = v === view ? 'block' : 'none'
    );
    if (view === 'login' || view === 'forgot') populateUserSelects();
};

window.selectRole = function selectRole(role) {
    selectedRole = role;
    document.querySelectorAll('.auth-role-btn').forEach(b =>
        b.classList.toggle('selected', b.dataset.role === role)
    );
};

window._selectedAgentType = null;
window.selectAgentType = function selectAgentType(type) {
    if (!['jour-fixe', 'nuit-fixe', 'alterne'].includes(type)) return;
    window._selectedAgentType = type;
    document.querySelectorAll('.auth-agent-btn').forEach(b => {
        const sel = b.dataset.agent === type;
        b.style.borderColor = sel ? 'var(--brand-aqua)' : 'var(--border)';
        b.style.background = sel ? 'rgba(64,206,234,0.12)' : 'var(--surface-sec)';
        b.style.color = sel ? 'var(--brand-aqua)' : 'var(--text)';
    });
};

function _renderUserList(containerId, hiddenId, selectedId, entries, onSelect) {
    const box = document.getElementById(containerId);
    if (!box) return;
    if (entries.length === 0) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    box.innerHTML = entries.map(([id, u]) => `
      <div onclick="${onSelect}('${escapeHTML(id)}')" style="padding:10px 14px; cursor:pointer; font-size:0.85rem; font-weight:700;
        border-bottom:1px solid var(--border); background:${id === selectedId ? 'rgba(59,130,246,0.12)' : 'var(--surface-sec)'};
        color:${id === selectedId ? 'var(--brand-blue)' : 'var(--text)'};">
        ${escapeHTML(u.firstName)} ${escapeHTML((u.lastName || '').toUpperCase())}
        <span style="font-size:0.7rem; color:var(--text-muted); margin-left:6px;">${escapeHTML((u.role || '').toUpperCase())}</span>
      </div>`).join('');
}

window.filterAuthUsers = function filterAuthUsers(val) {
    const q = val.toLowerCase().trim();
    document.getElementById('auth-select-user').value = '';
    document.getElementById('auth-selected-user').style.display = 'none';
    const searchWrap = document.getElementById('auth-search-user-wrap');
    if (searchWrap) searchWrap.style.display = 'block';
    const entries = Object.entries(authUsers).filter(([_, u]) =>
        !q || u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q)
    );
    _renderUserList('auth-user-list', 'auth-select-user', '', entries, 'selectAuthUser');
};

window.selectAuthUser = function selectAuthUser(id) {
    const u = authUsers[id];
    if (!u) return;
    document.getElementById('auth-select-user').value = id;
    document.getElementById('auth-search-user').value = '';
    document.getElementById('auth-user-list').style.display = 'none';
    const searchWrap = document.getElementById('auth-search-user-wrap');
    if (searchWrap) searchWrap.style.display = 'none';
    const sel = document.getElementById('auth-selected-user');
    const txt = document.getElementById('auth-selected-user-text');
    sel.style.display = 'flex';
    if (txt) txt.textContent = `${u.firstName} ${u.lastName.toUpperCase()} · ${u.role.toUpperCase()}`;
    document.getElementById('auth-pin').focus();
};

window.clearSelectedAuthUser = function clearSelectedAuthUser() {
    document.getElementById('auth-select-user').value = '';
    const sel = document.getElementById('auth-selected-user');
    if (sel) sel.style.display = 'none';
    const searchWrap = document.getElementById('auth-search-user-wrap');
    if (searchWrap) searchWrap.style.display = 'block';
    const search = document.getElementById('auth-search-user');
    if (search) { search.value = ''; search.focus(); }
    const list = document.getElementById('auth-user-list');
    if (list) list.style.display = 'none';
};

window.filterForgotUsers = function filterForgotUsers(val) {
    const q = val.toLowerCase().trim();
    document.getElementById('forgot-select-user').value = '';
    document.getElementById('forgot-selected-user').style.display = 'none';
    const entries = Object.entries(authUsers).filter(([_, u]) =>
        !q || u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q)
    );
    _renderUserList('forgot-user-list', 'forgot-select-user', '', entries, 'selectForgotUser');
};

window.selectForgotUser = function selectForgotUser(id) {
    const u = authUsers[id];
    if (!u) return;
    document.getElementById('forgot-select-user').value = id;
    document.getElementById('forgot-search-user').value = '';
    document.getElementById('forgot-user-list').style.display = 'none';
    const sel = document.getElementById('forgot-selected-user');
    sel.style.display = 'block';
    sel.textContent = `${u.firstName} ${u.lastName.toUpperCase()} · ${u.role.toUpperCase()}`;
};

function populateUserSelects() { /* search-based, no dropdown needed */ }

window.showAuthModal = function showAuthModal() {
    ['auth-search-user', 'auth-pin', 'forgot-search-user', 'reg-firstname', 'reg-lastname', 'reg-pin', 'reg-pin2', 'auth-admin-user', 'auth-admin-pass'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    ['auth-user-list', 'auth-selected-user', 'forgot-user-list', 'forgot-selected-user'].forEach(id => {
        const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
    const searchWrap = document.getElementById('auth-search-user-wrap');
    if (searchWrap) searchWrap.style.display = 'block';
    const hiddenLogin = document.getElementById('auth-select-user');
    const hiddenForgot = document.getElementById('forgot-select-user');
    if (hiddenLogin) hiddenLogin.value = '';
    if (hiddenForgot) hiddenForgot.value = '';
    showAuthView('login');
    document.getElementById('auth-modal').style.display = 'flex';
};

function checkAutoLogin() {
    const stored = localStorage.getItem('pulseunit_autologin');
    if (!stored) return false;
    try {
        const { userId, firstName, lastName, role, expiry } = JSON.parse(stored);
        if (Date.now() > expiry) { localStorage.removeItem('pulseunit_autologin'); return false; }
        const rosterUser = roster.find(r => r.id === userId);
        const u = authUsers[userId] || (firstName ? { firstName, lastName, role } : null) || (rosterUser ? { firstName: rosterUser.firstName, lastName: rosterUser.lastName, role: rosterUser.role } : null);
        if (u) {
            currentUser = { id: userId, firstName: u.firstName, lastName: u.lastName, role: u.role };
            sessionStorage.setItem('pulseunit_current_user', JSON.stringify(currentUser));
            startPresenceHeartbeat();
            return true;
        }
    } catch (e) {}
    return false;
}
window.checkAutoLogin = checkAutoLogin;

window.registerUser = async function registerUser() {
    const fn   = document.getElementById('reg-firstname').value.trim();
    const ln   = document.getElementById('reg-lastname').value.trim();
    const pin  = document.getElementById('reg-pin').value;
    const pin2 = document.getElementById('reg-pin2').value;
    const agentType = window._selectedAgentType;
    const wantsNotif = document.getElementById('reg-notif-permission')?.checked !== false;
    if (!fn || !ln) return alert('Veuillez entrer votre prénom et nom.');
    if (fn.length > 50 || ln.length > 50) return alert('Prénom et nom ne peuvent pas dépasser 50 caractères.');
    if (!selectedRole) return alert('Veuillez choisir votre rôle.');
    if (!agentType) return alert('Veuillez choisir votre type d\'agent (jour fixe, nuit fixe ou alterné).');
    if (!/^\d{6}$/.test(pin)) return alert('Le code doit contenir exactement 6 chiffres.');
    if (pin !== pin2) return alert('Les codes ne correspondent pas.');
    const already = Object.values(authUsers).find(u =>
        u.firstName.toLowerCase() === fn.toLowerCase() && u.lastName.toLowerCase() === ln.toLowerCase()
    );
    if (already) return alert('Un compte avec ce nom existe déjà. Connectez-vous.');
    let rosterId = null;
    const rosterMatch = roster.find(r =>
        r.firstName.toLowerCase() === fn.toLowerCase() && r.lastName.toLowerCase() === ln.toLowerCase()
    );
    if (rosterMatch) {
        rosterId = rosterMatch.id;
    } else {
        rosterId = 'u_' + Date.now();
        roster.push({ id: rosterId, firstName: fn, lastName: ln, role: selectedRole });
        saveData();
    }
    const hashes = await buildPinHashes(pin);
    authUsers[rosterId] = {
        firstName: fn, lastName: ln, role: selectedRole,
        pinHash: hashes.pinHash,           // legacy (compat)
        pinHashV2: hashes.pinHashV2,        // P1.5 PBKDF2
        pinSalt: hashes.pinSalt,
        tempPin: null, createdAt: Date.now(),
        failedAttempts: 0, blocked: false, blockedAt: null
    };
    if (AUTH_DOC) await AUTH_DOC.set({ users: authUsers });
    // Tente login Custom Token (uid réel + claim role) — fallback anonyme si Worker pas configuré
    if (window.customAuth) {
        const cr = await window.customAuth.loginWithPin(rosterId, pin);
        if (!cr.ok && !cr.fallback) console.warn('[register] custom token failed', cr);
    }
    currentUser = { id: rosterId, firstName: fn, lastName: ln, role: selectedRole };
    sessionStorage.setItem('pulseunit_current_user', JSON.stringify(currentUser));
    startPresenceHeartbeat();
    document.getElementById('auth-modal').style.display = 'none';
    updateHeaderUser();
    await loadUserPlan(rosterId);
    if (typeof window.loadUserProfile === 'function') await window.loadUserProfile(rosterId);
    if (typeof window.loadBedNotes === 'function') await window.loadBedNotes();
    if (typeof window.loadNotifs === 'function') await window.loadNotifs();
    if (typeof window.loadMessages === 'function') await window.loadMessages();
    if (typeof window.startShiftReminderLoop === 'function') window.startShiftReminderLoop();
    // Sauvegarde du type d'agent choisi à l'inscription
    if (window.userProfile) window.userProfile.agentType = agentType;
    if (typeof window.saveUserProfile === 'function') window.saveUserProfile();
    // Permission notifs : demandée tout de suite si l'utilisateur a coché la case
    if (wantsNotif && typeof window.requestNotifPermission === 'function') {
        try { await window.requestNotifPermission(); } catch (e) {}
    }
    renderApp();
    showToast(`✅ Compte créé ! Bienvenue ${fn} 👋`);
    checkWorkStatus();
    // Lance le tutoriel d'accueil après inscription
    if (typeof window.maybeStartTutorial === 'function') window.maybeStartTutorial();
};

window.loginUser = async function loginUser() {
    const userId = document.getElementById('auth-select-user').value;
    const pin    = document.getElementById('auth-pin').value;
    if (!userId) return alert('Recherchez et sélectionnez votre nom dans la liste.');
    if (!pin)    return alert('Entrez votre code à 6 chiffres.');
    const user = authUsers[userId];
    if (!user) return alert('Utilisateur introuvable.');
    if (user.blocked) {
        return alert('Compte bloqué après 3 codes erronés.\nContactez l\'administrateur.');
    }
    if (user.tempPin) {
        if (user.tempPinExpiry && Date.now() > user.tempPinExpiry) {
            authUsers[userId].tempPin = null;
            authUsers[userId].tempPinExpiry = null;
            if (AUTH_DOC) await AUTH_DOC.set({ users: authUsers });
            return alert('Code provisoire expiré.\nDemandez un nouveau code à l\'administrateur.');
        }
        const tempHash = await hashPin(pin);
        if (tempHash === user.tempPin) {
            authUsers[userId].tempPin = null;
            authUsers[userId].tempPinExpiry = null;
            if (AUTH_DOC) await AUTH_DOC.set({ users: authUsers });
            currentUser = { id: userId, firstName: user.firstName, lastName: user.lastName, role: user.role };
            sessionStorage.setItem('pulseunit_current_user', JSON.stringify(currentUser));
            document.getElementById('auth-modal').style.display = 'none';
            document.getElementById('auth-change-pin-modal').style.display = 'flex';
            return;
        }
    }
    // P1.5 — vérifie V2 prioritairement, fallback legacy
    let pinOk = false;
    if (user.pinHashV2 && user.pinSalt) {
        const v2 = await hashPinV2(pin, user.pinSalt);
        pinOk = (v2 === user.pinHashV2);
    }
    if (!pinOk && user.pinHash) {
        const legacy = await hashPin(pin);
        pinOk = (legacy === user.pinHash);
        // Migration transparente : si legacy match mais V2 absent, on rebake le V2
        if (pinOk && (!user.pinHashV2 || !user.pinSalt)) {
            try {
                const hashes = await buildPinHashes(pin);
                authUsers[userId].pinHashV2 = hashes.pinHashV2;
                authUsers[userId].pinSalt = hashes.pinSalt;
                if (AUTH_DOC) await AUTH_DOC.update({
                    [`users.${userId}.pinHashV2`]: hashes.pinHashV2,
                    [`users.${userId}.pinSalt`]: hashes.pinSalt
                });
            } catch (e) { console.warn('[auth] pin migration failed', e); }
        }
    }
    if (!pinOk) {
        let tries;
        if (AUTH_DOC && window.db) {
            try {
                tries = await window.db.runTransaction(async tx => {
                    const snap = await tx.get(AUTH_DOC);
                    const u = (snap.data()?.users || {})[userId] || {};
                    const n = (u.failedAttempts || 0) + 1;
                    const upd = { [`users.${userId}.failedAttempts`]: n };
                    if (n >= 3) { upd[`users.${userId}.blocked`] = true; upd[`users.${userId}.blockedAt`] = Date.now(); }
                    tx.update(AUTH_DOC, upd);
                    return n;
                });
                authUsers[userId].failedAttempts = tries;
                if (tries >= 3) { authUsers[userId].blocked = true; authUsers[userId].blockedAt = Date.now(); }
            } catch (e) {
                console.warn('PulseUnit: transaction failedAttempts:', e);
                tries = (authUsers[userId].failedAttempts || 0) + 1;
                authUsers[userId].failedAttempts = tries;
                if (tries >= 3) { authUsers[userId].blocked = true; authUsers[userId].blockedAt = Date.now(); }
                await AUTH_DOC.set({ users: authUsers });
            }
        } else {
            tries = (authUsers[userId].failedAttempts || 0) + 1;
            authUsers[userId].failedAttempts = tries;
            if (tries >= 3) { authUsers[userId].blocked = true; authUsers[userId].blockedAt = Date.now(); }
        }
        if (tries >= 3) { renderAdminUsers(); return alert('Compte bloqué après 3 codes erronés.\nContactez l\'administrateur.'); }
        document.getElementById('auth-pin').value = '';
        return alert(`Code incorrect. Tentative ${tries}/3.`);
    }
    authUsers[userId].failedAttempts = 0;
    authUsers[userId].blocked = false;
    authUsers[userId].blockedAt = null;
    if (AUTH_DOC) await AUTH_DOC.set({ users: authUsers });
    // P1.4 — Custom Token Firebase (uid réel + claim role) avec fallback anonyme si Worker non configuré
    if (window.customAuth) {
        const cr = await window.customAuth.loginWithPin(userId, pin);
        if (!cr.ok && !cr.fallback) console.warn('[login] custom token failed', cr);
    }
    currentUser = { id: userId, firstName: user.firstName, lastName: user.lastName, role: user.role };
    sessionStorage.setItem('pulseunit_current_user', JSON.stringify(currentUser));
    if (document.getElementById('auth-remember')?.checked) {
        localStorage.setItem('pulseunit_autologin', JSON.stringify({
            userId,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            expiry: Date.now() + 7 * 24 * 60 * 60 * 1000
        }));
    }
    startPresenceHeartbeat();
    document.getElementById('auth-modal').style.display = 'none';
    updateHeaderUser();
    await loadUserPlan(userId);
    if (typeof window.loadUserProfile === 'function') await window.loadUserProfile(userId);
    if (typeof window.loadBedNotes === 'function') await window.loadBedNotes();
    if (typeof window.loadNotifs === 'function') await window.loadNotifs();
    if (typeof window.loadMessages === 'function') await window.loadMessages();
    if (typeof window.startShiftReminderLoop === 'function') window.startShiftReminderLoop();
    if (typeof window.maybePromptNotifPermission === 'function') window.maybePromptNotifPermission();
    renderApp();
    checkWorkStatus();
};

window.loginAdminFromAuth = async function loginAdminFromAuth() {
    const user = document.getElementById('auth-admin-user').value.trim();
    const pass = document.getElementById('auth-admin-pass').value;
    if (!user || !pass) return alert('Veuillez remplir les identifiants admin.');
    try {
        const ok = await verifyAdminCredentials(user, pass);
        if (!ok) return alert('Identifiants admin incorrects.');
        // P1.6 — tente Custom Token avec claim admin:true (pour Firestore Rules futures)
        if (window.customAuth) {
            const cr = await window.customAuth.loginAdmin(user, pass);
            if (!cr.ok && !cr.fallback) console.warn('[admin-login] custom token failed', cr);
        }
        setAdminSession(true);
        // L'admin obtient un currentUser complet pour accéder à toutes les features
        currentUser = { id: 'admin_view', firstName: 'Admin', lastName: 'PulseUnit', role: 'ide' };
        sessionStorage.setItem('pulseunit_current_user', JSON.stringify(currentUser));
        // Ajouter l'admin à la garde active pour bypasser les gardes-checks
        initShiftData(currentShiftKey);
        if (!shiftHistory[currentShiftKey].activeStaffIds.includes('admin_view')) {
            shiftHistory[currentShiftKey].activeStaffIds.push('admin_view');
        }
        document.getElementById('auth-modal').style.display = 'none';
        updateHeaderUser();
        if (typeof window.loadNotifs === 'function') await window.loadNotifs();
        renderApp();
        updateAdminPanelBtn();
        renderAdminResets();
        renderAdminUsers();
        document.getElementById('admin-panel-modal').style.display = 'flex';
    } catch (err) {
        console.error('Erreur login admin:', err);
        alert('Erreur de vérification. Réessayez.');
    }
};

window.changeTempPin = async function changeTempPin() {
    const newPin = document.getElementById('change-pin-new').value;
    const conf   = document.getElementById('change-pin-confirm').value;
    if (!/^\d{6}$/.test(newPin)) return alert('Le code doit contenir 6 chiffres.');
    if (newPin !== conf) return alert('Les codes ne correspondent pas.');
    const hashes = await buildPinHashes(newPin);
    authUsers[currentUser.id].pinHash = hashes.pinHash;
    authUsers[currentUser.id].pinHashV2 = hashes.pinHashV2;
    authUsers[currentUser.id].pinSalt = hashes.pinSalt;
    authUsers[currentUser.id].tempPin = null;
    if (AUTH_DOC) await AUTH_DOC.set({ users: authUsers });
    resetRequests = resetRequests.map(r =>
        r.userId === currentUser.id ? { ...r, status: 'resolved' } : r
    );
    if (RESETS_DOC) await RESETS_DOC.set({ requests: resetRequests });
    document.getElementById('auth-change-pin-modal').style.display = 'none';
    updateHeaderUser();
    renderApp();
    alert('Nouveau code enregistré !');
};

window.logoutUser = async function logoutUser() {
    // Confirmation : sautée si l'appelant a déjà confirmé via l'UI in-app
    // (modale Mon compte → mini-confirm). Sinon fallback vers le confirm natif.
    if (window.__logoutSkipConfirm) {
        window.__logoutSkipConfirm = false;
    } else if (!confirm('Se déconnecter ?')) {
        return;
    }
    await setPresence(false);
    stopPresenceHeartbeat();
    setAdminSession(false);
    currentUser = null;
    sessionStorage.removeItem('pulseunit_current_user');
    localStorage.removeItem('pulseunit_autologin');
    updateHeaderUser();
    showAuthModal();
};

window.checkDataEmptyBanner = function checkDataEmptyBanner() {
    const banner = document.getElementById('data-empty-banner');
    if (!banner) return;
    const noUsers = !window.authUsers || Object.keys(window.authUsers).length === 0;
    const noRoster = !Array.isArray(window.roster) || window.roster.length === 0;
    banner.style.display = (noUsers || noRoster) ? 'flex' : 'none';
};

function updateHeaderUser() {
    const el = document.getElementById('header-user-info');
    if (!el) return;
    if (currentUser) {
        el.innerHTML = '';
    } else {
        el.innerHTML = `<button class="header-btn outline" onclick="showAuthModal()" style="font-size:0.65rem; padding:0 8px; height:26px;">Connexion</button>`;
    }
    if (typeof window.renderNotifsBell === 'function') window.renderNotifsBell();
}
window.updateHeaderUser = updateHeaderUser;

window.openAlphaModal = function openAlphaModal() {
    document.getElementById('alpha-modal').style.display = 'flex';
};

window.openShareInstallModal = function openShareInstallModal() {
    document.getElementById('share-install-modal').style.display = 'flex';
    if (!_qrGenerated) {
        const el = document.getElementById('share-qrcode');
        if (el && typeof QRCode !== 'undefined') {
            el.innerHTML = '';
            new QRCode(el, { text: ALPHA_URL, width: 160, height: 160, correctLevel: QRCode.CorrectLevel.M });
            _qrGenerated = true;
        }
    }
};

window.openChangePinModal = function openChangePinModal() {
    document.getElementById('change-pin-modal').style.display = 'flex';
    ['chg-old', 'chg-new', 'chg-conf'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
};

window.copyShareLink = function copyShareLink() {
    const btn = document.getElementById('share-copy-btn');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ALPHA_URL).then(() => {
            btn.textContent = '✅ Copié !';
            setTimeout(() => { btn.textContent = 'Copier'; }, 2500);
        }).catch(() => _copyFallback(btn));
    } else {
        _copyFallback(btn);
    }
};

function _copyFallback(btn) {
    try {
        const ta = document.createElement('textarea');
        ta.value = ALPHA_URL;
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px;';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, 9999);
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok && btn) {
            btn.textContent = '✅ Copié !';
            setTimeout(() => { btn.textContent = 'Copier'; }, 2500);
        } else {
            prompt('Copie ce lien :', ALPHA_URL);
        }
    } catch (e) {
        prompt('Copie ce lien :', ALPHA_URL);
    }
}

window.sendWhatsAppBug = function sendWhatsAppBug() {
    const user = currentUser ? `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role.toUpperCase()})` : 'Utilisateur inconnu';
    const date = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const msg = encodeURIComponent(
        `🧪 *Bug PulseUnit Alpha*\n\n` +
        `👤 Utilisateur : ${user}\n` +
        `🕐 Heure : ${date}\n\n` +
        `📝 Description du problème :\n[Décris ce qui s'est passé]\n\n` +
        `📸 [Joins ta capture d'écran]`
    );
    window.open(`https://wa.me/${WHATSAPP_NUM}?text=${msg}`, '_blank');
};

function showToast(msg) {
    let t = document.getElementById('app-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'app-toast';
        t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:12px 20px;border-radius:10px;font-size:0.85rem;font-weight:700;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.4);transition:opacity 0.4s;pointer-events:none;';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, 3000);
}
window.showToast = showToast;

window.sendResetRequest = async function sendResetRequest() {
    const userId = document.getElementById('forgot-select-user').value;
    if (!userId) return alert('Sélectionnez votre nom.');
    const user = authUsers[userId];
    if (!user) return alert('Utilisateur introuvable.');
    const already = resetRequests.find(r => r.userId === userId && r.status === 'pending');
    if (already) return alert('Une demande est déjà en attente.\nContactez directement l\'administrateur.');
    resetRequests.push({
        userId, firstName: user.firstName, lastName: user.lastName, role: user.role,
        requestedAt: new Date().toISOString(), status: 'pending'
    });
    if (RESETS_DOC) await RESETS_DOC.set({ requests: resetRequests });
    // Notifier l'admin (compte admin_view)
    if (typeof window.pushNotif === 'function') {
        window.pushNotif('admin_view', 'reset',
            `🔑 Demande de reset PIN — ${user.firstName} ${user.lastName.toUpperCase()}`,
            `${(user.role || 'ide').toUpperCase()} demande un code provisoire. Cliquez pour ouvrir le panneau admin.`,
            { kind: 'openAdminResets' });
    }
    showAuthView('login');
    alert('Demande envoyée.\nL\'administrateur va vous fournir un code provisoire.');
};

window.adminSetTempPin = async function adminSetTempPin(userId) {
    const tempPin = prompt('Code provisoire à 6 chiffres :');
    if (!tempPin) return;
    if (!/^\d{6}$/.test(tempPin)) return alert('6 chiffres requis.');
    const tempPinHash = await hashPin(tempPin);
    authUsers[userId].tempPin = tempPinHash;
    authUsers[userId].tempPinExpiry = Date.now() + 60 * 60 * 1000; // TTL 1h
    authUsers[userId].failedAttempts = 0;
    authUsers[userId].blocked = false;
    authUsers[userId].blockedAt = null;
    if (AUTH_DOC) await AUTH_DOC.set({ users: authUsers });
    resetRequests = resetRequests.map(r =>
        r.userId === userId ? { ...r, status: 'resolved' } : r
    );
    if (RESETS_DOC) await RESETS_DOC.set({ requests: resetRequests });
    renderAdminResets();
    const u = authUsers[userId];
    alert(`Code provisoire "${tempPin}" défini pour ${u.firstName} ${u.lastName}.\nDemandez-lui de se connecter avec ce code.\nValide 1 heure.`);
};

function renderAdminResets() {
    const pending = resetRequests.filter(r => r.status === 'pending');
    const badge = document.getElementById('admin-reset-badge');
    if (badge) { badge.textContent = pending.length; badge.style.display = pending.length > 0 ? 'flex' : 'none'; }
    const container = document.getElementById('admin-resets-container');
    if (!container) return;
    if (pending.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:8px 0;">Aucune demande en attente</p>';
        return;
    }
    container.innerHTML = pending.map(r => `
      <div class="admin-reset-row">
        <div>
          <div style="font-weight:800; font-size:0.85rem;">${escapeHTML(r.firstName)} ${escapeHTML(r.lastName)}</div>
          <div style="font-size:0.72rem; color:var(--text-muted);">${escapeHTML((r.role || '').toUpperCase())} · ${new Date(r.requestedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <button onclick="adminSetTempPin('${escapeHTML(r.userId)}')" style="background:var(--crit); color:#fff; border:none; border-radius:6px; padding:6px 10px; font-size:0.75rem; font-weight:800; cursor:pointer;">
          Code provisoire
        </button>
      </div>
    `).join('');
}
window.renderAdminResets = renderAdminResets;

window.adminSelectNewRole = function adminSelectNewRole(role) {
    _adminNewRole = role;
    ['ide', 'as', 'med'].forEach(r => {
        const btn = document.getElementById('admin-role-' + r);
        if (btn) btn.style.opacity = r === role ? '1' : '0.35';
    });
};

window.adminCreateUser = async function adminCreateUser() {
    const fn  = document.getElementById('admin-new-firstname').value.trim();
    const ln  = document.getElementById('admin-new-lastname').value.trim();
    const pin = document.getElementById('admin-new-pin').value.trim();
    if (!fn || !ln)      return alert('Veuillez saisir le prénom et le nom.');
    if (fn.length > 50 || ln.length > 50) return alert('Prénom et nom ne peuvent pas dépasser 50 caractères.');
    if (!_adminNewRole)  return alert('Veuillez choisir un rôle.');
    if (!/^\d{6}$/.test(pin)) return alert('Le code PIN doit contenir exactement 6 chiffres.');
    const already = Object.values(authUsers).find(u =>
        u.firstName.toLowerCase() === fn.toLowerCase() && u.lastName.toLowerCase() === ln.toLowerCase()
    );
    if (already) return alert('Un compte avec ce nom existe déjà.');
    let rosterId = null;
    const rosterMatch = roster.find(r =>
        r.firstName.toLowerCase() === fn.toLowerCase() && r.lastName.toLowerCase() === ln.toLowerCase()
    );
    if (rosterMatch) {
        rosterId = rosterMatch.id;
    } else {
        rosterId = 'u_' + Date.now();
        roster.push({ id: rosterId, firstName: fn, lastName: ln, role: _adminNewRole });
        saveData();
    }
    const hashes = await buildPinHashes(pin);
    authUsers[rosterId] = {
        firstName: fn, lastName: ln, role: _adminNewRole,
        pinHash: hashes.pinHash,
        pinHashV2: hashes.pinHashV2,
        pinSalt: hashes.pinSalt,
        tempPin: null, createdAt: Date.now(),
        failedAttempts: 0, blocked: false, blockedAt: null
    };
    if (AUTH_DOC) await AUTH_DOC.set({ users: authUsers });
    document.getElementById('admin-new-firstname').value = '';
    document.getElementById('admin-new-lastname').value  = '';
    document.getElementById('admin-new-pin').value       = '';
    adminSelectNewRole('');
    _adminNewRole = '';
    renderAdminUsers();
    showToast(`✅ Compte créé pour ${fn} ${ln.toUpperCase()}`);
};

window.adminUnlockUser = async function adminUnlockUser(userId) {
    const u = authUsers[userId];
    if (!u) return;
    authUsers[userId].failedAttempts = 0;
    authUsers[userId].blocked = false;
    authUsers[userId].blockedAt = null;
    if (AUTH_DOC) await AUTH_DOC.set({ users: authUsers });
    renderAdminUsers();
    showToast(`🔓 Compte débloqué : ${u.firstName} ${u.lastName.toUpperCase()}`);
};

window.adminDeleteUser = async function adminDeleteUser(userId) {
    const authU = authUsers[userId];
    const rosterU = roster.find(r => r.id === userId);
    const src = authU || rosterU;
    if (!src) return;
    const name = `${src.firstName} ${(src.lastName || '').toUpperCase()}`;
    if (!confirm(`Supprimer ${name} ?\n\nCette action est irréversible.`)) return;
    if (authU) {
        delete authUsers[userId];
        if (AUTH_DOC) await AUTH_DOC.set({ users: authUsers });
    }
    roster = roster.filter(r => r.id !== userId);
    saveData();
    if (PRESENCE_DOC) {
        try { await PRESENCE_DOC.set({ [userId]: firebase.firestore.FieldValue.delete() }, { merge: true }); } catch (e) {}
    }
    renderAdminUsers();
    showToast(`🗑️ Compte de ${name} supprimé.`);
};

window.openAdminUsersList = function openAdminUsersList() {
    const searchEl = document.getElementById('admin-users-search');
    if (searchEl) searchEl.value = '';
    renderAdminUsers();
    document.getElementById('admin-users-modal').style.display = 'flex';
};

function renderAdminUsers() {
    const onlineEl = document.getElementById('admin-online-container');
    if (onlineEl) {
        const ids = Object.keys(onlineUsers);
        if (ids.length === 0) {
            onlineEl.innerHTML = '<span style="font-size:0.8rem; color:var(--text-muted);">Aucun utilisateur connecté</span>';
        } else {
            onlineEl.innerHTML = ids.map(id => {
                const u = onlineUsers[id];
                const col = ROLE_COLORS[u.role] || 'var(--brand-blue)';
                const since = u.lastSeen ? new Date(u.lastSeen).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
                return `<div style="display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:8px; background:var(--surface-sec); margin-bottom:5px; border:1px solid var(--border);">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#22c55e; flex-shrink:0;"></span>
            <span style="font-weight:800; font-size:0.83rem; color:var(--text); flex:1;">${escapeHTML(u.firstName)} ${escapeHTML(u.lastName.toUpperCase())}</span>
            <span style="font-size:0.7rem; font-weight:700; color:${col}; background:${col}22; padding:2px 6px; border-radius:4px;">${u.role.toUpperCase()}</span>
            ${since ? `<span style="font-size:0.68rem; color:var(--text-muted);">${since}</span>` : ''}
          </div>`;
            }).join('');
        }
    }

    const container = document.getElementById('admin-users-container');
    if (!container) return;

    const q = (document.getElementById('admin-users-search')?.value || '').toLowerCase().trim();

    // Comptes avec auth (authUsers)
    let authEntries = Object.entries(authUsers).map(([id, u]) => ({ id, u, hasAuth: true }));

    // Entrées roster sans compte auth (créées via createNewStaff)
    const rosterOnly = roster
        .filter(r => !authUsers[r.id])
        .map(r => ({ id: r.id, u: { firstName: r.firstName, lastName: r.lastName, role: r.role }, hasAuth: false }));

    let allEntries = [...authEntries, ...rosterOnly].sort((a, b) =>
        (a.u.lastName || '').localeCompare(b.u.lastName || '')
    );
    if (q) allEntries = allEntries.filter(({ u }) =>
        u.firstName.toLowerCase().includes(q) || (u.lastName || '').toLowerCase().includes(q)
    );

    const countEl = document.getElementById('admin-users-count');
    if (countEl) countEl.textContent = `${authEntries.length} compte(s) · ${rosterOnly.length} sans compte`;

    if (allEntries.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:16px 0;">Aucun résultat</p>';
        return;
    }
    container.innerHTML = allEntries.map(({ id, u, hasAuth }) => {
        const col = ROLE_COLORS[u.role] || 'var(--brand-blue)';
        const isOnline = !!onlineUsers[id];
        const created = u.createdAt
            ? new Date(u.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '—';
        const isBlocked = !!u.blocked;
        const lockDate = u.blockedAt
            ? new Date(u.blockedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
            : '';
        const subline = hasAuth
            ? `Créé le ${created}${isBlocked ? ` · <span style="color:var(--crit); font-weight:900;">BLOQUÉ${lockDate ? ' (' + lockDate + ')' : ''}</span>` : ''}`
            : `<span style="color:var(--text-muted); font-style:italic;">Pas de compte — roster uniquement</span>`;
        return `<div style="display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:10px; background:var(--surface-sec); margin-bottom:7px; border:1px solid ${hasAuth ? 'var(--border)' : 'var(--border)'}; opacity:${hasAuth ? '1' : '0.75'};">
        <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:${isOnline ? '#22c55e' : 'var(--border)'}; flex-shrink:0;" title="${isOnline ? 'Connecté' : 'Hors ligne'}"></span>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:800; font-size:0.85rem; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(u.firstName)} ${escapeHTML((u.lastName || '').toUpperCase())}</div>
          <div style="font-size:0.68rem; color:var(--text-muted);">${subline}</div>
        </div>
        <span style="font-size:0.7rem; font-weight:700; color:${col}; background:${col}22; padding:2px 7px; border-radius:4px; flex-shrink:0;">${u.role.toUpperCase()}</span>
        ${hasAuth && isBlocked ? `<button onclick="adminUnlockUser('${id}')" style="background:var(--as); color:#fff; border:none; border-radius:6px; padding:4px 8px; font-size:0.7rem; font-weight:800; cursor:pointer; flex-shrink:0;" title="Débloquer">🔓</button>` : ''}
        <button onclick="adminDeleteUser('${id}')" style="background:none; border:none; color:var(--crit); font-size:1.15rem; cursor:pointer; padding:2px 4px; flex-shrink:0;" title="Supprimer">🗑️</button>
      </div>`;
    }).join('');
}
window.renderAdminUsers = renderAdminUsers;

window.changeMyPin = async function changeMyPin() {
    if (!currentUser) return alert('Vous devez être connecté.');
    const oldPin  = document.getElementById('chg-old').value;
    const newPin  = document.getElementById('chg-new').value;
    const confPin = document.getElementById('chg-conf').value;
    if (!oldPin || !newPin || !confPin) return alert('Veuillez remplir tous les champs.');
    if (!/^\d{6}$/.test(newPin)) return alert('Le nouveau code doit contenir 6 chiffres.');
    if (newPin !== confPin) return alert('Les nouveaux codes ne correspondent pas.');
    const user = authUsers[currentUser.id];
    if (!user) return alert('Compte introuvable.');
    // Vérif old pin V2 prioritaire, fallback legacy
    let oldOk = false;
    if (user.pinHashV2 && user.pinSalt) {
        oldOk = (await hashPinV2(oldPin, user.pinSalt)) === user.pinHashV2;
    }
    if (!oldOk && user.pinHash) {
        oldOk = (await hashPin(oldPin)) === user.pinHash;
    }
    if (!oldOk) return alert('Ancien code incorrect.');
    const hashes = await buildPinHashes(newPin);
    authUsers[currentUser.id].pinHash = hashes.pinHash;
    authUsers[currentUser.id].pinHashV2 = hashes.pinHashV2;
    authUsers[currentUser.id].pinSalt = hashes.pinSalt;
    if (AUTH_DOC) await AUTH_DOC.set({ users: authUsers });
    document.getElementById('chg-old').value = '';
    document.getElementById('chg-new').value = '';
    document.getElementById('chg-conf').value = '';
    const cm = document.getElementById('change-pin-modal');
    if (cm) cm.style.display = 'none';
    alert('Code modifié avec succès !');
};

async function loadAuth() {
    if (!AUTH_DOC) return;
    // Retry jusqu'à 4 tentatives (1s, 2s, 4s) pour les premiers démarrages où Firebase auth peut être lent
    const delays = [0, 1000, 2000, 4000];
    for (let i = 0; i < delays.length; i++) {
        if (delays[i]) await new Promise(r => setTimeout(r, delays[i]));
        try {
            const doc = await AUTH_DOC.get({ source: 'server' });
            authUsers = (doc.exists && doc.data().users) ? doc.data().users : {};
            const resDoc = await RESETS_DOC.get({ source: 'server' });
            resetRequests = (resDoc.exists && resDoc.data().requests) ? resDoc.data().requests : [];
            if (PRESENCE_DOC) {
                const presDoc = await PRESENCE_DOC.get({ source: 'server' });
                onlineUsers = (presDoc.exists && presDoc.data()) ? presDoc.data() : {};
            }
            if (Object.keys(authUsers).length > 0 || i === delays.length - 1) return;
        } catch (e) {
            console.warn(`Auth load error (try ${i + 1}/${delays.length}):`, e);
            if (i === delays.length - 1) return;
        }
    }
}
window.loadAuth = loadAuth;

window.reloadAppData = async function reloadAppData() {
    const btn = document.getElementById('data-reload-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Chargement...'; }
    // 1. Refait l'auth Firebase si nécessaire (au cas où la connexion anonyme avait échoué au boot)
    if (window.firebase && firebase.auth && !firebase.auth().currentUser) {
        try { await firebase.auth().signInAnonymously(); } catch (e) { console.warn('Auth retry:', e); }
    }
    // 2. Recharge auth users + presence + resets
    await loadAuth();
    // 3. Recharge bed notes (sync multi-appareils)
    if (typeof window.loadBedNotes === 'function') await window.loadBedNotes();
    // 3b. Recharge roster + shiftHistory
    if (window.PULSEUNIT_DOC) {
        try {
            const doc = await window.PULSEUNIT_DOC.get({ source: 'server' });
            if (doc.exists) {
                const data = doc.data();
                if (Array.isArray(data.roster)) window.roster = data.roster;
                if (data.shiftHistory && typeof data.shiftHistory === 'object') window.shiftHistory = data.shiftHistory;
            }
        } catch (e) { console.warn('Reload PULSEUNIT_DOC:', e); }
    }
    const noUsers = !authUsers || Object.keys(authUsers).length === 0;
    const noRoster = !Array.isArray(window.roster) || window.roster.length === 0;
    if (btn) {
        btn.disabled = false;
        btn.textContent = (noUsers || noRoster) ? '⚠ Réessayer' : '✓ OK';
        setTimeout(() => { btn.textContent = '🔄 Recharger'; }, 2500);
    }
    // 4. Rafraîchir l'écran de connexion s'il est ouvert
    if (typeof filterAuthUsers === 'function') {
        const search = document.getElementById('auth-search-user');
        if (search) filterAuthUsers(search.value || '');
    }
    // 5. Rafraîchir le dashboard si déjà connecté
    if (typeof window.renderApp === 'function') window.renderApp();
    // 6. Mettre à jour la bannière
    if (typeof window.checkDataEmptyBanner === 'function') window.checkDataEmptyBanner();
};
