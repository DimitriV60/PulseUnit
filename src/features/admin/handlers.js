/**
 * Admin handlers — Panneau admin local (SHA-256, verrouillage USIP).
 * Dépend de (script scope inline) :
 *   currentUser, shiftHistory, currentShiftKey, initShiftData,
 *   saveData, renderApp, renderAdminResets, renderAdminUsers.
 * Expose sur window : openAdmin, togglePass, updateAdminPanelBtn,
 *   toggleAdminUsipLock, checkAdmin.
 * Partage script scope : adminSessionActive, isAdmin, setAdminSession.
 */

const ADMIN_USER = 'admin';
let adminSessionActive = false;

function setAdminSession(active) {
    adminSessionActive = !!active;
}

/** Vrai si une session administrateur est active (indépendante du compte connecté). */
function isAdmin() {
    return !!adminSessionActive;
}

window.openAdmin = function openAdmin() {
    if (!currentUser) {
        alert('Connectez-vous d\u2019abord avec votre compte utilisateur.');
        return;
    }
    if (isAdmin()) {
        updateAdminPanelBtn();
        renderAdminResets();
        renderAdminUsers();
        document.getElementById('admin-panel-modal').style.display = 'flex';
        return;
    }
    document.getElementById('admin-user').value = '';
    document.getElementById('admin-pass').value = '';
    document.getElementById('admin-login-modal').style.display = 'flex';
};

window.togglePass = function togglePass() {
    const input = document.getElementById('admin-pass');
    const btn   = document.getElementById('toggle-pass-btn');
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '\uD83D\uDE48';
    } else {
        input.type = 'password';
        btn.textContent = '\uD83D\uDC41\uFE0F';
    }
};

function updateAdminPanelBtn() {
    const isLocked = !!shiftHistory._adminLockUsipGlobal;
    const btn = document.getElementById('admin-usip-btn');
    if (!btn) return;
    if (isLocked) {
        btn.innerHTML = '\uD83D\uDD13 D\u00E9verrouiller USIP';
        btn.style.background = 'var(--as)';
    } else {
        btn.innerHTML = '\uD83D\uDD12 Verrouiller USIP';
        btn.style.background = 'var(--crit)';
    }
}
window.updateAdminPanelBtn = updateAdminPanelBtn;

window.toggleAdminUsipLock = function toggleAdminUsipLock() {
    initShiftData(currentShiftKey);
    const newState = !shiftHistory._adminLockUsipGlobal;
    shiftHistory._adminLockUsipGlobal = newState;
    // Propage l'état uniquement sur les gardes encore actives (en cours ou à venir).
    // Les gardes passées (verrouillées) gardent leur état historique tel qu'il était.
    Object.keys(shiftHistory).forEach(k => {
        if (k.startsWith('_') || k.endsWith('-meds') || k.endsWith('-medsBeds')) return;
        const sh = shiftHistory[k];
        if (sh && typeof sh === 'object' && 'adminLockUsip' in sh) {
            if (typeof isShiftLocked === 'function' && isShiftLocked(k)) return; // garde passée → on ne touche pas
            sh.adminLockUsip = newState;
        }
    });
    saveData();
    updateAdminPanelBtn();
    renderApp();
};

async function verifyAdminCredentials(user, pass) {
    if (!user || !pass) return false;
    const encoder    = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(pass));
    const hashHex    = Array.from(new Uint8Array(hashBuffer))
                           .map(b => b.toString(16).padStart(2, '0')).join('');
    const storedHash = localStorage.getItem('pu_admin_pass_hash') || window.ADMIN_PASS_HASH_REMOTE;
    if (!storedHash) return false;
    return user === ADMIN_USER && hashHex === storedHash;
}

window.changeAdminPassword = async function changeAdminPassword() {
    const cur  = document.getElementById('admin-cur-pass').value;
    const nw   = document.getElementById('admin-new-pass').value;
    const conf = document.getElementById('admin-conf-pass').value;
    if (!cur || !nw || !conf) { showToast('⛔ Remplissez tous les champs'); return; }
    if (nw.length < 8)  { showToast('⛔ Minimum 8 caractères'); return; }
    if (nw !== conf)    { showToast('⛔ Les mots de passe ne correspondent pas'); return; }
    const ok = await verifyAdminCredentials(ADMIN_USER, cur);
    if (!ok) { showToast('⛔ Mot de passe actuel incorrect'); return; }
    const encoder    = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(nw));
    const hashHex    = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('pu_admin_pass_hash', hashHex);
    document.getElementById('admin-cur-pass').value = '';
    document.getElementById('admin-new-pass').value = '';
    document.getElementById('admin-conf-pass').value = '';
    showToast('✅ Mot de passe admin mis à jour');
};

window.checkAdmin = async function checkAdmin() {
    const u = document.getElementById('admin-user').value.trim();
    const p = document.getElementById('admin-pass').value;
    if (!u || !p) { alert('Veuillez remplir tous les champs.'); return; }
    try {
        if (await verifyAdminCredentials(u, p)) {
            setAdminSession(true);
            document.getElementById('admin-login-modal').style.display = 'none';
            updateAdminPanelBtn();
            document.getElementById('admin-panel-modal').style.display = 'flex';
        } else {
            alert('Identifiants incorrects.');
        }
    } catch (err) {
        console.error('Erreur crypto:', err);
        alert('Erreur de v\u00E9rification. Navigateur non compatible.');
    }
};
