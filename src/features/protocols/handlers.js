/**
 * Protocols handlers — Protocoles de soin, lecture seule avec accordéon.
 * Dépend de window.PROTOCOLS_DATA et window.escapeHTML.
 * Expose les fonctions sur window pour onclick inline.
 */

window.openProtocoles = function openProtocoles() {
    document.getElementById('protocoles-view').style.display = 'flex';
    window.renderProtoList();
};

window.closeProtocoles = function closeProtocoles() {
    document.getElementById('protocoles-view').style.display = 'none';
};

window.renderProtoList = function renderProtoList() {
    const PROTOCOLS_DATA = window.PROTOCOLS_DATA;
    const escapeHTML = window.escapeHTML;
    const el = document.getElementById('proto-list-content');
    let html = '';
    PROTOCOLS_DATA.forEach(p => {
        html += `
        <div class="proto-card" data-action="openProtocoleDetail:${p.id}" style="border-left:4px solid ${p.color};">
          <div class="proto-card-icon">${p.icon}</div>
          <div class="proto-card-body">
            <div class="proto-card-title">${escapeHTML(p.title)}</div>
            <div class="proto-card-sub">${escapeHTML(p.subtitle)}</div>
            <span class="proto-card-ref">${escapeHTML(p.ref)}</span>
          </div>
          <div class="proto-card-arrow">›</div>
        </div>`;
    });
    el.innerHTML = html;
};

window.openProtocoleDetail = function openProtocoleDetail(id) {
    const p = window.PROTOCOLS_DATA.find(x => x.id === id);
    if (!p) return;
    document.getElementById('proto-detail-title').textContent = p.icon + ' ' + p.title;
    document.getElementById('proto-detail-ref').textContent = p.ref;
    window.renderProtoDetail(p);
    document.getElementById('protocole-detail-view').style.display = 'flex';
};

window.closeProtocoleDetail = function closeProtocoleDetail() {
    document.getElementById('protocole-detail-view').style.display = 'none';
    window.renderProtoList();
};

window.renderProtoDetail = function renderProtoDetail(p) {
    const escapeHTML = window.escapeHTML;
    let html = '';
    p.sections.forEach((sec, si) => {
        const isFirst = si === 0;
        html += `
        <div class="proto-section">
          <div class="proto-section-header" data-action="toggleProtoSection:${sec.id}">
            <div class="proto-section-title">
              <span>${sec.icon}</span>
              <span>${escapeHTML(sec.title)}</span>
              <span class="proto-section-badge">${sec.steps.length} étapes</span>
            </div>
            <span class="proto-section-chevron ${isFirst ? 'open' : ''}" id="chev-${sec.id}">›</span>
          </div>
          <div class="proto-steps ${isFirst ? 'open' : ''}" id="steps-${sec.id}">`;
        if (sec.info) {
            html += `<div class="proto-info-block"><p>${escapeHTML(sec.info)}</p></div>`;
        }
        sec.steps.forEach((step, stepIdx) => {
            const isWarn = step.note && step.note.startsWith('⚠️');
            html += `
            <div class="proto-step-ro">
              <div class="proto-step-icon" style="font-size:0.72rem; font-weight:900; color:var(--text-muted); min-width:1.5rem; text-align:center;">${stepIdx + 1}</div>
              <div style="flex:1;">
                <div class="proto-step-text">${escapeHTML(step.text)}</div>
                ${step.note ? `<div class="${isWarn ? 'proto-warn-block' : 'proto-step-note'}" style="${isWarn ? 'margin:4px 0 0;padding:6px 10px;' : ''}">${isWarn ? '<p>' : ''}${escapeHTML(step.note)}${isWarn ? '</p>' : ''}</div>` : ''}
              </div>
            </div>`;
        });
        html += `</div></div>`;
    });
    document.getElementById('proto-detail-content').innerHTML = html;
};

window.toggleProtoSection = function toggleProtoSection(secId) {
    const stepsEl = document.getElementById('steps-' + secId);
    const chevEl  = document.getElementById('chev-'  + secId);
    if (!stepsEl || !chevEl) return;
    const isOpen = stepsEl.classList.contains('open');
    stepsEl.classList.toggle('open', !isOpen);
    chevEl.classList.toggle('open', !isOpen);
};
