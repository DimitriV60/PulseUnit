/**
 * Procedures handlers — Checklists procédures (KTC, Intubation) + Table de dilution.
 * Pas de persistance : chaque ouverture repart d'une feuille vierge.
 * Expose sur window : openProcedures, closeProcedures, setProcTab, resetProcChecklist,
 *   toggleProcItem, filterDilutions.
 */

const PROC_CHECKLISTS = {
  ktc: {
    title: 'Pose de KTC',
    subtitle: 'Voie centrale 3 lumières — 20 cm',
    items: [
      'KTC 20 cm 3 voies',
      'Casaque stérile',
      'Gants stériles',
      'Charlottes ×2 (opérateur + aide)',
      'Champs stériles',
      'Compresses stériles',
      'Seringue 10 ml',
      'Bistouri',
      'Ciseau',
      'Fil à suture',
      'Pince à suture',
      '3 valves anti-retour',
      'Pansement stérile transparent',
      'Capote écho (sonde échographe)',
      'Chlorhexidine alcoolique',
      'Boîte à aiguilles'
    ]
  },
  intubation: {
    title: 'Intubation oro-trachéale',
    subtitle: 'Matériel à préparer avant l\'induction',
    items: [
      'Laryngoscope',
      'Lame Mac jetable taille 3 et taille 4',
      'Sonde IOT : 6 / 7 / 7,5 / 8',
      'BAVU',
      'Respirateur + humidificateur',
      'Système clos',
      'Circuit respiratoire',
      'Système d\'aspiration',
      'Sonde d\'aspiration rouge',
      'Seringue 10 ml (gonfler le ballonnet)',
      'Cordon de fixation',
      'Sonde capno + module capnographie',
      'Stéthoscope',
      'Mandrin d\'Eschmann',
      'Boîte intubation difficile'
    ]
  }
};

const DILUTIONS_DATA = [
  { med: 'Adrénaline',       pres: '5 mg / 5 ml',   dil: '2 amp = 10 ml (sans dilution)',        conc: '1 mg/ml',    indic: 'Arrêt cardiaque',              voie: 'IVD',     froid: false },
  { med: 'Atracurium',       pres: '50 mg / 5 ml',  dil: '2 amp = 10 ml (sans dilution)',        conc: '10 mg/ml',   indic: 'Curare — induction',           voie: 'IVD',     froid: true  },
  { med: 'Atropine',         pres: '0,5 mg / 1 ml', dil: '1 amp = 1 ml (sans dilution)',         conc: '0,5 mg/ml',  indic: 'Bradycardie mal tolérée',      voie: 'IVD',     froid: false },
  { med: 'Amiodarone',       pres: '150 mg / 3 ml', dil: '2 amp + 14 ml G5% = 20 ml',           conc: '15 mg/ml',   indic: 'Troubles rythmiques auriculaires — V40 en 30 min, à l\'abri de la lumière', voie: 'PSE/IVL', froid: false },
  { med: 'Célocurine',       pres: '100 mg / 2 ml', dil: '1 amp + 8 ml NaCl = 10 ml',           conc: '10 mg/ml',   indic: 'Curare — induction',           voie: 'IVD',     froid: true  },
  { med: 'Dobutamine',       pres: '250 mg / 20 ml',dil: '1 flacon + 30 ml G5% = 50 ml',        conc: '5 mg/ml',    indic: 'Choc cardiogénique — réf. protocole GHPSO', voie: 'PSE', froid: false },
  { med: 'Éphédrine',        pres: '30 mg / 1 ml',  dil: '1 amp + 9 ml NaCl = 10 ml',           conc: '3 mg/ml',    indic: 'Hypotension',                  voie: 'IVD',     froid: false },
  { med: 'Etomidate',        pres: '—',             dil: 'Prêt à l\'emploi',                     conc: '2 mg/ml',    indic: 'Induction rapide',             voie: 'IVD',     froid: false },
  { med: 'Flumazénil',       pres: '—',             dil: 'Prêt à l\'emploi',                     conc: '0,1 mg/ml',  indic: 'Antagoniste BZD',              voie: 'IVD',     froid: false },
  { med: 'Furosémide',       pres: '—',             dil: 'Prêt à l\'emploi',                     conc: '0,1 mg/ml',  indic: 'Diurétique urgence',           voie: 'IVD',     froid: false },
  { med: 'Méthylprednisolone',pres: '—',            dil: 'Prêt à l\'emploi',                     conc: '24 mg/ml',   indic: 'Anti-inflammatoire',           voie: 'IVD',     froid: false },
  { med: 'Midazolam',        pres: '—',             dil: 'Prêt à l\'emploi',                     conc: '1 mg/ml',    indic: 'Sédation / anxiolyse',         voie: 'IVD/PSE', froid: false },
  { med: 'Naloxone',         pres: '—',             dil: 'Prêt à l\'emploi',                     conc: '0,04 mg/ml', indic: 'Antagoniste opioïdes',         voie: 'IVD',     froid: false },
  { med: 'Noradrénaline',    pres: '—',             dil: 'Voie dédiée seule',                     conc: '1 mg/ml',    indic: 'Choc septique — ⚠️ voie seule', voie: 'PSE',     froid: false },
  { med: 'Propofol',         pres: '—',             dil: 'Prêt à l\'emploi',                     conc: '1 mg/ml',    indic: 'Sédation / induction',         voie: 'IVD/PSE', froid: false }
];

let _procTab = 'ktc';
let _procChecked = { ktc: {}, intubation: {} };
const PROC_TABS = ['ktc', 'intubation', 'dilution', 'eer'];

window.openProcedures = function openProcedures() {
    document.getElementById('procedures-view').style.display = 'flex';
    _procChecked = { ktc: {}, intubation: {} };
    document.getElementById('proc-search').value = '';
    renderProcTab();
};

window.closeProcedures = function closeProcedures() {
    document.getElementById('procedures-view').style.display = 'none';
};

window.setProcTab = function setProcTab(tab) {
    _procTab = tab;
    renderProcTab();
};

window.toggleProcItem = function toggleProcItem(key, idx) {
    _procChecked[key] = _procChecked[key] || {};
    _procChecked[key][idx] = !_procChecked[key][idx];
    renderProcTab();
};

window.resetProcChecklist = function resetProcChecklist() {
    _procChecked[_procTab] = {};
    renderProcTab();
};

window.filterDilutions = function filterDilutions() {
    renderProcTab();
};

function renderProcTab() {
    PROC_TABS.forEach(t => {
        const btn = document.getElementById('proc-tab-' + t);
        if (btn) btn.style.background = t === _procTab ? 'var(--brand-aqua)' : 'var(--surface-sec)';
        if (btn) btn.style.color = t === _procTab ? '#fff' : 'var(--text-muted)';
    });

    const resetBtn = document.getElementById('proc-reset-btn');
    if (resetBtn) resetBtn.style.display = (_procTab === 'ktc' || _procTab === 'intubation') ? 'flex' : 'none';

    const searchInput = document.getElementById('proc-search');
    if (searchInput) searchInput.style.display = _procTab === 'dilution' ? 'block' : 'none';

    const content = document.getElementById('procedures-content');
    if (_procTab === 'dilution') {
        content.innerHTML = renderDilutionTable();
    } else if (_procTab === 'eer') {
        content.innerHTML = renderEERView();
    } else {
        content.innerHTML = renderChecklist(_procTab);
    }
}

function renderChecklist(key) {
    const cl = PROC_CHECKLISTS[key];
    const checked = _procChecked[key] || {};
    const done = Object.values(checked).filter(Boolean).length;
    const total = cl.items.length;
    const pct = Math.round((done / total) * 100);

    let html = `
      <div style="padding:0 16px 8px; flex-shrink:0;">
        <div style="font-size:0.85rem; font-weight:900; color:var(--text-muted); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">${cl.subtitle}</div>
        <div style="height:6px; background:var(--border); border-radius:3px; overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:${pct === 100 ? 'var(--ide)' : 'var(--brand-aqua)'}; border-radius:3px; transition:width 0.3s;"></div>
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; font-weight:700;">${done} / ${total} ${pct === 100 ? '✅' : ''}</div>
      </div>
      <div style="flex:1; overflow-y:auto; padding:0 16px 40px;">`;

    cl.items.forEach((item, idx) => {
        const isChecked = !!checked[idx];
        html += `
        <div onclick="toggleProcItem('${key}', ${idx})"
             style="display:flex; align-items:center; gap:12px; padding:13px 0; border-bottom:1px solid var(--border); cursor:pointer; user-select:none;">
          <div style="flex-shrink:0; width:22px; height:22px; border-radius:6px; border:2px solid ${isChecked ? 'var(--ide)' : 'var(--border)'}; background:${isChecked ? 'var(--ide)' : 'transparent'}; display:flex; align-items:center; justify-content:center; transition:all 0.15s;">
            ${isChecked ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
          </div>
          <span style="font-size:0.9rem; font-weight:${isChecked ? '700' : '800'}; color:${isChecked ? 'var(--text-muted)' : 'var(--text)'}; text-decoration:${isChecked ? 'line-through' : 'none'}; transition:all 0.15s;">${escapeHTML(item)}</span>
        </div>`;
    });

    html += `</div>`;
    return html;
}

function renderEERView() {
    return `
    <div style="flex:1; overflow-y:auto; padding:0 16px 40px;">

      <!-- Calculateur poids -->
      <div style="margin-bottom:16px;">
        <div style="font-size:0.75rem; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Paramètres initiaux</div>
        <div style="display:flex; gap:10px; align-items:center;">
          <input type="number" id="eer-poids-input" min="40" max="200" placeholder="Poids (kg)"
            style="flex:1; padding:10px 14px; border-radius:10px; border:1px solid var(--border); background:var(--surface); color:var(--text); font-size:1rem; font-weight:900; font-family:var(--font); outline:none;"
            oninput="calcEER()">
          <span style="font-size:0.85rem; color:var(--text-muted); font-weight:700; white-space:nowrap;">kg</span>
        </div>
        <div id="eer-result"></div>
        <div style="margin-top:8px; font-size:0.72rem; color:var(--text-muted); font-weight:700; padding:6px 10px; background:var(--surface-sec); border-radius:6px; border:1px solid var(--border);">
          ⚠️ Débit sang 150 ml/min = constante — NE PAS MODIFIER
        </div>
      </div>

      <!-- Surveillance CA ionisé -->
      <div style="margin-bottom:12px;">
        <div style="font-size:0.75rem; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Ajustements — noter chaque changement</div>
        <div style="font-size:0.72rem; color:var(--text-muted); font-weight:700; margin-bottom:8px; padding:6px 10px; background:rgba(239,68,68,0.07); border-radius:6px; border:1px solid rgba(239,68,68,0.2);">
          ⚠️ 3 changements consécutifs → appeler le médecin
        </div>

        <div style="font-size:0.78rem; font-weight:900; color:var(--text); margin-bottom:6px;">CA ionisé patient (cible 1,0 – 1,2 mmol/L)</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px;">
          <button onclick="eerCaChange('patient','low')" style="padding:10px; border-radius:8px; border:1px solid var(--crit); background:rgba(239,68,68,0.08); color:var(--crit); font-size:0.78rem; font-weight:900; font-family:var(--font); cursor:pointer; line-height:1.3;">< 1,0<br>⬆️ +10% Ca²⁺</button>
          <button onclick="eerCaChange('patient','high')" style="padding:10px; border-radius:8px; border:1px solid var(--med); background:rgba(245,158,11,0.08); color:var(--med); font-size:0.78rem; font-weight:900; font-family:var(--font); cursor:pointer; line-height:1.3;">> 1,2<br>⬇️ -10% Ca²⁺</button>
        </div>

        <div style="font-size:0.78rem; font-weight:900; color:var(--text); margin-bottom:6px;">CA ionisé post-filtre (cible 0,25 – 0,35 mmol/L)</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px;">
          <button onclick="eerCaChange('filtre','low')" style="padding:10px; border-radius:8px; border:1px solid var(--med); background:rgba(245,158,11,0.08); color:var(--med); font-size:0.78rem; font-weight:900; font-family:var(--font); cursor:pointer; line-height:1.3;">< 0,25<br>⬇️ Citrate −0,5</button>
          <button onclick="eerCaChange('filtre','high')" style="padding:10px; border-radius:8px; border:1px solid var(--crit); background:rgba(239,68,68,0.08); color:var(--crit); font-size:0.78rem; font-weight:900; font-family:var(--font); cursor:pointer; line-height:1.3;">> 0,35<br>⬆️ Citrate +0,5</button>
        </div>

        <div id="eer-alerts" style="margin-top:4px;"></div>
      </div>

      <!-- Rappel surveillance -->
      <div style="padding:10px 12px; background:var(--surface-sec); border-radius:8px; border:1px solid var(--border); font-size:0.72rem; color:var(--text-muted); font-weight:700; line-height:1.6;">
        <div style="color:var(--text); font-weight:900; margin-bottom:4px;">🕐 Prélèvements CA ionisé</div>
        • 60 min après initiation de l'EERC<br>
        • Toutes les 4–6h si stable<br>
        • 1h après modification citrate ou Ca²⁺<br>
        <span style="color:var(--crit);">⚠️ Prélever 45 min après changement poche citrate / seringue Ca²⁺ / arrêt pompe</span>
      </div>
    </div>`;
}

function renderDilutionTable() {
    const q = (document.getElementById('proc-search')?.value || '').toLowerCase().trim();
    const rows = DILUTIONS_DATA.filter(d =>
        !q || d.med.toLowerCase().includes(q) || d.indic.toLowerCase().includes(q)
    );

    let html = `<div style="flex:1; overflow-y:auto; padding:0 0 40px;">`;

    if (rows.length === 0) {
        html += `<div style="padding:40px 20px; text-align:center; color:var(--text-muted); font-size:0.9rem; font-weight:700;">Aucun résultat</div>`;
    } else {
        rows.forEach(d => {
            html += `
            <div style="padding:13px 16px; border-bottom:1px solid var(--border);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:5px;">
                <span style="font-size:0.95rem; font-weight:900; color:var(--text);">${escapeHTML(d.med)}${d.froid ? ' <span title="Conserver au réfrigérateur" style="font-size:0.75rem;">🧊</span>' : ''}</span>
                <span style="font-size:0.85rem; font-weight:900; color:var(--crit); white-space:nowrap; flex-shrink:0; background:rgba(239,68,68,0.1); padding:2px 8px; border-radius:6px;">${escapeHTML(d.conc)}</span>
              </div>
              ${d.pres !== '—' ? `<div style="font-size:0.75rem; color:var(--text-muted); font-weight:700; margin-bottom:3px;">📦 ${escapeHTML(d.pres)}</div>` : ''}
              ${d.dil !== 'Prêt à l\'emploi' ? `<div style="font-size:0.75rem; color:var(--brand-aqua); font-weight:700; margin-bottom:3px;">⚗️ ${escapeHTML(d.dil)}</div>` : `<div style="font-size:0.75rem; color:var(--ide); font-weight:700; margin-bottom:3px;">✓ Prêt à l'emploi</div>`}
              <div style="display:flex; gap:8px; margin-top:5px; align-items:center;">
                <span style="font-size:0.72rem; font-weight:900; background:var(--surface-sec); padding:2px 7px; border-radius:5px; color:var(--text-muted); border:1px solid var(--border);">${escapeHTML(d.voie)}</span>
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">${escapeHTML(d.indic)}</span>
              </div>
            </div>`;
        });
    }

    html += `</div>`;
    return html;
}
