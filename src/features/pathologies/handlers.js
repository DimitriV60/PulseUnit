/**
 * Pathologies handlers — Référentiel clinique par système avec définitions.
 * Dépend de window.PATHOLOGIES_DATA.
 * Expose les fonctions sur window pour onclick inline.
 */

window.openPathologies = function openPathologies() {
    document.getElementById('pathologies-view').style.display = 'flex';
    window.renderPathologies();
};

window.closePathologies = function closePathologies() {
    document.getElementById('pathologies-view').style.display = 'none';
};

window.renderPathologies = function renderPathologies() {
    const DATA = window.PATHOLOGIES_DATA;
    const escapeHTML = window.escapeHTML;
    const container = document.getElementById('pathologies-list');
    const q = (document.getElementById('pathologies-search')?.value || '').toLowerCase().trim();

    // Group by system
    const sysMap = new Map();
    DATA.forEach(p => {
        const matches = !q ||
            p.name.toLowerCase().includes(q) ||
            p.sys.toLowerCase().includes(q) ||
            p.def.toLowerCase().includes(q);
        if (!matches) return;
        if (!sysMap.has(p.sys)) sysMap.set(p.sys, []);
        sysMap.get(p.sys).push(p);
    });

    if (sysMap.size === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--text-muted); font-weight:700; font-size:0.9rem;">Aucun résultat pour "${escapeHTML(q)}"</div>`;
        return;
    }

    let html = '';
    sysMap.forEach((pathos, sys) => {
        html += `<div style="margin-bottom:20px;">
          <div style="font-size:0.68rem; font-weight:900; color:var(--ide); text-transform:uppercase; letter-spacing:1.5px; padding:6px 0 8px; border-bottom:1px solid var(--border); margin-bottom:10px;">${escapeHTML(sys)}</div>
          <div style="display:flex; flex-direction:column; gap:6px;">`;
        pathos.forEach(p => {
            html += `
            <div class="patho-item" onclick="togglePathoDef('${escapeHTML(p.id)}')" style="background:var(--surface); border:1px solid var(--border); border-radius:10px; overflow:hidden; cursor:pointer;">
              <div style="padding:12px 16px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <span style="font-size:0.9rem; font-weight:800; color:var(--text);">${escapeHTML(p.name)}</span>
                <span id="patho-chevron-${escapeHTML(p.id)}" style="font-size:0.8rem; color:var(--text-muted); flex-shrink:0; transition:transform 0.2s;">▼</span>
              </div>
              <div id="patho-def-${escapeHTML(p.id)}" style="display:none; padding:0 16px 14px; font-size:0.83rem; line-height:1.7; color:var(--text-muted); font-weight:600; border-top:1px solid var(--border); padding-top:12px; background:var(--surface-sec);">
                ${escapeHTML(p.def)}
              </div>
            </div>`;
        });
        html += `</div></div>`;
    });

    container.innerHTML = html;
};

window.togglePathoDef = function togglePathoDef(id) {
    const def = document.getElementById('patho-def-' + id);
    const chevron = document.getElementById('patho-chevron-' + id);
    if (!def) return;
    const isOpen = def.style.display !== 'none';
    def.style.display = isOpen ? 'none' : 'block';
    if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
};
