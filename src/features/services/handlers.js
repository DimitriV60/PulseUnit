/**
 * Services handlers — Annuaire téléphonique GHPSO.
 * Refonte 2026-04-30 : vue "Par étage" mise en avant + métaphore bâtiment,
 * mini-ascenseur sticky, favoris, sélecteur de site.
 *
 * Dépend de window.SERVICES_DATA et window.escapeHTML.
 */

let _servicesTab  = 'etage';            // 'etage' | 'annuaire' | 'favoris'  — par étage par défaut
let _servicesSite = 'Creil';            // 'Creil' | 'Senlis'
const FAV_KEY     = 'pulseunit_svc_favs';
let _servicesFavs = _loadFavs();

/* ═════════ Persistance favoris ═════════ */
function _loadFavs() {
    try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); }
    catch { return new Set(); }
}
function _saveFavs() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify([...(_servicesFavs)])); } catch {}
}
function _favKey(site, cat, name) { return `${site}|${cat}|${name}`; }

window.toggleServiceFav = function toggleServiceFav(site, cat, name) {
    const k = _favKey(site, cat, name);
    if (_servicesFavs.has(k)) _servicesFavs.delete(k);
    else _servicesFavs.add(k);
    _saveFavs();
    if (window.triggerHaptic) window.triggerHaptic('light');
    renderServices();
};

/* ═════════ Open / Close ═════════ */
window.openServices = function openServices() {
    document.getElementById('services-view').style.display = 'flex';
    _updateTabStyles();
    _updateSiteStyles();
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

window.setServicesSite = function setServicesSite(site) {
    _servicesSite = site;
    _updateSiteStyles();
    renderServices();
};

function _updateTabStyles() {
    const tabs = { etage: 'svc-tab-etage', annuaire: 'svc-tab-annuaire', favoris: 'svc-tab-favoris' };
    Object.entries(tabs).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        const active = _servicesTab === key;
        el.style.background = active ? 'var(--brand-aqua)' : 'var(--surface)';
        el.style.color      = active ? '#fff' : 'var(--text-muted)';
        el.style.border     = active ? 'none' : '1px solid var(--border)';
    });
    // Le sélecteur de site n'a de sens que pour la vue Par étage
    const siteWrap = document.getElementById('svc-site-selector');
    if (siteWrap) siteWrap.style.display = (_servicesTab === 'etage') ? 'flex' : 'none';
}

function _updateSiteStyles() {
    ['Creil', 'Senlis'].forEach(s => {
        const el = document.getElementById('svc-site-' + s);
        if (!el) return;
        const active = _servicesSite === s;
        el.style.background = active ? 'var(--brand-aqua)' : 'var(--surface)';
        el.style.color      = active ? '#fff' : 'var(--text-muted)';
        el.style.border     = active ? 'none' : '1px solid var(--border)';
    });
}

/* ═════════ Reveal numéro masqué ═════════ */
window.revealServiceNum = function revealServiceNum(el, num, fullDisplay) {
    el.outerHTML = `<a href="tel:${num}" style="font-size:0.95rem; font-weight:900; color:var(--brand-aqua); text-decoration:none; white-space:nowrap;">${fullDisplay} 📞</a>`;
};

/* ═════════ Normalisation étages ═════════ */
// Étages canoniques : id numérique pour tri.
// -2 = Sous-sol, 0 = RDC, 1..7 = étages, 99 = Transverse/Administration.
const FLOOR_META = {
    7:  { label: 'Étage 7',          short: '7',  icon: '🏢', accent: '#7B61FF', tag: '7e' },
    6:  { label: 'Étage 6',          short: '6',  icon: '🏢', accent: '#3B82F6', tag: '6e' },
    5:  { label: 'Étage 5',          short: '5',  icon: '🏢', accent: '#06B6D4', tag: '5e' },
    4:  { label: 'Étage 4',          short: '4',  icon: '🏢', accent: '#10B981', tag: '4e' },
    3:  { label: 'Étage 3',          short: '3',  icon: '🏢', accent: '#F59E0B', tag: '3e' },
    2:  { label: 'Étage 2',          short: '2',  icon: '🏢', accent: '#F97316', tag: '2e' },
    1:  { label: 'Étage 1',          short: '1',  icon: '🏢', accent: '#EF4444', tag: '1er' },
    0:  { label: 'Rez-de-chaussée',  short: 'RDC', icon: '🚪', accent: '#22C55E', tag: 'RDC' },
   '-2':{ label: 'Sous-sol',         short: '−1', icon: '⬇️', accent: '#64748B', tag: 'SS' },
    99: { label: 'Administration / Transverse', short: '★', icon: '🗂️', accent: '#94A3B8', tag: 'Adm' }
};

// Détecte un étage depuis n'importe quelle chaîne (libellé section ou nom d'entrée).
function _parseFloor(text) {
    if (!text) return null;
    const t = String(text).toLowerCase();
    if (t.includes('administratif') || t.includes('administration')) return 99;
    if (t.includes('sous-sol')) return -2;
    if (/\brdc\b|rez[- ]de[- ]chauss/.test(t)) return 0;
    // Range "Étages 2 à 6" / "Étages 4-5" → premier étage cité
    const range = t.match(/étages?\s*(\d)\s*(?:à|-|et)\s*(\d)/);
    if (range) return parseInt(range[1], 10);
    // Étage simple "Étage 5", "(Étage 4)"
    const single = t.match(/étage\s*(\d)/);
    if (single) return parseInt(single[1], 10);
    return null;
}

// Renvoie l'étage final pour une entrée donnée.
// 1) Si le nom de l'entrée mentionne explicitement un étage → priorité.
// 2) Sinon on prend le premier étage cité dans section.floor.
// 3) Sinon → 99 (Transverse).
function _resolveFloor(section, entry) {
    const fromEntry = _parseFloor(entry.name);
    if (fromEntry !== null) return fromEntry;
    const fromSection = _parseFloor(section.floor);
    if (fromSection !== null) return fromSection;
    return 99;
}

/* ═════════ Helpers de rendu ═════════ */
function _matchEntry(entry, section, q) {
    if (!q) return true;
    return entry.name.toLowerCase().includes(q)
        || (entry.display && entry.display.toLowerCase().includes(q))
        || (entry.num && entry.num.includes(q))
        || section.cat.toLowerCase().includes(q);
}

function _favStarHTML(site, cat, name) {
    const isFav = _servicesFavs.has(_favKey(site, cat, name));
    const star  = isFav ? '★' : '☆';
    const color = isFav ? '#F59E0B' : 'var(--text-muted)';
    const safe  = (s) => String(s).replace(/'/g, "\\'");
    return `<button onclick="event.stopPropagation();toggleServiceFav('${safe(site)}','${safe(cat)}','${safe(name)}')"
        aria-label="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}"
        style="background:transparent; border:none; cursor:pointer; padding:4px 6px; font-size:1.1rem; color:${color}; line-height:1;">${star}</button>`;
}

function _entryRow(entry, section, escapeHTML, opts = {}) {
    const { showCategory = false, showFloorBadge = false } = opts;
    const hasNum = entry.num && entry.num.trim() !== '';
    const label  = entry.display && entry.display.trim() !== '' ? entry.display : entry.num;

    const badges = [];
    if (showCategory) {
        badges.push(`<span style="font-size:0.62rem; font-weight:800; color:var(--text-muted); background:var(--surface-sec); border:1px solid var(--border); border-radius:5px; padding:2px 7px; white-space:nowrap;">${escapeHTML(section.icon)} ${escapeHTML(section.cat)}</span>`);
    }
    if (showFloorBadge) {
        const f = _resolveFloor(section, entry);
        const meta = FLOOR_META[f];
        if (meta) badges.push(`<span style="font-size:0.62rem; font-weight:900; color:#fff; background:${meta.accent}; border-radius:5px; padding:2px 7px; white-space:nowrap;">${meta.tag}</span>`);
    }
    const badgesHTML = badges.length ? `<div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:3px;">${badges.join('')}</div>` : '';

    const numEl = !hasNum
        ? `<span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); background:var(--surface-sec); border-radius:6px; padding:3px 10px;">—</span>`
        : entry.reveal
            ? `<span onclick="revealServiceNum(this,'${escapeHTML(entry.num)}','${escapeHTML(entry.reveal)}')" style="font-size:0.95rem; font-weight:900; color:var(--brand-aqua); white-space:nowrap; cursor:pointer;">${escapeHTML(label)}</span>`
            : `<a href="tel:${escapeHTML(entry.num)}" style="font-size:0.95rem; font-weight:900; color:var(--brand-aqua); text-decoration:none; white-space:nowrap;">${escapeHTML(label)}</a>`;

    return `<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 12px; background:var(--surface); border:1px solid var(--border); border-radius:10px;">
        <div style="display:flex; align-items:center; gap:6px; min-width:0; flex:1;">
            ${_favStarHTML(section.site, section.cat, entry.name)}
            <div style="display:flex; flex-direction:column; gap:2px; min-width:0; flex:1;">
              <span style="font-size:0.88rem; font-weight:700; color:var(--text); overflow:hidden; text-overflow:ellipsis;">${escapeHTML(entry.name)}</span>
              ${badgesHTML}
            </div>
        </div>
        ${numEl}
    </div>`;
}

/* ═════════ Vue 1 — PAR ÉTAGE (principale) ═════════ */
function _renderParEtage(data, q, escapeHTML) {
    // Filtre par site + recherche, regroupe par étage puis par catégorie
    const byFloor = new Map(); // floorId → Map<cat, {section, entries[]}>
    let total = 0;

    data.forEach(section => {
        if (section.site !== _servicesSite) return;
        section.entries.forEach(e => {
            if (!_matchEntry(e, section, q)) return;
            const f = _resolveFloor(section, e);
            if (!byFloor.has(f)) byFloor.set(f, new Map());
            const catMap = byFloor.get(f);
            if (!catMap.has(section.cat)) catMap.set(section.cat, { section, entries: [] });
            catMap.get(section.cat).entries.push(e);
            total++;
        });
    });

    if (!total) return { html: '', total: 0, floorIds: [] };

    // Ordre architectural : du haut vers le bas (7 → −2), Transverse en dernier
    const order = [7, 6, 5, 4, 3, 2, 1, 0, -2, 99];
    const floorIds = order.filter(f => byFloor.has(f));

    // Mini-ascenseur sticky
    const elevator = `<div id="svc-elevator" style="position:sticky; top:0; z-index:2; display:flex; flex-wrap:wrap; gap:4px; padding:8px 0 12px; background:var(--bg); border-bottom:1px solid var(--border); margin-bottom:14px;">
      <span style="font-size:0.65rem; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; align-self:center; margin-right:4px;">Aller à :</span>
      ${floorIds.map(f => {
        const m = FLOOR_META[f];
        return `<a href="#svc-floor-${f}" onclick="event.preventDefault();document.getElementById('svc-floor-${f}')?.scrollIntoView({behavior:'smooth',block:'start'});if(window.triggerHaptic)triggerHaptic('light');"
          style="display:inline-flex; align-items:center; justify-content:center; min-width:34px; height:30px; padding:0 8px; border-radius:8px; background:${m.accent}; color:#fff; font-size:0.78rem; font-weight:900; text-decoration:none; cursor:pointer;">${m.short}</a>`;
      }).join('')}
    </div>`;

    let html = elevator;

    floorIds.forEach(f => {
        const meta   = FLOOR_META[f];
        const catMap = byFloor.get(f);
        const count  = [...catMap.values()].reduce((s, g) => s + g.entries.length, 0);

        // Bandeau d'étage : numéro géant + libellé + compteur
        html += `<section id="svc-floor-${f}" style="margin-bottom:22px; border:1px solid var(--border); border-radius:14px; overflow:hidden; background:var(--surface-sec);">
          <header style="display:flex; align-items:center; gap:14px; padding:14px 16px; background:linear-gradient(135deg, ${meta.accent} 0%, ${meta.accent}dd 100%); color:#fff;">
            <div style="display:flex; align-items:center; justify-content:center; width:46px; height:46px; border-radius:12px; background:rgba(255,255,255,0.18); font-size:1.4rem; font-weight:900; flex-shrink:0;">${meta.short}</div>
            <div style="flex:1; min-width:0;">
              <div style="font-size:1rem; font-weight:900; line-height:1.1;">${meta.icon} ${escapeHTML(meta.label)}</div>
              <div style="font-size:0.72rem; font-weight:700; opacity:0.9; margin-top:2px;">${count} service${count > 1 ? 's' : ''}</div>
            </div>
          </header>
          <div style="padding:14px;">`;

        // Catégories triées alphabétiquement à l'intérieur de chaque étage
        const sortedCats = [...catMap.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'));
        sortedCats.forEach(([cat, group], idx) => {
            html += `<div style="${idx > 0 ? 'margin-top:14px;' : ''}">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <span style="font-size:1rem;">${group.section.icon}</span>
                <span style="font-size:0.78rem; font-weight:900; color:var(--text); text-transform:uppercase; letter-spacing:0.4px;">${escapeHTML(cat)}</span>
                <span style="margin-left:auto; font-size:0.66rem; font-weight:800; color:var(--text-muted);">${group.entries.length}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:6px;">`;
            group.entries.forEach(e => { html += _entryRow(e, group.section, escapeHTML); });
            html += `</div></div>`;
        });

        html += `</div></section>`;
    });

    return { html, total, floorIds };
}

/* ═════════ Vue 2 — PAR CATÉGORIE (annuaire classique) ═════════ */
function _renderAnnuaire(data, q, escapeHTML) {
    let html = '';
    let total = 0;
    data.forEach(section => {
        const matched = section.entries.filter(e => _matchEntry(e, section, q));
        if (!matched.length) return;
        total += matched.length;
        const floorBadge = section.floor && section.floor !== '—'
            ? `<span style="font-size:0.62rem; font-weight:900; color:#fff; background:var(--brand-aqua); border-radius:5px; padding:2px 8px; white-space:nowrap;">${escapeHTML(section.floor)}</span>`
            : '';
        const siteBadge = `<span style="font-size:0.62rem; font-weight:800; color:var(--text-muted); background:var(--surface-sec); border:1px solid var(--border); border-radius:5px; padding:2px 7px; white-space:nowrap;">📍 ${escapeHTML(section.site)}</span>`;
        html += `<div style="margin-bottom:18px;">
          <div style="display:flex; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
            <span style="font-size:0.95rem;">${section.icon}</span>
            <span style="font-size:0.78rem; font-weight:900; color:var(--text); text-transform:uppercase; letter-spacing:0.4px;">${escapeHTML(section.cat)}</span>
            ${siteBadge}
            ${floorBadge}
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">`;
        matched.forEach(e => { html += _entryRow(e, section, escapeHTML); });
        html += `</div></div>`;
    });
    return { html, total };
}

/* ═════════ Vue 3 — FAVORIS ═════════ */
function _renderFavoris(data, q, escapeHTML) {
    if (!_servicesFavs.size) {
        return {
            html: `<div style="text-align:center; padding:50px 20px; color:var(--text-muted);">
              <div style="font-size:2.5rem; margin-bottom:10px;">⭐</div>
              <div style="font-size:0.92rem; font-weight:800; color:var(--text); margin-bottom:6px;">Aucun favori pour l'instant</div>
              <div style="font-size:0.82rem; line-height:1.5;">Touchez l'étoile ☆ à côté d'un service pour l'ajouter ici. Pratique pour vos numéros de garde.</div>
            </div>`,
            total: 0
        };
    }
    const favs = [];
    data.forEach(section => {
        section.entries.forEach(e => {
            if (_servicesFavs.has(_favKey(section.site, section.cat, e.name)) && _matchEntry(e, section, q)) {
                favs.push({ section, entry: e });
            }
        });
    });
    if (!favs.length) return { html: '', total: 0 };
    let html = `<div style="display:flex; flex-direction:column; gap:6px;">`;
    favs.forEach(({ section, entry }) => { html += _entryRow(entry, section, escapeHTML, { showCategory: true, showFloorBadge: true }); });
    html += `</div>`;
    return { html, total: favs.length };
}

/* ═════════ Render principal ═════════ */
window.renderServices = function renderServices() {
    const SERVICES_DATA = window.SERVICES_DATA;
    const escapeHTML    = window.escapeHTML;
    const container     = document.getElementById('services-list');
    if (!container) return;
    const q = (document.getElementById('services-search')?.value || '').toLowerCase().trim();

    let result;
    if (_servicesTab === 'favoris')      result = _renderFavoris(SERVICES_DATA, q, escapeHTML);
    else if (_servicesTab === 'annuaire') result = _renderAnnuaire(SERVICES_DATA, q, escapeHTML);
    else                                  result = _renderParEtage(SERVICES_DATA, q, escapeHTML);

    container.innerHTML = (q && result.total === 0)
        ? `<div style="text-align:center; padding:40px 20px; color:var(--text-muted); font-weight:700; font-size:0.9rem;">Aucun résultat pour « ${escapeHTML(q)} »</div>`
        : result.html;
};
