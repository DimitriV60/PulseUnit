/**
 * Pathologies handlers — Référentiel clinique par système avec définitions.
 * Dépend de window.PATHOLOGIES_DATA.
 * Expose les fonctions sur window pour onclick inline.
 */

let _pathoTab = 'all'; // 'all' | 'rea'

window.openPathologies = function openPathologies() {
    document.getElementById('pathologies-view').style.display = 'flex';
    window.renderPathologies();
};

window.closePathologies = function closePathologies() {
    document.getElementById('pathologies-view').style.display = 'none';
};

window.setPathoTab = function setPathoTab(tab) {
    _pathoTab = tab;
    document.getElementById('patho-tab-all').style.background = tab === 'all' ? 'var(--brand-aqua)' : 'var(--surface)';
    document.getElementById('patho-tab-all').style.color = tab === 'all' ? '#fff' : 'var(--text-muted)';
    document.getElementById('patho-tab-rea').style.background = tab === 'rea' ? 'var(--crit)' : 'var(--surface)';
    document.getElementById('patho-tab-rea').style.color = tab === 'rea' ? '#fff' : 'var(--text-muted)';
    window.renderPathologies();
};

window.renderPathologies = function renderPathologies() {
    const DATA = window.PATHOLOGIES_DATA;
    const escapeHTML = window.escapeHTML;
    const container = document.getElementById('pathologies-list');
    const q = (document.getElementById('pathologies-search')?.value || '').toLowerCase().trim();

    const filtered = DATA.filter(p => {
        if (_pathoTab === 'rea' && !p.rea) return false;
        if (!q) return true;
        return p.name.toLowerCase().includes(q) ||
               p.sys.toLowerCase().includes(q) ||
               p.def.toLowerCase().includes(q);
    });

    // Group by system
    const sysMap = new Map();
    filtered.forEach(p => {
        if (!sysMap.has(p.sys)) sysMap.set(p.sys, []);
        sysMap.get(p.sys).push(p);
    });

    if (sysMap.size === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--text-muted); font-weight:700; font-size:0.9rem;">${q ? `Aucun résultat pour "${escapeHTML(q)}"` : 'Aucune pathologie dans cet onglet'}</div>`;
        return;
    }

    let html = '';
    sysMap.forEach((pathos, sys) => {
        html += `<div style="margin-bottom:20px;">
          <div style="font-size:0.68rem; font-weight:900; color:var(--ide); text-transform:uppercase; letter-spacing:1.5px; padding:6px 0 8px; border-bottom:1px solid var(--border); margin-bottom:10px;">${escapeHTML(sys)}</div>
          <div style="display:flex; flex-direction:column; gap:6px;">`;
        pathos.forEach(p => {
            const reaBadge = p.rea ? `<span style="font-size:0.6rem; font-weight:900; background:rgba(239,68,68,0.15); color:var(--crit); border-radius:4px; padding:1px 5px; margin-left:6px; white-space:nowrap;">RÉA</span>` : '';
            html += `
            <div onclick="togglePathoDef('${escapeHTML(p.id)}')" style="background:var(--surface); border:1px solid var(--border); border-radius:10px; overflow:hidden; cursor:pointer;">
              <div style="padding:12px 16px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <span style="font-size:0.88rem; font-weight:800; color:var(--text); display:flex; align-items:center; flex-wrap:wrap;">${escapeHTML(p.name)}${reaBadge}</span>
                <span id="patho-chevron-${escapeHTML(p.id)}" style="font-size:0.8rem; color:var(--text-muted); flex-shrink:0; transition:transform 0.2s;">▼</span>
              </div>
              <div id="patho-def-${escapeHTML(p.id)}" style="display:none; padding:12px 16px 14px; font-size:0.83rem; line-height:1.7; color:var(--text-muted); font-weight:600; border-top:1px solid var(--border); background:var(--surface-sec);">
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
