/**
 * Respirator handlers — Simulateur oscilloscope 5 cycles (Canvas/RAF).
 * Dépend de :
 *   - window.RV_SCENARIOS, window.RV_CFG, window.RV_ZONES (config.js)
 *   - window.normesZoneBarHTML (norms/handlers.js)
 *   - getAutoTheme, triggerHaptic (inline)
 * Expose sur window : openNormesRespi, closeNormesRespi, applyRvScenario,
 *   setRespiMode, openRvModal, closeRvModal, rvModalSlide,
 *   startRvRepeat, stopRvRepeat.
 */

let respiValues = {
    vt:490, peep:5, fio2:40, fr:16, pcabove:14,
    comp:50, res:10, pplat:20, pcrete:26, ie:2, poids:70
};
let respiMode     = 'PC';
let respiScenario = 'standard';
let _rvAnimId     = null;
let _rvModalParam = null;
let _rvRepeatTimer= null;

const _rv_scope = {
    paw:  { lastY: null, x: 0 },
    flow: { lastY: null, x: 0 },
    vol:  { lastY: null, x: 0 },
};
let _rvSimTime = 0;
let _rvLastTS  = null;

const rvDP   = () => Math.max(0, respiValues.pplat - respiValues.peep);
const rvVMin = () => (respiValues.vt * respiValues.fr / 1000).toFixed(1);
const rvMlKg = () => (respiValues.vt / respiValues.poids).toFixed(1);

function rvGetZone(param, value) {
    const zones = window.RV_ZONES[param] || [];
    let az = zones[zones.length-1] || {color:'#64748b',label:'—',sev:0};
    for (const z of zones) { if (value >= z.min && value < z.max) { az = z; break; } }
    return az;
}

function rvIsDark() {
    const t = document.documentElement.getAttribute('data-theme');
    return t === 'dark' || (t === 'auto' && getAutoTheme() === 'dark') || !t;
}
function rvGetColors() {
    const dark = rvIsDark();
    return {
        paw:   dark ? '#f59e0b' : '#b45309',
        flow:  dark ? '#22c55e' : '#15803d',
        vol:   dark ? '#38bdf8' : '#0369a1',
        bg:    dark ? '#050e18' : '#f8fbff',
        grid:  dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,30,80,0.08)',
        sweep: dark ? '#050e18' : '#f8fbff',
    };
}

function updatePhysiology() {
    const v = respiValues;
    const T  = 60 / v.fr;
    const Ti = T / (1 + v.ie);
    const C  = v.comp / 1000;
    const R  = v.res;
    const tau = R * C;
    if (respiMode === 'VC') {
        const flowL = (v.vt / 1000) / Ti;
        v.pplat  = Math.round(v.peep + v.vt / v.comp);
        v.pcrete = Math.round(v.pplat + flowL * R);
    } else {
        const vAtt = v.pcabove * v.comp * (1 - Math.exp(-Ti / tau));
        v.vt     = Math.max(50, Math.round(vAtt));
        v.pplat  = Math.round(v.peep + v.vt / v.comp);
        v.pcrete = Math.round(v.peep + v.pcabove);
    }
}

function rvCalcState(t) {
    const v   = respiValues;
    const T   = 60 / v.fr;
    const Ti  = T / (1 + v.ie);
    const Te  = T - Ti;
    const C   = v.comp / 1000;
    const R   = v.res;
    const tau = R * C;
    const ph  = ((t % T) + T) % T;

    if (respiMode === 'VC') {
        const flowL = (v.vt / 1000) / Ti;
        if (ph < Ti) {
            return { paw: v.peep + (flowL * ph)/C + flowL*R, flow: flowL*60, vol: flowL*ph*1000 };
        }
        const te = ph - Ti, vEnd = v.vt / 1000, vol = vEnd * Math.exp(-te / tau);
        return { paw: v.peep + vol/C, flow: -(vEnd/tau)*Math.exp(-te/tau)*60, vol: vol*1000 };
    }

    if (respiMode === 'VSAI') {
        const ps = v.pcabove * 0.85, trig = 0.06;
        if (ph < trig) {
            const tp = ph/trig;
            return { paw: v.peep - 2*tp, flow: -9*tp, vol: 0 };
        } else if (ph < Ti) {
            const tp = (ph-trig)/(Ti-trig);
            const vol = ps * C * (1 - Math.exp(-ph/tau));
            return { paw: v.peep + ps*(1-Math.exp(-tp*4)), flow: (ps/R)*Math.exp(-ph/tau)*60, vol: vol*1000 };
        }
        const te = ph - Ti, vEnd = ps*C*(1-Math.exp(-Ti/tau)), vol = vEnd*Math.exp(-te/tau);
        return { paw: v.peep + (vol/C)*0.15, flow: -(vEnd/tau)*Math.exp(-te/tau)*60, vol: vol*1000 };
    }

    if (respiMode === 'VNI') {
        const leak = 8;
        if (ph < Ti) {
            const vol = v.pcabove*C*(1-Math.exp(-ph/tau));
            return { paw: v.peep+v.pcabove*(1-Math.exp(-ph*5)), flow: (v.pcabove/R)*Math.exp(-ph/tau)*60+leak, vol: vol*1000 };
        }
        const te = ph-Ti, vEnd = v.pcabove*C*(1-Math.exp(-Ti/tau)), vol = vEnd*Math.exp(-te/tau);
        return { paw: v.peep+0.5+v.pcabove*0.04*Math.exp(-te*8), flow: -(vEnd/tau)*Math.exp(-te/tau)*60*0.7+leak*0.3, vol: vol*1000 };
    }

    // PC-AC (défaut)
    if (ph < Ti) {
        const vol = v.pcabove * C * (1 - Math.exp(-ph / tau));
        return { paw: v.peep+v.pcabove*(1-Math.exp(-ph*10)), flow: (v.pcabove/R)*Math.exp(-ph/tau)*60, vol: vol*1000 };
    }
    const te = ph-Ti, vEnd = v.pcabove*C*(1-Math.exp(-Ti/tau)), vol = vEnd*Math.exp(-te/tau);
    return { paw: v.peep+(vol/C)*0.2, flow: -(vEnd/tau)*Math.exp(-te/tau)*60, vol: vol*1000 };
}

function rvDrawScope(canvasId, scope, val, yMin, yMax, color, bgColor, dx) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const parent = canvas.parentElement;
    const W = parent.clientWidth, H = parent.clientHeight;
    if (W < 2 || H < 2) return;
    if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W; canvas.height = H;
        scope.lastY = null; scope.x = 0;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = bgColor; ctx.fillRect(0, 0, W, H);
    }
    const ctx = canvas.getContext('2d');
    const y = Math.max(0, Math.min(H, H - ((val - yMin) / (yMax - yMin)) * H));

    if (scope.lastY !== null) {
        ctx.beginPath();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = color;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.moveTo(scope.x - dx, scope.lastY);
        ctx.lineTo(scope.x, y);
        ctx.stroke();
    }

    const GAP = 28;
    ctx.fillStyle = bgColor;
    ctx.fillRect(scope.x + 1, 0, GAP, H);

    const zy = H - ((0 - yMin) / (yMax - yMin)) * H;
    if (zy > 1 && zy < H - 1) {
        ctx.strokeStyle = rvIsDark() ? 'rgba(255,255,255,0.06)' : 'rgba(0,30,80,0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 8]);
        ctx.beginPath(); ctx.moveTo(0, zy); ctx.lineTo(W, zy); ctx.stroke();
        ctx.setLineDash([]);
    }

    scope.lastY = y;
    scope.x = (scope.x + dx) % W;
    if (scope.x < dx) scope.lastY = null;
}

function rvAnimLoop(ts) {
    if (_rvLastTS !== null) {
        const dt = (ts - _rvLastTS) / 1000;
        _rvSimTime += dt;

        updatePhysiology();
        const state = rvCalcState(_rvSimTime);
        const v     = respiValues;
        const clrs  = rvGetColors();

        const T_cycle = 60 / v.fr;
        const timeWin = T_cycle * 5;

        const W = (document.getElementById('rv-canvas-paw')?.parentElement?.clientWidth) || 200;
        const dx = (W / timeWin) * dt;

        const pawMax  = Math.max(v.peep + v.pcabove + 10, 40);
        const flowAbs = Math.max(v.vt * v.fr / 1000 * 2, 60);
        const volMax  = Math.max(v.vt * 1.3, 100);

        rvDrawScope('rv-canvas-paw',  _rv_scope.paw,  state.paw,   0,       pawMax,   clrs.paw,  clrs.bg, dx);
        rvDrawScope('rv-canvas-flow', _rv_scope.flow, state.flow, -flowAbs, flowAbs,  clrs.flow, clrs.bg, dx);
        rvDrawScope('rv-canvas-vol',  _rv_scope.vol,  state.vol,   0,       volMax,   clrs.vol,  clrs.bg, dx);

        const dp  = rvDP();
        const zPC = rvGetZone('pcrete', v.pcrete), zPP = rvGetZone('pplat', v.pplat);
        const zVT = rvGetZone('vt', v.vt),  zPEEP = rvGetZone('peep', v.peep);
        const zDP = rvGetZone('dp', dp), zC = rvGetZone('comp', v.comp), zR = rvGetZone('res', v.res);
        const up  = (id, val, col) => { const e=document.getElementById(id); if(e){e.textContent=val; if(col)e.style.color=col;} };
        up('rv-p-pcrete', v.pcrete, zPC.color);
        up('rv-p-pplat',  v.pplat,  zPP.color);
        up('rv-p-vt',     v.vt,     zVT.color);
        up('rv-p-peep',   v.peep,   zPEEP.color);
        up('rv-p-comp',   v.comp,   zC.color);
        up('rv-p-res',    v.res,    zR.color);
        up('rv-p-dp',     dp,       zDP.color);
        up('rv-c-fio2',   v.fio2 + '%');
        up('rv-c-fr',     v.fr);
        up('rv-c-vt',     v.vt + ' mL');
        up('rv-c-pcabove',v.pcabove);
        up('rv-c-peep',   v.peep);

        const maxSev = [zPC,zPP,zVT,zPEEP,zDP].reduce((a,b)=>b.sev>a.sev?b:a).sev;
        const alEl = document.getElementById('rv-alarm-status');
        if (alEl) {
            alEl.textContent = maxSev>=3?'⚠️ ALARME':maxSev>=1?'⚠️ ATTENTION':'● OK';
            alEl.className   = 'rv-alarm'+(maxSev>=3?' crit':maxSev>=1?' warn':'');
        }
    }
    _rvLastTS = ts;
    _rvAnimId = requestAnimationFrame(rvAnimLoop);
}

function rvResetScopes() {
    Object.values(_rv_scope).forEach(s => { s.lastY = null; s.x = 0; });
    ['rv-canvas-paw','rv-canvas-flow','rv-canvas-vol'].forEach(id => {
        const c = document.getElementById(id); if (!c) return;
        const ctx = c.getContext('2d');
        const clrs = rvGetColors();
        ctx.fillStyle = clrs.bg; ctx.fillRect(0, 0, c.width, c.height);
    });
}

window.openNormesRespi = function openNormesRespi() {
    document.getElementById('normes-respi-view').style.display = 'flex';
    _rvSimTime = 0; _rvLastTS = null;
    if (_rvAnimId) { cancelAnimationFrame(_rvAnimId); _rvAnimId = null; }
    rvRenderScenarios();
    setRespiMode('PC');
    setTimeout(() => {
        rvResetScopes();
        _rvAnimId = requestAnimationFrame(rvAnimLoop);
    }, 80);
};

window.closeNormesRespi = function closeNormesRespi() {
    if (_rvAnimId) { cancelAnimationFrame(_rvAnimId); _rvAnimId = null; }
    _rvLastTS = null;
    document.getElementById('normes-respi-view').style.display = 'none';
};

function rvRenderScenarios() {
    const bar = document.getElementById('rv-scenarios-bar'); if (!bar) return;
    bar.innerHTML = window.RV_SCENARIOS.map(sc => {
        const active = respiScenario === sc.id;
        return `<button class="rv-scene-btn${active?' active':''}"
        style="${active?`background:${sc.color}25;border-color:${sc.color};color:${sc.color};`:''}"
        data-action="applyRvScenario:${sc.id}">${sc.label}</button>`;
    }).join('');
}

window.applyRvScenario = function applyRvScenario(id) {
    const sc = window.RV_SCENARIOS.find(s => s.id === id); if (!sc) return;
    respiScenario = id;
    Object.assign(respiValues, sc.v);
    _rvSimTime = 0;
    rvResetScopes();
    triggerHaptic();
    rvRenderScenarios();
};

window.setRespiMode = function setRespiMode(mode) {
    respiMode = mode;
    ['PC','VC','VSAI','VNI'].forEach(m => {
        const e = document.getElementById('rv-mode-'+m);
        if (e) e.className = 'rv-mode-pill'+(m===mode?' active':'');
    });
    const BADGE={PC:'PC-AC',VC:'VC-CMV',VSAI:'VS-AI',VNI:'VNI'};
    const BCOL ={PC:'rgba(59,130,246,0.2)',VC:'rgba(34,197,94,0.2)',VSAI:'rgba(251,191,36,0.2)',VNI:'rgba(168,85,247,0.2)'};
    const BTXT ={PC:'#38bdf8',VC:'#4ade80',VSAI:'#fbbf24',VNI:'#a78bfa'};
    const badge = document.getElementById('rv-mode-badge');
    if (badge) { badge.textContent=BADGE[mode]||mode; badge.style.background=BCOL[mode]||''; badge.style.color=BTXT[mode]||''; }
    const CH={PC:['PAW  cmH₂O','DÉBIT  L/min','VOLUME  mL'],VC:['PAW  cmH₂O','DÉBIT  L/min','VOLUME  mL'],VSAI:['PAW  cmH₂O','DÉBIT  L/min','VOLUME  mL'],VNI:['IPAP/EPAP  cmH₂O','DÉBIT+FUITE  L/min','VT ESTIMÉ  mL']};
    const lbs = CH[mode]||CH.PC;
    ['rv-ch-paw','rv-ch-flow','rv-ch-vol'].forEach((id,i)=>{ const e=document.getElementById(id); if(e) e.textContent=lbs[i]; });
    const ctrlVT = document.getElementById('ctrl-vt');
    const ctrlPC = document.getElementById('ctrl-pcabove');
    if (ctrlVT) ctrlVT.className='rv-ctrl-btn'+(mode==='PC'||mode==='VSAI'||mode==='VNI'?' locked':'');
    if (ctrlPC) ctrlPC.className='rv-ctrl-btn'+(mode==='VC'?' locked':'');
    rvResetScopes();
    triggerHaptic();
};

function rvGetAnalysis(p, cur) {
    const v=respiValues, dp=rvDP(), mlkg=rvMlKg();
    const a={
        vt:      c=>c<280?`🚨 Trop bas (${c} mL = ${mlkg} mL/kg). Risque atélectasie.`:c<420?`🔵 Protecteur SDRA (${c} mL = ${mlkg} mL/kg). ΔP ≤14 cmH₂O.`:c<560?`✅ Normal (${c} mL = ${mlkg} mL/kg).`:c<700?`⚠️ Élevé (${c} mL). Vérifier Pplat < 30.`:`🚨 Volutraumatisme (${c} mL = ${mlkg} mL/kg). Réduire immédiatement.`,
        peep:    c=>c<4?`🔴 Insuffisante (${c} cmH₂O). Dérecrutement alvéolaire.`:c<8?`✅ Standard (${c} cmH₂O).`:c<12?`🔵 Modérée (${c} cmH₂O). Surveiller PAM.`:c<18?`⚠️ Élevée (${c} cmH₂O). SDRA — monitoring PA invasif.`:`🚨 Très élevée (${c} cmH₂O). Choc possible.`,
        fio2:    c=>c<=40?`✅ FiO₂ optimale (${c}%). Maintenir la plus basse possible.`:c<=60?`🔵 Modérée (${c}%). Calculer P/F sur GDS.`:c<=80?`⚠️ Élevée (${c}%). Toxicité > 48h.`:`🚨 FiO₂ > 80% (${c}%). Réduire dès que possible.`,
        fr:      c=>{ const vm=rvVMin(); return c<8?`🔵 Très basse (${c}/min). Hypercapnie permissive. VMin ${vm} L/min.`:c<=22?`✅ Normale (${c}/min). VMin ${vm} L/min.`:c<=30?`⚠️ Élevée (${c}/min). Risque auto-PEEP.`:`🚨 Très élevée (${c}/min). Piège à air.`; },
        pcabove: c=>c<10?`🔵 Basse (${c} cmH₂O). Vérifier VT résultant.`:c<18?`✅ Standard (${c} cmH₂O). Pplat ≈ ${v.peep+c} cmH₂O.`:c<25?`⚠️ Élevée (${c} cmH₂O). Compliance réduite ?`:`🚨 Très élevée (${c} cmH₂O). Barotraumatisme.`,
        comp:    c=>c<20?`🔴 Très réduite (${c} mL/cmH₂O). SDRA sévère. VT 4-6 mL/kg.`:c<35?`🟠 Réduite (${c}). Atélectasie ? OAP ?`:c<55?`🟡 Modérée (${c}).`:c<80?`✅ Normale (${c} mL/cmH₂O). τ=${(v.res*c/1000).toFixed(2)}s.`:`🔵 Élevée (${c}). Emphysème ? Hyperinflation.`,
        res:     c=>c<10?`✅ Normale (${c} cmH₂O/L/s). Voies aériennes libres.`:c<20?`🟡 Légèrement élevée (${c}). Aspiration trachéale.`:c<35?`🟠 Élevée (${c}). BPCO — bronchodilatateurs.`:`🔴 Très élevée (${c}). Asthme aigu. Nébulisation urgente.`,
        poids:   c=>`ℹ️ PP = ${c} kg → VT protecteur 6 mL/kg = ${Math.round(c*6)} mL. Actuel : ${v.vt} mL (${(v.vt/c).toFixed(1)} mL/kg).`,
    };
    return a[p] ? a[p](cur) : `${p} = ${cur}`;
}

window.openRvModal = function openRvModal(p) {
    const cfg = window.RV_CFG[p]; if (!cfg) return;
    if (p==='vt'&&(respiMode==='PC'||respiMode==='VSAI'||respiMode==='VNI'))
        return alert('En mode '+respiMode+', le VT est calculé.\nModifiez PC▲, Compliance ou Résistance.');
    if (p==='pcabove'&&respiMode==='VC')
        return alert('En mode VC, la pression est calculée.\nModifiez VT, Compliance ou Résistance.');
    if (cfg.readonly) return;
    _rvModalParam = p;
    const cur = respiValues[p] ?? 0;
    const zones = window.RV_ZONES[p]||[];
    const az = rvGetZone(p, cur);
    const el = id => document.getElementById(id);
    el('rv-modal-title').textContent  = cfg.label;
    el('rv-modal-value').textContent  = cur;
    el('rv-modal-value').style.color  = az.color;
    el('rv-modal-unit').textContent   = cfg.unit||'';
    el('rv-modal-slider').min         = cfg.min;
    el('rv-modal-slider').max         = cfg.max;
    el('rv-modal-slider').step        = cfg.step;
    el('rv-modal-slider').value       = cur;
    el('rv-modal-minmax').innerHTML   = `<span>${cfg.min} ${cfg.unit}</span><span>${cfg.max} ${cfg.unit}</span>`;
    el('rv-modal-bar').innerHTML      = zones.length ? window.normesZoneBarHTML(cur,cfg.min,cfg.max,zones,cfg.unit) : '';
    el('rv-modal-zone').textContent   = `${az.sev>=3?'🔴':az.sev>=1?'🟡':'🟢'} ${az.label}`;
    el('rv-modal-zone').style.background = az.color+'25';
    el('rv-modal-zone').style.color   = az.color;
    el('rv-modal-ana').textContent    = rvGetAnalysis(p, cur);
    document.getElementById('rv-param-modal').classList.add('show');
    triggerHaptic();
};

window.closeRvModal = function closeRvModal() {
    document.getElementById('rv-param-modal').classList.remove('show');
    _rvModalParam = null;
};

window.rvModalSlide = function rvModalSlide(v) {
    if (!_rvModalParam) return;
    const val = parseFloat(v);
    respiValues[_rvModalParam] = val;
    respiScenario = '';
    const az = rvGetZone(_rvModalParam, val);
    const el = id=>document.getElementById(id);
    el('rv-modal-value').textContent = val;
    el('rv-modal-value').style.color = az.color;
    el('rv-modal-zone').textContent  = `${az.sev>=3?'🔴':az.sev>=1?'🟡':'🟢'} ${az.label}`;
    el('rv-modal-zone').style.background = az.color+'25';
    el('rv-modal-zone').style.color  = az.color;
    const zones = window.RV_ZONES[_rvModalParam]||[], cfg = window.RV_CFG[_rvModalParam];
    if (zones.length&&cfg) el('rv-modal-bar').innerHTML = window.normesZoneBarHTML(val,cfg.min,cfg.max,zones,cfg.unit||'');
    el('rv-modal-ana').textContent = rvGetAnalysis(_rvModalParam, val);
    triggerHaptic();
    rvRenderScenarios();
};

window.startRvRepeat = function startRvRepeat(dir) {
    if (!_rvModalParam) return;
    const cfg=window.RV_CFG[_rvModalParam]; if(!cfg||cfg.readonly) return;
    const move=()=>{ const nv=Math.min(cfg.max,Math.max(cfg.min,respiValues[_rvModalParam]+dir*cfg.step)); respiValues[_rvModalParam]=nv; document.getElementById('rv-modal-slider').value=nv; window.rvModalSlide(nv); };
    move(); _rvRepeatTimer=setInterval(move,100);
};

window.stopRvRepeat = function stopRvRepeat() {
    clearInterval(_rvRepeatTimer); _rvRepeatTimer=null;
};
