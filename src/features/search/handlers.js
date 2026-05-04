/**
 * Global search handler — Recherche dashboard multi-source (Services + Lexique + Protocoles).
 * Dépend de :
 *   - window.SERVICES_DATA, window.LEXIQUE_DATA, window.PROTOCOLS_DATA (data modules)
 *   - escapeHTML (fonction inline partagée)
 * Les handlers relayés (openServices, openLexique, openProtocoles, renderServices, renderLexique)
 * sont tous exposés sur window par leurs modules respectifs.
 */

function _resetGlobalSearchPanel() {
    const r = document.getElementById('global-search-results');
    if (r) r.style.display = 'none';
    const s = document.getElementById('global-search');
    if (s) s.value = '';
    if (typeof window.toggleClearBtn === 'function') window.toggleClearBtn('global-search');
}

window.searchJumpToService = function searchJumpToService(name) {
    _resetGlobalSearchPanel();
    if (typeof window.openServices === 'function') window.openServices();
    setTimeout(() => {
        const f = document.getElementById('services-search');
        if (f) f.value = name;
        if (typeof window.renderServices === 'function') window.renderServices();
    }, 120);
};

window.searchJumpToLexique = function searchJumpToLexique(term) {
    _resetGlobalSearchPanel();
    if (typeof window.openLexique === 'function') window.openLexique();
    setTimeout(() => {
        const f = document.getElementById('lexique-search');
        if (f) f.value = term;
        if (typeof window.renderLexique === 'function') window.renderLexique();
    }, 120);
};

window.searchJumpToProtocoles = function searchJumpToProtocoles() {
    _resetGlobalSearchPanel();
    if (typeof window.openProtocoles === 'function') window.openProtocoles();
};

window.searchJumpToMessagesWith = function searchJumpToMessagesWith(otherId) {
    _resetGlobalSearchPanel();
    if (typeof window.openMessagesWith === 'function') window.openMessagesWith(otherId);
};

window.searchJumpToGroupMessages = function searchJumpToGroupMessages(groupKey) {
    _resetGlobalSearchPanel();
    if (typeof window.openGroupMessages === 'function') window.openGroupMessages(groupKey);
};

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
            html += `<div style="padding:10px 14px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; gap:12px; cursor:pointer;" data-action="searchJumpToService:${escapeHTML(e.name)}">
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
            html += `<div style="padding:10px 14px; border-top:1px solid var(--border); cursor:pointer;" data-action="searchJumpToLexique:${escapeHTML(t.term)}">
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
            html += `<div style="padding:10px 14px; border-top:1px solid var(--border); cursor:pointer;" data-action="searchJumpToProtocoles">
              <span style="font-size:0.88rem; font-weight:700; color:var(--text);">${escapeHTML(p.title)}</span>
              ${p.subtitle ? `<span style="font-size:0.78rem; color:var(--text-muted); margin-left:8px;">${escapeHTML(p.subtitle)}</span>` : ''}
            </div>`;
        });
    }

    // Recherche dans les messages (DM + groupes accessibles à l'utilisateur)
    if (window.currentUser && window.messagesData) {
        const msgMatches = [];
        Object.entries(window.messagesData).forEach(([cid, arr]) => {
            if (!Array.isArray(arr) || arr.length === 0) return;
            const isGroup = cid.startsWith('group__');
            if (isGroup) {
                if (typeof window.userAccessibleGroups === 'function') {
                    const allowed = window.userAccessibleGroups().some(g => g.key === cid);
                    if (!allowed) return;
                } else return;
            } else if (!cid.split('__').includes(window.currentUser.id)) {
                return;
            }
            arr.forEach(m => {
                if ((m.text || '').toLowerCase().includes(ql)) msgMatches.push({ cid, msg: m, isGroup });
            });
        });
        msgMatches.sort((a, b) => (b.msg.createdAt || 0) - (a.msg.createdAt || 0));
        if (msgMatches.length) {
            html += `<div style="padding:8px 14px 4px; font-size:0.72rem; font-weight:900; text-transform:uppercase; letter-spacing:1px; color:var(--brand-aqua);">💬 Messages (${msgMatches.length})</div>`;
            msgMatches.slice(0, 5).forEach(({ cid, msg, isGroup }) => {
                let label = '';
                let openCall = '';
                if (isGroup) {
                    const groupKey = cid;
                    const meta = (window.MESSAGE_GROUPS || []).find(g => g.key === cid);
                    label = meta ? `${meta.icon} ${meta.label}` : '👥 Groupe';
                    openCall = `searchJumpToGroupMessages:${groupKey}`;
                } else {
                    const otherId = cid.split('__').find(p => p !== window.currentUser.id) || cid;
                    const other = (window.roster || []).find(r => r.id === otherId);
                    label = other ? `${other.firstName} ${other.lastName.toUpperCase()}` : 'Conversation';
                    openCall = `searchJumpToMessagesWith:${otherId}`;
                }
                const text = msg.text || '';
                const idx = text.toLowerCase().indexOf(ql);
                const start = Math.max(0, idx - 15);
                const end = Math.min(text.length, idx + ql.length + 30);
                const prefix = (start > 0 ? '…' : '') + escapeHTML(text.slice(start, idx));
                const matched = '<mark style="background:rgba(64,206,234,0.35); color:var(--text); padding:0 2px; border-radius:2px;">' + escapeHTML(text.slice(idx, idx + ql.length)) + '</mark>';
                const suffix = escapeHTML(text.slice(idx + ql.length, end)) + (end < text.length ? '…' : '');
                html += `<div style="padding:10px 14px; border-top:1px solid var(--border); cursor:pointer;" data-action="${openCall}">
                  <div style="font-size:0.85rem; font-weight:800; color:var(--text);">${escapeHTML(label)}</div>
                  <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px; line-height:1.35;">${prefix}${matched}${suffix}</div>
                </div>`;
            });
        }
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
