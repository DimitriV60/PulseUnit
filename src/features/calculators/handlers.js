/**
 * Calculateurs handlers — Outils de calcul médical et administratif.
 * Expose les fonctions sur window pour compatibilité onclick inline.
 * Dépend de window.CALCULATORS_DATA (src/features/calculators/data.js).
 */

// ============ PRESETS PSE — DROGUES COURANTES DE RÉANIMATION ============
// Sources : Vidal, SmPC, recommandations SFAR. Plages indicatives en réanimation
// adulte. Les seuils "critique" déclenchent une alerte rouge ; "max" un avertissement.
const PSE_DRUG_PRESETS = {
    noradrenaline: {
        name: 'Noradrénaline', defaultUnit: 'ugkgmin', defaultConc: 0.16,
        concNote: '0.16 mg/mL (8 mg dans 50 mL G5%)',
        unit: 'µg/kg/min', min: 0.05, usual: 2, critical: 3,
        notes: 'Vasopresseur. Voie centrale impérative au-delà de 0,1 µg/kg/min.'
    },
    adrenaline: {
        name: 'Adrénaline', defaultUnit: 'ugkgmin', defaultConc: 0.1,
        concNote: '0.1 mg/mL (5 mg dans 50 mL G5%)',
        unit: 'µg/kg/min', min: 0.05, usual: 1, critical: 2,
        notes: 'Choc anaphylactique / arrêt cardiaque. Surveillance ECG continue.'
    },
    dobutamine: {
        name: 'Dobutamine', defaultUnit: 'ugkgmin', defaultConc: 5,
        concNote: '5 mg/mL (250 mg dans 50 mL G5%)',
        unit: 'µg/kg/min', min: 2, usual: 20, critical: 30,
        notes: 'Inotrope. Risque arythmogène à fortes doses.'
    },
    propofol: {
        name: 'Propofol', defaultUnit: 'mgkgh', defaultConc: 10,
        concNote: '10 mg/mL (Diprivan 1% pur)',
        unit: 'mg/kg/h', min: 1, usual: 4, critical: 5,
        notes: 'Sédation. Au-delà de 4 mg/kg/h prolongé : risque de PRIS (acidose lactique, rhabdomyolyse).'
    },
    midazolam: {
        name: 'Midazolam', defaultUnit: 'mgkgh', defaultConc: 1,
        concNote: '1 mg/mL (50 mg dans 50 mL NaCl 0,9%)',
        unit: 'mg/kg/h', min: 0.03, usual: 0.2, critical: 0.4,
        notes: 'Sédation. Accumulation chez l\'insuffisant rénal/hépatique.'
    },
    sufentanil: {
        name: 'Sufentanil', defaultUnit: 'ugkgh', defaultConc: 0.005,
        concNote: '5 µg/mL (250 µg dans 50 mL NaCl 0,9%)',
        unit: 'µg/kg/h', min: 0.1, usual: 1, critical: 2,
        notes: 'Analgésie centrale. Dépression respiratoire majeure.'
    },
    remifentanil: {
        name: 'Rémifentanil', defaultUnit: 'ugkgmin', defaultConc: 0.05,
        concNote: '50 µg/mL (2,5 mg dans 50 mL NaCl 0,9%)',
        unit: 'µg/kg/min', min: 0.05, usual: 0.25, critical: 0.5,
        notes: 'Analgésie courte durée. Apnée immédiate à l\'arrêt.'
    },
    ketamine: {
        name: 'Kétamine', defaultUnit: 'mgkgh', defaultConc: 5,
        concNote: '5 mg/mL (250 mg dans 50 mL NaCl 0,9%)',
        unit: 'mg/kg/h', min: 0.5, usual: 2, critical: 4,
        notes: 'Sédation/analgésie. Effets dissociatifs, surveillance HD.'
    },
    furosemide: {
        name: 'Furosémide', defaultUnit: 'mgh', defaultConc: 10,
        concNote: '10 mg/mL (Lasilix pur)',
        unit: 'mg/h', min: 5, usual: 40, critical: 80,
        notes: 'Diurétique IV continu. Surveillance kaliémie + diurèse horaire.'
    },
    insuline: {
        name: 'Insuline', defaultUnit: 'uih', defaultConc: 1,
        concNote: '1 UI/mL (50 UI dans 50 mL NaCl 0,9%)',
        unit: 'UI/h', min: 0.5, usual: 10, critical: 20,
        notes: 'Surveillance dextro horaire. Risque hypoglycémie sévère.'
    }
};

window.applyPSEDrugPreset = function applyPSEDrugPreset() {
    const sel = document.getElementById('calc_pse_drug');
    if (!sel) return;
    const key = sel.value;
    const preset = PSE_DRUG_PRESETS[key];
    if (!preset) return;
    document.getElementById('calc_pse_unit').value = preset.defaultUnit;
    document.getElementById('calc_pse_conc').value = preset.defaultConc;
    if (typeof showToast === 'function') {
        showToast(`💊 ${preset.name} — ${preset.concNote}`);
    }
};

// Convertit une dose dans l'unité native du préset (pour la comparer aux seuils)
function _normalizeDoseToPresetUnit(dose, unit, poids, presetUnit) {
    // Convertir d'abord en µg/kg/min (référence universelle), puis dans l'unité du preset
    let ugkgmin = null;
    const w = poids > 0 ? poids : null;
    if (unit === 'ugkgmin') ugkgmin = dose;
    else if (unit === 'ugkgh') ugkgmin = dose / 60;
    else if (unit === 'mgkgh') ugkgmin = (dose * 1000) / 60;
    else if (unit === 'mgh' && w) ugkgmin = (dose * 1000) / 60 / w;
    else if (unit === 'ugh' && w) ugkgmin = dose / 60 / w;
    else if (unit === 'uih') return { val: dose, unit: 'UI/h' }; // insuline : pas de conversion
    if (ugkgmin === null) return null;
    if (presetUnit === 'µg/kg/min') return { val: ugkgmin, unit: presetUnit };
    if (presetUnit === 'µg/kg/h')   return { val: ugkgmin * 60, unit: presetUnit };
    if (presetUnit === 'mg/kg/h')   return { val: (ugkgmin * 60) / 1000, unit: presetUnit };
    if (presetUnit === 'mg/h' && w) return { val: (ugkgmin * 60 * w) / 1000, unit: presetUnit };
    return null;
}

window.evaluatePSEDose = function evaluatePSEDose(drugKey, dose, unit, poids) {
    if (!drugKey) return null;
    const p = PSE_DRUG_PRESETS[drugKey];
    if (!p) return null;
    const norm = _normalizeDoseToPresetUnit(dose, unit, poids, p.unit);
    if (!norm) return {
        html: `<span style="color:var(--text-muted);">Préset <strong>${escapeHTML(p.name)}</strong> — Saisis le poids pour vérifier la plage usuelle.</span>`
    };
    const v = norm.val;
    const fmt = v < 0.1 ? v.toFixed(3) : v < 1 ? v.toFixed(2) : v.toFixed(1);
    let level, color, icon, label;
    if (v >= p.critical) {
        level = 'critical'; color = 'var(--crit)'; icon = '🚨';
        label = `OVERDOSE — ${fmt} ${p.unit} ≥ ${p.critical} ${p.unit} (seuil critique)`;
    } else if (v > p.usual) {
        level = 'high'; color = 'var(--med)'; icon = '⚠️';
        label = `HORS PLAGE USUELLE — ${fmt} ${p.unit} > ${p.usual} ${p.unit} (vérifier prescription)`;
    } else if (v < p.min) {
        level = 'low'; color = 'var(--med)'; icon = '⚠️';
        label = `Dose faible — ${fmt} ${p.unit} < ${p.min} ${p.unit} (sous le seuil minimal usuel)`;
    } else {
        level = 'ok'; color = 'var(--ok)'; icon = '✅';
        label = `Plage usuelle OK — ${fmt} ${p.unit} (entre ${p.min} et ${p.usual})`;
    }
    return {
        level,
        html: `
          <div style="padding:8px 10px; border-radius:8px; background:${level === 'critical' ? 'rgba(239,68,68,0.12)' : 'var(--surface-sec)'}; border-left:3px solid ${color};">
            <div style="color:${color}; font-weight:900; font-size:0.82rem;">${icon} ${label}</div>
            <div style="color:var(--text-muted); font-size:0.72rem; font-weight:700; margin-top:4px;">${escapeHTML(p.notes)}</div>
          </div>`
    };
};

window.openCalculateurs = function openCalculateurs() {
    document.getElementById('calculateurs-view').style.display = 'flex';
    renderCalculateurs();
};

window.closeCalculateurs = function closeCalculateurs() {
    document.getElementById('calculateurs-view').style.display = 'none';
};

function renderCalculateurs() {
    const grid = document.getElementById('calc-grid');
    const CALC_GROUPS = [
        {label:"SCORES CLINIQUES", ids:["glasgow", "rass", "waterlow", "sevrage"], color:"var(--crit)"},
        {label:"VENTILATION", ids:["ibw", "pf", "dp"], color:"var(--ide)"},
        {label:"HÉMODYNAMIQUE", ids:["pam", "pse"], color:"var(--med)"},
        {label:"MÉDICAMENTS", ids:["dosekg", "convmgml", "diurese", "imc"], color:"var(--as)"},
        {label:"RH / ADMIN", ids:["pct", "transmission"], color:"var(--text-muted)"},
        {label:"NUTRITION", ids:["calorique"], color:"var(--as)"},
    ];

    const CALCULATORS_DATA = window.CALCULATORS_DATA;
    const escapeHTML = window.escapeHTML;

    const parts = [];
    CALC_GROUPS.forEach(group => {
        parts.push(`<div style="grid-column:1/-1; font-size:0.65rem; font-weight:900; color:${group.color}; text-transform:uppercase; letter-spacing:1.5px; padding:4px 0 2px; border-bottom:1px solid var(--border); margin-bottom:2px;">${escapeHTML(group.label)}</div>`);
        group.ids.forEach(id => {
            const calc = CALCULATORS_DATA.find(c => c.id === id);
            if(!calc) return;
            parts.push(`
            <div class="calc-tile" data-action="openCalcModal:${escapeHTML(calc.id)}">
                <div class="calc-icon">${calc.icon}</div>
                <div class="calc-name">${escapeHTML(calc.title)}</div>
            </div>`);
        });
    });

    // Groupe EER
    parts.push(`<div style="grid-column:1/-1; font-size:0.65rem; font-weight:900; color:var(--brand-aqua); text-transform:uppercase; letter-spacing:1.5px; padding:4px 0 2px; border-bottom:1px solid var(--border); margin-bottom:2px;">EER / ANTICOAGULATION</div>`);
    parts.push(`
    <div class="calc-tile" data-action="openCalcModal:eer">
        <div class="calc-icon">🩸</div>
        <div class="calc-name">EER Citrate</div>
    </div>`);

    grid.innerHTML = parts.join('');
}

window.openCalcModal = function openCalcModal(id) {
    const calc = window.CALCULATORS_DATA.find(c => c.id === id);
    if(!calc) return;
    document.getElementById('calc-modal-title').innerHTML = `${calc.icon} ${calc.title}`;
    document.getElementById('calc-modal-body').innerHTML = calc.html;
    document.getElementById('calc-modal').style.display = 'flex';
};

window.closeCalcModal = function closeCalcModal() {
    document.getElementById('calc-modal').style.display = 'none';
};

window.calUpdateContexte = function calUpdateContexte() {
    const ctx = document.getElementById('cal_contexte')?.value;
    const isRea = ctx === 'rea';
    const lambdaRow = document.getElementById('cal_activite_row');
    const reaRow    = document.getElementById('cal_activite_rea_row');
    const stressRow = document.getElementById('cal_stress_row');
    if (lambdaRow) lambdaRow.style.display = isRea ? 'none' : '';
    if (reaRow)    reaRow.style.display    = isRea ? '' : 'none';
    if (stressRow) stressRow.style.display = isRea ? '' : 'none';
    const box = document.getElementById('res_cal_box');
    if (box) box.style.display = 'none';
};

window.execCalcLive = function execCalcLive(id) {
    execCalc(id);
};

window.execCalc = function execCalc(id) {
    if(id === 'glasgow') {
        const y = parseInt(document.getElementById('calc_gcs_y').value);
        const v = parseInt(document.getElementById('calc_gcs_v').value);
        const m = parseInt(document.getElementById('calc_gcs_m').value);
        if(isNaN(y) || isNaN(v) || isNaN(m)) return;
        const total = y + v + m;
        let sub = "", color = "";
        if(total >= 14)      { sub = "✅ Conscient — surveillance standard"; color = "var(--as)"; }
        else if(total >= 9)  { sub = "⚠️ Altération modérée de la conscience"; color = "var(--med)"; }
        else if(total >= 5)  { sub = "🟧 Altération sévère — évaluer intubation"; color = "var(--bmr)"; }
        else                 { sub = "🚨 GCS ≤ 4 — indication formelle d'intubation"; color = "var(--crit)"; }
        if(total <= 8) sub += " — GCS ≤ 8 = INTUBATION";
        document.getElementById('res_gcs_val').textContent = total + '/15';
        document.getElementById('res_gcs_val').style.color = color;
        document.getElementById('res_gcs_sub').innerHTML = sub;
        document.getElementById('res_gcs_detail').textContent = `Y${y} + V${v} + M${m} = ${total}`;
        document.getElementById('res_gcs_box').style.display = 'block';
    }
    else if(id === 'rass') {
        const score = parseInt(document.getElementById('calc_rass_score').value);
        if(isNaN(score)) return;
        const map = {
            4:  {t:"🔴 Combatif",           c:"var(--crit)",  s:"Danger immédiat pour l'équipe. Sédation urgente requise."},
            3:  {t:"🔴 Très agité",          c:"var(--crit)",  s:"Arrache cathéters/SIT. Sédation urgente. Appeler médecin."},
            2:  {t:"🟠 Agité",               c:"var(--bmr)",   s:"Mouvements fréquents, lutte contre respirateur. Réévaluer sédation."},
            1:  {t:"🟡 Anxieux",             c:"var(--med)",   s:"Anxieux sans mouvements agressifs. Évaluer cause."},
            0:  {t:"✅ Éveillé et calme",    c:"var(--as)",    s:"Score idéal en éveil. Cible habituelle du sevrage."},
            "-1":{t:"💤 Somnolent",           c:"var(--ide)",   s:"Répond à la voix > 10 sec. Dans la cible habituelle (-1 à 0)."},
            "-2":{t:"💤 Réveil bref",         c:"var(--ide)",   s:"Répond à la voix < 10 sec. Dans la cible habituelle."},
            "-3":{t:"😴 Mouvements à l'appel",c:"var(--med)",   s:"Mouvement ou ouverture des yeux sans contact visuel. Sédation légère."},
            "-4":{t:"😴 Sédation profonde",   c:"var(--med)",   s:"Réagit à la douleur seulement. Cible si curarisation."},
            "-5":{t:"⬛ Indéveillable",       c:"var(--text-muted)", s:"Aucune réaction. Sédation maximale. Vérifier les drogues."}
        };
        const k = String(score);
        const info = map[k] || map[score];
        if(!info) return;
        document.getElementById('res_rass_val').textContent = (score > 0 ? '+' : '') + score + ' — ' + info.t;
        document.getElementById('res_rass_val').style.color = info.c;
        document.getElementById('res_rass_sub').textContent = info.s;
        document.getElementById('res_rass_box').style.display = 'block';
    }
    else if(id === 'waterlow') {
        const fields = ['wl_corp','wl_peau','wl_sexage','wl_age','wl_cont','wl_mob','wl_nutri','wl_special'];
        let total = 0, allFilled = true;
        fields.forEach(f => {
            const el = document.getElementById(f);
            if(!el || el.value === '') { allFilled = false; return; }
            total += parseInt(el.value) || 0;
        });
        if(!allFilled) return;
        let sub = "", color = "";
        if(total < 10)       { sub = "✅ Pas de risque particulier"; color = "var(--as)"; }
        else if(total < 15)  { sub = "⚠️ À risque — matelas préventif recommandé"; color = "var(--med)"; }
        else if(total < 20)  { sub = "🟧 Haut risque — matelas haute performance + repositionnement /2H"; color = "var(--bmr)"; }
        else                 { sub = "🚨 Très haut risque — matelas haute performance + retournements stricts /2H"; color = "var(--crit)"; }
        document.getElementById('res_wl_val').textContent = total;
        document.getElementById('res_wl_val').style.color = color;
        document.getElementById('res_wl_sub').innerHTML = sub;
        document.getElementById('res_wl_box').style.display = 'block';
    }
    else if(id === 'sevrage') {
        const fields = ['sv_trem','sv_sueur','sv_agit','sv_hall','sv_conv'];
        let total = 0, allFilled = true;
        fields.forEach(f => {
            const el = document.getElementById(f);
            if(!el || el.value === '') { allFilled = false; return; }
            total += parseInt(el.value) || 0;
        });
        if(!allFilled) return;
        let sub = "", color = "";
        if(total <= 6)        { sub = "✅ Sevrage léger — surveillance clinique"; color = "var(--as)"; }
        else if(total <= 12)  { sub = "⚠️ Sevrage modéré — traitement médicamenteux (BZD). Réévaluer toutes les 4H."; color = "var(--med)"; }
        else if(total <= 18)  { sub = "🟧 Sevrage sévère — traitement intensif. Prévenir le médecin."; color = "var(--bmr)"; }
        else                  { sub = "🚨 Sevrage très sévère / Delirium tremens — prise en charge urgente. Réanimation."; color = "var(--crit)"; }
        document.getElementById('res_sv_val').textContent = total + ' / 20';
        document.getElementById('res_sv_val').style.color = color;
        document.getElementById('res_sv_sub').innerHTML = sub;
        document.getElementById('res_sv_box').style.display = 'block';
    }
    else if(id === 'ibw') {
        const sexe = document.getElementById('calc_ibw_sexe').value;
        const taille = parseFloat(document.getElementById('calc_ibw_taille').value);
        const obj = parseFloat(document.getElementById('calc_ibw_objectif').value);
        if(isNaN(taille) || isNaN(obj)) return;
        let ibw = 0;
        if(sexe === 'H') ibw = 50 + 0.91 * (taille - 152.4);
        else ibw = 45.5 + 0.91 * (taille - 152.4);
        const vt = Math.round(ibw * obj);
        const v6 = Math.round(ibw * 6);
        const v8 = Math.round(ibw * 8);
        document.getElementById('res_ibw_poids').textContent = ibw.toFixed(1) + ' kg';
        document.getElementById('res_ibw_vt').textContent = vt + ' mL';
        document.getElementById('res_ibw_sub').textContent = `Plage protectrice : ${v6} mL (6 mL/kg) → ${v8} mL (8 mL/kg).`;
        document.getElementById('res_ibw_box').style.display = 'block';
    }
    else if(id === 'pf') {
        const pao2 = parseFloat(document.getElementById('calc_pf_pao2').value);
        const fio2 = parseFloat(document.getElementById('calc_pf_fio2').value);
        if(isNaN(pao2) || isNaN(fio2) || fio2 === 0) return;
        const pf = Math.round(pao2 / (fio2 / 100));
        let sub = "", color = "";
        if(pf > 300)      { sub = "✅ Normal — Pas de SDRA"; color = "var(--as)"; }
        else if(pf > 200) { sub = "⚠️ SDRA Léger — surveillance renforcée"; color = "var(--med)"; }
        else if(pf > 100) { sub = "🟧 SDRA Modéré — mesures spécifiques"; color = "var(--bmr)"; }
        else              { sub = "🚨 SDRA Sévère — décubitus ventral, curarisation"; color = "var(--crit)"; }
        document.getElementById('res_pf_val').textContent = pf + ' mmHg';
        document.getElementById('res_pf_val').style.color = color;
        document.getElementById('res_pf_sub').innerHTML = sub;
        document.getElementById('res_pf_box').style.display = 'block';
    }
    else if(id === 'dp') {
        const pplat = parseFloat(document.getElementById('calc_dp_pplat').value);
        const peep = parseFloat(document.getElementById('calc_dp_peep').value);
        if(isNaN(pplat) || isNaN(peep)) return;
        const dp = pplat - peep;
        let sub = "", color = "";
        if(dp <= 14) { sub = "✅ Acceptable — à surveiller"; color = "var(--as)"; }
        else         { sub = "🚨 Élevée > 14 — risque de volutraumatisme. Réduire VT ou PEEP."; color = "var(--crit)"; }
        document.getElementById('res_dp_val').textContent = dp + ' cmH₂O';
        document.getElementById('res_dp_val').style.color = color;
        document.getElementById('res_dp_sub').innerHTML = sub;
        document.getElementById('res_dp_box').style.display = 'block';
    }
    else if(id === 'pam') {
        const pas = parseFloat(document.getElementById('calc_pam_pas').value);
        const pad = parseFloat(document.getElementById('calc_pam_pad').value);
        if(isNaN(pas) || isNaN(pad)) return;
        const pam = Math.round((pas + 2 * pad) / 3);
        let sub = "", color = "";
        if(pam >= 65) { sub = "✅ PAM dans les limites normales (≥ 65 mmHg)"; color = "var(--as)"; }
        else          { sub = "🚨 PAM basse (< 65) — risque d'hypoperfusion organique"; color = "var(--crit)"; }
        document.getElementById('res_pam_val').textContent = pam + ' mmHg';
        document.getElementById('res_pam_val').style.color = color;
        document.getElementById('res_pam_sub').innerHTML = sub;
        document.getElementById('res_pam_box').style.display = 'block';
    }
    else if(id === 'pse') {
        const dose = parseFloat(document.getElementById('calc_pse_dose').value);
        const unit = document.getElementById('calc_pse_unit').value;
        const poids = parseFloat(document.getElementById('calc_pse_poids').value);
        const conc = parseFloat(document.getElementById('calc_pse_conc').value);
        const drug = document.getElementById('calc_pse_drug')?.value || '';
        if(isNaN(dose) || isNaN(conc) || conc === 0) return;
        let debit = 0;
        if(unit === 'mgh')     debit = dose / conc;
        else if(unit === 'ugh') debit = (dose / 1000) / conc;
        else if(unit === 'uih') debit = dose / conc; // 1 UI/mL ≈ 1 mg/mL pour insuline diluée
        else if(unit === 'mgkgh')  { if(isNaN(poids)) return; debit = (dose * poids) / conc; }
        else if(unit === 'ugkgh')  { if(isNaN(poids)) return; debit = ((dose * poids) / 1000) / conc; }
        else if(unit === 'ugkgmin'){ if(isNaN(poids)) return; debit = ((dose * poids * 60) / 1000) / conc; }
        document.getElementById('res_pse_val').textContent = debit.toFixed(1) + ' mL/h';
        document.getElementById('res_pse_box').style.display = 'block';
        // Évaluation de sécurité si un médicament est sélectionné
        const safetyEl = document.getElementById('res_pse_safety');
        if (safetyEl) {
            const safety = window.evaluatePSEDose ? window.evaluatePSEDose(drug, dose, unit, poids) : null;
            if (safety) {
                safetyEl.style.display = 'block';
                safetyEl.innerHTML = safety.html;
            } else {
                safetyEl.style.display = 'none';
                safetyEl.innerHTML = '';
            }
        }
    }
    else if(id === 'dosekg') {
        const poids = parseFloat(document.getElementById('calc_dose_poids').value);
        const dose  = parseFloat(document.getElementById('calc_dose_val').value);
        const unit  = document.getElementById('calc_dose_unit').value;
        if(isNaN(poids) || isNaN(dose)) return;
        document.getElementById('res_dose_total').textContent = `${(poids * dose).toFixed(2)} ${unit}`;
        document.getElementById('res_dose_box').style.display = 'block';
    }
    else if(id === 'convmgml') {
        const qte  = parseFloat(document.getElementById('calc_conv_qte').value);
        const unit = document.getElementById('calc_conv_unit').value;
        const conc = parseFloat(document.getElementById('calc_conv_conc').value);
        if(isNaN(qte) || isNaN(conc) || conc === 0) return;
        const res = unit === 'mg' ? (qte / conc).toFixed(2) + ' mL' : (qte * conc).toFixed(2) + ' mg';
        document.getElementById('res_conv_res').textContent = res;
        document.getElementById('res_conv_box').style.display = 'block';
    }
    else if(id === 'diurese') {
        const poids = parseFloat(document.getElementById('calc_diu_poids').value);
        if(isNaN(poids)) return;
        document.getElementById('res_diu_val').textContent = `${Math.round(poids * 0.5)}–${Math.round(poids * 1)} mL/h`;
        document.getElementById('res_diu_box').style.display = 'block';
    }
    else if(id === 'imc') {
        const poids  = parseFloat(document.getElementById('calc_imc_poids').value);
        const taille = parseFloat(document.getElementById('calc_imc_taille').value);
        if(isNaN(poids) || isNaN(taille) || taille === 0) return;
        const imc = poids / Math.pow(taille / 100, 2);
        let sub = "", color = "var(--brand-aqua)";
        if(imc < 18.5)      { sub = "Dénutrition / Maigreur"; color = "var(--med)"; }
        else if(imc < 25)   { sub = "Corpulence normale"; color = "var(--as)"; }
        else if(imc < 30)   { sub = "Surpoids"; color = "var(--med)"; }
        else                { sub = "Obésité"; color = "var(--crit)"; }
        document.getElementById('res_imc_val').textContent = imc.toFixed(1) + ' kg/m²';
        document.getElementById('res_imc_val').style.color = color;
        document.getElementById('res_imc_sub').textContent = sub;
        document.getElementById('res_imc_box').style.display = 'block';
    }
    else if(id === 'pct') {
        const p = parseFloat(document.getElementById('calc_pct_p').value);
        const v = parseFloat(document.getElementById('calc_pct_v').value);
        if(isNaN(p) || isNaN(v)) return;
        document.getElementById('res_pct_val').textContent = ((p * v) / 100).toFixed(2);
        document.getElementById('res_pct_box').style.display = 'block';
    }
    else if(id === 'conges') {
        /* ============================================================
           Simulateur Congés Hors Saison & Fractionnement
           Source : Décret 2002-8 du 4 janvier 2002, Article 1
           HS : 1 jour si 3-5 CA pris hors saison, 2 jours si >= 6
           FRAC : 1 jour si >= 3 périodes de >= 5 jours ouvrés
        ============================================================ */
        const joursHS     = parseInt(document.getElementById('hs_jours')?.value) || 0;
        const exclusion   = document.getElementById('hs_exclusion')?.value || 'normal';
        const fracPer     = parseInt(document.getElementById('frac_periodes')?.value) || 0;

        let hsGagne = 0, hsSub = '', hsColor = 'var(--text-muted)';

        if (exclusion === 'bonifies') {
            hsGagne = 0; hsSub = '❌ Non éligible — Congés bonifiés (exclusion réglementaire).'; hsColor = 'var(--crit)';
        } else if (exclusion === 'ete' || exclusion === '31j') {
            hsGagne = 0; hsSub = '❌ Non éligible — CA pris en période estivale ou 31 jours consécutifs en été.'; hsColor = 'var(--crit)';
        } else if (joursHS >= 6) {
            hsGagne = 2; hsSub = '✅ ' + joursHS + ' jours hors saison → +2 jours (≥ 6 jours ouvrés hors saison).'; hsColor = 'var(--as)';
        } else if (joursHS >= 3) {
            hsGagne = 1; hsSub = '✅ ' + joursHS + ' jours hors saison → +1 jour (3 à 5 jours ouvrés hors saison).'; hsColor = 'var(--ide)';
        } else if (joursHS > 0) {
            hsGagne = 0; hsSub = '⚠️ ' + joursHS + ' jour(s) hors saison — minimum 3 jours ouvrés requis.'; hsColor = 'var(--med)';
        } else {
            hsSub = 'Renseignez le nombre de jours pris hors saison.';
        }

        let fracGagne = 0, fracSub = '', fracColor = 'var(--text-muted)';

        if (fracPer >= 2) {
            fracGagne = 1; fracSub = '✅ 3 périodes ou plus de ≥ 5 j ouvrés → +1 jour de fractionnement.'; fracColor = 'var(--as)';
        } else if (fracPer === 1) {
            fracGagne = 0; fracSub = '⚠️ 2 périodes — il en faut au moins 3 de ≥ 5 jours ouvrés chacune.'; fracColor = 'var(--med)';
        } else {
            fracSub = '❌ Moins de 3 périodes — non éligible au fractionnement.'; fracColor = 'var(--crit)';
        }

        const total = hsGagne + fracGagne;
        const jourWord = (n) => n <= 1 ? n + ' jour' : n + ' jours';

        document.getElementById('res_hs_val').textContent   = jourWord(hsGagne);
        document.getElementById('res_hs_val').style.color   = hsColor;
        document.getElementById('res_hs_sub').textContent   = hsSub;
        document.getElementById('res_frac_val').textContent = jourWord(fracGagne);
        document.getElementById('res_frac_val').style.color = fracColor;
        document.getElementById('res_frac_sub').textContent = fracSub;
        document.getElementById('res_conges_total').textContent = '+' + jourWord(total);
        document.getElementById('res_conges_base').textContent  = '25 CA + ' + total + ' = ' + (25 + total) + ' jours';
        document.getElementById('res_conges_box').style.display = 'flex';
    }
    else if(id === 'conges_ete') {
        /* ============================================================
           Calculateur Congés Été — Fonction Publique Hospitalière
           Source : Décret n° 2002-8 du 4 janvier 2002, art. 1
        ============================================================ */
        const quotite  = parseInt(document.getElementById('ete_quotite')?.value) || 100;
        const mois     = parseInt(document.getElementById('ete_mois')?.value) || 12;
        const deja     = parseInt(document.getElementById('ete_deja')?.value)  || 0;
        const joursEte = parseInt(document.getElementById('ete_ete')?.value)   || 0;
        const consec   = parseInt(document.getElementById('ete_consec')?.value)|| 0;

        const droitsBase = Math.ceil(25 * (quotite / 100) * (mois / 12));
        const soldeAvantEte = droitsBase - deja;
        const soldeApresEte = soldeAvantEte - joursEte;

        let rules = '';
        if (joursEte > 0) {
            if (consec >= 10 && consec <= 20)
                rules += '<span style="color:var(--as)">✅ Fraction principale : ' + consec + ' j consécutifs (règle 10–20 j respectée)</span><br>';
            else if (consec < 10 && consec > 0)
                rules += '<span style="color:var(--crit)">⚠️ Fraction principale : ' + consec + ' j consécutifs — minimum légal : 10 j (Décret 2002-8)</span><br>';
            else if (consec > 20)
                rules += '<span style="color:var(--crit)">❌ ' + consec + ' j consécutifs dépassent le maximum légal de 20 j — accord chef de service requis</span><br>';
            else
                rules += '<span style="color:var(--text-muted)">ℹ️ Renseignez le nombre de jours consécutifs pour vérifier la fraction principale.</span><br>';
        }
        if (soldeApresEte < 0)
            rules += '<span style="color:var(--crit)">❌ Solde insuffisant : il manque ' + Math.abs(soldeApresEte) + ' j</span><br>';
        else if (soldeApresEte > 0)
            rules += '<span style="color:var(--ide)">📅 Report possible : jusqu\'à ' + soldeApresEte + ' j avant le 31 mars N+1</span><br>';

        const joursHS = Math.max(0, soldeApresEte);
        let bonusTxt = '';
        if (joursHS >= 6)       bonusTxt = '🌿 Bonus hors saison potentiel : <strong>+2 j</strong> (≥ 6 j hors saison restants)';
        else if (joursHS >= 3)  bonusTxt = '🌿 Bonus hors saison potentiel : <strong>+1 j</strong> (3–5 j hors saison restants)';
        else if (joursHS > 0)   bonusTxt = '🌿 Hors saison : ' + joursHS + ' j restants — min 3 j ouvrés pour bonus';

        const j = n => n <= 1 ? n + ' jour' : n + ' jours';
        document.getElementById('res_ete_droits').textContent = 'Droits CA : ' + j(droitsBase) + (mois < 12 ? ' (proratisés sur ' + mois + ' mois)' : '');
        document.getElementById('res_ete_droits').style.color = 'var(--text)';
        document.getElementById('res_ete_solde').textContent  =
            'Posés hors été : ' + j(deja) + ' · Prévus en été : ' + j(joursEte) + ' · Solde : ' + j(Math.max(0, soldeApresEte));
        document.getElementById('res_ete_rules').innerHTML  = rules;
        document.getElementById('res_ete_bonus').innerHTML  = bonusTxt;
        document.getElementById('res_ete_box').style.display = 'flex';
    }
    else if(id === 'calorique') {
        const contexte = document.getElementById('cal_contexte')?.value || 'lambda';
        const sexe    = document.getElementById('cal_sexe').value;
        const age     = parseFloat(document.getElementById('cal_age').value);
        const poids   = parseFloat(document.getElementById('cal_poids').value);
        const taille  = parseFloat(document.getElementById('cal_taille').value);
        if (isNaN(age) || isNaN(poids) || isNaN(taille)) return;
        let mb = 0;
        if (sexe === 'H') mb = 88.362 + (13.397 * poids) + (4.799 * taille) - (5.677 * age);
        else              mb = 447.593 + (9.247 * poids) + (3.098 * taille) - (4.330 * age);
        let dej = 0, detail = '', warn = '';
        if (contexte === 'rea') {
            const activite = parseFloat(document.getElementById('cal_activite_rea').value);
            const stress   = parseFloat(document.getElementById('cal_stress').value);
            dej = Math.round(mb * activite * stress);
            const proteines = Math.round(poids * 1.3);
            const eau = Math.round(poids * 30);
            detail = `<span style="color:var(--text);">≈ <strong>${(dej/poids).toFixed(1)} kcal/kg/j</strong></span><br>` +
                     `Protéines : <strong style="color:var(--ide);">${proteines} g/j</strong> (1,3 g/kg/j)<br>` +
                     `Hydratation estimée : <strong style="color:var(--ide);">${eau} mL/j</strong> (30 mL/kg/j)`;
            if (poids > 100) warn = '⚠️ Obésité — envisager le poids idéal théorique (IBW).';
        } else {
            const activite = parseFloat(document.getElementById('cal_activite').value);
            dej = Math.round(mb * activite);
            const prot = Math.round(poids * 0.8);
            detail = `<span style="color:var(--text);">≈ <strong>${(dej/poids).toFixed(1)} kcal/kg/j</strong></span><br>` +
                     `Protéines recommandées : <strong style="color:var(--ide);">${prot}–${Math.round(poids*1.2)} g/j</strong> (0,8–1,2 g/kg/j)`;
        }
        document.getElementById('res_cal_mb').textContent = Math.round(mb) + ' kcal/j';
        document.getElementById('res_cal_dej').textContent = dej + ' kcal/j';
        document.getElementById('res_cal_detail').innerHTML = detail;
        document.getElementById('res_cal_warn').textContent = warn;
        document.getElementById('res_cal_box').style.display = 'flex';
    }
    else if(id === 'transmission') {
        const jours = parseFloat(document.getElementById('calc_tr_jours').value);
        if(isNaN(jours) || jours <= 0) return;
        const totalH = jours * 0.25;
        const heures = Math.floor(totalH);
        const minutes = Math.round((totalH - heures) * 60);
        const affH = heures > 0 ? (minutes > 0 ? `${heures}h ${minutes}min` : `${heures}h`) : `${minutes}min`;
        document.getElementById('res_tr_total').textContent = affH;
        document.getElementById('res_tr_sub').textContent = `0,25 × ${jours} jour${jours>1?'s':''} = ${totalH.toFixed(2)}h`;
        document.getElementById('res_tr_box').style.display = 'block';
    }
};
