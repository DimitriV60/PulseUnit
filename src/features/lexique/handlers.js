/**
 * Lexique handlers — Dictionnaire médical et abréviations (lecture seule).
 * Dépend de window.LEXIQUE_DATA et window.escapeHTML.
 * Expose les fonctions sur window pour onclick inline.
 */

let currentLexiqueFilter = 'TOUT';

window.openLexique = function openLexique() {
    document.getElementById('lexique-view').style.display = 'flex';
    window.renderLexique();
};

window.closeLexique = function closeLexique() {
    document.getElementById('lexique-view').style.display = 'none';
};

window.setLexiqueFilter = function setLexiqueFilter(cat) {
    currentLexiqueFilter = cat;
    window.renderLexique();
};

window.toggleLexCard = function toggleLexCard(element) {
    element.classList.toggle('expanded');
};

window.renderLexique = function renderLexique() {
    const LEXIQUE_DATA = window.LEXIQUE_DATA;
    const escapeHTML = window.escapeHTML;

    const search = document.getElementById('lexique-search').value.toLowerCase();
    const categories = ["TOUT","PERSONNEL","MONITORAGE","NEURO","SCORES","VENTILATION","VOIES","MATÉRIEL","HÉMODYNAMIQUE","BIO","SEPSIS","MÉDICAMENTS","ÉLIMINATION"];

    const catLabels = {"TOUT":"TOUT","PERSONNEL":"PERSONNEL","MONITORAGE":"MONITORAGE","NEURO":"NEURO","SCORES":"SCORES","VENTILATION":"VENTILATION","VOIES":"VOIES","MATÉRIEL":"MATÉRIEL","HÉMODYNAMIQUE":"HÉMO","BIO":"BIO","SEPSIS":"SEPSIS","MÉDICAMENTS":"MÉDICS","ÉLIMINATION":"ÉLIMINATION","ABREV":"ABRÉVIATIONS"};
    let filtersHTML = '';
    categories.forEach(cat => {
        const isActive = cat === currentLexiqueFilter ? 'active' : '';
        const label = catLabels[cat] || cat;
        filtersHTML += `<button class="lex-filter-btn ${isActive}" onclick="setLexiqueFilter('${cat}')">${label}</button>`;
    });
    document.getElementById('lexique-filters').innerHTML = filtersHTML;

    const filteredData = LEXIQUE_DATA.filter(item => {
        const matchCat = currentLexiqueFilter === 'TOUT' || item.cat === currentLexiqueFilter;
        const matchSearch = item.term.toLowerCase().includes(search) || item.def.toLowerCase().includes(search) || item.fullName.toLowerCase().includes(search);
        return matchCat && matchSearch;
    });

    document.getElementById('lexique-count').textContent = `${filteredData.length} termes affichés`;

    let contentHTML = '';
    if(filteredData.length === 0) {
        contentHTML = `<div style="color:var(--text-muted); text-align:center; padding:20px;">Aucun résultat trouvé.</div>`;
    } else {
        filteredData.forEach(item => {
            contentHTML += `
            <div class="lex-card" onclick="toggleLexCard(this)">
                <div class="lex-term">${escapeHTML(item.term)}</div>
                <div class="lex-fullname">${escapeHTML(item.fullName)}</div>
                <div class="lex-def">${escapeHTML(item.def)}</div>
                <div class="lex-separator"></div>
                <div class="lex-hint">↓ Cliquer pour explication experte</div>
                <span class="lex-tag">${escapeHTML(item.cat)}</span>
                <div class="lex-expert">${escapeHTML(item.expert)}</div>
            </div>`;
        });
    }
    document.getElementById('lexique-content').innerHTML = contentHTML;
};
