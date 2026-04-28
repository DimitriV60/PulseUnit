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

/* ── Vue PAR ÉTAGE : regroupement strict -1, 0, 1, 2, 3, 4, 5, 6, 7 ── */
// Mappe le champ texte floor (libre) vers un étage canonique numérique.
// Les ranges ("Étages 2 à 6", "Étages 4-5") sont assignés à leur premier étage cité.
// Les valeurs "Étage administratif" / "—" / vides tombent dans un bucket "Transverse".
function _normalizeFloor(text) {
    if (!text || text === '—') return { id: 99, num: null, label: 'Transverse / Non spécifié', icon: '📍' };
    const t = String(text).toLowerCase();
    if (t.includes('administratif')) return { id: 99, num: null, label: 'Administration', icon: '🗂️' };
    // Sous-sol seul
    if (t.includes('sous-sol') && !t.includes('rdc')) return { id: -1, num: -1, label: 'Sous-sol (−1)', icon: '⬇️' };
    // RDC + Sous-sol → on classe en RDC (0) puisque RDC est le label primaire
    if (t.includes('rdc')) return { id: 0, num: 0, label: 'RDC (0)', icon: '🚪' };
    // Range "Étages 2 à 6" / "Étages 4-5" → premier étage cité
    const range = t.match(/étages?\s*(\d)\s*(?:à|-|et|à)\s*(\d)/);
    if (range) {
        const n = parseInt(range[1], 10);
        return { id: n, num: n, label: `Étage ${n}`, icon: ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣'][n - 1] || '🏢' };
    }
    // Étage simple "Étage 1", "Étage 1 / 2"
    const single = t.match(/étage\s*(\d)/);
    if (single) {
        const n = parseInt(single[1], 10);
        return { id: n, num: n, label: `Étage ${n}`, icon: ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣'][n - 1] || '🏢' };
    }
    return { id: 99, num: null, label: text, icon: '📍' };
}

function _renderParEtage(data, q, escapeHTML) {
    // Collecte par (site + étage canonique)
    const map = new Map();
    data.forEach(section => {
        const norm = _normalizeFloor(section.floor);
        const key  = section.site + '|' + norm.id;
        if (!map.has(key)) map.set(key, { site: section.site, norm, entries: [] });
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

    // Tri : Creil d'abord, puis étage croissant strict (-1 → 0 → 1 → 2 → ... → 7 → 99)
    const sorted = [...map.values()]
        .filter(g => g.entries.length)
        .sort((a, b) => {
            if (a.site !== b.site) return a.site === 'Creil' ? -1 : 1;
            return a.norm.id - b.norm.id;
        });

    let html = '';
    let total = 0;
    let lastSite = null;
    sorted.forEach(({ site, norm, entries }) => {
        total += entries.length;
        if (site !== lastSite) {
            lastSite = site;
            html += `<div style="font-size:0.68rem; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin:${html ? '24px' : '0'} 0 10px;">📍 ${escapeHTML(site)}</div>`;
        }
        html += `<div style="margin-bottom:18px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; padding:10px 14px; background:var(--surface-sec); border-radius:10px; border:1px solid var(--border);">
            <span style="font-size:1.1rem;">${norm.icon}</span>
            <span style="font-size:0.92rem; font-weight:900; color:var(--text);">${escapeHTML(norm.label)}</span>
            <span style="margin-left:auto; font-size:0.7rem; font-weight:700; color:var(--text-muted);">${entries.length}</span>
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
