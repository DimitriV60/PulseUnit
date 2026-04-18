/**
 * Norms handlers — Normes médicales référence (lecture seule).
 * Dépend de window.NORMES_REF.
 * Expose les fonctions sur window pour onclick inline.
 * Les helpers normesGetActiveZone et normesZoneBarHTML sont partagés avec la feature respirator.
 */

let normesCurrentCat = 'VITAUX';

window.normesGetActiveZone = function normesGetActiveZone(value, zones) {
    let az = zones[zones.length-1];
    for (const z of zones) { if (value >= z.min && value < z.max) { az = z; break; } }
    return az;
};

window.normesZoneBarHTML = function normesZoneBarHTML(value, min, max, zones, unit) {
    const val = Math.min(max, Math.max(min, parseFloat(value)));
    const norm = (val - min) / (max - min);
    const az = window.normesGetActiveZone(val, zones);
    const ac = az.color;
    const dv = val < 1 ? val.toFixed(2) : val < 10 ? val.toFixed(1) : Math.round(val);
    const segs = zones.map(z => {
        const zMin = Math.max(z.min, min), zMax = Math.min(z.max, max);
        if (zMin >= zMax) return '';
        const w = ((zMax - zMin) / (max - min) * 100).toFixed(3);
        return `<div class="normes-zonebar-seg" style="flex-basis:${w}%;background:${z.color};opacity:0.85;"></div>`;
    }).join('');
    const indLeft = Math.min(97, Math.max(3, norm * 100)).toFixed(2);
    return `<div class="normes-bar-card">
      <div class="normes-bar-title">📍 Position dans les zones cliniques</div>
      <div class="normes-zonebar-outer">
        <div class="normes-zonebar">${segs}</div>
        <div class="normes-zonebar-indicator" style="left:${indLeft}%;">
          <div class="normes-zonebar-line" style="background:var(--text);"></div>
          <div class="normes-zonebar-arrow"></div>
          <div class="normes-zonebar-val" style="color:${ac};">${dv} ${unit}</div>
        </div>
        <div class="normes-bar-minmax"><span>${min}</span><span>${max} ${unit}</span></div>
      </div>
    </div>`;
};

window.openNormes = function openNormes() {
    document.getElementById('normes-view').style.display = 'flex';
    window.renderNormes();
};

window.closeNormes = function closeNormes() {
    document.getElementById('normes-view').style.display = 'none';
};

window.setNormesCat = function setNormesCat(id) {
    normesCurrentCat = id;
    window.renderNormes();
};

window.getNormesCurrentCat = function getNormesCurrentCat() {
    return normesCurrentCat;
};

window.setNormesCurrentCat = function setNormesCurrentCat(id) {
    normesCurrentCat = id;
};

window.renderNormes = function renderNormes() {
    const NORMES_REF = window.NORMES_REF;
    const filtersEl = document.getElementById('normes-cat-filters');
    if (filtersEl) {
        filtersEl.innerHTML = NORMES_REF.map(c =>
            `<button class="normes-cat-btn${normesCurrentCat===c.id?' active':''}" onclick="setNormesCat('${c.id}')">${c.icon} ${c.label}</button>`
        ).join('');
    }
    const cat = NORMES_REF.find(c => c.id === normesCurrentCat);
    const wrap = document.getElementById('normes-table-wrap');
    if (!cat || !wrap) return;
    let html = '';
    cat.groups.forEach(g => {
        html += `<div class="normes-group">`;
        html += `<div class="normes-group-title">${g.title}</div>`;
        g.rows.forEach(r => {
            const badge = r.a
                ? `<span class="normes-row-alert" role="status" aria-label="Alerte : ${r.a}">${r.a}</span>`
                : r.w
                ? `<span class="normes-row-warn" role="status" aria-label="Attention : ${r.w}">${r.w}</span>`
                : '';
            html += `<div class="normes-row">
            <div class="normes-row-left">
              <div class="normes-row-param">${r.p}</div>
              ${badge}
            </div>
            <div class="normes-row-right">
              <span class="normes-row-val">${r.n}</span>
              ${r.u ? `<span class="normes-row-unit">${r.u}</span>` : ''}
            </div>
          </div>`;
        });
        html += `</div>`;
    });
    html += `<div class="normes-source">Sources : SFAR 2024 · SRLF · KDIGO 2024 · ESC/AHA 2023 · ARDSNet · ESICM</div>`;
    wrap.innerHTML = html;
    const pagerEl = document.getElementById('normes-pager');
    if (pagerEl) {
        const catIdx = NORMES_REF.findIndex(c => c.id === normesCurrentCat);
        pagerEl.innerHTML = NORMES_REF.map((_, i) =>
            `<div class="normes-pager-dot${i === catIdx ? ' active' : ''}"></div>`
        ).join('');
    }
};
