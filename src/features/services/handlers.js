/**
 * Services handlers — Annuaire téléphonique des services hospitaliers.
 * Dépend de window.SERVICES_DATA et window.escapeHTML.
 * Expose les fonctions sur window pour onclick inline.
 */

let _servicesViewMode = 'service'; // 'service' | 'floor'

window.openServices = function openServices() {
    document.getElementById('services-view').style.display = 'flex';
    window.renderServices();
};

window.closeServices = function closeServices() {
    document.getElementById('services-view').style.display = 'none';
};

window.toggleServicesView = function toggleServicesView() {
    _servicesViewMode = _servicesViewMode === 'service' ? 'floor' : 'service';
    window.renderServices();
};

window.revealServiceNum = function revealServiceNum(el, num, fullDisplay) {
    el.innerHTML = `<a href="tel:${num}" style="font-size:0.95rem; font-weight:900; color:var(--brand-aqua); text-decoration:none; white-space:nowrap; letter-spacing:0.03em;">${fullDisplay} 📞</a>`;
    el.onclick = null;
    el.style.cursor = 'default';
};

function renderEntryRow(entry, escapeHTML) {
    const hasNum = entry.num && entry.num.trim() !== '';
    const label = entry.display && entry.display.trim() !== '' ? entry.display : entry.num;
    if (!hasNum) {
        return `<div style="background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
            <span style="font-size:0.9rem; font-weight:700; color:var(--text);">${escapeHTML(entry.name)}</span>
            <span style="font-size:0.78rem; font-weight:700; color:var(--text-muted); white-space:nowrap; background:var(--surface-sec); border-radius:6px; padding:4px 10px;">À venir</span>
        </div>`;
    }
    if (entry.reveal) {
        return `<div style="background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
            <span style="font-size:0.9rem; font-weight:700; color:var(--text);">${escapeHTML(entry.name)}</span>
            <span onclick="revealServiceNum(this,'${escapeHTML(entry.num)}','${escapeHTML(entry.reveal)}')" style="font-size:1rem; font-weight:900; color:var(--brand-aqua); white-space:nowrap; letter-spacing:0.03em; cursor:pointer;">${escapeHTML(label)}</span>
        </div>`;
    }
    return `<div style="background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
        <span style="font-size:0.9rem; font-weight:700; color:var(--text);">${escapeHTML(entry.name)}</span>
        <a href="tel:${escapeHTML(entry.num)}" style="font-size:1rem; font-weight:900; color:var(--brand-aqua); text-decoration:none; white-space:nowrap; letter-spacing:0.03em;">${escapeHTML(label)}</a>
    </div>`;
}

window.renderServices = function renderServices() {
    const SERVICES_DATA = window.SERVICES_DATA;
    const escapeHTML = window.escapeHTML;
    const container = document.getElementById('services-list');
    const q = (document.getElementById('services-search')?.value || '').toLowerCase().trim();
    let html = '';
    let totalVisible = 0;

    // Update toggle button label
    const btn = document.getElementById('services-view-toggle');
    if (btn) btn.textContent = _servicesViewMode === 'floor' ? '📋 Vue par service' : '🏢 Vue par étage';

    if (_servicesViewMode === 'floor') {
        // Group by floor (Creil only, skip Senlis which has no floor data)
        const floorMap = new Map();
        SERVICES_DATA.forEach(section => {
            const matched = section.entries.filter(e =>
                !q ||
                e.name.toLowerCase().includes(q) ||
                (e.display && e.display.toLowerCase().includes(q)) ||
                (e.num && e.num.includes(q)) ||
                section.cat.toLowerCase().includes(q)
            );
            if (!matched.length) return;
            totalVisible += matched.length;
            const key = section.site + '|' + (section.floor || '—');
            if (!floorMap.has(key)) floorMap.set(key, { site: section.site, floor: section.floor || '—', sections: [] });
            floorMap.get(key).sections.push({ section, matched });
        });

        // Sort: Creil first by floor label, then Senlis
        const sorted = [...floorMap.values()].sort((a, b) => {
            if (a.site !== b.site) return a.site === 'Creil' ? -1 : 1;
            const rank = { 'Sous-sol': 0, 'RDC': 1, 'RDC / Sous-sol': 1, 'Étage 1': 2, 'Étage 1 / 2': 2, 'Étage 2': 3, 'Étage 2 à 6': 3, 'Étage 3': 4, 'Étage 4': 5, 'Étage 5': 6, 'Étage 6': 7, 'Étage 7': 8 };
            return (rank[a.floor] ?? 99) - (rank[b.floor] ?? 99);
        });

        sorted.forEach(({ site, floor, sections }) => {
            html += `<div style="margin-bottom:24px;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                <div style="background:var(--ide-glow); border:1px solid rgba(96,206,234,0.3); border-radius:8px; padding:4px 12px; font-size:0.72rem; font-weight:900; color:var(--ide); text-transform:uppercase; letter-spacing:1px; white-space:nowrap;">🏢 ${escapeHTML(floor)}</div>
                <div style="font-size:0.72rem; font-weight:700; color:var(--text-muted);">${escapeHTML(site)}</div>
              </div>`;
            sections.forEach(({ section, matched }) => {
                html += `<div style="margin-bottom:12px;">
                  <div style="font-size:0.72rem; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; display:flex; align-items:center; gap:6px;">${section.icon} ${escapeHTML(section.cat)}</div>
                  <div style="display:flex; flex-direction:column; gap:6px;">`;
                matched.forEach(entry => { html += renderEntryRow(entry, escapeHTML); });
                html += `</div></div>`;
            });
            html += `</div>`;
        });
    } else {
        SERVICES_DATA.forEach(section => {
            const matched = section.entries.filter(e =>
                !q ||
                e.name.toLowerCase().includes(q) ||
                (e.display && e.display.toLowerCase().includes(q)) ||
                (e.num && e.num.includes(q))
            );
            if (!matched.length) return;
            totalVisible += matched.length;

            const floorBadge = section.floor
                ? `<span style="font-size:0.65rem; font-weight:800; color:var(--ide); background:var(--ide-glow); border-radius:6px; padding:2px 8px; margin-left:8px;">${escapeHTML(section.floor)}</span>`
                : '';

            html += `<div style="margin-bottom:24px;">
            <div class="pool-title" style="display:flex; align-items:center; gap:8px;">
              <span>${section.icon}</span> ${section.cat}${floorBadge}
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">`;
            matched.forEach(entry => { html += renderEntryRow(entry, escapeHTML); });
            html += `</div></div>`;
        });
    }

    if (q && totalVisible === 0) {
        html = `<div style="text-align:center; padding:40px 20px; color:var(--text-muted); font-weight:700; font-size:0.9rem;">Aucun résultat pour "${escapeHTML(q)}"</div>`;
    }

    container.innerHTML = html;
};
