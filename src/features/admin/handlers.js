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
        if (typeof window.renderAdminCurrentShift === 'function') window.renderAdminCurrentShift();
        document.getElementById('admin-panel-modal').style.display = 'flex';
        return;
    }
    document.getElementById('admin-user').value = '';
    document.getElementById('admin-pass').value = '';
    document.getElementById('admin-login-modal').style.display = 'flex';
};

// \u2500\u2500 Section "Garde courante" du panneau admin (2026-05-03) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

/** Rend la liste des agents actuellement affect\u00e9s \u00e0 la garde courante. */
window.renderAdminCurrentShift = function renderAdminCurrentShift() {
    const container = document.getElementById('admin-shift-container');
    if (!container) return;
    if (typeof initShiftData === 'function') initShiftData(currentShiftKey);
    const h = shiftHistory[currentShiftKey] || {};
    const dateOnly = (currentShiftKey || '').split('-').slice(0, 3).join('-');
    const meds = (shiftHistory[dateOnly + '-meds'] || []).filter(Boolean);

    // Liste agr\u00e9g\u00e9e : non-m\u00e9d, tech IDE, m\u00e9decins
    const ROLE_COLORS = { ide: 'var(--ide)', as: 'var(--as)', med: 'var(--med)', tech: 'var(--tech)' };
    const items = [];
    (h.activeStaffIds || []).forEach(id => {
        const p = roster.find(r => r.id === id);
        if (p) items.push({ id, role: p.role, label: `${p.firstName} ${(p.lastName || '').toUpperCase()}`, kind: 'staff' });
    });
    if (h.techIdeId) {
        const t = roster.find(r => r.id === h.techIdeId);
        if (t) items.push({ id: h.techIdeId, role: 'tech', label: `${t.firstName} ${(t.lastName || '').toUpperCase()}`, kind: 'tech' });
    }
    meds.forEach(id => {
        const m = roster.find(r => r.id === id);
        if (m) items.push({ id, role: 'med', label: `${m.firstName} ${(m.lastName || '').toUpperCase()}`, kind: 'med' });
    });

    if (items.length === 0) {
        container.innerHTML = '<span style="font-size:0.78rem; color:var(--text-muted);">Aucun agent en garde actuellement.</span>';
        renderAdminShiftCandidates();
        return;
    }
    container.innerHTML = items.map(it => {
        const col = ROLE_COLORS[it.role] || 'var(--brand-blue)';
        const roleTag = it.kind === 'tech' ? 'TECH' : (it.role || '').toUpperCase();
        return `<div style="display:flex; align-items:center; gap:6px; padding:7px 9px; border-radius:8px; background:var(--surface-sec); margin-bottom:5px; border:1px solid var(--border);">
            <span style="font-weight:800; font-size:0.82rem; color:var(--text); flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(it.label)}</span>
            <span style="font-size:0.66rem; font-weight:800; color:${col}; background:${col}22; padding:2px 6px; border-radius:4px; flex-shrink:0;">${roleTag}</span>
            <button data-action="adminRemoveFromShift:${escapeHTML(it.id)},${it.kind}" style="background:none; border:none; color:var(--crit); font-size:1rem; cursor:pointer; padding:2px 4px; flex-shrink:0;" title="Retirer de la garde">\u00d7</button>
        </div>`;
    }).join('');
    renderAdminShiftCandidates();
};

/** Liste les candidats du roster non encore en garde, filtr\u00e9s par la search input. */
window.renderAdminShiftCandidates = function renderAdminShiftCandidates() {
    const cont = document.getElementById('admin-shift-candidates');
    if (!cont) return;
    if (typeof initShiftData === 'function') initShiftData(currentShiftKey);
    const h = shiftHistory[currentShiftKey] || {};
    const dateOnly = (currentShiftKey || '').split('-').slice(0, 3).join('-');
    const meds = shiftHistory[dateOnly + '-meds'] || [];
    const inGarde = new Set([
        ...(h.activeStaffIds || []),
        h.techIdeId,
        ...meds.filter(Boolean)
    ].filter(Boolean));

    const q = (document.getElementById('admin-shift-add-search')?.value || '').toLowerCase().trim();
    // 2026-05-03 \u2014 n'affiche les candidats QUE si l'utilisateur a tap\u00e9 une recherche.
    // Sinon (initial ou apr\u00e8s ajout) \u2192 liste vid\u00e9e pour ne pas encombrer le panneau.
    if (!q) {
        cont.innerHTML = '';
        return;
    }
    const candidates = roster
        .filter(r => !inGarde.has(r.id))
        .filter(r => (r.firstName + ' ' + r.lastName).toLowerCase().includes(q))
        .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

    if (candidates.length === 0) {
        cont.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); padding:8px 0; text-align:center;">Aucun r\u00e9sultat.</div>';
        return;
    }
    const ROLE_COLORS = { ide: 'var(--ide)', as: 'var(--as)', med: 'var(--med)', tech: 'var(--tech)' };
    cont.innerHTML = candidates.slice(0, 30).map(p => {
        const col = ROLE_COLORS[p.role] || 'var(--brand-blue)';
        return `<div style="display:flex; align-items:center; gap:6px; padding:6px 9px; border-radius:7px; background:var(--surface); margin-bottom:4px; border:1px solid var(--border);">
            <span style="font-weight:700; font-size:0.78rem; color:var(--text); flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(p.firstName)} ${escapeHTML((p.lastName || '').toUpperCase())}</span>
            <span style="font-size:0.62rem; font-weight:800; color:${col}; background:${col}22; padding:1px 5px; border-radius:3px; flex-shrink:0;">${(p.role || '').toUpperCase()}</span>
            <button data-action="adminAddToShift:${escapeHTML(p.id)}" style="background:var(--brand-aqua); border:none; color:#fff; font-size:0.7rem; font-weight:800; cursor:pointer; padding:3px 8px; border-radius:5px; flex-shrink:0;" title="Ajouter \u00e0 la garde">+ Ajouter</button>
        </div>`;
    }).join('');
};

/** Ajoute un agent \u00e0 la garde courante (r\u00f4le d\u00e9duit du roster). */
window.adminAddToShift = function adminAddToShift(userId) {
    if (typeof initShiftData === 'function') initShiftData(currentShiftKey);
    const p = roster.find(r => r.id === userId);
    if (!p) return showToast('\u26d4 Agent introuvable dans le roster');
    const h = shiftHistory[currentShiftKey];
    const dateOnly = currentShiftKey.split('-').slice(0, 3).join('-');
    if (p.role === 'med') {
        if (!shiftHistory[dateOnly + '-meds']) shiftHistory[dateOnly + '-meds'] = [null, null, null];
        if (shiftHistory[dateOnly + '-meds'].includes(userId)) return showToast('D\u00e9j\u00e0 en garde');
        const empty = shiftHistory[dateOnly + '-meds'].indexOf(null);
        if (empty === -1) return showToast('\u26d4 3 m\u00e9decins d\u00e9j\u00e0 assign\u00e9s');
        shiftHistory[dateOnly + '-meds'][empty] = userId;
    } else {
        if ((h.activeStaffIds || []).includes(userId)) return showToast('D\u00e9j\u00e0 en garde');
        if (!h.activeStaffIds) h.activeStaffIds = [];
        h.activeStaffIds.push(userId);
    }
    if (typeof saveData === 'function') saveData();
    if (typeof window.customAuth !== 'undefined' && window.customAuth.audit) {
        window.customAuth.audit('user_unlock', userId, { kind: 'shift_add' });
    }
    showToast(`\u2705 ${p.firstName} ${(p.lastName || '').toUpperCase()} ajout\u00e9 \u00e0 la garde`);
    if (typeof renderApp === 'function') renderApp();
    // Vide la barre de recherche + ferme la liste des candidats
    const searchEl = document.getElementById('admin-shift-add-search');
    if (searchEl) searchEl.value = '';
    const clearBtn = document.getElementById('admin-shift-add-search-clear');
    if (clearBtn) clearBtn.style.display = 'none';
    const candidatesEl = document.getElementById('admin-shift-candidates');
    if (candidatesEl) candidatesEl.innerHTML = '';
    window.renderAdminCurrentShift();
};

/** Retire un agent de la garde courante. kind \u2208 'staff' | 'tech' | 'med' */
window.adminRemoveFromShift = function adminRemoveFromShift(userId, kind) {
    if (typeof initShiftData === 'function') initShiftData(currentShiftKey);
    const h = shiftHistory[currentShiftKey];
    const dateOnly = currentShiftKey.split('-').slice(0, 3).join('-');
    if (kind === 'tech') {
        if (h.techIdeId === userId) h.techIdeId = null;
    } else if (kind === 'med') {
        const arr = shiftHistory[dateOnly + '-meds'] || [];
        const idx = arr.indexOf(userId);
        if (idx !== -1) arr[idx] = null;
        shiftHistory[dateOnly + '-meds'] = arr;
    } else {
        h.activeStaffIds = (h.activeStaffIds || []).filter(id => id !== userId);
        // Aussi nettoyer les \u00e9ventuelles assignations lit
        if (h.assignments) {
            for (const [bedId, asgn] of Object.entries(h.assignments)) {
                if (!asgn) continue;
                if (asgn.ide === userId) asgn.ide = null;
                if (asgn.as === userId)  asgn.as = null;
            }
        }
    }
    if (typeof saveData === 'function') saveData();
    showToast('\ud83d\uddd1\ufe0f Agent retir\u00e9 de la garde');
    if (typeof renderApp === 'function') renderApp();
    window.renderAdminCurrentShift();
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
    if (window.customAuth) window.customAuth.audit('usip_lock_toggle', null, { locked: newState });
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
    if (window.customAuth) window.customAuth.audit('admin_pass_change');
    showToast('✅ Mot de passe admin mis à jour');
};

window.checkAdmin = async function checkAdmin() {
    const u = document.getElementById('admin-user').value.trim();
    const p = document.getElementById('admin-pass').value;
    if (!u || !p) { alert('Veuillez remplir tous les champs.'); return; }
    try {
        if (await verifyAdminCredentials(u, p)) {
            // P1.6 — tente Custom Token avec claim admin:true (Firestore Rules futures)
            if (window.customAuth) {
                const cr = await window.customAuth.loginAdmin(u, p);
                if (!cr.ok && !cr.fallback) console.warn('[admin] custom token failed', cr);
            }
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
