/**
 * Procedures handlers — Checklists (KTA, KTC, Intubation) + Dilutions.
 * Deux vues séparées : checklists-view et dilutions-view.
 * Pas de persistance : feuille vierge à chaque ouverture.
 * EER Citrate → accessible via Calculateurs (openCalcModal('eer')).
 *
 * Expose sur window :
 *   openChecklists, closeChecklists, setChecklistTab, resetChecklist, toggleCheckItem
 *   openDilutions, closeDilutions, filterDilutions, setDilutionTab
 */

// ─── Données checklists ───────────────────────────────────────────────────────

const CHECKLISTS = {
  kta: {
    title: 'Pose de KTA',
    subtitle: 'Cathéter artériel — radial ou fémoral',
    items: [
      'Cathéter artériel (20G radial / 18G fémoral)',
      'Gants stériles',
      'Champs stériles',
      'Compresses stériles',
      'Seringue 10 ml NaCl 0,9%',
      'Robinet 3 voies',
      'Prolongateur de pression',
      'Transducteur de pression + capteur',
      'Sac de pression (cuff)',
      'NaCl 500 ml (flush)',
      'Pansement stérile transparent',
      'Chlorhexidine alcoolique',
      'Attelle de poignet',
      'Fil de fixation ou steristrip',
      'Capote écho (sonde échographe)'
    ]
  },
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
  },
  sng_asp: {
    title: 'Pose de SNG en aspiration',
    subtitle: 'Sonde nasogastrique — drainage / aspiration digestive',
    items: [
      'Sonde gastrique Salem double courant (CH 16 ou 18)',
      'Gants non stériles',
      'Lubrifiant',
      'Compresses non stériles',
      'Seringue 50 ml à embout conique (ENFit)',
      'Stéthoscope (test à l\'air)',
      'Sparadrap hypoallergénique pour fixation',
      'Sac collecteur gradué + raccord',
      'Système d\'aspiration murale + manomètre (dépression douce 30-40 mmHg)',
      'Bocal d\'aspiration',
      'Prescription médicale + traçabilité (longueur extériorisée)'
    ]
  },
  sng_sans_asp: {
    title: 'Pose de SNG sans aspiration',
    subtitle: 'Sonde nasogastrique — nutrition entérale / médicaments',
    items: [
      'Sonde gastrique simple courant (CH 12 ou 14, polyuréthane/silicone)',
      'Gants non stériles',
      'Lubrifiant',
      'Compresses non stériles',
      'Seringue 50 ml à embout conique (ENFit)',
      'Stéthoscope (test à l\'air)',
      'Sparadrap hypoallergénique pour fixation',
      'Bouchon obturateur de SNG',
      'Tubulure de nutrition entérale + pompe (si NE)',
      'Poche de NE prescrite',
      'Prescription médicale + traçabilité (longueur extériorisée)'
    ]
  },
  sondeurinaire: {
    title: 'Pose de sonde urinaire',
    subtitle: 'Sondage vésical à demeure — technique stérile',
    items: [
      'Sonde Foley CH 14 (femme) / CH 16-18 (homme), 2 voies à ballonnet',
      'Sac collecteur stérile à urines (système clos)',
      'Set de sondage stérile (champs, cupules, compresses, pince)',
      'Gants stériles',
      'Gants non stériles (toilette préalable)',
      'Antiseptique (Dakin ou chlorhexidine aqueuse)',
      'Sérum physiologique stérile (rinçage méat)',
      'Prescription médicale + traçabilité (date, calibre, indication)'
    ]
  },
  pdp: {
    title: 'Prélèvement Distal Protégé (PDP)',
    subtitle: 'Technique aveugle — diagnostic PAVM',
    items: [
      'Cathéter PDP type Combicath',
      'Connecteur coudé orientable',
      'Gants stériles',
      'Masque chirurgical',
      'Lunettes de protection',
      'Champs stériles',
      'Ciseau stérile',
      'Compresses',
      'Sérum physiologique 10 ml stérile (rinçage du cathéter)',
      'Seringue 10 ml',
      'Tube stérile de transport (microbiologie)',
      'Système d\'aspiration prêt',
      'Prescription médicale + traçabilité'
    ]
  }
};

// ─── Données dilutions ────────────────────────────────────────────────────────

const DILUTIONS_DATA = [
  { med: 'Adrénaline',        pres: '5 mg / 5 ml',    dil: '2 amp = 10 ml (sans dilution)',      conc: '1 mg/ml',    indic: 'Arrêt cardiaque',                                        voie: 'IVD',     froid: false },
  { med: 'Amiodarone',        pres: '150 mg / 3 ml',  dil: '2 amp + 14 ml G5% = 20 ml',         conc: '15 mg/ml',   indic: 'Troubles rythmiques — V40 en 30 min, à l\'abri de la lumière', voie: 'PSE/IVL', froid: false },
  { med: 'Atracurium',        pres: '50 mg / 5 ml',   dil: '2 amp = 10 ml (sans dilution)',      conc: '10 mg/ml',   indic: 'Curare — induction',                                     voie: 'IVD',     froid: true  },
  { med: 'Atropine',          pres: '0,5 mg / 1 ml',  dil: '1 amp = 1 ml (sans dilution)',       conc: '0,5 mg/ml',  indic: 'Bradycardie mal tolérée',                                voie: 'IVD',     froid: false },
  { med: 'Célocurine',        pres: '100 mg / 2 ml',  dil: '1 amp + 8 ml NaCl = 10 ml',         conc: '10 mg/ml',   indic: 'Curare — induction',                                     voie: 'IVD',     froid: true  },
  { med: 'Dobutamine',        pres: '250 mg / 20 ml', dil: '1 flacon + 30 ml G5% = 50 ml',      conc: '5 mg/ml',    indic: 'Choc cardiogénique — réf. protocole GHPSO',              voie: 'PSE',     froid: false },
  { med: 'Éphédrine',         pres: '30 mg / 1 ml',   dil: '1 amp + 9 ml NaCl = 10 ml',         conc: '3 mg/ml',    indic: 'Hypotension',                                            voie: 'IVD',     froid: false },
  { med: 'Etomidate',         pres: '—',              dil: 'Prêt à l\'emploi',                   conc: '2 mg/ml',    indic: 'Induction rapide',                                       voie: 'IVD',     froid: false },
  { med: 'Flumazénil',        pres: '—',              dil: 'Prêt à l\'emploi',                   conc: '0,1 mg/ml',  indic: 'Antagoniste BZD',                                        voie: 'IVD',     froid: false },
  { med: 'Furosémide',        pres: '—',              dil: 'Prêt à l\'emploi',                   conc: '0,1 mg/ml',  indic: 'Diurétique urgence',                                     voie: 'IVD',     froid: false },
  { med: 'Méthylprednisolone',pres: '—',              dil: 'Prêt à l\'emploi',                   conc: '24 mg/ml',   indic: 'Anti-inflammatoire',                                     voie: 'IVD',     froid: false },
  { med: 'Midazolam',         pres: '—',              dil: 'Prêt à l\'emploi',                   conc: '1 mg/ml',    indic: 'Sédation / anxiolyse',                                   voie: 'IVD/PSE', froid: false },
  { med: 'Naloxone',          pres: '—',              dil: 'Prêt à l\'emploi',                   conc: '0,04 mg/ml', indic: 'Antagoniste opioïdes',                                   voie: 'IVD',     froid: false },
  { med: 'Noradrénaline',     pres: '—',              dil: 'Voie dédiée seule',                  conc: '1 mg/ml',    indic: 'Choc septique — ⚠️ voie seule',                          voie: 'PSE',     froid: false },
  { med: 'Propofol',          pres: '—',              dil: 'Prêt à l\'emploi',                   conc: '1 mg/ml',    indic: 'Sédation / induction',                                   voie: 'IVD/PSE', froid: false }
];

// ─── État ─────────────────────────────────────────────────────────────────────

let _clTab = 'kta';
let _clChecked = { kta: {}, ktc: {}, intubation: {}, sng_asp: {}, sng_sans_asp: {}, sondeurinaire: {}, pdp: {} };

// ─── Checklists ───────────────────────────────────────────────────────────────

window.openChecklists = function openChecklists() {
    document.getElementById('checklists-view').style.display = 'flex';
    _clChecked = { kta: {}, ktc: {}, intubation: {}, sng_asp: {}, sng_sans_asp: {}, sondeurinaire: {}, pdp: {} };
    renderChecklist();
};

window.closeChecklists = function closeChecklists() {
    document.getElementById('checklists-view').style.display = 'none';
};

window.setChecklistTab = function setChecklistTab(tab) {
    _clTab = tab;
    renderChecklist();
};

window.toggleCheckItem = function toggleCheckItem(key, idx) {
    _clChecked[key] = _clChecked[key] || {};
    _clChecked[key][idx] = !_clChecked[key][idx];
    renderChecklist();
};

window.resetChecklist = function resetChecklist() {
    _clChecked[_clTab] = {};
    renderChecklist();
};

function renderChecklist() {
    ['kta', 'ktc', 'intubation', 'sng_asp', 'sng_sans_asp', 'sondeurinaire', 'pdp'].forEach(t => {
        const btn = document.getElementById('cl-tab-' + t);
        if (!btn) return;
        btn.style.background = t === _clTab ? 'var(--brand-aqua)' : 'var(--surface-sec)';
        btn.style.color = t === _clTab ? '#fff' : 'var(--text-muted)';
    });

    const cl = CHECKLISTS[_clTab];
    const checked = _clChecked[_clTab] || {};
    const done = Object.values(checked).filter(Boolean).length;
    const total = cl.items.length;
    const pct = Math.round((done / total) * 100);

    const resetBtn = document.getElementById('cl-reset-btn');
    if (resetBtn) resetBtn.textContent = done > 0 ? '↺ Reset (' + done + ')' : '↺ Reset';

    let html = `
      <div style="padding:0 16px 8px; flex-shrink:0;">
        <div style="font-size:0.82rem; font-weight:800; color:var(--text-muted); margin-bottom:6px;">${cl.subtitle}</div>
        <div style="height:6px; background:var(--border); border-radius:3px; overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:${pct === 100 ? 'var(--ide)' : 'var(--brand-aqua)'}; border-radius:3px; transition:width 0.2s;"></div>
        </div>
        <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px; font-weight:700;">${done} / ${total}${pct === 100 ? ' ✅ Complet' : ''}</div>
      </div>
      <div style="flex:1; overflow-y:auto; padding:0 16px 40px;">`;

    cl.items.forEach((item, idx) => {
        const isChecked = !!checked[idx];
        html += `
        <div data-action="toggleCheckItem:${_clTab},${idx}"
             style="display:flex; align-items:center; gap:12px; padding:13px 0; border-bottom:1px solid var(--border); cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent;">
          <div style="flex-shrink:0; width:22px; height:22px; border-radius:6px; border:2px solid ${isChecked ? 'var(--ide)' : 'var(--border)'}; background:${isChecked ? 'var(--ide)' : 'transparent'}; display:flex; align-items:center; justify-content:center; transition:all 0.15s;">
            ${isChecked ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
          </div>
          <span style="font-size:0.9rem; font-weight:${isChecked ? '600' : '800'}; color:${isChecked ? 'var(--text-muted)' : 'var(--text)'}; text-decoration:${isChecked ? 'line-through' : 'none'}; transition:all 0.15s; line-height:1.3;">${escapeHTML(item)}</span>
        </div>`;
    });

    html += `</div>`;
    document.getElementById('checklists-content').innerHTML = html;
}

// ─── Dilutions ───────────────────────────────────────────────────────────────

window.openDilutions = function openDilutions() {
    document.getElementById('dilutions-view').style.display = 'flex';
    document.getElementById('dil-search').value = '';
    document.getElementById('dilutions-content').innerHTML = renderDilutionList();
};

window.closeDilutions = function closeDilutions() {
    document.getElementById('dilutions-view').style.display = 'none';
};

window.filterDilutions = function filterDilutions() {
    document.getElementById('dilutions-content').innerHTML = renderDilutionList();
};

// setDilutionTab conservé pour compatibilité (peut rester inutilisé)
window.setDilutionTab = function setDilutionTab() {};

function renderDilutionList() {
    const q = (document.getElementById('dil-search')?.value || '').toLowerCase().trim();
    const rows = DILUTIONS_DATA.filter(d =>
        !q || d.med.toLowerCase().includes(q) || d.indic.toLowerCase().includes(q)
    );

    if (rows.length === 0) {
        return `<div style="flex:1; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:0.9rem; font-weight:700;">Aucun résultat</div>`;
    }

    let html = `<div style="flex:1; overflow-y:auto; padding:0 0 40px;">`;
    rows.forEach(d => {
        const pret = d.dil === 'Prêt à l\'emploi';
        html += `
        <div style="padding:13px 16px; border-bottom:1px solid var(--border);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:5px;">
            <span style="font-size:0.95rem; font-weight:900; color:var(--text);">${escapeHTML(d.med)}${d.froid ? ' <span title="Conserver au réfrigérateur">🧊</span>' : ''}</span>
            <span style="font-size:0.85rem; font-weight:900; color:var(--crit); white-space:nowrap; flex-shrink:0; background:rgba(239,68,68,0.1); padding:2px 8px; border-radius:6px;">${escapeHTML(d.conc)}</span>
          </div>
          ${d.pres !== '—' ? `<div style="font-size:0.74rem; color:var(--text-muted); font-weight:700; margin-bottom:3px;">📦 ${escapeHTML(d.pres)}</div>` : ''}
          <div style="font-size:0.74rem; color:${pret ? 'var(--ide)' : 'var(--brand-aqua)'}; font-weight:700; margin-bottom:5px;">${pret ? '✓ ' : '⚗️ '}${escapeHTML(d.dil)}</div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="font-size:0.7rem; font-weight:900; background:var(--surface-sec); padding:2px 7px; border-radius:5px; color:var(--text-muted); border:1px solid var(--border);">${escapeHTML(d.voie)}</span>
            <span style="font-size:0.74rem; color:var(--text-muted); font-weight:700;">${escapeHTML(d.indic)}</span>
          </div>
        </div>`;
    });
    html += `</div>`;
    return html;
}

