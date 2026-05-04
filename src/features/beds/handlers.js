/**
 * Beds handlers — grille principale R\u00C9A + USIP, assignations IDE/AS/MED,
 *   marqueurs BMR/dialyse/critique/ferm\u00E9, rendu global `renderApp()`.
 *
 * D\u00E9pend (script scope inline) de :
 *   CONFIG, reaBedsList, ICONS, CHECKLIST_ITEMS, TECH_TASKS,
 *   roster, shiftHistory, currentShiftKey, selectedStaffForTap, currentUser,
 *   escapeHTML, saveData, initShiftData, isShiftLocked, isOnCurrentShift,
 *   canEditBeds, getStaffTargets, doSearch, clearShift, showToast,
 *   openTasks, openChecklist.
 *
 * Expose sur window : toggleMedBed, assignLit, toggleLit, getAllBedIds, renderApp.
 */


window.toggleMedBed = function toggleMedBed(bedKey, docIndex) {
    if (!currentUser) return;
    initShiftData(currentShiftKey);
    if (isShiftLocked(currentShiftKey)) return;
    if (shiftHistory[currentShiftKey].medLocked && !isAdmin()) {
        showToast('🔒 Cartes réa verrouillées par l\'admin');
        return;
    }
    if (!isOnCurrentShift()) {
        showToast('\u26D4 Vous n\'\u00EAtes pas affect\u00E9 \u00E0 cette garde');
        return;
    }
    if (currentUser.role === 'med') {
        showToast('\u26D4 Les IDE/AS g\u00E8rent les secteurs m\u00E9decins');
        return;
    }
    const dO = currentShiftKey.split('-').slice(0, 3).join('-');
    if (!shiftHistory[dO + '-medsBeds']) shiftHistory[dO + '-medsBeds'] = {};
    if (docIndex === 2 && !bedKey.startsWith('usip-')) return;
    if (shiftHistory[dO + '-medsBeds'][bedKey] === docIndex) shiftHistory[dO + '-medsBeds'][bedKey] = null;
    else shiftHistory[dO + '-medsBeds'][bedKey] = docIndex;
    renderApp();
    saveData();
};

window.assignLit = function assignLit(id) {
    if (currentUser?.role === 'med') {
        showToast('\u26D4 Les m\u00E9decins ne peuvent pas modifier les lits IDE/AS');
        return;
    }
    if (!canEditBeds() || !selectedStaffForTap) {
        if (!selectedStaffForTap && canEditBeds()) showToast('S\u00E9lectionnez-vous d\'abord dans l\'effectif');
        return;
    }
    const p = roster.find(r => r.id === selectedStaffForTap);
    if (!p) return;
    initShiftData(currentShiftKey);
    const d = shiftHistory[currentShiftKey].assignments[id];
    if (!d) return;
    d[p.role] = (d[p.role] === p.id) ? null : p.id;
    renderApp();
    saveData();
};

window.toggleLit = function toggleLit(id, p, e) {
    if (!canEditBeds()) {
        showToast('⛔ Édition interdite : ce n’est pas ton secteur.');
        return;
    }
    if (e) e.stopPropagation();
    initShiftData(currentShiftKey);
    let h = shiftHistory[currentShiftKey];
    if (!h.assignments[id]) h.assignments[id] = { ide: null, as: null, bmr: false, dialyse: false, crit: false, closed: false };
    let d = h.assignments[id];
    // N'importe qui peut rouvrir un lit fermé
    if (p === 'closed' && d.closed) { d.closed = false; renderApp(); saveData(); return; }
    const isTech = h.techIdeId === currentUser?.id;
    const isAssigned = currentUser?.id === d.ide || currentUser?.id === d.as;
    const isUnassigned = !d.ide && !d.as;
    const isActive = (h.activeStaffIds || []).includes(currentUser?.id);
    // Cas spécial : fermer un lit sans IDE/AS assigné est autorisé pour tout actif
    const canCloseUnassigned = (p === 'closed' && isUnassigned && (isActive || isTech));
    if (!isAdmin() && !isTech && !isAssigned && !canCloseUnassigned) {
        showToast('⛔ Ce n’est pas ta chambre — seul l’IDE ou l’AS assigné peut modifier ce lit.');
        return;
    }
    d[p] = !d[p];
    if (p === 'closed' && d.closed) { d.ide = null; d.as = null; }
    renderApp();
    saveData();
};
window.getAllBedIds = function getAllBedIds() {
    const ids = [];
    CONFIG.forEach(z => z.beds.forEach(n => ids.push(`${z.type}-${n}`)));
    return ids;
};

window.renderApp = function renderApp() {
    initShiftData(currentShiftKey);
    const h = shiftHistory[currentShiftKey];
    const dateOnly = currentShiftKey.split('-').slice(0, 3).join('-');
    const locked = isShiftLocked(currentShiftKey);
    const banner = document.getElementById('locked-banner');
    if (locked) { banner.style.display = 'block'; banner.textContent = '\uD83D\uDD12 GARDE TERMIN\u00C9E - LECTURE SEULE'; }
    else { banner.style.display = 'none'; }
    document.querySelectorAll('.shift-tab').forEach(b => b.classList.toggle('active', b.getAttribute('data-key') === currentShiftKey));

    const getName = (id) => { const p = roster.find(r => r.id === id); return p ? escapeHTML(`${p.firstName} ${p.lastName.charAt(0)}.`) : null; };
    const t = getStaffTargets();

    let boardHTML = '';
    let miniListHTML = '';
    // 2026-05-02 — L'IDE Tech reste dans l'effectif comme une IDE normale.
    // Son rôle ne change pas (badge IDE), elle est sélectionnable pour les lits.
    const allP = [...(shiftHistory[dateOnly + '-meds'] || []), ...h.activeStaffIds]
        .filter((v, i, a) => v && a.indexOf(v) === i)
        .map(id => roster.find(r => r.id === id))
        .filter(x => x);

    const getSortVal = p => {
        if (p.role === 'med') return 1;
        if (p.role === 'ide') return 2;
        if (p.role === 'as') return 3;
        return 4;
    };

    allP.sort((a, b) => getSortVal(a) - getSortVal(b)).forEach(p => {
        const colors = { med: 'var(--med)', ide: 'var(--ide)', as: 'var(--as)' };
        const roleLbl = p.role.toUpperCase();
        // 2026-05-03 — L'IDE qui prend le slot tech change de couleur en violet
        // (même rôle IDE, sélectionnable comme avant) — Dimitri.
        const _isThisIdeTech = p.role === 'ide' && p.id === h.techIdeId;
        const col = _isThisIdeTech ? 'var(--tech)' : colors[p.role];

        const isSelectable = p.role === 'ide' || p.role === 'as';
        let clickAttr = ''; let bgStyle = 'transparent';
        if (isSelectable && !locked) {
            clickAttr = `onclick="toggleSelection('${p.id}')"`;
            if (selectedStaffForTap === p.id) bgStyle = 'var(--ide-glow)';
        }
        const removeX = (isSelectable && !locked) ? `<span onclick="event.stopPropagation();showRemoveAgentConfirm('${p.id}')" style="margin-left:6px;font-size:1rem;line-height:1;cursor:pointer;color:var(--crit);opacity:0.55;flex-shrink:0;">×</span>` : '';
        miniListHTML += `<div class="mini-item" style="border-color:${col}; cursor:${isSelectable && !locked ? 'pointer' : 'default'}; background:${bgStyle};" ${clickAttr}><span>${escapeHTML(p.firstName)} ${escapeHTML(p.lastName[0])}.</span>${removeX}<span class="role-badge" style="color:${col}">${roleLbl}</span></div>`;
    });

    boardHTML += `
      <div class="zone-header" style="color:var(--text); border-color:var(--border);">GESTION \u00C9QUIPE & POSTES</div>
      <div class="special-grid" style="align-items: stretch;">

        <div style="display:grid; grid-template-rows: 1fr 1fr; gap:15px; height:100%;">
          <div class="bed-card effectif-card" style="display:flex; flex-direction:column; justify-content:center; padding:15px; margin:0; min-height:0; border-color:var(--border);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                  <span style="font-weight:900; font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">R\u00C9A</span>
                  <span style="font-size:0.65rem; font-weight:900; background:var(--surface-sec); padding:3px 8px; border-radius:6px; color:var(--text); border:1px solid var(--border);">${t.rIDE_T}I / ${t.rAS_T}A</span>
              </div>
              <div style="display:flex; justify-content:space-around; align-items:center;">
                  <div style="font-size:0.9rem; font-weight:800; color:var(--text-muted);">IDE <span style="font-size:1.5rem; font-weight:900; color:${t.rI < t.rIDE_T ? 'var(--crit)' : 'var(--ide)'}; margin-left:3px;">${t.rI}</span></div>
                  <div style="font-size:0.9rem; font-weight:800; color:var(--text-muted);">AS <span style="font-size:1.5rem; font-weight:900; color:${t.rA < t.rAS_T ? 'var(--crit)' : 'var(--as)'}; margin-left:3px;">${t.rA}</span></div>
              </div>
              <div style="margin-top:12px; padding-top:8px; border-top:1px solid var(--border); font-size:0.75rem; text-align:center; color:var(--text-muted); font-weight:800;">
                  Lits : <strong style="color:var(--text);">${15 - t.rC}</strong>/15 ouverts <span style="margin-left:8px;">Ferm\u00E9s : <strong style="color:var(--crit)">${t.rC}</strong></span>
              </div>
          </div>

          <div class="bed-card effectif-card ${t.uAllC ? (h.adminLockUsip ? 'admin-closed' : 'closed') : ''}" style="display:flex; flex-direction:column; justify-content:center; padding:15px; border-color:${t.uAllC ? 'var(--border)' : 'var(--border)'}; margin:0; min-height:0;">
              ${t.uAllC ? `
              <div class="closed-overlay" style="margin:auto;">
                  ${ICONS.closed}
                  <span style="margin-top:2px; font-size:0.7rem;">USIP FERM\u00C9E</span>
              </div>` : `
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                  <span style="font-weight:900; font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">USIP</span>
                  <span style="font-size:0.65rem; font-weight:900; background:var(--surface-sec); padding:3px 8px; border-radius:6px; color:var(--text); border:1px solid var(--border);">${t.uIDE_T}I / ${t.uAS_T}A</span>
              </div>
              <div style="display:flex; justify-content:space-around; align-items:center;">
                  <div style="font-size:0.9rem; font-weight:800; color:var(--text-muted);">IDE <span style="font-size:1.5rem; font-weight:900; color:${t.uI < t.uIDE_T ? 'var(--crit)' : 'var(--ide)'}; margin-left:3px;">${t.uI}</span></div>
                  <div style="font-size:0.9rem; font-weight:800; color:var(--text-muted);">AS <span style="font-size:1.5rem; font-weight:900; color:${t.uA < t.uAS_T ? 'var(--crit)' : 'var(--as)'}; margin-left:3px;">${t.uA}</span></div>
              </div>
              <div style="margin-top:12px; padding-top:8px; border-top:1px solid var(--border); font-size:0.75rem; text-align:center; color:var(--text-muted); font-weight:800;">
                  Lits : <strong style="color:var(--text);">${5 - t.uC}</strong>/5 ouverts <span style="margin-left:8px;">Ferm\u00E9s : <strong style="color:var(--crit)">${t.uC}</strong></span>
              </div>
              `}
          </div>
        </div>

        <div class="bed-card special-card" style="min-height:0; border-color:var(--border); padding:15px; height:100%; display:flex; flex-direction:column; justify-content:flex-start;">
            <div class="bed-header" style="flex-shrink:0; color:var(--text-muted); margin-bottom:10px; border-bottom:1px solid var(--border); padding-bottom:8px; display:flex; justify-content:center;">
                <span class="b-num" style="font-size:0.85rem; font-weight:900; text-transform:uppercase; letter-spacing:1px;">\uD83D\uDCCB EFFECTIF</span>
            </div>
            <div class="mini-list" id="mini-list-content" style="flex:1; overflow-y:auto; min-height:0; padding-right:5px; margin-bottom:10px;">${miniListHTML}</div>
        </div>
      </div>
    `;

    const container = document.getElementById('pool-list'); container.innerHTML = '';

    boardHTML += `<div class="special-grid">`;
    const ms = shiftHistory[dateOnly + '-meds'];
    const mBeds = shiftHistory[dateOnly + '-medsBeds'];

    [0, 1].forEach(i => {
        const m = roster.find(r => r.id === ms[i]);
        const medEditable = !locked && (!h.medLocked || isAdmin());
        let grid = `<div class="med-beds-selector" style="${!medEditable ? 'opacity:0.6; pointer-events:none;' : ''}">`;
        reaBedsList.forEach(n => {
            const isActive = mBeds[n] === i ? 'active' : '';
            grid += `<div class="med-bed-btn ${isActive}" onclick="toggleMedBed('${n}', ${i})">${n}</div>`;
        });
        grid += `</div>`;
        const _lockBtn = isAdmin()
            ? `<button onclick="event.stopPropagation();toggleMedLock()" style="background:none;border:none;font-size:0.78rem;cursor:pointer;padding:0 3px;line-height:1;opacity:${h.medLocked ? '1' : '0.35'};" title="${h.medLocked ? 'D\u00E9verrouiller' : 'Verrouiller'}">${h.medLocked ? '\uD83D\uDD12' : '\uD83D\uDD13'}</button>`
            : `<span style="font-size:0.78rem;opacity:${h.medLocked ? '1' : '0.3'};">${h.medLocked ? '\uD83D\uDD12' : '\uD83D\uDD13'}</span>`;
        boardHTML += `<div class="bed-card special-card med-card">
        <div class="bed-header" style="color:var(--med)">
            <div style="display:flex;align-items:center;gap:5px;">
              <span class="b-num">R\u00C9A ${i + 1}</span>
              ${_lockBtn}
            </div>
            <a href="tel:${i === 0 ? '0344611862' : '0344611822'}" style="font-size:0.75rem; font-weight:900; background:var(--med-glow); padding:4px 8px; border-radius:6px; border:1px solid rgba(245,158,11,0.3); color:var(--med); text-decoration:none;">\uD83D\uDCDE ${i === 0 ? '1862' : '1822'}</a>
        </div>
        ${grid}
        ${m ? `<div class="staff-pill med-pill">Dr. ${escapeHTML(m.firstName)} ${escapeHTML(m.lastName.charAt(0)).toUpperCase()}. ${medEditable ? `<span class="remove-btn" onclick="clearShift(${i},'med')">\u00D7</span>` : ''}</div>` : `<div class="search-box">${medEditable ? `<input type="text" id="search-med-${i}" placeholder="\uD83D\uDD0D Nom Doc..." class="special-input" oninput="doSearch('med-${i}',this.value)" autocomplete="off"><div class="suggestions" id="sugg-med-${i}"></div>` : '<span style="color:var(--text-muted);font-size:0.8rem;font-weight:700;">---</span>'}</div>`}
      </div>`;
    });

    boardHTML += `</div><div class="special-grid">`;

    const techP = roster.find(r => r.id === h.techIdeId);

    const _sp = currentShiftKey.split('-');
    const _dow = _sp.length >= 4 ? new Date(_sp[0], _sp[1] - 1, _sp[2]).getDay() : 0;
    const _st = _sp[3] === 'jour' ? 'J' : 'N';
    const _todayTasks = TECH_TASKS.filter(t => t.shifts.some(s => s === 'ALL' || s === 'ALL-' + _st || s === _dow + '-' + _st));
    const _done = (h.techTasks || []).filter(id => _todayTasks.some(t => t.id === id)).length;
    const _total = _todayTasks.length;
    const _pct = _total > 0 ? Math.round((_done / _total) * 100) : 0;

    // 2026-05-02 \u2014 Carte IDE TECH au design EXACT d'un lit (sans boutons d'actions),
    // une seule barre = barre des t\u00E2ches (pattern cl-bar-row).
    const _isTechMine = currentUser && techP && currentUser.id === h.techIdeId;
    const _targetable = !techP && !locked && selectedStaffForTap === currentUser?.id && currentUser?.role === 'ide';
    const _stTask = _pct === 100 ? 'done' : _done > 0 ? 'partial' : 'empty';
    const _scoreTask = _pct === 100 ? '\u2713 OK' : `${_done}/${_total}`;
    const _techName = techP ? `${escapeHTML(techP.firstName)} ${escapeHTML(techP.lastName[0]) || ''}.` : '---';
    const _techBarClick = _isTechMine
        ? `onclick="event.stopPropagation();openTasks()"`
        : `onclick="event.stopPropagation()"`;

    // 2026-05-03 — Bordure droite violette sur la carte IDE TECH si au moins
    // une chambre a une tech note non vide (visible IDE Tech / admin).
    // Format aligné sur les cartes lit : border-right qui suit le border-radius.
    const _techCardHasNotes = (_isTechMine || (typeof isAdmin === 'function' && isAdmin()))
                              && typeof window.getRoomsWithTechNotes === 'function'
                              && window.getRoomsWithTechNotes().length > 0;
    const _techCardBorder = _techCardHasNotes ? 'border-right:4px solid var(--tech);' : '';

    boardHTML += `<div class="bed-card ${_targetable ? 'targetable' : ''}" style="position:relative;${_techCardBorder}" onclick="handleTechIdeTap(event)" title="${_techCardHasNotes ? 'Notes tech en attente dans des chambres' : ''}">
      <div class="bed-bg-num" style="color:var(--tech); opacity:0.08;">TECH</div>
      <div class="bed-header">
        <span class="b-num" style="color:var(--tech);">IDE TECH</span>
        <div class="b-actions" style="${locked ? 'opacity:0.5;pointer-events:none;' : ''}">
          <a href="tel:0344617125" onclick="event.stopPropagation()" style="font-size:0.65rem; font-weight:900; background:var(--tech-glow); padding:3px 6px; border-radius:5px; border:1px solid rgba(168,85,247,0.3); color:var(--tech); text-decoration:none; white-space:nowrap;">\uD83D\uDCDE 7125</a>
          <a href="tel:0344616086" onclick="event.stopPropagation()" style="font-size:0.65rem; font-weight:900; background:var(--tech-glow); padding:3px 6px; border-radius:5px; border:1px solid rgba(168,85,247,0.3); color:var(--tech); text-decoration:none; white-space:nowrap;">\uD83D\uDCDE 6086</a>
        </div>
      </div>
      <div class="cl-bar-row" ${_techBarClick}>
        <div class="cl-minibar"><div class="cl-minibar-fill ${_stTask}" style="width:${_pct}%"></div></div>
        <span class="cl-score ${_stTask}">${_scoreTask}</span>
      </div>
      <div class="pill-container">
        <div class="staff-pill ${techP ? 'ide-pill' : 'empty-pill'}"><span class="pill-prefix">IDE</span><span>${_techName}</span></div>
      </div>
    </div>`;

    const m2 = roster.find(r => r.id === ms[2]);
    const usipMedEditable = !locked && (!h.medLocked || isAdmin());
    let uGrid = `<div class="med-beds-selector" style="${!usipMedEditable ? 'opacity:0.6; pointer-events:none;' : ''}">`;
    [1, 2, 3, 4, 5].forEach(n => {
        const isActive = mBeds['usip-' + n] === 2 ? 'active' : '';
        uGrid += `<div class="med-bed-btn ${isActive}" onclick="toggleMedBed('usip-${n}', 2)">${n}</div>`;
    });
    uGrid += `</div>`;
    let uPhone = (ms[2] && ms[2] === ms[0]) ? '1862' : (ms[2] && ms[2] === ms[1] ? '1822' : '');
    let uPhoneNum = (ms[2] && ms[2] === ms[0]) ? '0344611862' : (ms[2] && ms[2] === ms[1] ? '0344611822' : '');

    boardHTML += `<div class="bed-card special-card med-card ${t.uAllC ? (h.adminLockUsip ? 'admin-closed' : 'closed') : ''}" style="${t.uAllC ? 'pointer-events:none;' : ''}">
      ${t.uAllC ? `<div class="closed-overlay">${ICONS.closed}<span style="margin-top:5px;">USIP FERM\u00C9E</span></div>` : `
      <div class="bed-header" style="color:var(--med)">
        <div style="display:flex;align-items:center;gap:5px;">
          <span class="b-num">R\u00C9A USIP</span>
          ${isAdmin() ? `<button onclick="event.stopPropagation();toggleMedLock()" style="background:none;border:none;font-size:0.78rem;cursor:pointer;padding:0 3px;line-height:1;opacity:${h.medLocked ? '1' : '0.35'};" title="${h.medLocked ? 'D\u00E9verrouiller' : 'Verrouiller'}">${h.medLocked ? '\uD83D\uDD12' : '\uD83D\uDD13'}</button>` : `<span style="font-size:0.78rem;opacity:${h.medLocked ? '1' : '0.3'};">${h.medLocked ? '\uD83D\uDD12' : '\uD83D\uDD13'}</span>`}
        </div>
        ${uPhone ? `<a href="tel:${uPhoneNum}" style="font-size:0.75rem; font-weight:900; background:var(--med-glow); padding:4px 8px; border-radius:6px; border:1px solid rgba(245,158,11,0.3); color:var(--med); text-decoration:none;">\uD83D\uDCDE ${uPhone}</a>` : ''}
      </div>
      ${uGrid}
      ${m2 ? `<div class="staff-pill med-pill">Dr. ${escapeHTML(m2.firstName)} ${escapeHTML(m2.lastName.charAt(0)).toUpperCase()}. ${usipMedEditable ? `<span class="remove-btn" onclick="clearShift(2,'med')">\u00D7</span>` : ''}</div>` : `<div class="search-box">${usipMedEditable ? `<input type="text" id="search-med-2" class="special-input" placeholder="\uD83D\uDD0D Nom Doc..." oninput="doSearch('med-2',this.value)" autocomplete="off"><div class="suggestions" id="sugg-med-2"></div>` : '<span style="color:var(--text-muted);font-size:0.8rem;font-weight:700;">---</span>'}</div>`}
      `}
    </div>`;

    boardHTML += `</div>`;

    CONFIG.forEach(z => {
        boardHTML += `<div class="zone-header">${z.name}</div><div class="beds-grid">`;
        z.beds.forEach(n => {
            const id = `${z.type}-${n}`;
            if (!h.assignments[id]) h.assignments[id] = { ide: null, as: null, bmr: false, dialyse: false, crit: false, closed: false };
            const d = h.assignments[id], iN = getName(d.ide), aN = getName(d.as);
            const isAdminLocked = (z.type === 'usip' && h.adminLockUsip);

            if (isAdminLocked) {
                boardHTML += `<div class="bed-card admin-closed"><div class="closed-overlay">${ICONS.closed}<span>LIT ${n}</span></div></div>`;
            } else if (d.closed) {
                boardHTML += `<div class="bed-card closed" onclick="toggleLit('${id}','closed',event)"><div class="closed-overlay">${ICONS.closed}<span>LIT ${n}</span></div></div>`;
            } else {
                boardHTML += (() => {
                    const _cl = ((shiftHistory[currentShiftKey] || {}).checklistChambre || {})[id] || {};
                    const _done = CHECKLIST_ITEMS.filter(i => _cl[i.id]).length;
                    const _total = CHECKLIST_ITEMS.length;
                    const _pct = Math.round((_done / _total) * 100);
                    const _stCl = _done === _total ? 'done' : _done > 0 ? 'partial' : 'empty';
                    const _scoreTxt = _stCl === 'done' ? '\u2713 OK' : `${_done}/${_total}`;
                    const _canSeeShared = !!(currentUser && (d.ide === currentUser.id || d.as === currentUser.id || (typeof isAdmin === 'function' && isAdmin())));
                    const _myNote = typeof getBedNoteForCurrentUser === 'function' ? getBedNoteForCurrentUser(id, dateOnly, _canSeeShared) : null;
                    // 2026-05-03 — Marqueurs latéraux (suivent le border-radius
                    // de la carte). Gauche violet = tech notes (IDE Tech / admin).
                    // Droite aqua = note IDE/AS perso (ma note).
                    const _isTechIdeForShift = !!(currentUser && h.techIdeId === currentUser.id);
                    const _showTechBorder = (_isTechIdeForShift || (typeof isAdmin === 'function' && isAdmin()))
                                            && typeof window.hasTechNotesForBed === 'function'
                                            && window.hasTechNotesForBed(id);
                    const _borderLeftStyle = _showTechBorder ? 'border-left:4px solid var(--tech);' : '';
                    const _borderRightStyle = _myNote ? 'border-right:4px solid var(--brand-aqua);' : '';
                    return `<div class="bed-card ${d.crit ? 'critical' : ''} ${selectedStaffForTap && !locked ? 'targetable' : ''}" style="position:relative;${_borderLeftStyle}${_borderRightStyle}" onclick="handleBedTap('${id}')" title="${_showTechBorder ? 'Note tech présente · ' : ''}${_myNote ? 'Ma note présente' : ''}">
              <div class="bed-bg-num">${n}</div>
              <div class="bed-header">
                  <span class="b-num">${n}</span>
                  <div class="b-actions" style="${locked ? 'opacity:0.5;pointer-events:none;' : ''}">
                      <button class="a-btn ${d.bmr ? 'active bmr' : ''}" onclick="toggleLit('${id}','bmr',event)">${ICONS.bmr}</button>
                      <button class="a-btn ${d.dialyse ? 'active dialyse' : ''}" onclick="toggleLit('${id}','dialyse',event)">${ICONS.dialyse}</button>
                      <button class="a-btn ${d.crit ? 'active crit' : ''}" onclick="toggleLit('${id}','crit',event)">${ICONS.crit}</button>
                      <button class="a-btn" onclick="toggleLit('${id}','closed',event)">${ICONS.closed}</button>
                  </div>
              </div>
              <div class="cl-bar-row" onclick="event.stopPropagation();openChecklist('${id}')">
                  <div class="cl-minibar"><div class="cl-minibar-fill ${_stCl}" style="width:${_pct}%"></div></div>
                  <span class="cl-score ${_stCl}">${_scoreTxt}</span>
              </div>
              <div class="pill-container">
                  <div class="staff-pill ${d.ide ? 'ide-pill' : 'empty-pill'}"><span class="pill-prefix">IDE</span><span>${iN || '---'}</span></div>
                  <div class="staff-pill ${d.as ? 'as-pill' : 'empty-pill'}"><span class="pill-prefix">AS</span><span>${aN || '---'}</span></div>
              </div>
            </div>`;
                })();
            }
        });
        boardHTML += `</div>`;
    });

    board.innerHTML = boardHTML;
};
