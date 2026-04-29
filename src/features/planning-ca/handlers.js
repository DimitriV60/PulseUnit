/**
 * Planning CA handlers — Validation jours consécutifs FPH (localStorage + Firebase).
 * Dépend de :
 *   - window.PLAN_WORK_STATES, window.PLAN_LABELS (config.js)
 *   - getJoursFeries (de conges-calendar/handlers.js, exposé via window + script scope)
 *   - PLANS_DOC, currentUser (let/const inline)
 * Expose :
 *   - Variables script scope partagées avec inline (auth, bed-grid, global touch handlers) :
 *     planYear, planRegime, planStates, planLockedMonths, planDrag, planSoldes
 *   - Fonctions script scope partagées : getPlanDayState, savePlanData, loadUserPlan,
 *     applyPlanStateDrag, cyclePlanDay, updatePlanStats
 *   - Fonctions onclick : window.cyclePlanDay, window.planCellTouchStart,
 *     window.togglePlanMonthLock, window.setPlanRegime, window.changePlanYear,
 *     window.resetPlanMonth, window.openPlanningCA, window.closePlanningCA,
 *     window.updatePlanSolde, window.reportSolde, window.togglePlanLegend,
 *     window.togglePlanSoldes
 */

let planYear   = new Date().getFullYear();
let planRegime = localStorage.getItem('pulseunit_plan_regime') || 'jour';
let planStates = JSON.parse(localStorage.getItem('pulseunit_plan_states') || '{}');
let planLabels = JSON.parse(localStorage.getItem('pulseunit_plan_labels') || '{}');
let planLockedMonths = new Set(JSON.parse(localStorage.getItem('pulseunit_plan_locked') || '[]'));
function savePlanLocked() { localStorage.setItem('pulseunit_plan_locked', JSON.stringify([...planLockedMonths])); }

function savePlanData() {
    localStorage.setItem('pulseunit_plan_states', JSON.stringify(planStates));
    localStorage.setItem('pulseunit_plan_labels', JSON.stringify(planLabels));
    localStorage.setItem('pulseunit_plan_regime', planRegime);
    if (typeof PLANS_DOC !== 'undefined' && PLANS_DOC && currentUser) {
        // update() avec dotted-path REMPLACE la valeur entière (pas de merge sur les sous-maps),
        // contrairement à set({merge:true}) qui fusionne — sinon les dates supprimées localement
        // reviennent au prochain load car Firestore les conserve.
        const userPlan = { states: planStates, labels: planLabels, regime: planRegime };
        PLANS_DOC.update({ [currentUser.id]: userPlan })
            .catch(() => {
                // Doc inexistant → fallback set merge pour le créer
                PLANS_DOC.set({ [currentUser.id]: userPlan }, { merge: true })
                    .catch(e => console.warn('Plan sync error', e));
            });
    }
}

// Modale "roulette" mois/année avant scan — sur mobile, <select> natif = picker roulette iOS / liste Android
function _askScanMonthYear() {
    return new Promise((resolve) => {
        const today = new Date();
        const curY = today.getFullYear();
        const curM = today.getMonth() + 1;
        const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
        const years = [];
        for (let y = curY - 2; y <= curY + 1; y++) years.push(y);
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px;';
        overlay.innerHTML = `
            <div style="background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:18px; min-width:280px; max-width:90vw;">
                <h3 style="margin:0 0 14px; color:var(--text); font-size:1rem; font-weight:900; text-align:center;">📅 Mois du planning à scanner</h3>
                <div style="display:flex; gap:10px; margin-bottom:14px;">
                    <select id="scan-month-pick" style="flex:1; padding:12px; border-radius:8px; border:1px solid var(--border); background:var(--surface-sec); color:var(--text); font-size:1rem; font-weight:700;">
                        ${months.map((m,i) => `<option value="${i+1}" ${i+1===curM?'selected':''}>${m}</option>`).join('')}
                    </select>
                    <select id="scan-year-pick" style="flex:1; padding:12px; border-radius:8px; border:1px solid var(--border); background:var(--surface-sec); color:var(--text); font-size:1rem; font-weight:700;">
                        ${years.map(y => `<option value="${y}" ${y===curY?'selected':''}>${y}</option>`).join('')}
                    </select>
                </div>
                <div style="display:flex; gap:10px;">
                    <button id="scan-month-cancel" style="flex:1; padding:11px; border-radius:8px; border:1px solid var(--border); background:var(--surface-sec); color:var(--text-muted); font-weight:800; font-size:0.88rem; cursor:pointer;">Annuler</button>
                    <button id="scan-month-ok" style="flex:1; padding:11px; border-radius:8px; border:none; background:var(--brand-aqua); color:#fff; font-weight:900; font-size:0.88rem; cursor:pointer;">Scanner</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const cleanup = (val) => { overlay.remove(); resolve(val); };
        overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(null); });
        document.getElementById('scan-month-cancel').onclick = () => cleanup(null);
        document.getElementById('scan-month-ok').onclick = () => {
            const m = parseInt(document.getElementById('scan-month-pick').value);
            const y = parseInt(document.getElementById('scan-year-pick').value);
            cleanup({ year: y, month: m });
        };
    });
}

// --- Scan planning par photo ------------------------------------------------

// URL du Cloudflare Worker (à remplacer après déploiement, cf worker/SETUP.md)
const SCAN_WORKER_URL = 'https://pulseunit-scan.dimitri-valentin.workers.dev';

let _scanInProgress = false;

function _readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            const idx = result.indexOf(',');
            resolve(idx >= 0 ? result.slice(idx + 1) : result);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

// Compresse l'image à max 2000px (long côté), JPEG qualité 0.85.
// Une photo Android 12 MP brute (5-10 MB) → ~200-400 KB après compression.
// Évite les "Failed to fetch" liés à un POST trop lourd sur réseau mobile.
function _compressImage(file, maxDim = 2000, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
                const ratio = Math.min(maxDim / width, maxDim / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            const idx = dataUrl.indexOf(',');
            resolve({
                base64: idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl,
                mimeType: 'image/jpeg',
                bytes: idx >= 0 ? Math.round((dataUrl.length - idx) * 0.75) : 0
            });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Image illisible'));
        };
        img.src = url;
    });
}

window.scanPlanningPhoto = async function scanPlanningPhoto(ev) {
    const input = ev && ev.target ? ev.target : document.getElementById('plan-scan-input');
    const file = input && input.files && input.files[0];
    if (input) input.value = '';
    if (!file) return;
    if (_scanInProgress) { showToast('⏳ Scan déjà en cours...'); return; }
    if (!currentUser) { showToast('Connectez-vous pour scanner'); return; }
    if (SCAN_WORKER_URL.includes('PASTE-YOUR')) {
        showToast('⛔ Worker non configuré (cf worker/SETUP.md)');
        return;
    }
    if (file.size > 8 * 1024 * 1024) {
        showToast('⛔ Image trop volumineuse (max 8 Mo)');
        return;
    }
    // Demande le mois cible via une modale avec selects natifs (roulette mobile)
    const target = await _askScanMonthYear();
    if (!target) return;
    const targetYear = target.year;
    const targetMonth = target.month;
    _scanInProgress = true;
    showToast('📷 Préparation de la photo...');
    let imageBase64, mimeType;
    try {
        const compressed = await _compressImage(file);
        imageBase64 = compressed.base64;
        mimeType = compressed.mimeType;
    } catch (e) {
        // Fallback : envoie l'image brute si la compression Canvas échoue
        // (HEIC sur certains Android, ou formats exotiques)
        console.warn('compress failed, falling back to raw', e);
        try {
            imageBase64 = await _readFileAsBase64(file);
            mimeType = file.type || 'image/jpeg';
        } catch (e2) {
            showToast('⛔ Impossible de lire l\'image (format ?)');
            _scanInProgress = false;
            return;
        }
    }
    try {
        showToast('🤖 Extraction du planning...');
        const resp = await fetch(SCAN_WORKER_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                imageBase64,
                mimeType,
                firstName: currentUser.firstName,
                lastName: currentUser.lastName,
                year: targetYear,
                month: targetMonth
            })
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            const errCode = data && data.error;
            const errMsg = data && data.message;
            const errStatus = data && data.status;
            const msg = errCode === 'rate_limit' ? '⏳ Service saturé, réessayez dans 1 minute'
                       : errCode === 'image_too_large' ? '⛔ Image trop lourde'
                       : errCode === 'origin_forbidden' ? `⛔ Origine refusée: ${(data && data.received) || '?'}`
                       : errCode === 'gemini_error' ? `⛔ Vision API ${errStatus || ''}: ${(errMsg || '').slice(0, 80)}`
                       : errCode === 'unparsable_response' ? '⛔ Réponse Vision illisible'
                       : `⛔ Erreur ${resp.status}${errCode ? ' · ' + errCode : ''}`;
            showToast(msg);
            _scanInProgress = false;
            return;
        }
        if (!data.found) {
            showToast('⚠️ ' + (data.reason || 'Ligne non identifiée sur la photo'));
            _scanInProgress = false;
            return;
        }
        _applyScannedPlan(data.states || {}, data.count || 0, data.labels || {});
    } catch (e) {
        console.warn('scanPlanning error', e);
        const name = e && e.name ? e.name : '';
        const msg = e && e.message ? e.message : 'Erreur de scan';
        const online = (typeof navigator !== 'undefined' && 'onLine' in navigator) ? navigator.onLine : true;
        const detail = name ? ` (${name}${online ? '' : ' • offline'})` : '';
        showToast('⛔ ' + msg + detail);
    }
    _scanInProgress = false;
};

function _applyScannedPlan(scanned, count, labels) {
    if (!scanned || count === 0) {
        showToast('Aucune donnée à importer');
        return;
    }
    // Snapshot pour undo (states + labels)
    const snapshot = { states: JSON.parse(JSON.stringify(planStates)), labels: JSON.parse(JSON.stringify(planLabels)) };
    let added = 0, replaced = 0;
    for (const [date, state] of Object.entries(scanned)) {
        if (planStates[date] !== undefined && planStates[date] !== state) replaced++;
        else if (planStates[date] === undefined) added++;
        planStates[date] = state;
        if (labels && labels[date]) planLabels[date] = labels[date];
        else delete planLabels[date];
    }
    savePlanData();
    if (typeof renderPlanCalendrier === 'function') renderPlanCalendrier();
    else if (typeof updatePlanStats === 'function') updatePlanStats();
    _showScanUndoToast(added, replaced, snapshot);
}

function _showScanUndoToast(added, replaced, snapshot) {
    const wrap = document.getElementById('plan-scan-undo');
    if (!wrap) {
        const el = document.createElement('div');
        el.id = 'plan-scan-undo';
        el.style.cssText = 'position:fixed; left:50%; bottom:20px; transform:translateX(-50%); z-index:9999; background:var(--surface); border:1px solid var(--brand-aqua); border-radius:12px; padding:12px 16px; display:flex; align-items:center; gap:14px; box-shadow:0 4px 16px rgba(0,0,0,0.35); font-weight:800; color:var(--text); font-size:0.88rem;';
        document.body.appendChild(el);
    }
    const root = document.getElementById('plan-scan-undo');
    const replacedTxt = replaced > 0 ? ` · ${replaced} remplacé${replaced > 1 ? 's' : ''}` : '';
    root.innerHTML = `<span>✅ ${added} ajouté${added > 1 ? 's' : ''}${replacedTxt}</span>
        <button id="plan-scan-undo-btn" style="background:var(--brand-aqua); color:#000; border:none; border-radius:8px; padding:7px 12px; font-weight:900; cursor:pointer; font-size:0.82rem;">Annuler</button>`;
    root.style.display = 'flex';
    let timer = setTimeout(() => { root.style.display = 'none'; }, 15000);
    document.getElementById('plan-scan-undo-btn').onclick = () => {
        clearTimeout(timer);
        planStates = snapshot.states || snapshot;
        planLabels = snapshot.labels || {};
        savePlanData();
        if (typeof renderPlanCalendar === 'function') renderPlanCalendar();
        else if (typeof updatePlanStats === 'function') updatePlanStats();
        root.style.display = 'none';
        showToast('↩️ Import annulé');
    };
}

async function loadUserPlan(userId) {
    if (typeof PLANS_DOC === 'undefined' || !PLANS_DOC || !userId) return;
    try {
        const doc = await PLANS_DOC.get();
        if (!doc.exists) return;
        const userPlan = doc.data()[userId];
        if (!userPlan) return;
        if (userPlan.states && typeof userPlan.states === 'object') {
            planStates = userPlan.states;
            localStorage.setItem('pulseunit_plan_states', JSON.stringify(planStates));
        }
        if (userPlan.labels && typeof userPlan.labels === 'object') {
            planLabels = userPlan.labels;
            localStorage.setItem('pulseunit_plan_labels', JSON.stringify(planLabels));
        }
        if (userPlan.regime) {
            planRegime = userPlan.regime;
            localStorage.setItem('pulseunit_plan_regime', planRegime);
        }
    } catch(e) { console.warn('loadUserPlan error', e); }
}

function getPlanDefaultState(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const dow = d.getDay();
    if (getJoursFeries(d.getFullYear()).has(dateStr)) return 'ferie';
    if (dow === 0 || dow === 6) return 'rh';
    return 'travail';
}

function _planPrevDay(ds) {
    const dt = new Date(ds + 'T12:00:00');
    dt.setDate(dt.getDate() - 1);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

function getPlanDayState(dateStr) {
    if (planStates[dateStr] !== undefined) return planStates[dateStr];
    const p1 = _planPrevDay(dateStr);
    const p2 = _planPrevDay(p1);
    if (planStates[p1] === 'nuit') return 'rcn';
    if (planStates[p2] === 'nuit' && planStates[p1] === undefined) return 'rh';
    return getPlanDefaultState(dateStr);
}

function planDayHTML(dayNum, state, dateStr) {
    const customLbl = dateStr && planLabels[dateStr];
    const lbl = customLbl || window.PLAN_LABELS[state];
    if (!lbl) return String(dayNum);
    return `<span style="font-size:0.7rem;line-height:1;">${dayNum}</span><span style="font-size:0.48rem;font-weight:900;line-height:1;">${lbl}</span>`;
}

function _planNextDay(ds) {
    const dt = new Date(ds + 'T12:00:00');
    dt.setDate(dt.getDate() + 1);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}
function refreshPlanCell(dateStr) {
    const cell = document.getElementById('plan-d-' + dateStr);
    if (!cell) return;
    const st = getPlanDayState(dateStr);
    cell.className = 'plan-day p-' + st;
    cell.innerHTML  = planDayHTML(parseInt(dateStr.split('-')[2]), st, dateStr);
}

window.cyclePlanDay = function cyclePlanDay(dateStr) {
    const cur      = getPlanDayState(dateStr);
    const defState = getPlanDefaultState(dateStr);
    const cycle = ['travail', 'jour', 'nuit', 'ca', 'can1', 'ca_hp', 'ca_hpn1', 'hp', 'hpn1', 'rcv', 'rcvn1', 'frac', 'fracn1', 'maladie', 'rh', 'hs', 'hs_j', 'hs_n', 'rc', 'formation'];
    const idx   = cycle.indexOf(cur);
    let next;

    if (idx === -1) {
        next = cycle[0];
        planStates[dateStr] = next;
    } else {
        next = cycle[(idx + 1) % cycle.length];
        const shouldRevert = (next === defState) ||
            (idx === cycle.length - 1 && defState !== 'travail' && defState !== 'rh');
        if (shouldRevert) { delete planStates[dateStr]; next = getPlanDayState(dateStr); }
        else planStates[dateStr] = next;
    }
    // Tout cyclage manuel invalide le label scanné Digihops (numéro de séquence)
    if (planLabels[dateStr]) delete planLabels[dateStr];
    savePlanData();

    refreshPlanCell(dateStr);
    refreshPlanCell(_planNextDay(dateStr));
    refreshPlanCell(_planNextDay(_planNextDay(dateStr)));

    const mKey = dateStr.slice(0, 7);
    const mEl  = document.getElementById('plan-mc-' + mKey);
    if (mEl) {
        const y = parseInt(mKey.slice(0,4)), mo = parseInt(mKey.slice(5,7)) - 1;
        let caC = 0, rcnC = 0;
        const nb = new Date(y, mo+1, 0).getDate();
        for (let dd = 1; dd <= nb; dd++) {
            const s = `${y}-${String(mo+1).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
            const st = getPlanDayState(s);
            if (st === 'ca' || st === 'can1') caC++;
            if (st === 'rcn') rcnC++;
        }
        let badge = '';
        if (caC  > 0) badge += caC + ' CA';
        if (rcnC > 0) badge += (badge ? ' · ' : '') + rcnC + ' RCN';
        mEl.textContent = badge;
    }
    updatePlanStats();
};

let planDrag = { active: false, state: null, startDate: null, lastDate: null, moved: false };

function applyPlanStateDrag(dateStr, targetState) {
    const autoStates = new Set(['rcn', 'ferie']);
    if (targetState === null || autoStates.has(targetState)) {
        delete planStates[dateStr];
    } else {
        const defState = getPlanDefaultState(dateStr);
        if (targetState === defState) delete planStates[dateStr];
        else planStates[dateStr] = targetState;
    }
    refreshPlanCell(dateStr);
    refreshPlanCell(_planNextDay(dateStr));
    refreshPlanCell(_planNextDay(_planNextDay(dateStr)));
}

window.planCellTouchStart = function planCellTouchStart(dateStr, e) {
    if (planLockedMonths.has(dateStr.slice(0,7))) return;
    e.preventDefault();
    const cur = getPlanDayState(dateStr);
    planDrag.active    = true;
    planDrag.moved     = false;
    planDrag.state     = cur;
    planDrag.startDate = dateStr;
    planDrag.lastDate  = dateStr;
};

function calcPlanStats() {
    const PLAN_WORK_STATES = window.PLAN_WORK_STATES;
    const caSet  = new Set();
    const fer    = getJoursFeries(planYear);
    let djfCount = 0, hsCA = 0;
    let hsjCount = 0, hsnCount = 0, rcCount = 0;
    const caPeriodsWD = []; let curPer = [];
    const start  = new Date(`${planYear}-01-01T12:00:00`);
    const end    = new Date(`${planYear}-12-31T12:00:00`);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const s   = d.toISOString().split('T')[0];
        const st  = getPlanDayState(s);
        const dow = d.getDay();
        const isHol = fer.has(s);
        const isWE  = (dow===0 || dow===6);
        if (st === 'ca' || st === 'can1') {
            caSet.add(s);
            const mo = d.getMonth()+1; if(mo<=4||mo>=11) hsCA++;
            if (!isWE && !isHol) curPer.push(s);
        } else {
            if (st === 'hs_j') hsjCount++;
            else if (st === 'hs_n') hsnCount++;
            else if (st === 'rc') rcCount++;
            if (!isWE && !isHol && curPer.length>0) { caPeriodsWD.push([...curPer]); curPer=[]; }
            if ((dow===0||isHol) && ['travail','jour','nuit','hs','hs_j','hs_n','formation'].includes(st)) djfCount++;
        }
    }
    if (curPer.length>0) caPeriodsWD.push(curPer);

    const caCount  = caSet.size;
    const hsBonus  = hsCA>=6 ? 2 : hsCA>=3 ? 1 : 0;
    const fracBonus = caPeriodsWD.filter(p=>p.length>=5).length>=3 ? 1 : 0;
    const rcvBonus  = (planRegime!=='nuit' && djfCount>=20) ? 2 : 0;
    const caN1Solde  = (planSoldes && planSoldes.caN1)  || 0;
    const hpSolde    = (planSoldes && planSoldes.hp)    || 0;
    const hpn1Solde  = (planSoldes && planSoldes.hpn1)  || 0;
    const rcvSolde   = (planSoldes && planSoldes.rcv)   || 0;
    const rcvn1Solde = (planSoldes && planSoldes.rcvn1) || 0;
    const fracSolde  = (planSoldes && planSoldes.frac)  || 0;
    const fracn1Solde = (planSoldes && planSoldes.fracn1) || 0;
    const hsjSolde   = (planSoldes && planSoldes.hsj)   || 0;
    const hsjN1Solde = (planSoldes && planSoldes.hsjN1) || 0;
    const hsnSolde   = (planSoldes && planSoldes.hsn)   || 0;
    const hsnN1Solde = (planSoldes && planSoldes.hsnN1) || 0;
    const rcSolde    = (planSoldes && planSoldes.rc)    || 0;
    const rcN1Solde  = (planSoldes && planSoldes.rcN1)  || 0;
    const grandTotal = 25 + caN1Solde + hpSolde + hpn1Solde + rcvSolde + rcvn1Solde + fracSolde + fracn1Solde + hsBonus + fracBonus + rcvBonus + hsjSolde + hsjN1Solde + hsnSolde + hsnN1Solde + rcSolde + rcN1Solde;

    const leaveSet = new Set([...caSet]);
    if (leaveSet.size === 0) return { caCount, hsjCount, hsnCount, rcCount, maxSpan: 0, periods: [], djfCount, hsCA, hsBonus, fracBonus, rcvBonus, grandTotal };

    const sorted = [...leaveSet].sort();
    const periods = [];
    let pStart = sorted[0], pEnd = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
        const prevDate = new Date(pEnd + 'T12:00:00');
        const currDate = new Date(sorted[i] + 'T12:00:00');
        const diffDays = Math.round((currDate - prevDate) / 86400000);
        let hasTravail = false;
        for (let g = 1; g < diffDays; g++) {
            const gd = new Date(prevDate);
            gd.setDate(prevDate.getDate() + g);
            if (PLAN_WORK_STATES.has(getPlanDayState(gd.toISOString().split('T')[0]))) { hasTravail = true; break; }
        }
        if (hasTravail) { periods.push({ start: pStart, end: pEnd }); pStart = sorted[i]; }
        pEnd = sorted[i];
    }
    periods.push({ start: pStart, end: pEnd });

    const dayBefore = ds => {
        const dt = new Date(ds + 'T12:00:00');
        dt.setDate(dt.getDate() - 1);
        return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    };
    const periodsSpan = periods.map(p => {
        let extStart = p.start;
        const d1 = dayBefore(extStart);
        if (getPlanDayState(d1) === 'rh') {
            extStart = d1;
            const d2 = dayBefore(extStart);
            if (getPlanDayState(d2) === 'rcn') extStart = d2;
        }
        const s = new Date(extStart + 'T12:00:00');
        const e = new Date(p.end   + 'T12:00:00');
        return Math.round((e - s) / 86400000) + 1;
    });
    const maxSpan = Math.max(...periodsSpan);
    return { caCount, hsjCount, hsnCount, rcCount, maxSpan, periods: periods.map((p,i) => ({...p, span: periodsSpan[i]})), djfCount, hsCA, hsBonus, fracBonus, rcvBonus, grandTotal };
}

function updatePlanStats() {
    const limit = planRegime === 'nuit' ? 22 : 21;
    const stats = calcPlanStats();
    const { caCount, hsjCount, hsnCount, rcCount, maxSpan, djfCount, hsBonus, fracBonus, rcvBonus, grandTotal } = stats;
    const el = id => document.getElementById(id);
    const set = (id, v) => { const e = el(id); if(e) e.textContent = v; };

    set('pstat-ca',    caCount);
    set('pstat-ratio', (maxSpan||0) + '/' + limit);
    set('pstat-hsj',   hsjCount);
    set('pstat-hsn',   hsnCount);
    set('pstat-rc',    rcCount);
    set('pstat-frac',  fracBonus ? '+' + fracBonus : '+0');
    set('pstat-djf',   planRegime !== 'nuit' ? djfCount : '—');
    set('pstat-rcv',   planRegime !== 'nuit' ? (rcvBonus ? '+' + rcvBonus : '+0') : '—');
    set('pstat-tot',   grandTotal);

    const djfChip = el('pstat-djf-chip');
    const rcvChip = el('pstat-rcv-chip');
    if (djfChip) djfChip.style.opacity = planRegime === 'nuit' ? '0.3' : '1';
    if (rcvChip) rcvChip.style.opacity = planRegime === 'nuit' ? '0.3' : '1';

    const ratioChip = el('pstat-ratio-chip');
    if (ratioChip) {
        ratioChip.className = 'psu' + (maxSpan > limit ? ' fail-u' : maxSpan > limit - 3 ? ' warn-u' : '');
    }

    const countPlaced = (state) => {
        let n = 0;
        const s = new Date(`${planYear}-01-01T12:00:00`), e = new Date(`${planYear}-12-31T12:00:00`);
        for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) {
            if (planStates[d.toISOString().split('T')[0]] === state) n++;
        }
        return n;
    };
    const soldeMap = { can1:'caN1', hp:'hp', hpn1:'hpn1', rcv:'rcv', rcvn1:'rcvn1', frac:'frac', fracn1:'fracn1', hs_j:'hsj', hs_n:'hsn', rc:'rc' };
    Object.entries(soldeMap).forEach(([state, key]) => {
        const placed = countPlaced(state);
        const credit = planSoldes[key] || 0;
        const usedEl = document.getElementById(`solde-${state}-used`);
        if (usedEl) usedEl.textContent = `${placed}/${credit} posés`;
        const warnEl = document.getElementById(`solde-${state}-warn`);
        if (warnEl) warnEl.style.display = placed > credit ? 'inline' : 'none';
    });

    const today = new Date();
    const warnOrNot = (exp, n) => {
        if (!n) return null;
        const dt = exp ? new Date(exp+'T12:00:00') : null;
        if (dt && dt < today) return `<s style="opacity:.45">${n}</s>`;
        if (dt && (dt-today) < 30*86400000) return `<span class="plan-solde-warn">${n}</span>`;
        return String(n);
    };
    const solde = planSoldes;
    const soldeTotal = el('plan-solde-total-val');
    if (soldeTotal) {
        const parts = [
            warnOrNot(solde.caN1Exp,  solde.caN1)  ? warnOrNot(solde.caN1Exp,  solde.caN1)  + ' CA-1'   : '',
            warnOrNot(solde.hpn1Exp,  solde.hpn1)  ? warnOrNot(solde.hpn1Exp,  solde.hpn1)  + ' HP-1'   : '',
            warnOrNot(solde.hpExp,    solde.hp)     ? warnOrNot(solde.hpExp,    solde.hp)     + ' HP'     : '',
            warnOrNot(solde.rcvn1Exp, solde.rcvn1) ? warnOrNot(solde.rcvn1Exp, solde.rcvn1) + ' RCV-1'  : '',
            warnOrNot(solde.rcvExp,   solde.rcv)   ? warnOrNot(solde.rcvExp,   solde.rcv)   + ' RCV'    : '',
            warnOrNot(solde.fracn1Exp,solde.fracn1)? warnOrNot(solde.fracn1Exp,solde.fracn1)+ ' FR-1'   : '',
            warnOrNot(solde.fracExp,  solde.frac)  ? warnOrNot(solde.fracExp,  solde.frac)  + ' FR'     : '',
            solde.hsjN1 ? solde.hsjN1 + ' HSJ-1' : '',
            solde.hsj   ? solde.hsj   + ' HSJ'   : '',
            solde.hsnN1 ? solde.hsnN1 + ' HSN-1' : '',
            solde.hsn   ? solde.hsn   + ' HSN'   : '',
            solde.rcN1  ? solde.rcN1  + ' RC-1'  : '',
            solde.rc    ? solde.rc    + ' RC'    : '',
        ].filter(Boolean);
        soldeTotal.innerHTML = parts.length ? parts.join(' · ') : '—';
    }
}

function renderPlanMonth(year, month) {
    const MOIS  = ['Janvier','Février','Mars','Avril','Mai','Juin',
                   'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const JOURS = ['L','M','M','J','V','S','D'];
    const mKey  = `${year}-${String(month+1).padStart(2,'0')}`;
    const nbJ   = new Date(year, month+1, 0).getDate();
    let firstDow = new Date(year, month, 1).getDay();
    firstDow = firstDow === 0 ? 6 : firstDow - 1;
    let caC = 0, rcnC = 0;
    for (let d = 1; d <= nbJ; d++) {
        const s  = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const st = getPlanDayState(s);
        if (st === 'ca')  caC++;
        if (st === 'rcn') rcnC++;
    }
    let badge = '';
    if (caC  > 0) badge += caC + ' CA';
    if (rcnC > 0) badge += (badge ? ' · ' : '') + rcnC + ' RCN';
    const locked = planLockedMonths.has(mKey);
    const lockBtn = `<button class="plan-month-lock${locked ? ' is-locked' : ''}" onclick="togglePlanMonthLock('${mKey}')" title="${locked ? 'Déverrouiller' : 'Verrouiller'}">${locked ? '🔒' : '🔓'}</button>`;
    let html = `<div class="cal-month${locked ? ' locked' : ''}"><div class="cal-month-header"><span>${MOIS[month]} ${year}</span><span style="display:flex;align-items:center;gap:6px;"><span class="cal-month-count" id="plan-mc-${mKey}">${badge}</span>${lockBtn}<button class="plan-month-clear" onclick="resetPlanMonth('${mKey}')">↺</button></span></div><div class="cal-grid">`;
    JOURS.forEach((j, i) => { html += `<div class="cal-day-label${i >= 5 ? ' we' : ''}">${j}</div>`; });
    for (let e = 0; e < firstDow; e++) html += '<div class="plan-day empty"></div>';
    for (let d = 1; d <= nbJ; d++) {
        const str = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const st  = getPlanDayState(str);
        html += `<div class="plan-day p-${st}" id="plan-d-${str}"${locked ? '' : ` onclick="cyclePlanDay('${str}')" ontouchstart="planCellTouchStart('${str}',event)"`}>${planDayHTML(d, st, str)}</div>`;
    }
    html += '</div></div>';
    return html;
}

function renderPlanCalendrier() {
    const pj = document.getElementById('pbtn-jour'); if(pj) pj.className = 'plan-regime-pill' + (planRegime === 'jour' ? ' active-jour' : '');
    const pn = document.getElementById('pbtn-nuit'); if(pn) pn.className = 'plan-regime-pill' + (planRegime === 'nuit' ? ' active-nuit' : '');
    document.getElementById('plan-year-label').textContent = planYear;
    const rcnLeg = document.getElementById('plan-legend-rcn');
    if (rcnLeg) rcnLeg.style.display = planRegime === 'nuit' ? 'inline' : 'none';
    let html = '';
    for (let m = 0; m < 12; m++) html += renderPlanMonth(planYear, m);
    document.getElementById('plan-scroll').innerHTML = html;
    updatePlanStats();
}

window.togglePlanMonthLock = function togglePlanMonthLock(mKey) {
    if (planLockedMonths.has(mKey)) planLockedMonths.delete(mKey);
    else planLockedMonths.add(mKey);
    savePlanLocked();
    renderPlanCalendrier();
};

window.setPlanRegime  = function(r) { planRegime = r; savePlanData(); renderPlanCalendrier(); };
window.changePlanYear = function(d) { planYear += d; renderPlanCalendrier(); };

window.resetPlanningCA = function resetPlanningCA() {
    if (!confirm('Effacer tout le planning pour ' + planYear + ' ?')) return;
    const y = String(planYear);
    Object.keys(planStates).forEach(k => { if (k.startsWith(y)) delete planStates[k]; });
    Object.keys(planLabels).forEach(k => { if (k.startsWith(y)) delete planLabels[k]; });
    // Suppression explicite Firestore : pour chaque mois de l'année, on delete()
    // les sous-clés. Plus sûr que l'update() global qui peut être annulé par un
    // listener concurrent ou un cache obsolète côté client.
    if (typeof PLANS_DOC !== 'undefined' && PLANS_DOC && currentUser && firebase && firebase.firestore) {
        const D = firebase.firestore.FieldValue.delete();
        const updates = {};
        for (let mm = 1; mm <= 12; mm++) {
            const nbDays = new Date(parseInt(y), mm, 0).getDate();
            for (let d = 1; d <= nbDays; d++) {
                const ds = `${y}-${String(mm).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                updates[`${currentUser.id}.states.${ds}`] = D;
                updates[`${currentUser.id}.labels.${ds}`] = D;
            }
        }
        PLANS_DOC.update(updates).catch(e => console.warn('Plan year delete sync error', e));
    }
    savePlanData();
    renderPlanCalendrier();
};

let planSoldes = (() => {
    const defaults = { caN1: 0, caN1Exp: '', hp: 0, hpExp: '', hpn1: 0, hpn1Exp: '', rcv: 0, rcvExp: '', rcvn1: 0, rcvn1Exp: '', frac: 0, fracExp: '', fracn1: 0, fracn1Exp: '', hsj: 0, hsjN1: 0, hsn: 0, hsnN1: 0, rc: 0, rcN1: 0 };
    const stored = JSON.parse(localStorage.getItem('pulseunit_plan_soldes') || 'null');
    return stored ? { ...defaults, ...stored } : defaults;
})();
function savePlanSoldes() { try { localStorage.setItem('pulseunit_plan_soldes', JSON.stringify(planSoldes)); } catch(e){} }

window.updatePlanSolde = function(field, val) {
    planSoldes[field] = val; savePlanSoldes(); updatePlanStats();
};
window.reportSolde = function(fromKey, toKey, inputId) {
    planSoldes[toKey] = planSoldes[fromKey] || 0;
    savePlanSoldes();
    const inp = document.getElementById(inputId);
    if (inp) inp.value = planSoldes[toKey] || '';
    updatePlanStats();
};

let planLegendOpen = false;
window.togglePlanLegend = function() {
    planLegendOpen = !planLegendOpen;
    const body   = document.getElementById('plan-legend-body');
    const arrow  = document.getElementById('plan-legend-arrow');
    if (body)  body.style.display  = planLegendOpen ? 'flex' : 'none';
    if (arrow) arrow.textContent   = planLegendOpen ? '▴' : '▾';
};

let planSoldesOpen = false;
window.togglePlanSoldes = function() {
    planSoldesOpen = !planSoldesOpen;
    const body   = document.getElementById('plan-soldes-body');
    const toggle = document.getElementById('plan-soldes-toggle');
    if (body)   body.style.display   = planSoldesOpen ? 'block' : 'none';
    if (toggle) toggle.textContent   = planSoldesOpen ? '▴' : '▾';
};

function initPlanSoldesUI() {
    if (!planSoldes.caN1Exp)  { planSoldes.caN1Exp  = `${planYear}-01-31`; savePlanSoldes(); }
    if (!planSoldes.hpn1Exp)  { planSoldes.hpn1Exp  = `${planYear}-01-31`; savePlanSoldes(); }
    if (!planSoldes.hpExp)    { planSoldes.hpExp     = `${planYear}-03-31`; savePlanSoldes(); }
    if (!planSoldes.rcvn1Exp) { planSoldes.rcvn1Exp = `${planYear}-01-31`;  savePlanSoldes(); }
    if (!planSoldes.rcvExp)   { planSoldes.rcvExp    = `${planYear}-03-31`; savePlanSoldes(); }
    if (!planSoldes.fracn1Exp){ planSoldes.fracn1Exp = `${planYear}-01-31`; savePlanSoldes(); }
    if (!planSoldes.fracExp)  { planSoldes.fracExp   = `${planYear}-03-31`; savePlanSoldes(); }
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
    set('solde-ca-n1',      planSoldes.caN1   || '');
    set('solde-ca-n1-exp',  planSoldes.caN1Exp);
    set('solde-hpn1',       planSoldes.hpn1   || '');
    set('solde-hpn1-exp',   planSoldes.hpn1Exp);
    set('solde-hp',         planSoldes.hp     || '');
    set('solde-hp-exp',     planSoldes.hpExp);
    set('solde-rcvn1',      planSoldes.rcvn1  || '');
    set('solde-rcvn1-exp',  planSoldes.rcvn1Exp);
    set('solde-rcv',        planSoldes.rcv    || '');
    set('solde-rcv-exp',    planSoldes.rcvExp);
    set('solde-fracn1',     planSoldes.fracn1 || '');
    set('solde-fracn1-exp', planSoldes.fracn1Exp);
    set('solde-frac',       planSoldes.frac   || '');
    set('solde-frac-exp',   planSoldes.fracExp);
}

window.resetPlanMonth = function(mKey) {
    if (!confirm('Effacer le mois ' + mKey + ' ?')) return;
    Object.keys(planStates).forEach(k => { if (k.startsWith(mKey)) delete planStates[k]; });
    Object.keys(planLabels).forEach(k => { if (k.startsWith(mKey)) delete planLabels[k]; });
    // Suppression explicite des dotted-paths en Firestore — protège contre le cache PWA
    // où l'ancien savePlanData() avec set({merge:true}) a pu laisser des entrées orphelines.
    if (typeof PLANS_DOC !== 'undefined' && PLANS_DOC && currentUser && firebase && firebase.firestore) {
        const D = firebase.firestore.FieldValue.delete();
        const updates = {};
        const yyyy = parseInt(mKey.slice(0,4)), mm = parseInt(mKey.slice(5,7));
        const nbDays = new Date(yyyy, mm, 0).getDate();
        for (let d = 1; d <= nbDays; d++) {
            const ds = `${mKey}-${String(d).padStart(2,'0')}`;
            updates[`${currentUser.id}.states.${ds}`] = D;
            updates[`${currentUser.id}.labels.${ds}`] = D;
        }
        PLANS_DOC.update(updates).catch(e => console.warn('Plan month delete sync error', e));
    }
    savePlanData();
    renderPlanCalendrier();
};

window.openPlanningCA = function openPlanningCA() {
    document.getElementById('planning-ca-view').style.display = 'flex';
    setTimeout(() => { renderPlanCalendrier(); initPlanSoldesUI(); switchPlanTab('calendar'); }, 30);
};
window.closePlanningCA = function closePlanningCA() {
    document.getElementById('planning-ca-view').style.display = 'none';
};

// ============================================================================
// Onglets Calendrier / Suivi RH
// ============================================================================

window.switchPlanTab = function switchPlanTab(name) {
    const tabs = ['calendar', 'suivi'];
    if (!tabs.includes(name)) return;
    tabs.forEach(t => {
        const content = document.getElementById('plan-tab-' + t);
        const btn = document.getElementById('plan-tab-btn-' + t);
        const isActive = (t === name);
        if (content) content.style.display = isActive ? (t === 'calendar' ? 'flex' : 'block') : 'none';
        if (btn) btn.classList.toggle('is-active', isActive);
    });
    if (name === 'suivi') renderSuiviRH();
};

// ============================================================================
// Suivi RH — moteur de rendu
// ============================================================================

function _suiviProfileType() {
    // Source de vérité : window.userProfile.agentType (cf. profile/handlers.js)
    // Fallback sur planRegime ('jour'/'nuit') puis 'jour-fixe' par défaut
    if (typeof getProfileAgentType === 'function') return getProfileAgentType();
    if (planRegime === 'nuit') return 'nuit-fixe';
    return 'jour-fixe';
}

function _suiviProfileLabel(t) {
    return ({ 'jour-fixe':'Jour fixe', 'nuit-fixe':'Nuit fixe', 'alterne':'Alterné' })[t] || '—';
}

function _suiviTotalCAEntitled() {
    // Capital théorique CA = 25 + bonus HS + bonus Frac + soldes N-1 reportés
    const stats = (typeof calcPlanStats === 'function') ? calcPlanStats() : { hsBonus:0, fracBonus:0 };
    const caN1 = (planSoldes && planSoldes.caN1) || 0;
    return 25 + caN1 + (stats.hsBonus || 0) + (stats.fracBonus || 0);
}

window.renderSuiviRH = function renderSuiviRH() {
    if (typeof window.PlanEngine !== 'object') return;
    const E = window.PlanEngine;
    const year = planYear;
    const profile = _suiviProfileType();
    const fer = (typeof getJoursFeries === 'function') ? getJoursFeries(year) : new Set();

    // Bandeau identité
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    if (currentUser) {
        setText('suivi-name', `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || '—');
        setText('suivi-role', (currentUser.role || '').toUpperCase() || '—');
    } else {
        setText('suivi-name', '—');
        setText('suivi-role', '—');
    }
    setText('suivi-profile-type', _suiviProfileLabel(profile));
    setText('suivi-year-lbl', year);

    // Compteurs CA / CA-HP / Frac / RCV
    const postes = E.soldesPostes(year, planStates);
    const caTotal   = _suiviTotalCAEntitled();
    const caHpTotal = ((planSoldes && planSoldes.hp) || 0) + ((planSoldes && planSoldes.hpn1) || 0);
    const fracTotal = ((planSoldes && planSoldes.frac) || 0) + ((planSoldes && planSoldes.fracn1) || 0);
    const stats = (typeof calcPlanStats === 'function') ? calcPlanStats() : { rcvBonus:0, djfCount:0 };
    const rcvBonus = stats.rcvBonus || 0;
    const rcvTotal = rcvBonus + ((planSoldes && planSoldes.rcv) || 0) + ((planSoldes && planSoldes.rcvn1) || 0);
    const rcvEligible = (profile !== 'nuit-fixe') && (stats.djfCount >= 20 || rcvTotal > 0);

    function _setCard(prefix, posed, total, opts) {
        opts = opts || {};
        const rest = total - posed;
        const restEl = document.getElementById('suivi-' + prefix + '-rest');
        const restWrap = restEl ? restEl.parentElement : null;
        const bar = document.getElementById('suivi-' + prefix + '-bar');
        setText('suivi-' + prefix + '-posed', String(posed));
        setText('suivi-' + prefix + '-total', String(total));
        if (restEl) restEl.textContent = String(Math.max(0, rest));
        if (restWrap) {
            restWrap.classList.toggle('is-over', rest < 0);
            restWrap.classList.toggle('not-eligible', !!opts.notEligible);
        }
        if (bar) {
            const pct = total > 0 ? Math.min(100, Math.round((posed / total) * 100)) : 0;
            bar.style.width = pct + '%';
        }
    }
    _setCard('ca',   (postes.ca || 0) + (postes.can1 || 0), caTotal);
    _setCard('cahp', (postes.ca_hp || 0) + (postes.ca_hpn1 || 0), caHpTotal);
    _setCard('frac', (postes.frac || 0) + (postes.fracn1 || 0), fracTotal);
    _setCard('rcv',  (postes.rcv || 0) + (postes.rcvn1 || 0), rcvTotal, { notEligible: !rcvEligible });
    const rcvCard = document.getElementById('suivi-card-rcv');
    if (rcvCard) rcvCard.classList.toggle('is-disabled', !rcvEligible);
    const rcvRestWrap = document.getElementById('suivi-rcv-rest-wrap');
    if (rcvRestWrap && !rcvEligible) rcvRestWrap.innerHTML = '<em>Non éligible (&lt;20 DJF)</em>';

    // Transmissions
    const transm = E.transmissionHours(year, planStates);
    setText('suivi-transm-formula', `${transm.gardes} gardes × 0h25`);
    setText('suivi-transm-total', transm.formatted || '—');

    // Tableau débit/crédit mensuel
    const dcTable = E.yearlyDebitCreditTable(year, planStates, fer, profile);
    const recap = E.yearlyRecap(year, planStates, fer, profile);
    const fmt = (h) => E.formatHours(h);
    const sign = (h) => h > 0.005 ? 'is-positive' : (h < -0.005 ? 'is-negative' : '');

    const theoTotal = recap.totalTheoreticalHours || 0;
    const realTotal = recap.totalRealizedHours || 0;
    const dcTotal = recap.totalDebitCredit || 0;
    setText('suivi-theo-total', fmt(theoTotal));
    setText('suivi-real-total', fmt(realTotal));
    const dcEl = document.getElementById('suivi-dc-total');
    if (dcEl) {
        dcEl.textContent = fmt(dcTotal);
        dcEl.classList.remove('is-positive', 'is-negative');
        if (sign(dcTotal)) dcEl.classList.add(sign(dcTotal));
    }

    const grid = document.getElementById('suivi-debit-grid');
    if (grid) {
        grid.innerHTML = dcTable.map(row => {
            const dcCls = sign(row.debitCredit);
            const cuCls = sign(row.cumul);
            return `<div class="suivi-debit-row">
                <span class="suivi-debit-row-month">${row.monthName || row.monthLabel || ''}</span>
                <span class="suivi-debit-row-dc ${dcCls}">${fmt(row.debitCredit)}</span>
                <span class="suivi-debit-row-cumul ${cuCls}">${fmt(row.cumul)}</span>
            </div>`;
        }).join('');
    }

    // CA consécutifs
    const consec = E.consecutiveCAPeriods(year, planStates, fer);
    const consecEl = document.getElementById('suivi-consec');
    if (consecEl) {
        if (!consec || consec.length === 0) {
            consecEl.innerHTML = '<div class="suivi-consec-empty">Aucune période de CA pour cette année.</div>';
        } else {
            consecEl.innerHTML = consec.map(p => {
                const len = p.lengthCalendarDays || p.lengthDays || 0;
                const overLimit = p.exceedsLimit || len > 31;
                const warn = !overLimit && len >= 22;
                const cls = overLimit ? 'is-over' : (warn ? 'is-warn' : '');
                const tag = overLimit ? '⚠️ Dépasse 31 jours' : (warn ? '⚠️ Proche limite' : '');
                return `<div class="suivi-consec-row ${cls}">
                    <span class="suivi-consec-dates">${p.start} → ${p.end}${tag ? ' · ' + tag : ''}</span>
                    <span class="suivi-consec-len">${len} j</span>
                </div>`;
            }).join('');
        }
    }

    // Récap rapide
    const recapGrid = document.getElementById('suivi-recap-grid');
    if (recapGrid) {
        const dw = recap.daysWorked || {};
        const samedis = (recap.weekendDaysWorked && recap.weekendDaysWorked.samedis) || 0;
        const dimanches = (recap.weekendDaysWorked && recap.weekendDaysWorked.dimanches) || 0;
        const cells = [
            { v: dw.total || 0, l: 'Jours trav.' },
            { v: dw.jour || 0, l: 'Gardes J' },
            { v: dw.nuit || 0, l: 'Gardes N' },
            { v: recap.feriesWorked || 0, l: 'Fériés trav.' },
            { v: samedis + dimanches, l: 'Week-ends' },
            { v: (recap.daysOff && recap.daysOff.maladie) || 0, l: 'Maladie' }
        ];
        recapGrid.innerHTML = cells.map(c => `<div class="suivi-recap-cell">
            <span class="suivi-recap-cell-val">${c.v}</span>
            <span class="suivi-recap-cell-lbl">${c.l}</span>
        </div>`).join('');
    }
};

// ============================================================================
// Export PDF — adapter PlanEngine.yearlyRecap → format attendu par PlanPdfExport
// ============================================================================

window.exportSuiviRHPdf = async function exportSuiviRHPdf() {
    if (!window.PlanEngine || !window.PlanPdfExport) {
        if (typeof showToast === 'function') showToast('⛔ Modules manquants (rechargez l\'app)');
        return;
    }
    if (!currentUser) {
        if (typeof showToast === 'function') showToast('⛔ Connectez-vous pour exporter');
        return;
    }
    const E = window.PlanEngine;
    const year = planYear;
    const profile = _suiviProfileType();
    const fer = (typeof getJoursFeries === 'function') ? getJoursFeries(year) : new Set();
    const recapEng = E.yearlyRecap(year, planStates, fer, profile);
    const dcTable = E.yearlyDebitCreditTable(year, planStates, fer, profile);
    const consec = E.consecutiveCAPeriods(year, planStates, fer);
    const postes = E.soldesPostes(year, planStates);

    // Adapter : engine output → shape attendue par PdfExport (counts, totalTheoretical, etc.)
    const dw = recapEng.daysWorked || {};
    const off = recapEng.daysOff || {};
    const recapAdapted = {
        counts: {
            jour: dw.jour || 0,
            nuit: dw.nuit || 0,
            hs_j: dw.hs_j || 0,
            hs_n: dw.hs_n || 0,
            formation: dw.formation || 0,
            rh: off.rh || 0,
            rc: off.rc || 0,
            rcn: off.rcn || 0,
            ferie: off.ferie || 0,
            maladie: off.maladie || 0
        },
        totalTheoretical: recapEng.totalTheoreticalHours || 0,
        totalRealized: recapEng.totalRealizedHours || 0,
        annualDebitCredit: recapEng.totalDebitCredit || 0,
        feriesWorked: recapEng.feriesWorked || 0,
        saturdaysWorked: (recapEng.weekendDaysWorked && recapEng.weekendDaysWorked.samedis) || 0,
        sundaysWorked: (recapEng.weekendDaysWorked && recapEng.weekendDaysWorked.dimanches) || 0
    };

    const dcTableAdapted = dcTable.map(r => ({
        debitCredit: r.debitCredit,
        cumul: r.cumul
    }));

    const consecAdapted = (consec || []).map(p => ({
        start: p.start, end: p.end, days: p.lengthCalendarDays || p.lengthDays || 0
    }));

    const stats = (typeof calcPlanStats === 'function') ? calcPlanStats() : { rcvBonus:0, djfCount:0 };
    const caTotal   = _suiviTotalCAEntitled();
    const caHpTotal = ((planSoldes && planSoldes.hp) || 0) + ((planSoldes && planSoldes.hpn1) || 0);
    const fracTotal = ((planSoldes && planSoldes.frac) || 0) + ((planSoldes && planSoldes.fracn1) || 0);
    const rcvTotal  = (stats.rcvBonus || 0) + ((planSoldes && planSoldes.rcv) || 0) + ((planSoldes && planSoldes.rcvn1) || 0);
    const rcvEligible = (profile !== 'nuit-fixe') && (stats.djfCount >= 20 || rcvTotal > 0);

    if (typeof showToast === 'function') showToast('📄 Génération du PDF...');
    try {
        await window.PlanPdfExport.exportYearlyRecap({
            year,
            user: { firstName: currentUser.firstName, lastName: currentUser.lastName, role: currentUser.role },
            profile,
            recap: recapAdapted,
            debitCreditTable: dcTableAdapted,
            ca:   { posed: (postes.ca || 0) + (postes.can1 || 0),         total: caTotal },
            caHp: { posed: (postes.ca_hp || 0) + (postes.ca_hpn1 || 0),   total: caHpTotal },
            frac: { posed: (postes.frac || 0) + (postes.fracn1 || 0),     total: fracTotal },
            rcv:  { posed: (postes.rcv || 0) + (postes.rcvn1 || 0),       total: rcvTotal, eligible: rcvEligible },
            consecutiveCA: consecAdapted
        });
        if (typeof showToast === 'function') showToast('✅ PDF téléchargé');
    } catch (e) {
        console.warn('exportSuiviRHPdf error', e);
        if (typeof showToast === 'function') showToast('⛔ Échec export : ' + (e && e.message || 'inconnu'));
    }
};
