/**
 * Services handlers — Annuaire téléphonique GHPSO.
 * Refonte v2 (2026-04-30) : 3 onglets sobres.
 *   1. 📋 Annuaire    — liste alphabétique par site (Creil / Senlis), index A→Z latéral.
 *   2. 🏢 Par étage   — étages distincts, services groupés à l'intérieur de chaque étage.
 *   3. ⭐ Favoris     — numéros épinglés par l'utilisateur, persistance localStorage.
 *
 * Dépend de window.SERVICES_DATA et window.escapeHTML.
 */

let _servicesTab  = 'annuaire';         // 'annuaire' | 'etage' | 'favoris'
let _servicesSite = 'Creil';            // 'Creil' | 'Senlis'
const FAV_KEY     = 'pulseunit_svc_favs';
let _servicesFavs = _loadFavs();

window.scrollToServiceLetter = function scrollToServiceLetter(letter) {
    const el = document.getElementById('svc-letter-' + letter);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (typeof window.triggerHaptic === 'function') window.triggerHaptic('light');
};

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
    const tabs = { annuaire: 'svc-tab-annuaire', etage: 'svc-tab-etage', favoris: 'svc-tab-favoris' };
    Object.entries(tabs).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        const active = _servicesTab === key;
        el.style.background = active ? 'var(--brand-aqua)' : 'var(--surface)';
        el.style.color      = active ? '#fff' : 'var(--text-muted)';
        el.style.border     = active ? 'none' : '1px solid var(--border)';
    });
    // Site selector visible pour Annuaire + Par étage uniquement
    const siteWrap = document.getElementById('svc-site-selector');
    if (siteWrap) siteWrap.style.display = (_servicesTab === 'favoris') ? 'none' : 'flex';
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
const FLOOR_LABEL = {
    7: 'Étage 7', 6: 'Étage 6', 5: 'Étage 5', 4: 'Étage 4',
    3: 'Étage 3', 2: 'Étage 2', 1: 'Étage 1',
    0: 'Rez-de-chaussée', '-2': 'Sous-sol', 99: 'Transverse / Administration'
};
const FLOOR_TAG = {
    7: '7e', 6: '6e', 5: '5e', 4: '4e', 3: '3e', 2: '2e', 1: '1er',
    0: 'RDC', '-2': 'SS', 99: 'Adm'
};

function _parseFloor(text) {
    if (!text) return null;
    const t = String(text).toLowerCase();
    if (t.includes('administratif') || t.includes('administration')) return 99;
    if (t.includes('sous-sol')) return -2;
    if (/\brdc\b|rez[- ]de[- ]chauss/.test(t)) return 0;
    const range = t.match(/étages?\s*(\d)\s*(?:à|-|et)\s*(\d)/);
    if (range) return parseInt(range[1], 10);
    const single = t.match(/étage\s*(\d)/);
    if (single) return parseInt(single[1], 10);
    return null;
}

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
    return `<button data-stop data-action="toggleServiceFav:${safe(site)},${safe(cat)},${safe(name)}"
        aria-label="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}"
        style="background:transparent; border:none; cursor:pointer; padding:4px 6px; font-size:1.15rem; color:${color}; line-height:1;">${star}</button>`;
}

function _floorBadge(f, escapeHTML) {
    const tag = FLOOR_TAG[f];
    if (!tag) return '';
    return `<span style="font-size:0.62rem; font-weight:900; color:var(--text-muted); background:var(--surface-sec); border:1px solid var(--border); border-radius:5px; padding:2px 7px; white-space:nowrap;">${escapeHTML(tag)}</span>`;
}

function _entryRow(entry, section, escapeHTML, opts = {}) {
    const { showFloorBadge = false, showCategory = false } = opts;
    const hasNum = entry.num && entry.num.trim() !== '';
    const label  = entry.display && entry.display.trim() !== '' ? entry.display : entry.num;

    const sub = [];
    if (showCategory) sub.push(`<span style="font-size:0.7rem; font-weight:700; color:var(--text-muted);">${escapeHTML(section.icon)} ${escapeHTML(section.cat)}</span>`);
    if (showFloorBadge) {
        const f = _resolveFloor(section, entry);
        const tag = FLOOR_TAG[f];
        if (tag) sub.push(`<span style="font-size:0.62rem; font-weight:900; color:var(--text-muted); background:var(--surface-sec); border:1px solid var(--border); border-radius:5px; padding:2px 7px;">${escapeHTML(tag)}</span>`);
    }
    const subHTML = sub.length ? `<div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-top:3px;">${sub.join('')}</div>` : '';

    const numEl = !hasNum
        ? `<span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); background:var(--surface-sec); border-radius:6px; padding:3px 10px;">—</span>`
        : entry.reveal
            ? `<span data-action="revealServiceNum:$el,${escapeHTML(entry.num)},${escapeHTML(entry.reveal)}" style="font-size:0.95rem; font-weight:900; color:var(--brand-aqua); white-space:nowrap; cursor:pointer;">${escapeHTML(label)}</span>`
            : `<a href="tel:${escapeHTML(entry.num)}" style="font-size:0.95rem; font-weight:900; color:var(--brand-aqua); text-decoration:none; white-space:nowrap;">${escapeHTML(label)}</a>`;

    return `<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 12px; background:var(--surface); border:1px solid var(--border); border-radius:10px;">
        <div style="display:flex; align-items:center; gap:6px; min-width:0; flex:1;">
            ${_favStarHTML(section.site, section.cat, entry.name)}
            <div style="display:flex; flex-direction:column; gap:0; min-width:0; flex:1;">
              <span style="font-size:0.88rem; font-weight:700; color:var(--text); overflow:hidden; text-overflow:ellipsis;">${escapeHTML(entry.name)}</span>
              ${subHTML}
            </div>
        </div>
        ${numEl}
    </div>`;
}

/* ═════════ Vue 1 — ANNUAIRE alphabétique par site ═════════ */
// Aplatit toutes les entries du site sélectionné, trie A→Z, regroupe par lettre initiale.
// Index latéral A B C ... Z permettant de sauter à une lettre en 1 tap.
function _stripAccents(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function _firstLetter(name) {
    const s = _stripAccents(name).trim().toUpperCase();
    const c = s.charCodeAt(0);
    if (c >= 65 && c <= 90) return s[0];      // A-Z
    if (c >= 48 && c <= 57) return '#';        // chiffre
    return '#';
}

function _renderAnnuaire(data, q, escapeHTML) {
    // Aplatit
    const flat = [];
    data.forEach(section => {
        if (section.site !== _servicesSite) return;
        section.entries.forEach(e => {
            if (!_matchEntry(e, section, q)) return;
            flat.push({ section, entry: e });
        });
    });
    if (!flat.length) return { html: '', total: 0 };

    // Trie alpha (insensible accents)
    flat.sort((a, b) => _stripAccents(a.entry.name).localeCompare(_stripAccents(b.entry.name), 'fr', { sensitivity: 'base' }));

    // Groupe par lettre
    const byLetter = new Map();
    flat.forEach(item => {
        const L = _firstLetter(item.entry.name);
        if (!byLetter.has(L)) byLetter.set(L, []);
        byLetter.get(L).push(item);
    });

    const letters = [...byLetter.keys()].sort((a, b) => {
        if (a === '#') return 1;
        if (b === '#') return -1;
        return a.localeCompare(b);
    });

    // Index latéral A→Z (sticky droite)
    const letterIndex = `<nav id="svc-alpha-index" aria-label="Index alphabétique"
        style="position:fixed; right:6px; top:50%; transform:translateY(-50%); display:flex; flex-direction:column; gap:1px; z-index:5; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:6px 4px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
      ${letters.map(L => `<a href="#svc-letter-${L}" data-action="scrollToServiceLetter:${L}"
        style="display:flex; align-items:center; justify-content:center; width:18px; height:16px; font-size:0.65rem; font-weight:900; color:var(--brand-aqua); text-decoration:none; cursor:pointer;">${escapeHTML(L)}</a>`).join('')}
    </nav>`;

    // Liste
    let html = letterIndex;
    letters.forEach(L => {
        const items = byLetter.get(L);
        html += `<div id="svc-letter-${L}" style="margin-bottom:18px;">
          <div style="display:flex; align-items:center; gap:10px; padding:8px 4px 6px; position:sticky; top:0; background:var(--bg); z-index:1;">
            <span style="display:inline-flex; align-items:center; justify-content:center; min-width:26px; height:26px; padding:0 8px; border-radius:7px; background:var(--brand-aqua); color:#fff; font-size:0.85rem; font-weight:900;">${escapeHTML(L)}</span>
            <span style="font-size:0.66rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">${items.length} entrée${items.length > 1 ? 's' : ''}</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">`;
        items.forEach(({ section, entry }) => {
            html += _entryRow(entry, section, escapeHTML, { showFloorBadge: true, showCategory: true });
        });
        html += `</div></div>`;
    });

    return { html, total: flat.length };
}

/* ═════════ Vue 2 — PAR ÉTAGE (étages → services) ═════════ */
function _renderParEtage(data, q, escapeHTML) {
    const byFloor = new Map();
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
    if (!total) return { html: '', total: 0 };

    const order = [7, 6, 5, 4, 3, 2, 1, 0, -2, 99];
    const floorIds = order.filter(f => byFloor.has(f));

    let html = '';
    floorIds.forEach(f => {
        const catMap = byFloor.get(f);
        const count  = [...catMap.values()].reduce((s, g) => s + g.entries.length, 0);

        // Bandeau d'étage sobre : tag + libellé + compteur
        html += `<section id="svc-floor-${f}" style="margin-bottom:18px;">
          <header style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:var(--surface-sec); border:1px solid var(--border); border-radius:10px; margin-bottom:10px;">
            <span style="display:inline-flex; align-items:center; justify-content:center; min-width:34px; height:30px; padding:0 8px; border-radius:7px; background:var(--brand-aqua); color:#fff; font-size:0.78rem; font-weight:900;">${escapeHTML(FLOOR_TAG[f] || '')}</span>
            <span style="font-size:0.92rem; font-weight:900; color:var(--text);">${escapeHTML(FLOOR_LABEL[f] || '')}</span>
            <span style="margin-left:auto; font-size:0.7rem; font-weight:800; color:var(--text-muted);">${count} service${count > 1 ? 's' : ''}</span>
          </header>`;

        // Services (catégories) triés alphabétiquement à l'intérieur de l'étage
        const sortedCats = [...catMap.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'));
        sortedCats.forEach(([cat, group], idx) => {
            html += `<div style="${idx > 0 ? 'margin-top:14px;' : ''} padding-left:6px;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <span style="font-size:0.95rem;">${group.section.icon}</span>
                <span style="font-size:0.78rem; font-weight:900; color:var(--text);">${escapeHTML(cat)}</span>
                <span style="margin-left:auto; font-size:0.66rem; font-weight:800; color:var(--text-muted);">${group.entries.length}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:6px;">`;
            group.entries.forEach(e => { html += _entryRow(e, group.section, escapeHTML); });
            html += `</div></div>`;
        });

        html += `</section>`;
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
    // Regroupé par site
    const bySite = { Creil: [], Senlis: [] };
    data.forEach(section => {
        section.entries.forEach(e => {
            if (_servicesFavs.has(_favKey(section.site, section.cat, e.name)) && _matchEntry(e, section, q)) {
                (bySite[section.site] || (bySite[section.site] = [])).push({ section, entry: e });
            }
        });
    });
    let html = '';
    let total = 0;
    ['Creil', 'Senlis'].forEach(site => {
        const items = bySite[site] || [];
        if (!items.length) return;
        items.sort((a, b) => _stripAccents(a.entry.name).localeCompare(_stripAccents(b.entry.name), 'fr', { sensitivity: 'base' }));
        total += items.length;
        html += `<div style="margin-bottom:16px;">
          <div style="font-size:0.66rem; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.6px; margin-bottom:8px; padding-left:4px;">📍 ${escapeHTML(site)} · ${items.length}</div>
          <div style="display:flex; flex-direction:column; gap:6px;">`;
        items.forEach(({ section, entry }) => { html += _entryRow(entry, section, escapeHTML, { showFloorBadge: true, showCategory: true }); });
        html += `</div></div>`;
    });
    return { html, total };
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
    else if (_servicesTab === 'etage')   result = _renderParEtage(SERVICES_DATA, q, escapeHTML);
    else                                  result = _renderAnnuaire(SERVICES_DATA, q, escapeHTML);

    container.innerHTML = (q && result.total === 0)
        ? `<div style="text-align:center; padding:40px 20px; color:var(--text-muted); font-weight:700; font-size:0.9rem;">Aucun résultat pour « ${escapeHTML(q)} »</div>`
        : result.html;
};
