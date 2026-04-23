/**
 * Global search handler — Recherche dashboard multi-source (Services + Lexique + Protocoles).
 * Dépend de :
 *   - window.SERVICES_DATA, window.LEXIQUE_DATA, window.PROTOCOLS_DATA (data modules)
 *   - escapeHTML (fonction inline partagée)
 * Les handlers relayés (openServices, openLexique, openProtocoles, renderServices, renderLexique)
 * sont tous exposés sur window par leurs modules respectifs.
 */

window.renderGlobalSearch = function renderGlobalSearch() {
    const SERVICES_DATA = window.SERVICES_DATA;
    const LEXIQUE_DATA = window.LEXIQUE_DATA;
    const PROTOCOLS_DATA = window.PROTOCOLS_DATA;
    const input = document.getElementById('global-search');
    const results = document.getElementById('global-search-results');
    const q = (input?.value || '').trim();

    if (!q || q.length < 2) { results.style.display = 'none'; return; }
    const ql = q.toLowerCase();

    let html = '';

    const srvMatches = [];
    SERVICES_DATA.forEach(section => {
        section.entries.forEach(entry => {
            if (entry.name.toLowerCase().includes(ql) || (entry.display && entry.display.toLowerCase().includes(ql)) || (entry.num && entry.num.includes(ql))) {
                srvMatches.push({ ...entry, cat: section.cat });
            }
        });
    });
    if (srvMatches.length) {
        html += `<div style="padding:8px 14px 4px; font-size:0.72rem; font-weight:900; text-transform:uppercase; letter-spacing:1px; color:var(--brand-aqua);">📞 Services</div>`;
        srvMatches.slice(0, 5).forEach(e => {
            const hasNum = e.num && e.num.trim() !== '';
            const label = e.display && e.display.trim() !== '' ? e.display : e.num;
            html += `<div style="padding:10px 14px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; gap:12px; cursor:pointer;" onclick="document.getElementById('global-search-results').style.display='none'; document.getElementById('global-search').value=''; openServices(); setTimeout(()=>{document.getElementById('services-search').value='${escapeHTML(e.name)}'; renderServices();},120);">
              <span style="font-size:0.88rem; font-weight:700; color:var(--text);">${escapeHTML(e.name)} <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHTML(e.cat)}</span></span>
              ${hasNum ? `<span style="font-size:0.95rem; font-weight:900; color:var(--brand-aqua); white-space:nowrap;">${escapeHTML(label)}</span>` : ''}
            </div>`;
        });
    }

    const lexMatches = LEXIQUE_DATA.filter(t =>
        t.term.toLowerCase().includes(ql) || t.fullName.toLowerCase().includes(ql) || t.def.toLowerCase().includes(ql)
    );
    if (lexMatches.length) {
        html += `<div style="padding:8px 14px 4px; font-size:0.72rem; font-weight:900; text-transform:uppercase; letter-spacing:1px; color:var(--med);">📖 Lexique</div>`;
        lexMatches.slice(0, 4).forEach(t => {
            html += `<div style="padding:10px 14px; border-top:1px solid var(--border); cursor:pointer;" onclick="document.getElementById('global-search-results').style.display='none'; document.getElementById('global-search').value=''; openLexique(); setTimeout(()=>{document.getElementById('lexique-search').value='${escapeHTML(t.term)}'; renderLexique();},120);">
              <span style="font-size:0.88rem; font-weight:700; color:var(--text);">${escapeHTML(t.term)}</span>
              <span style="font-size:0.78rem; color:var(--text-muted); margin-left:8px;">${escapeHTML(t.fullName)}</span>
            </div>`;
        });
    }

    const protoMatches = PROTOCOLS_DATA.filter(p =>
        p.title.toLowerCase().includes(ql) || (p.subtitle && p.subtitle.toLowerCase().includes(ql))
    );
    if (protoMatches.length) {
        html += `<div style="padding:8px 14px 4px; font-size:0.72rem; font-weight:900; text-transform:uppercase; letter-spacing:1px; color:var(--ok);">📋 Protocoles</div>`;
        protoMatches.slice(0, 3).forEach(p => {
            html += `<div style="padding:10px 14px; border-top:1px solid var(--border); cursor:pointer;" onclick="document.getElementById('global-search-results').style.display='none'; document.getElementById('global-search').value=''; openProtocoles();">
              <span style="font-size:0.88rem; font-weight:700; color:var(--text);">${escapeHTML(p.title)}</span>
              ${p.subtitle ? `<span style="font-size:0.78rem; color:var(--text-muted); margin-left:8px;">${escapeHTML(p.subtitle)}</span>` : ''}
            </div>`;
        });
    }

    if (!html) {
        html = `<div style="padding:16px 14px; font-size:0.88rem; font-weight:700; color:var(--text-muted);">Aucun résultat pour "${escapeHTML(q)}"</div>`;
    }

    results.innerHTML = html;
    results.style.display = 'block';
};

// ── Fermeture résultats au clic hors zone ────────────────────────────────────
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-box') && !e.target.closest('.search-area')) {
    document.querySelectorAll('.suggestions').forEach(el => el.style.display = 'none');
  }
  if (!e.target.closest('#global-search') && !e.target.closest('#global-search-results')) {
    const r = document.getElementById('global-search-results');
    if (r) r.style.display = 'none';
  }
});
