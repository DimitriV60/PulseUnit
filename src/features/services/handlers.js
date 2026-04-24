/**
 * Services handlers — Annuaire téléphonique des services hospitaliers.
 * Dépend de window.SERVICES_DATA et window.escapeHTML.
 */

let _servicesTab = 'annuaire'; // 'annuaire' | 'etage'

window.openServices = function openServices() {
    document.getElementById('services-view').style.display = 'flex';
    _updateTabStyles();
    renderServices();
};

window.closeServices = function closeServices() {
    document.getElementById('services-view').style.display = 'none';
};

window.setServicesTab = function setServicesTab(tab) {
    _servicesTab = tab;
    _updateTabStyles();
    renderServices();
};

function _updateTabStyles() {
    const tabs = { annuaire: 'svc-tab-annuaire', etage: 'svc-tab-etage' };
    Object.entries(tabs).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        const active = _servicesTab === key;
        el.style.background = active ? 'var(--brand-aqua)' : 'var(--surface)';
        el.style.color      = active ? '#fff' : 'var(--text-muted)';
        el.style.border     = active ? 'none' : '1px solid var(--border)';
    });
}

window.revealServiceNum = function revealServiceNum(el, num, fullDisplay) {
    el.outerHTML = `<a href="tel:${num}" style="font-size:0.95rem; font-weight:900; color:var(--brand-aqua); text-decoration:none; white-space:nowrap;">${fullDisplay} 📞</a>`;
};

/* ── Rendu d'une ligne entrée ── */
function _entryRow(entry, escapeHTML, showFloor) {
    const hasNum = entry.num && entry.num.trim() !== '';
    const label  = entry.display && entry.display.trim() !== '' ? entry.display : entry.num;
    const floorTag = showFloor && entry._floor
        ? `<span style="font-size:0.65rem; font-weight:800; color:var(--ide); background:var(--ide-glow); border-radius:5px; padding:2px 7px; white-space:nowrap;">${escapeHTML(entry._floor)}</span>`
        : '';

    const numEl = !hasNum
        ? `<span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); background:var(--surface-sec); border-radius:6px; padding:3px 10px;">—</span>`
        : entry.reveal
            ? `<span onclick="revealServiceNum(this,'${escapeHTML(entry.num)}','${escapeHTML(entry.reveal)}')" style="font-size:0.95rem; font-weight:900; color:var(--brand-aqua); white-space:nowrap; cursor:pointer;">${escapeHTML(label)}</span>`
            : `<a href="tel:${escapeHTML(entry.num)}" style="font-size:0.95rem; font-weight:900; color:var(--brand-aqua); text-decoration:none; white-space:nowrap;">${escapeHTML(label)}</a>`;

    return `<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:11px 14px; background:var(--surface); border:1px solid var(--border); border-radius:10px;">
        <div style="display:flex; flex-direction:column; gap:3px; min-width:0;">
          <span style="font-size:0.88rem; font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(entry.name)}</span>
          ${floorTag}
        </div>
        ${numEl}
    </div>`;
}

/* ── Vue ANNUAIRE : catégories avec badge étage ── */
function _renderAnnuaire(data, q, escapeHTML) {
    let html = '';
    let total = 0;
    data.forEach(section => {
        const matched = section.entries.filter(e => !q
            || e.name.toLowerCase().includes(q)
            || (e.display && e.display.toLowerCase().includes(q))
            || (e.num && e.num.includes(q))
            || section.cat.toLowerCase().includes(q)
        );
        if (!matched.length) return;
        total += matched.length;
        const floorBadge = section.floor
            ? `<span style="font-size:0.65rem; font-weight:800; color:var(--ide); background:var(--ide-glow); border-radius:6px; padding:3px 9px; margin-left:6px; white-space:nowrap;">${escapeHTML(section.floor)}</span>`
            : '';
        html += `<div style="margin-bottom:20px;">
          <div style="display:flex; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:4px;">
            <span style="font-size:0.72rem; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">${section.icon} ${escapeHTML(section.cat)}</span>
            ${floorBadge}
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">`;
        matched.forEach(e => { html += _entryRow(e, escapeHTML, false); });
        html += `</div></div>`;
    });
    return { html, total };
}

/* ── Vue PAR ÉTAGE : regroupement plat par étage ── */
function _renderParEtage(data, q, escapeHTML) {
    const FLOOR_ORDER = ['RDC', 'RDC / Sous-sol', 'Sous-sol', 'Étage 1', 'Étage 1 / 2', 'Étage 2', 'Étages 2 à 6', 'Étage 3', 'Étage 4', 'Étage 5', 'Étage 6', 'Étage 7', '—'];
    const FLOOR_ICON  = { 'RDC': '🚪', 'RDC / Sous-sol': '🚪', 'Sous-sol': '⬇️', 'Étage 1': '1️⃣', 'Étage 1 / 2': '1️⃣', 'Étage 2': '2️⃣', 'Étages 2 à 6': '📊', 'Étage 3': '3️⃣', 'Étage 4': '4️⃣', 'Étage 5': '5️⃣', 'Étage 6': '6️⃣', 'Étage 7': '7️⃣', '—': '📍' };

    // Collect entries by (site+floor)
    const map = new Map();
    data.forEach(section => {
        const floor = section.floor || '—';
        const key   = section.site + '|' + floor;
        if (!map.has(key)) map.set(key, { site: section.site, floor, entries: [] });
        section.entries.forEach(e => {
            if (!q
                || e.name.toLowerCase().includes(q)
                || (e.display && e.display.toLowerCase().includes(q))
                || (e.num && e.num.includes(q))
                || section.cat.toLowerCase().includes(q)
            ) {
                map.get(key).entries.push({ ...e, _cat: section.cat, _icon: section.icon });
            }
        });
    });

    // Sort by site (Creil first) then floor order
    const sorted = [...map.values()]
        .filter(g => g.entries.length)
        .sort((a, b) => {
            if (a.site !== b.site) return a.site === 'Creil' ? -1 : 1;
            const ra = FLOOR_ORDER.indexOf(a.floor);
            const rb = FLOOR_ORDER.indexOf(b.floor);
            return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb);
        });

    let html = '';
    let total = 0;
    let lastSite = null;
    sorted.forEach(({ site, floor, entries }) => {
        total += entries.length;
        if (site !== lastSite) {
            lastSite = site;
            html += `<div style="font-size:0.68rem; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin:${html ? '24px' : '0'} 0 10px;">📍 ${escapeHTML(site)}</div>`;
        }
        const icon = FLOOR_ICON[floor] || '🏢';
        html += `<div style="margin-bottom:18px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; padding:8px 12px; background:var(--surface-sec); border-radius:10px; border:1px solid var(--border);">
            <span style="font-size:1rem;">${icon}</span>
            <span style="font-size:0.88rem; font-weight:900; color:var(--text);">${escapeHTML(floor)}</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">`;
        entries.forEach(e => { html += _entryRow(e, escapeHTML, false); });
        html += `</div></div>`;
    });
    return { html, total };
}

window.renderServices = function renderServices() {
    const SERVICES_DATA = window.SERVICES_DATA;
    const escapeHTML    = window.escapeHTML;
    const container     = document.getElementById('services-list');
    const q = (document.getElementById('services-search')?.value || '').toLowerCase().trim();

    const { html, total } = _servicesTab === 'etage'
        ? _renderParEtage(SERVICES_DATA, q, escapeHTML)
        : _renderAnnuaire(SERVICES_DATA, q, escapeHTML);

    container.innerHTML = (q && total === 0)
        ? `<div style="text-align:center; padding:40px 20px; color:var(--text-muted); font-weight:700; font-size:0.9rem;">Aucun résultat pour « ${escapeHTML(q)} »</div>`
        : html;
};
