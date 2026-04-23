/**
 * Settings handlers — modale Paramètres (thème, son, haptique).
 *
 * NB : l'init thème anti-flash (`savedTheme`, `applyTheme`, `getAutoTheme`, `appSettings`)
 *      reste dans le <script> du <head> d'index.html — nécessaire AVANT rendu CSS
 *      pour éviter un flash blanc en mode sombre. Ce handlers.js ne contient que
 *      les fonctions appelées par le DOM (après chargement).
 *
 * Expose sur window : openSettings, setTheme, updateThemeBtns, toggleAppSetting.
 */

window.openSettings = function openSettings() {
    document.getElementById('settings-modal').style.display = 'flex';
};

window.setTheme = function setTheme(t) {
    savedTheme = t;
    localStorage.setItem('pulseunit_theme', t);
    applyTheme(t);
    updateThemeBtns();
};

function updateThemeBtns() {
    const btns = { auto: 'theme-btn-auto', light: 'theme-btn-light', dark: 'theme-btn-dark' };
    const desc = { auto: 'Automatique (\u2600\uFE0F Jour / \uD83C\uDF19 Nuit selon l\'heure)', light: 'Th\u00E8me clair permanent', dark: 'Th\u00E8me sombre permanent' };
    Object.entries(btns).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        const active = savedTheme === key;
        el.style.background  = active ? 'var(--brand-aqua)' : 'var(--pill-bg)';
        el.style.color       = active ? '#fff' : 'var(--text)';
        el.style.borderColor = active ? 'var(--brand-aqua)' : 'var(--border)';
        el.style.boxShadow   = active ? '0 0 8px rgba(64,206,234,0.3)' : 'none';
    });
    const d = document.getElementById('theme-desc-modal');
    if (d) d.textContent = desc[savedTheme] || '';
}
window.updateThemeBtns = updateThemeBtns;

window.toggleAppSetting = function toggleAppSetting(key) {
    appSettings[key] = document.getElementById('setting-' + key).checked;
    localStorage.setItem('pulseunit_settings', JSON.stringify(appSettings));
};

// ── Init UI au chargement ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    updateThemeBtns();
    document.getElementById('setting-sound').checked  = appSettings.sound;
    document.getElementById('setting-haptic').checked = appSettings.haptic;
});
