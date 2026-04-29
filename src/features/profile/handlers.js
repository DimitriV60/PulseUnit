/**
 * Profile handlers — profil agent (type jour-fixe / nuit-fixe / alterne).
 *
 * Source de vérité pour le calcul des heures théoriques par mois (cf. PlanEngine.theoreticalHoursForMonth).
 * Stocké dans PLANS_DOC.{userId}.profile et en localStorage `pulseunit_user_profile_<userId>`.
 *
 * Expose sur window :
 *   - window.userProfile (objet courant)
 *   - openProfile, closeProfile, setAgentType, loadUserProfile, saveUserProfile, getProfileAgentType
 */

(function() {
    'use strict';

    const DEFAULT_PROFILE = { agentType: 'jour-fixe' };

    // ── State ────────────────────────────────────────────────────────────────
    window.userProfile = { ...DEFAULT_PROFILE };

    // Clé localStorage par utilisateur ; fallback "_global" si l'auth n'a pas encore
    // peuplé currentUser au moment de la sauvegarde (rare mais possible).
    const LS_FALLBACK = 'pulseunit_user_profile_global';
    function _lsKey() {
        return currentUser && currentUser.id ? `pulseunit_user_profile_${currentUser.id}` : LS_FALLBACK;
    }

    function _loadFromLocal() {
        const keys = [_lsKey(), LS_FALLBACK];
        for (const k of keys) {
            if (!k) continue;
            try {
                const stored = JSON.parse(localStorage.getItem(k) || 'null');
                if (stored && stored.agentType) {
                    window.userProfile = { ...DEFAULT_PROFILE, ...stored };
                    return;
                }
            } catch(e) { /* ignore */ }
        }
    }

    function _saveLocal() {
        const k = _lsKey();
        try {
            localStorage.setItem(k, JSON.stringify(window.userProfile));
            // Toujours alimenter aussi la clé fallback (= dernière valeur saisie),
            // utile en cas de currentUser non encore peuplé au prochain chargement.
            localStorage.setItem(LS_FALLBACK, JSON.stringify(window.userProfile));
        } catch(e) { console.warn('[profile] save local error', e); }
    }

    function _saveFirestore() {
        if (typeof PLANS_DOC === 'undefined' || !PLANS_DOC) {
            console.warn('[profile] Firestore indisponible — sauvegarde locale uniquement');
            return;
        }
        if (!currentUser || !currentUser.id) {
            console.warn('[profile] currentUser absent — sauvegarde Firestore reportée');
            return;
        }
        const path = `${currentUser.id}.profile`;
        PLANS_DOC.update({ [path]: window.userProfile })
            .catch(() => {
                // Doc inexistant → fallback set merge
                return PLANS_DOC.set({ [currentUser.id]: { profile: window.userProfile } }, { merge: true });
            })
            .catch(e => console.warn('[profile] Firestore sync error', e));
    }

    // ── API publique ─────────────────────────────────────────────────────────

    window.loadUserProfile = async function loadUserProfile(userId) {
        // Reset à la valeur par défaut puis tente de relire local + Firestore
        window.userProfile = { ...DEFAULT_PROFILE };
        if (!userId) return;
        _loadFromLocal();
        if (typeof PLANS_DOC === 'undefined' || !PLANS_DOC) return;
        try {
            const doc = await PLANS_DOC.get();
            if (!doc.exists) return;
            const userPlan = doc.data()[userId];
            if (userPlan && userPlan.profile && userPlan.profile.agentType) {
                window.userProfile = { ...DEFAULT_PROFILE, ...userPlan.profile };
                _saveLocal();
            } else {
                // Migration douce : si pas de profil Firestore mais regime existant ('jour'/'nuit'),
                // dérive un type par défaut. Le user peut toujours corriger via la modale.
                if (userPlan && userPlan.regime === 'nuit') {
                    window.userProfile.agentType = 'nuit-fixe';
                    _saveLocal();
                    _saveFirestore();
                }
            }
        } catch(e) { console.warn('loadUserProfile error', e); }
    };

    window.saveUserProfile = function saveUserProfile() {
        _saveLocal();
        _saveFirestore();
    };

    window.getProfileAgentType = function getProfileAgentType() {
        return (window.userProfile && window.userProfile.agentType) || 'jour-fixe';
    };

    window.setAgentType = function setAgentType(t) {
        if (!['jour-fixe', 'nuit-fixe', 'alterne'].includes(t)) {
            console.warn('[profile] setAgentType — type invalide :', t);
            return;
        }
        window.userProfile.agentType = t;
        saveUserProfile();
        _refreshProfileUI();
        // Si le module planning est ouvert, forcer un recalcul des stats
        if (typeof updatePlanStats === 'function') updatePlanStats();
        if (typeof renderSuiviRH === 'function') renderSuiviRH();
        if (typeof showToast === 'function') showToast('✅ Profil enregistré : ' + t);
        console.log('[profile] setAgentType →', t);
    };

    window.openProfile = function openProfile() {
        const m = document.getElementById('profile-modal');
        if (!m) return;
        m.style.display = 'flex';
        _refreshProfileUI();
    };

    window.closeProfile = function closeProfile() {
        const m = document.getElementById('profile-modal');
        if (m) m.style.display = 'none';
    };

    function _refreshProfileUI() {
        // Identité (lecture seule, depuis currentUser)
        const nameEl = document.getElementById('profile-name');
        const roleEl = document.getElementById('profile-role');
        if (currentUser) {
            if (nameEl) nameEl.textContent = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || '—';
            if (roleEl) roleEl.textContent = (currentUser.role || '').toUpperCase() || '—';
        } else {
            if (nameEl) nameEl.textContent = '—';
            if (roleEl) roleEl.textContent = '—';
        }
        // Type d'agent (cartes radio + radio caché pour la sémantique)
        const t = getProfileAgentType();
        ['jour-fixe', 'nuit-fixe', 'alterne'].forEach(opt => {
            const el = document.getElementById(`profile-type-${opt}`);
            if (el) el.checked = (t === opt);
            const card = document.getElementById(`profile-type-card-${opt}`);
            if (card) {
                card.classList.toggle('is-active', t === opt);
                card.setAttribute('aria-checked', t === opt ? 'true' : 'false');
            }
        });
        // Texte d'aide selon le type
        const help = document.getElementById('profile-type-help');
        if (help) {
            help.textContent = ({
                'jour-fixe': 'Personnel jour, repos fixes — 35h hebdo (≈1568-1596h annuelles).',
                'nuit-fixe': 'Personnel exclusivement nuit (≥90% du temps annuel) — 32h30 hebdo (≈1482h annuelles).',
                'alterne'  : 'Alternance jour/nuit — base 35h avec revalorisations sur les nuits travaillées.'
            })[t] || '';
        }
    }

    // Init UI au chargement (les éléments DOM peuvent ne pas exister tout de suite,
    // _refreshProfileUI gère les manquants en silence)
    document.addEventListener('DOMContentLoaded', _refreshProfileUI);

})();
