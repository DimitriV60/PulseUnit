/**
 * EER Prismaflex — Anticoagulation citrate.
 * Calculateur paramètres initiaux selon poids + arbres décisionnels CA++.
 * Expose sur window : openEER, closeEER, calcEER, eerCaChange.
 * Document source : GHPSO (Mme Detrez, M. Taupin, Dr Léonetti)
 */

// Table paramètres initiaux par poids (kg → { debitSang, doseCitrate, reinjection })
const EER_TABLE = [
  { min: 48, max: 57,  debit: 100, citrate: 3.6, reinj: '325 / 325' },
  { min: 57, max: 67,  debit: 100, citrate: 3.6, reinj: '450 / 450' },
  { min: 67, max: 102, debit: 150, citrate: 3.0, reinj: '750 / 750' },
  { min: 102,max: 999, debit: 200, citrate: 2.5, reinj: '1000 / 1000' }
];

// Correspondance exacte image pour poids précis
const EER_EXACT = {
  50:  { debit: 100, citrate: 3.6, reinj: '325 / 325' },
  55:  { debit: 100, citrate: 3.6, reinj: '325 / 325' },
  60:  { debit: 100, citrate: 3.6, reinj: '450 / 450' },
  65:  { debit: 100, citrate: 3.6, reinj: '450 / 450' },
  70:  { debit: 150, citrate: 3.0, reinj: '750 / 750' },
  75:  { debit: 150, citrate: 3.0, reinj: '750 / 750' },
  80:  { debit: 150, citrate: 3.0, reinj: '750 / 750' },
  85:  { debit: 150, citrate: 3.0, reinj: '750 / 750' },
  90:  { debit: 150, citrate: 3.0, reinj: '750 / 750' },
  95:  { debit: 150, citrate: 3.0, reinj: '750 / 750' },
  100: { debit: 150, citrate: 3.0, reinj: '750 / 750' },
  105: { debit: 200, citrate: 2.5, reinj: '1000 / 1000' },
  110: { debit: 200, citrate: 2.5, reinj: '1000 / 1000' },
  115: { debit: 200, citrate: 2.5, reinj: '1000 / 1000' },
  120: { debit: 200, citrate: 2.5, reinj: '1000 / 1000' }
};

function getEERParams(poids) {
  // Chercher la tranche correspondante
  const row = EER_TABLE.find(r => poids >= r.min && poids < r.max);
  return row || null;
}

window.openEER = function openEER() {
  document.getElementById('eer-view').style.display = 'flex';
  renderEERInit();
};

window.closeEER = function closeEER() {
  document.getElementById('eer-view').style.display = 'none';
};

window.calcEER = function calcEER() {
  const input = document.getElementById('eer-poids-input');
  const poids = parseInt(input?.value || '0', 10);
  const result = document.getElementById('eer-result');
  if (!result) return;

  if (!poids || poids < 40 || poids > 200) {
    result.innerHTML = `<div style="color:var(--crit); font-size:0.85rem; font-weight:700; padding:12px 0;">⚠️ Poids invalide (40–200 kg)</div>`;
    return;
  }

  const params = getEERParams(poids);
  if (!params) {
    result.innerHTML = `<div style="color:var(--crit); font-size:0.85rem; font-weight:700; padding:12px 0;">⚠️ Hors tableau</div>`;
    return;
  }

  result.innerHTML = `
    <div style="background:var(--surface-sec); border:1px solid var(--border); border-radius:12px; padding:16px; margin-top:12px;">
      <div style="font-size:0.75rem; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px;">Paramètres initiaux — ${poids} kg</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div style="background:var(--surface); border-radius:8px; padding:10px; border:1px solid var(--border);">
          <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700; margin-bottom:3px;">DÉBIT SANG</div>
          <div style="font-size:1.4rem; font-weight:900; color:var(--brand-blue);">${params.debit} <span style="font-size:0.8rem; color:var(--text-muted);">ml/min</span></div>
          <div style="font-size:0.65rem; color:var(--crit); font-weight:800; margin-top:3px;">NE PAS CHANGER</div>
        </div>
        <div style="background:var(--surface); border-radius:8px; padding:10px; border:1px solid var(--border);">
          <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700; margin-bottom:3px;">DOSE CITRATE INITIALE</div>
          <div style="font-size:1.4rem; font-weight:900; color:var(--brand-aqua);">${params.citrate} <span style="font-size:0.8rem; color:var(--text-muted);">mmol/L</span></div>
          <div style="font-size:0.65rem; color:var(--text-muted); font-weight:800; margin-top:3px;">Ligne blanche</div>
        </div>
        <div style="background:var(--surface); border-radius:8px; padding:10px; border:1px solid var(--border); grid-column:1/-1;">
          <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700; margin-bottom:3px;">RÉINJECTION POST-DILUTION (PHOXILIUM)</div>
          <div style="font-size:1.3rem; font-weight:900; color:var(--med);">${params.reinj} <span style="font-size:0.8rem; color:var(--text-muted);">ml/h</span></div>
          <div style="font-size:0.65rem; color:var(--text-muted); font-weight:800; margin-top:3px;">Vert / Violet</div>
        </div>
      </div>
      <div style="margin-top:10px; padding:8px 10px; background:rgba(59,130,246,0.08); border-radius:8px; border:1px solid rgba(59,130,246,0.2); font-size:0.75rem; color:var(--brand-blue); font-weight:700;">
        💊 Compensation Ca²⁺ : Chlorure de Calcium 10% — voie seule HTC ou VTD — démarrer à 100%
      </div>
    </div>`;
};

window.eerCaChange = function eerCaChange(type, direction) {
  const alerts = document.getElementById('eer-alerts');
  if (!alerts) return;

  let msg = '';
  let color = '';

  if (type === 'patient') {
    if (direction === 'low') {
      msg = '⬆️ CA ionisé patient < 1,0 mmol/L → AUGMENTER compensation Ca²⁺ de 10 %';
      color = 'var(--crit)';
    } else {
      msg = '⬇️ CA ionisé patient > 1,2 mmol/L → DIMINUER compensation Ca²⁺ de 10 %';
      color = 'var(--med)';
    }
  } else {
    if (direction === 'low') {
      msg = '⬇️ CA post-filtre < 0,25 mmol/L → DIMINUER dose citrate de 0,5 mmol/L';
      color = 'var(--med)';
    } else {
      msg = '⬆️ CA post-filtre > 0,35 mmol/L → AUGMENTER dose citrate de 0,5 mmol/L';
      color = 'var(--crit)';
    }
  }

  const existing = alerts.querySelectorAll('.eer-alert-item');
  const count = existing.length + 1;
  const badge = count >= 3
    ? `<span style="background:var(--crit); color:#fff; border-radius:4px; padding:1px 5px; font-size:0.65rem; font-weight:900; margin-left:6px;">⚠️ APPELER LE MÉDECIN</span>`
    : '';

  const item = document.createElement('div');
  item.className = 'eer-alert-item';
  item.style.cssText = `padding:9px 12px; border-left:3px solid ${color}; background:var(--surface-sec); border-radius:6px; margin-bottom:6px; font-size:0.8rem; font-weight:700; color:var(--text);`;
  item.innerHTML = `<span style="color:${color};">${msg}</span>${badge}`;
  alerts.appendChild(item);

  if (count >= 3) {
    alerts.innerHTML += `<div style="padding:10px 12px; background:rgba(239,68,68,0.12); border:1px solid var(--crit); border-radius:8px; color:var(--crit); font-size:0.85rem; font-weight:900; text-align:center; margin-top:4px;">🚨 3 changements consécutifs — APPELER LE MÉDECIN</div>`;
  }
};

function renderEERInit() {
  const result = document.getElementById('eer-result');
  if (result) result.innerHTML = '';
  const alerts = document.getElementById('eer-alerts');
  if (alerts) alerts.innerHTML = '';
  const input = document.getElementById('eer-poids-input');
  if (input) input.value = '';
}
