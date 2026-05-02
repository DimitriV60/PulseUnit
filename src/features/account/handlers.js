/**
 * Account handlers — modale "Mon compte" (Profil + Préférences + Sécurité + Plus).
 * Extrait inline d'index.html (P2.2 audit 2026-04-30).
 *
 * Dépend (script scope) de : currentUser, appSettings, getProfileAgentType,
 *   updateThemeBtns, openSideMenu, closeSideMenu, logoutUser.
 *
 * Expose sur window : switchAccountTab, openAccount, closeAccount,
 *   openProfile (alias), closeProfile (alias), openSettings (alias),
 *   requestLogoutConfirm, cancelLogoutConfirm, confirmLogoutNow,
 *   openGuide, closeGuide.
 */
(function () {
    function _resetLogoutUI() {
        var d = document.getElementById('account-logout-default');
        var c = document.getElementById('account-logout-confirm');
        if (d) d.style.display = '';
        if (c) c.style.display = 'none';
    }
    window.switchAccountTab = function switchAccountTab(name) {
        var tabs = ['profil', 'prefs', 'securite', 'plus'];
        if (tabs.indexOf(name) === -1) name = 'profil';
        tabs.forEach(function (t) {
            var btn = document.getElementById('acc-tab-btn-' + t);
            var pnl = document.getElementById('acc-panel-' + t);
            var active = (t === name);
            if (btn) {
                btn.classList.toggle('is-active', active);
                btn.setAttribute('aria-selected', active ? 'true' : 'false');
            }
            if (pnl) pnl.style.display = active ? '' : 'none';
        });
    };
    window.openAccount = function openAccount() {
        var m = document.getElementById('account-modal');
        if (!m) return;
        _resetLogoutUI();
        window.switchAccountTab('profil');
        m.style.display = 'flex';
        if (typeof updateThemeBtns === 'function') updateThemeBtns();
        // Refresh identité + type d'agent (réutilise la fct privée du module profile via openProfile-equivalent)
        if (currentUser) {
            var nameEl = document.getElementById('profile-name');
            var roleEl = document.getElementById('profile-role');
            if (nameEl) nameEl.textContent = (((currentUser.lastName || '').toUpperCase()) + ' ' + (currentUser.firstName || '')).trim() || '—';
            if (roleEl) roleEl.textContent = (currentUser.role || '').toUpperCase() || '—';
        }
        var t = (typeof getProfileAgentType === 'function') ? getProfileAgentType() : 'jour-fixe';
        ['jour-fixe', 'nuit-fixe', 'alterne'].forEach(function (opt) {
            var radio = document.getElementById('profile-type-' + opt);
            if (radio) radio.checked = (t === opt);
            var card = document.getElementById('profile-type-card-' + opt);
            if (card) {
                card.classList.toggle('is-active', t === opt);
                card.setAttribute('aria-checked', t === opt ? 'true' : 'false');
            }
        });
        var help = document.getElementById('profile-type-help');
        if (help) {
            help.textContent = ({
                'jour-fixe': "Personnel jour, repos fixes — 35h hebdo (≈1568-1596h annuelles).",
                'nuit-fixe': "Personnel exclusivement nuit (≥90% du temps annuel) — 32h30 hebdo (≈1482h annuelles).",
                'alterne'  : "Alternance jour/nuit — base 35h avec revalorisations sur les nuits travaillées."
            })[t] || '';
        }
        var sSound  = document.getElementById('setting-sound');
        var sHaptic = document.getElementById('setting-haptic');
        var sDnd    = document.getElementById('setting-dnd');
        if (sSound  && typeof appSettings !== 'undefined') sSound.checked  = !!appSettings.sound;
        if (sHaptic && typeof appSettings !== 'undefined') sHaptic.checked = !!appSettings.haptic;
        if (sDnd    && typeof appSettings !== 'undefined') sDnd.checked    = !!appSettings.dnd;
    };
    window.closeAccount = function closeAccount() {
        var m = document.getElementById('account-modal');
        if (m) m.style.display = 'none';
        _resetLogoutUI();
    };
    // Aliases backwards-compat — anciens callers (openProfile depuis Suivi, openSettings éventuel)
    window.openProfile  = window.openAccount;
    window.closeProfile = window.closeAccount;
    window.openSettings = window.openAccount;

    // Mini-confirm déconnexion
    window.requestLogoutConfirm = function requestLogoutConfirm() {
        var d = document.getElementById('account-logout-default');
        var c = document.getElementById('account-logout-confirm');
        if (d) d.style.display = 'none';
        if (c) c.style.display = '';
    };
    window.cancelLogoutConfirm = function cancelLogoutConfirm() {
        _resetLogoutUI();
    };
    window.confirmLogoutNow = function confirmLogoutNow() {
        window.closeAccount();
        window.__logoutSkipConfirm = true;
        if (typeof logoutUser === 'function') logoutUser();
    };

    // Guide PulseUnit — vue plein écran, retour au menu burger à la fermeture
    window.openGuide = function openGuide() {
        if (typeof closeSideMenu === 'function') closeSideMenu();
        var v = document.getElementById('tuto-view');
        if (v) v.style.display = 'flex';
    };
    window.closeGuide = function closeGuide() {
        var v = document.getElementById('tuto-view');
        if (v) v.style.display = 'none';
        if (typeof openSideMenu === 'function') openSideMenu();
    };
})();
