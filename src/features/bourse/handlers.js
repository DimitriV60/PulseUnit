/**
 * Bourse d'échange — Permutation de gardes (stateful Firebase temps réel).
 * Dépend de :
 *   - swapRequests (let inline ~4449, mutué par listener Firebase + handlers)
 *   - currentUser, SWAP_DOC, planStates (let/const inline)
 *   - getPlanDayState, isAdmin, showToast (fonctions inline)
 * Expose les fonctions sur window pour onclick inline.
 */

const _MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
function _isGardeState(st) { return ['jour','nuit','hs_j','hs_n','hs'].includes(st); }

let _offCalY = new Date().getFullYear(), _offCalM = new Date().getMonth() + 1;
let _offDate  = '';
let _wantType  = 'indiff';
let _wantShift = 'jour';
let _wantCalY = new Date().getFullYear(), _wantCalM = new Date().getMonth() + 1;
let _wantDate = '';

let _propReqId = '', _propCalY = new Date().getFullYear(), _propCalM = new Date().getMonth() + 1, _propDate = '';

window.openBourse = function openBourse() {
    const v = document.getElementById('bourse-view');
    if (!v) return;
    v.style.display = 'flex';
    const addBtn = document.getElementById('bourse-add-btn');
    if (addBtn) addBtn.style.display = currentUser ? 'flex' : 'none';
    window.renderBourseList();
};

window.closeBourse = function closeBourse() {
    document.getElementById('bourse-view').style.display = 'none';
    document.getElementById('bourse-create-modal').style.display = 'none';
    const pm = document.getElementById('bourse-propose-modal');
    if (pm) pm.style.display = 'none';
};

window.openBourseCreate = function openBourseCreate() {
    if (!currentUser) { showToast('Connectez-vous pour proposer un échange'); return; }
    const now = new Date();
    _offCalY = now.getFullYear(); _offCalM = now.getMonth() + 1; _offDate = '';
    _wantType = 'indiff'; _wantShift = 'jour';
    _wantCalY = now.getFullYear(); _wantCalM = now.getMonth() + 1; _wantDate = '';
    document.getElementById('swap-note').value = '';
    document.querySelectorAll('.swap-want-btn').forEach(b => b.classList.toggle('active', b.dataset.val === 'indiff'));
    document.getElementById('bourse-wanted-cal-wrap').style.display = 'none';
    document.getElementById('bourse-create-modal').style.display = 'flex';
    window.renderOfferedCal();
};

window.closeBourseCreate = function closeBourseCreate() {
    document.getElementById('bourse-create-modal').style.display = 'none';
};

function _buildBourneCal(wrapId, y, m, selDate, today, clickFn, clearFn, prevFn, nextFn, filterFn, emptyMsg) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    const firstDow = (new Date(y, m-1, 1).getDay() + 6) % 7;
    const days = new Date(y, m, 0).getDate();
    let h = `<div class="bourse-cal-nav">
      <button class="bourse-cal-nav-btn" data-action="${prevFn}">‹</button>
      <span class="bourse-cal-nav-month">${_MONTHS_FR[m-1]} ${y}</span>
      <button class="bourse-cal-nav-btn" data-action="${nextFn}">›</button>
    </div>
    <div class="bourse-cal-dow">
      <div class="bourse-cal-dow-lbl">Lu</div><div class="bourse-cal-dow-lbl">Ma</div>
      <div class="bourse-cal-dow-lbl">Me</div><div class="bourse-cal-dow-lbl">Je</div>
      <div class="bourse-cal-dow-lbl">Ve</div><div class="bourse-cal-dow-lbl">Sa</div>
      <div class="bourse-cal-dow-lbl">Di</div>
    </div><div class="bourse-cal-grid">`;
    for (let i = 0; i < firstDow; i++) h += '<div class="bourse-cal-cell empty"></div>';
    for (let d = 1; d <= days; d++) {
        const ds = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const st = getPlanDayState(ds);
        const inactive = ds < today || (filterFn && !filterFn(st));
        const sel = ds === selDate;
        const cellAction = inactive ? '' : ` data-action="${clickFn}:${ds}"`;
        h += `<div class="bourse-cal-cell p-${st}${inactive ? ' past' : ''}${sel ? ' bc-selected' : ''}"${cellAction}>${d}</div>`;
    }
    h += '</div>';
    if (selDate) {
        const [,bm,bd] = selDate.split('-');
        const bwd = ['dim','lun','mar','mer','jeu','ven','sam'][new Date(selDate+'T12:00:00').getDay()];
        const st = getPlanDayState(selDate);
        const lbl = (st === 'nuit' || st === 'hs_n') ? '🌙 Nuit' : '☀️ Jour';
        h += `<div class="bourse-cal-footer" data-action="${clearFn}">✕ ${lbl} — ${bwd} ${parseInt(bd)}/${parseInt(bm)}</div>`;
    } else {
        h += `<div class="bourse-cal-footer empty-sel">${emptyMsg}</div>`;
    }
    wrap.innerHTML = h;
}

window.renderOfferedCal = function renderOfferedCal() {
    const today = new Date().toISOString().split('T')[0];
    _buildBourneCal('bourse-offered-cal', _offCalY, _offCalM, _offDate, today, 'pickOffDate', 'clearOffDate', 'prevOffCal', 'nextOffCal', _isGardeState, 'Sélectionnez une garde à céder');
};
window.pickOffDate  = ds => { _offDate = ds; window.renderOfferedCal(); };
window.clearOffDate = ()  => { _offDate = ''; window.renderOfferedCal(); };
window.prevOffCal   = ()  => { if (_offCalM===1){_offCalM=12;_offCalY--;}else _offCalM--; window.renderOfferedCal(); };
window.nextOffCal   = ()  => { if (_offCalM===12){_offCalM=1;_offCalY++;}else _offCalM++; window.renderOfferedCal(); };

window.selectWantedType = function(btn) {
    _wantType = btn.dataset.val;
    document.querySelectorAll('.swap-want-btn:not([id^="btn-want-"])').forEach(b => b.classList.toggle('active', b === btn));
    const wrap = document.getElementById('bourse-wanted-cal-wrap');
    if (_wantType === 'date') {
        wrap.style.display = 'block';
        _wantShift = 'jour';
        document.querySelectorAll('#btn-want-jour,#btn-want-nuit,#btn-want-indiff-date').forEach(b => b.classList.toggle('active', b.id === 'btn-want-jour'));
        window.renderWantedCal();
    } else {
        wrap.style.display = 'none'; _wantDate = '';
    }
};
window.selectWantedShift = function(btn) {
    _wantShift = btn.dataset.val;
    document.querySelectorAll('#btn-want-jour,#btn-want-nuit,#btn-want-indiff-date').forEach(b => b.classList.toggle('active', b === btn));
};

window.renderWantedCal = function renderWantedCal() {
    const wrap = document.getElementById('bourse-wanted-cal');
    if (!wrap) return;
    const y = _wantCalY, m = _wantCalM;
    const today = new Date().toISOString().split('T')[0];
    const firstDow = (new Date(y, m-1, 1).getDay() + 6) % 7;
    const days = new Date(y, m, 0).getDate();
    let h = `<div class="bourse-cal-nav">
      <button class="bourse-cal-nav-btn" data-action="prevWantCal">‹</button>
      <span class="bourse-cal-nav-month">${_MONTHS_FR[m-1]} ${y}</span>
      <button class="bourse-cal-nav-btn" data-action="nextWantCal">›</button>
    </div>
    <div class="bourse-cal-dow">
      <div class="bourse-cal-dow-lbl">Lu</div><div class="bourse-cal-dow-lbl">Ma</div>
      <div class="bourse-cal-dow-lbl">Me</div><div class="bourse-cal-dow-lbl">Je</div>
      <div class="bourse-cal-dow-lbl">Ve</div><div class="bourse-cal-dow-lbl">Sa</div>
      <div class="bourse-cal-dow-lbl">Di</div>
    </div><div class="bourse-cal-grid">`;
    for (let i = 0; i < firstDow; i++) h += '<div class="bourse-cal-cell empty"></div>';
    for (let d = 1; d <= days; d++) {
        const ds = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const past = ds < today;
        const sel = ds === _wantDate;
        const cellAction = past ? '' : ` data-action="pickWantDate:${ds}"`;
        h += `<div class="bourse-cal-cell${past?' past':''}${sel?' bc-selected':''}" style="border:1px solid var(--border);"${cellAction}>${d}</div>`;
    }
    h += '</div>';
    if (_wantDate) {
        const [,bm,bd] = _wantDate.split('-');
        const bwd = ['dim','lun','mar','mer','jeu','ven','sam'][new Date(_wantDate+'T12:00:00').getDay()];
        h += `<div class="bourse-cal-footer" data-action="clearWantDate">✕ ${bwd} ${parseInt(bd)}/${parseInt(bm)}</div>`;
    } else {
        h += `<div class="bourse-cal-footer empty-sel">Touchez une date</div>`;
    }
    wrap.innerHTML = h;
};
window.pickWantDate  = ds => { _wantDate = ds; window.renderWantedCal(); };
window.clearWantDate = ()  => { _wantDate = ''; window.renderWantedCal(); };
window.prevWantCal   = ()  => { if (_wantCalM===1){_wantCalM=12;_wantCalY--;}else _wantCalM--; window.renderWantedCal(); };
window.nextWantCal   = ()  => { if (_wantCalM===12){_wantCalM=1;_wantCalY++;}else _wantCalM++; window.renderWantedCal(); };

window.submitSwapRequest = async function submitSwapRequest() {
    if (!currentUser) return;
    if (!_offDate) { showToast('Sélectionnez la garde à céder'); return; }
    if (_wantType === 'date' && !_wantDate) { showToast('Sélectionnez la date souhaitée'); return; }
    const offSt = getPlanDayState(_offDate);
    const offShift = (offSt === 'nuit' || offSt === 'hs_n') ? 'nuit' : 'jour';
    const note = (document.getElementById('swap-note').value || '').trim().slice(0, 200);
    const req = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        userId: currentUser.id,
        userName: (currentUser.firstName + ' ' + currentUser.lastName).trim(),
        userRole: currentUser.role || 'ide',
        offeredDate: _offDate, offeredShift: offShift,
        wantedType: _wantType,
        wantedShift: _wantType === 'date' ? _wantShift : 'indiff',
        wantedDate: _wantType === 'date' ? _wantDate : '',
        note, ts: Date.now(), status: 'open',
        proposedBy: null, proposedByName: null, proposedByRole: null,
        proposedDate: null, proposedShift: null,
        acceptedBy: null, acceptedByName: null
    };
    const updated = [...swapRequests, req];
    window.closeBourseCreate();
    try {
        if (SWAP_DOC) await SWAP_DOC.set({ requests: updated }, { merge: false });
        swapRequests = updated; window.renderBourseList();
        showToast('✅ Demande publiée');
        // Notifier tous les agents du roster (sauf l'auteur)
        if (typeof window.pushNotifToMany === 'function' && Array.isArray(roster)) {
            const targets = roster.filter(r => r.id !== currentUser.id).map(r => r.id);
            const wantedTxt = req.wantedType === 'date'
                ? `${req.wantedShift === 'jour' ? 'Jour' : (req.wantedShift === 'nuit' ? 'Nuit' : 'Indif.')} le ${req.wantedDate}`
                : 'Indifférent';
            window.pushNotifToMany(targets, 'bourse',
                `🔄 Nouvelle annonce — ${req.userName}`,
                `Cède ${req.offeredShift === 'jour' ? 'Jour' : 'Nuit'} ${req.offeredDate} • Recherche : ${wantedTxt}`,
                { kind: 'openBourse' });
        }
    } catch(e) { showToast('Erreur de connexion'); }
};

window.openBoursePropose = function(id) {
    if (!currentUser) { showToast('Connectez-vous pour proposer'); return; }
    _propReqId = id;
    const now = new Date();
    _propCalY = now.getFullYear(); _propCalM = now.getMonth() + 1; _propDate = '';
    document.getElementById('bourse-propose-modal').style.display = 'flex';
    renderProposeCal();
};
window.closeBoursePropose = function() {
    document.getElementById('bourse-propose-modal').style.display = 'none';
};
function renderProposeCal() {
    const today = new Date().toISOString().split('T')[0];
    _buildBourneCal('bourse-propose-cal', _propCalY, _propCalM, _propDate, today, 'pickPropDate', 'clearPropDate', 'prevPropCal', 'nextPropCal', _isGardeState, 'Sélectionnez votre garde à proposer');
}
window.pickPropDate  = ds => { _propDate = ds; renderProposeCal(); };
window.clearPropDate = ()  => { _propDate = ''; renderProposeCal(); };
window.prevPropCal   = ()  => { if (_propCalM===1){_propCalM=12;_propCalY--;}else _propCalM--; renderProposeCal(); };
window.nextPropCal   = ()  => { if (_propCalM===12){_propCalM=1;_propCalY++;}else _propCalM++; renderProposeCal(); };
window.submitPropose = async function() {
    if (!currentUser || !_propReqId) return;
    if (!_propDate) { showToast('Sélectionnez une garde à proposer'); return; }
    const propSt = getPlanDayState(_propDate);
    const propShift = (propSt === 'nuit' || propSt === 'hs_n') ? 'nuit' : 'jour';
    const updated = swapRequests.map(r => r.id === _propReqId
        ? { ...r, status: 'proposed',
            proposedBy: currentUser.id,
            proposedByName: (currentUser.firstName + ' ' + currentUser.lastName).trim(),
            proposedByRole: currentUser.role || 'ide',
            proposedDate: _propDate, proposedShift: propShift }
        : r
    );
    window.closeBoursePropose();
    try {
        if (SWAP_DOC) await SWAP_DOC.set({ requests: updated }, { merge: false });
        swapRequests = updated; window.renderBourseList();
        showToast('✅ Proposition envoyée');
        // Notifier l'auteur de l'annonce
        const original = swapRequests.find(r => r.id === _propReqId);
        if (original && typeof window.pushNotif === 'function') {
            window.pushNotif(original.userId, 'bourse',
                `🔄 Proposition reçue — ${currentUser.firstName} ${currentUser.lastName}`,
                `Propose ${propShift === 'jour' ? 'Jour' : 'Nuit'} le ${_propDate} en échange de votre garde`,
                { kind: 'openBourse' });
        }
    } catch(e) { showToast('Erreur de connexion'); }
};

window.acceptSwap = async function acceptSwap(id) {
    if (!currentUser) return;
    const r = swapRequests.find(x => x.id === id);
    if (!r || r.userId !== currentUser.id) return;
    const updated = swapRequests.map(x => x.id === id
        ? { ...x, status: 'accepted', acceptedBy: x.proposedBy, acceptedByName: x.proposedByName }
        : x
    );
    try {
        if (SWAP_DOC) await SWAP_DOC.set({ requests: updated }, { merge: false });
        swapRequests = updated; window.renderBourseList();
        showToast('✅ Échange confirmé — à valider avec le cadre');
        // Notifier le proposeur que l'échange a été accepté
        if (r.proposedBy && typeof window.pushNotif === 'function') {
            window.pushNotif(r.proposedBy, 'bourse',
                `✅ Échange accepté — ${currentUser.firstName} ${currentUser.lastName}`,
                `Votre proposition pour la garde du ${r.offeredDate} a été confirmée. À valider avec le cadre.`,
                { kind: 'openBourse' });
        }
    } catch(e) { showToast('Erreur de connexion'); }
};
window.declineProposal = async function(id) {
    const updated = swapRequests.map(r => r.id === id
        ? { ...r, status: 'open', proposedBy: null, proposedByName: null, proposedByRole: null, proposedDate: null, proposedShift: null }
        : r
    );
    try {
        if (SWAP_DOC) await SWAP_DOC.set({ requests: updated }, { merge: false });
        swapRequests = updated; window.renderBourseList();
        showToast('Proposition refusée');
    } catch(e) { showToast('Erreur de connexion'); }
};

window.cancelSwap = async function cancelSwap(id) {
    if (!currentUser) return;
    const idx = swapRequests.findIndex(r => r.id === id);
    if (idx === -1) return;
    if (swapRequests[idx].userId !== currentUser.id && !isAdmin()) { showToast('Action non autorisée'); return; }
    const updated = swapRequests.filter(r => r.id !== id);
    try {
        if (SWAP_DOC) await SWAP_DOC.set({ requests: updated }, { merge: false });
        swapRequests = updated; window.renderBourseList();
        showToast('Demande supprimée');
    } catch(e) { showToast('Erreur de connexion'); }
};

window.renderBourseList = function renderBourseList() {
    const el = document.getElementById('bourse-list');
    if (!el) return;
    const ROLE_LBL = { ide:'IDE', as:'AS', med:'MED', tech:'TECH' };
    const myRole = currentUser?.role || null;
    const roleBadge = role => role
        ? `<span class="bourse-role-badge b-${role}">${ROLE_LBL[role]||role.toUpperCase()}</span>` : '';
    const fmtDate = ds => {
        if (!ds) return '—';
        const [,m,d] = ds.split('-');
        const wd = ['dim','lun','mar','mer','jeu','ven','sam'][new Date(ds+'T12:00:00').getDay()];
        return `${wd} ${parseInt(d)}/${parseInt(m)}`;
    };
    const shiftLbl = s => s === 'nuit' ? '🌙 Nuit' : '☀️ Jour';
    const wantedLbl = r => {
        if (r.wantedType === 'date' && r.wantedDate) {
            const shiftPart = r.wantedShift === 'nuit' ? '🌙 Nuit' : r.wantedShift === 'indiff_date' ? '🔄 Indiff.' : '☀️ Jour';
            return `${shiftPart} du ${fmtDate(r.wantedDate)}`;
        }
        if (r.wantedType === 'jour' || r.wantedShift === 'jour') return '☀️ Jour';
        if (r.wantedType === 'nuit' || r.wantedShift === 'nuit') return '🌙 Nuit';
        return '🔄 Indiff.';
    };
    function checkCompat(r) {
        if (!currentUser || r.userId === currentUser.id) return null;
        const today = new Date().toISOString().split('T')[0];
        const wt = r.wantedType || r.wantedShift || 'indiff';
        if (wt === 'date') {
            const st = getPlanDayState(r.wantedDate);
            if (!_isGardeState(st)) return 'red';
            const ws = r.wantedShift || 'indiff_date';
            if (ws === 'indiff_date') return 'green';
            if (ws === 'jour' && (st === 'jour' || st === 'hs_j')) return 'green';
            if (ws === 'nuit' && (st === 'nuit' || st === 'hs_n')) return 'green';
            return 'red';
        }
        for (const [date, state] of Object.entries(planStates)) {
            if (date <= today) continue;
            if (wt === 'indiff' && _isGardeState(state)) return 'green';
            if (wt === 'jour' && (state==='jour'||state==='hs_j')) return 'green';
            if (wt === 'nuit' && (state==='nuit'||state==='hs_n')) return 'green';
        }
        return 'red';
    }

    const mine   = swapRequests.filter(r => currentUser && r.userId === currentUser.id);
    const others = swapRequests.filter(r => {
        if (!r || r.status === 'accepted') return false;
        if (currentUser && r.userId === currentUser.id) return false;
        if (myRole && r.userRole && r.userRole !== myRole) return false;
        return true;
    });

    let html = '';
    if (others.length === 0 && mine.length === 0) {
        html = `<div class="bourse-empty"><div class="bourse-empty-icon">↔️</div>Aucune demande en cours pour votre fonction.<br><span style="font-size:0.82rem;">Appuyez sur <b>+</b> pour proposer un échange.</span></div>`;
    } else {
        html += `<div class="bourse-section-lbl">Propositions disponibles</div>`;
        if (others.length === 0) {
            html += `<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:0.82rem;">Aucune demande ouverte pour votre fonction</div>`;
        } else {
            others.forEach(r => {
                const compat = checkCompat(r);
                const isProp = r.status === 'proposed';
                const isMyProp = isProp && r.proposedBy === currentUser?.id;
                const compatBadge = compat === 'green'
                    ? `<span class="bourse-compat-badge bc-green">🟢 Possible</span>`
                    : compat === 'red'
                    ? `<span class="bourse-compat-badge bc-red">🔴 Non dispo</span>` : '';
                const canPropose = currentUser && compat === 'green' && !isProp;
                html += `<div class="bourse-card${compat==='green'?' compat-ok':''}">
                  <div class="bourse-card-header">
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span class="bourse-card-who">${r.userName}</span>${roleBadge(r.userRole)}
                    </div>
                    <div style="display:flex;align-items:center;gap:5px;">
                      ${compatBadge}
                      <span class="bourse-status-badge ${isProp?'prop':'open'}">${isProp?'En cours':'Ouvert'}</span>
                    </div>
                  </div>
                  <div class="bourse-card-line">
                    <span class="bourse-card-label">Cède</span>
                    <span class="bourse-card-val">${shiftLbl(r.offeredShift)} du ${fmtDate(r.offeredDate)}</span>
                  </div>
                  <div class="bourse-card-line">
                    <span class="bourse-card-label">Contre</span>
                    <span class="bourse-card-val">${wantedLbl(r)}</span>
                  </div>
                  ${r.note ? `<div class="bourse-card-note">"${r.note}"</div>` : ''}
                  ${canPropose ? `<button class="bourse-btn-accept" data-action="openBoursePropose:${r.id}">Proposer ma garde</button>` : ''}
                  ${isProp && !isMyProp ? `<div style="font-size:0.78rem;color:var(--text-muted);text-align:center;padding:6px 0;">Une proposition est déjà en attente</div>` : ''}
                </div>`;
            });
        }

        if (mine.length > 0) {
            html += '<div class="bourse-section-lbl">Mes demandes</div>';
            mine.forEach(r => {
                const isAcc  = r.status === 'accepted';
                const isProp = r.status === 'proposed';
                html += `<div class="bourse-card${isAcc?' accepted':''}">
                  <div class="bourse-card-header">
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span class="bourse-card-who">${r.userName}</span>${roleBadge(r.userRole)}
                    </div>
                    <span class="bourse-status-badge ${isAcc?'acc':isProp?'prop':'open'}">${isAcc?'✓ Accepté':isProp?'💬 Proposition':'Ouvert'}</span>
                  </div>
                  <div class="bourse-card-line">
                    <span class="bourse-card-label">Cède</span>
                    <span class="bourse-card-val">${shiftLbl(r.offeredShift)} du ${fmtDate(r.offeredDate)}</span>
                  </div>
                  <div class="bourse-card-line">
                    <span class="bourse-card-label">Contre</span>
                    <span class="bourse-card-val">${wantedLbl(r)}</span>
                  </div>
                  ${r.note ? `<div class="bourse-card-note">"${r.note}"</div>` : ''}
                  ${isProp ? `<div class="bourse-prop-box">
                    <div class="bourse-prop-who">${r.proposedByName} ${roleBadge(r.proposedByRole)} propose :</div>
                    <div class="bourse-prop-date">${shiftLbl(r.proposedShift)} du ${fmtDate(r.proposedDate)}</div>
                    <div style="display:flex;gap:8px;margin-top:10px;">
                      <button class="bourse-btn-accept" data-action="acceptSwap:${r.id}">✅ Accepter</button>
                      <button class="bourse-btn-cancel" data-action="declineProposal:${r.id}">Refuser</button>
                    </div>
                  </div>` : ''}
                  ${isAcc ? `<div class="bourse-card-ok">✅ Échange avec <b>${r.acceptedByName}</b> — à valider avec le cadre</div>` : ''}
                  ${!isAcc ? `<button class="bourse-btn-cancel" style="margin-top:8px;" data-action="cancelSwap:${r.id}">Supprimer</button>` : ''}
                </div>`;
            });
        }
    }

    const openCount = swapRequests.filter(r => r.status !== 'accepted').length;
    const sub = document.getElementById('bourse-subtitle');
    if (sub) sub.textContent = openCount > 0 ? `${openCount} demande${openCount>1?'s':''} en cours` : 'Aucune demande';
    el.innerHTML = html;
};
