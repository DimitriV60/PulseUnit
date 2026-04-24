/**
 * EER Prismaflex — Anticoagulation citrate.
 * Calculateur paramètres initiaux + arbres CA++.
 * Expose sur window : calcEER, eerCaChange.
 * Document source : GHPSO (Mme Detrez, M. Taupin, Dr Léonetti)
 */

const EER_TABLE = [
  { min: 40,  max: 57,  debit: 100, citrate: 3.6, reinj: '325 / 325'   },
  { min: 57,  max: 67,  debit: 100, citrate: 3.6, reinj: '450 / 450'   },
  { min: 67,  max: 102, debit: 150, citrate: 3.0, reinj: '750 / 750'   },
  { min: 102, max: 999, debit: 200, citrate: 2.5, reinj: '1000 / 1000' }
];

window.calcEER = function calcEER() {
    const input = document.getElementById('eer-poids-input');
    const result = document.getElementById('eer-result');
    if (!input || !result) return;

    const poids = parseInt(input.value || '0', 10);
    if (!poids || poids < 40 || poids > 200) {
        result.innerHTML = poids ? `<div style="color:var(--crit); font-size:0.82rem; font-weight:700; padding:10px 0;">⚠️ Poids invalide (40–200 kg)</div>` : '';
        return;
    }

    const p = EER_TABLE.find(r => poids >= r.min && poids < r.max);
    if (!p) { result.innerHTML = ''; return; }

    // Reset compteur changements à chaque nouveau calcul
    const alerts = document.getElementById('eer-alerts');
    if (alerts) alerts.innerHTML = '';

    result.innerHTML = `
      <div style="background:var(--surface-sec); border:1px solid var(--border); border-radius:12px; padding:14px; margin-top:10px;">
        <div style="font-size:0.7rem; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">Paramètres initiaux — ${poids} kg</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div style="background:var(--surface); border-radius:8px; padding:10px; border:1px solid var(--border);">
            <div style="font-size:0.65rem; color:var(--text-muted); font-weight:800; margin-bottom:2px;">DÉBIT SANG</div>
            <div style="font-size:1.3rem; font-weight:900; color:var(--brand-blue);">${p.debit} <span style="font-size:0.75rem; color:var(--text-muted);">ml/min</span></div>
            <div style="font-size:0.62rem; color:var(--crit); font-weight:900; margin-top:2px;">NE PAS CHANGER</div>
          </div>
          <div style="background:var(--surface); border-radius:8px; padding:10px; border:1px solid var(--border);">
            <div style="font-size:0.65rem; color:var(--text-muted); font-weight:800; margin-bottom:2px;">CITRATE INITIAL</div>
            <div style="font-size:1.3rem; font-weight:900; color:var(--brand-aqua);">${p.citrate} <span style="font-size:0.75rem; color:var(--text-muted);">mmol/L</span></div>
            <div style="font-size:0.62rem; color:var(--text-muted); font-weight:800; margin-top:2px;">Ligne blanche</div>
          </div>
          <div style="background:var(--surface); border-radius:8px; padding:10px; border:1px solid var(--border); grid-column:1/-1;">
            <div style="font-size:0.65rem; color:var(--text-muted); font-weight:800; margin-bottom:2px;">RÉINJECTION PHOXILIUM</div>
            <div style="font-size:1.3rem; font-weight:900; color:var(--med);">${p.reinj} <span style="font-size:0.75rem; color:var(--text-muted);">ml/h</span></div>
            <div style="font-size:0.62rem; color:var(--text-muted); font-weight:800; margin-top:2px;">Vert / Violet</div>
          </div>
        </div>
        <div style="margin-top:8px; padding:7px 10px; background:rgba(59,130,246,0.08); border-radius:7px; border:1px solid rgba(59,130,246,0.2); font-size:0.72rem; color:var(--brand-blue); font-weight:700;">
          💊 Ca²⁺ : CaCl 10% voie seule HTC/VTD — démarrer à 100%
        </div>
      </div>`;
};

window.eerCaChange = function eerCaChange(type, direction) {
    const alerts = document.getElementById('eer-alerts');
    if (!alerts) return;

    const msgs = {
        'patient-low':  { txt: 'CA patient < 1,0 → ⬆️ +10% compensation Ca²⁺', col: 'var(--crit)' },
        'patient-high': { txt: 'CA patient > 1,2 → ⬇️ -10% compensation Ca²⁺', col: 'var(--med)'  },
        'filtre-low':   { txt: 'CA post-filtre < 0,25 → ⬇️ Citrate −0,5 mmol/L', col: 'var(--med)'  },
        'filtre-high':  { txt: 'CA post-filtre > 0,35 → ⬆️ Citrate +0,5 mmol/L', col: 'var(--crit)' }
    };
    const { txt, col } = msgs[type + '-' + direction] || {};
    if (!txt) return;

    const count = alerts.querySelectorAll('.eer-alert-item').length + 1;

    const item = document.createElement('div');
    item.className = 'eer-alert-item';
    item.style.cssText = `padding:8px 11px; border-left:3px solid ${col}; background:var(--surface-sec); border-radius:6px; margin-bottom:6px; font-size:0.78rem; font-weight:700; color:${col};`;
    item.textContent = count + '. ' + txt;
    alerts.appendChild(item);

    if (count >= 3) {
        const warn = document.createElement('div');
        warn.style.cssText = 'padding:10px 12px; background:rgba(239,68,68,0.12); border:1px solid var(--crit); border-radius:8px; color:var(--crit); font-size:0.85rem; font-weight:900; text-align:center; margin-top:4px;';
        warn.textContent = '🚨 3 changements — APPELER LE MÉDECIN';
        alerts.appendChild(warn);
    }
};
