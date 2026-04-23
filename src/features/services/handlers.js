/**
 * Services handlers — Annuaire téléphonique des services hospitaliers.
 * Dépend de window.SERVICES_DATA et window.escapeHTML.
 * Expose les fonctions sur window pour onclick inline.
 */

window.openServices = function openServices() {
    document.getElementById('services-view').style.display = 'flex';
    window.renderServices();
};

window.closeServices = function closeServices() {
    document.getElementById('services-view').style.display = 'none';
};

window.renderServices = function renderServices() {
    const SERVICES_DATA = window.SERVICES_DATA;
    const escapeHTML = window.escapeHTML;
    const container = document.getElementById('services-list');
    const q = (document.getElementById('services-search')?.value || '').toLowerCase().trim();
    let html = '';
    let totalVisible = 0;

    SERVICES_DATA.forEach(section => {
        const matched = section.entries.filter(e =>
            !q ||
            e.name.toLowerCase().includes(q) ||
            (e.display && e.display.toLowerCase().includes(q)) ||
            (e.num && e.num.includes(q))
        );
        if (!matched.length) return;
        totalVisible += matched.length;

        html += `<div style="margin-bottom:24px;">
        <div class="pool-title" style="display:flex; align-items:center; gap:8px;">
          <span>${section.icon}</span> ${section.cat}
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">`;

        matched.forEach(entry => {
            const hasNum = entry.num && entry.num.trim() !== '';
            const label = entry.display && entry.display.trim() !== '' ? entry.display : entry.num;
            html += `<div style="background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
            <span style="font-size:0.9rem; font-weight:700; color:var(--text);">${escapeHTML(entry.name)}</span>
            ${hasNum
                ? `<a href="tel:${escapeHTML(entry.num)}" style="font-size:1rem; font-weight:900; color:var(--brand-aqua); text-decoration:none; white-space:nowrap; letter-spacing:0.03em;">${escapeHTML(label)}</a>`
                : `<span style="font-size:0.78rem; font-weight:700; color:var(--text-muted); white-space:nowrap; background:var(--surface-sec); border-radius:6px; padding:4px 10px;">À venir</span>`
            }
          </div>`;
        });

        html += `</div></div>`;
    });

    if (q && totalVisible === 0) {
        html = `<div style="text-align:center; padding:40px 20px; color:var(--text-muted); font-weight:700; font-size:0.9rem;">Aucun résultat pour "${escapeHTML(q)}"</div>`;
    }

    container.innerHTML = html;
};
