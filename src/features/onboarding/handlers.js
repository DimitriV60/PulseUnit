/**
 * Onboarding handlers — tutoriel interactif au premier login.
 *
 * Affiche un overlay multi-étapes pour découvrir les fonctions principales :
 * - Menu, Planning, Messages, Annuaire, Mon profil + RGPD.
 *
 * Persistance : localStorage 'pu_tutorial_done' = '1' après complétion.
 *
 * Expose sur window :
 *   - startTutorial()      Démarre le tuto manuellement
 *   - maybeStartTutorial() Démarre le tuto si pas encore vu (auto)
 *   - tutorialNext / tutorialPrev / tutorialSkip
 */

(function () {
    'use strict';

    const TUTORIAL_KEY = 'pu_tutorial_done';

    const STEPS = [
        {
            icon: '👋',
            title: 'Bienvenue dans PulseUnit !',
            body: 'En 6 étapes rapides, tu vas découvrir l\'essentiel. Tu peux passer à tout moment et revenir plus tard via Mon profil.',
            note: ''
        },
        {
            icon: '☰',
            title: 'Le menu principal',
            body: 'Le bouton ☰ en haut à gauche ouvre toutes les sections : Planning, Messages, Annuaire, Calculateurs, Protocoles, Pathologies, Lexique…',
            note: 'Astuce : la barre 🔍 en haut du dashboard cherche dans toutes les sections en même temps (services, lexique, protocoles, messages).'
        },
        {
            icon: '📅',
            title: 'Planning & Suivi RH',
            body: 'Pose tes CA, repos, formations, heures supp. Scan Digihops par photo (📷) qui lit ta ligne automatiquement. Compteurs auto avec règles GHPSO + Décrets 2002-8/9.',
            note: 'Export PDF formel pour la DRH dans l\'onglet Suivi RH.'
        },
        {
            icon: '💬',
            title: 'Messagerie',
            body: 'DM 1-à-1 avec n\'importe quel collègue + groupes par rôle (IDE, AS, Réa, USIP, Toute l\'équipe). Mentions @prénom dans les groupes, réactions emoji, réponses, édition, recherche.',
            note: 'La pastille rouge sur 💬 indique le total non-lus. Mode 🌙 Ne pas déranger dans Paramètres pour les nuits.'
        },
        {
            icon: '📞',
            title: 'Annuaire GHPSO',
            body: 'Tous les numéros internes (Creil + Senlis), 3 onglets : Annuaire alphabétique, Par étage, ⭐ Favoris pour épingler tes numéros de garde.',
            note: ''
        },
        {
            icon: '👤',
            title: 'Mon profil & RGPD',
            body: 'Type d\'agent (Jour fixe / Nuit fixe / Alterné) modifiable à tout moment. Bouton 📦 Exporter mes données (.json) pour récupérer tout ce que l\'app stocke sur toi (RGPD art. 15 + 20).',
            note: 'C\'est ici que tu pourras revoir ce tutoriel plus tard.'
        }
    ];

    let _step = 0;

    window.maybeStartTutorial = function maybeStartTutorial() {
        try {
            if (localStorage.getItem(TUTORIAL_KEY) === '1') return;
        } catch (e) {}
        // Délai pour laisser le dashboard se rendre
        setTimeout(() => window.startTutorial(), 600);
    };

    window.startTutorial = function startTutorial() {
        _step = 0;
        _renderStep();
    };

    window.tutorialNext = function tutorialNext() {
        if (_step >= STEPS.length - 1) return _finish();
        _step++;
        _renderStep();
    };

    window.tutorialPrev = function tutorialPrev() {
        if (_step <= 0) return;
        _step--;
        _renderStep();
    };

    window.tutorialSkip = function tutorialSkip() { _finish(); };

    function _finish() {
        try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch (e) {}
        const ov = document.getElementById('pu-tutorial-overlay');
        if (ov) ov.remove();
    }

    function _renderStep() {
        const s = STEPS[_step];
        if (!s) return _finish();

        let ov = document.getElementById('pu-tutorial-overlay');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'pu-tutorial-overlay';
            ov.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.78); z-index:9000; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(6px); padding:20px;';
            document.body.appendChild(ov);
        }

        const total = STEPS.length;
        const pct = Math.round(((_step + 1) / total) * 100);
        const isFirst = _step === 0;
        const isLast = _step === total - 1;

        ov.innerHTML = `
          <div style="background:var(--surface); border-radius:18px; max-width:440px; width:100%; padding:28px 24px 22px; box-shadow:0 25px 70px rgba(0,0,0,0.5); border:1px solid var(--border); position:relative;">
            <button onclick="tutorialSkip()" title="Passer" style="position:absolute; top:10px; right:12px; background:none; border:none; color:var(--text-muted); font-size:1.3rem; cursor:pointer; line-height:1;">×</button>

            <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
              <div style="font-size:2.2rem; flex-shrink:0; line-height:1;">${s.icon}</div>
              <div style="flex:1;">
                <div style="font-size:0.7rem; color:var(--brand-aqua); font-weight:900; letter-spacing:1px; text-transform:uppercase; margin-bottom:2px;">Étape ${_step + 1} / ${total}</div>
                <div style="font-size:1.1rem; font-weight:900; color:var(--text); line-height:1.25;">${s.title}</div>
              </div>
            </div>

            <div style="font-size:0.88rem; line-height:1.55; color:var(--text); font-weight:600;">${s.body}</div>

            ${s.note ? `<div style="margin-top:12px; padding:9px 12px; background:rgba(64,206,234,0.10); border-left:3px solid var(--brand-aqua); border-radius:0 8px 8px 0; font-size:0.78rem; line-height:1.5; color:var(--text-muted); font-weight:700;">💡 ${s.note}</div>` : ''}

            <div style="margin-top:18px; height:4px; background:var(--surface-sec); border-radius:2px; overflow:hidden;">
              <div style="height:100%; background:var(--brand-aqua); width:${pct}%; transition:width 0.3s;"></div>
            </div>

            <div style="display:flex; gap:8px; margin-top:16px; align-items:center;">
              <button onclick="tutorialSkip()" style="background:none; border:none; color:var(--text-muted); font-size:0.78rem; font-weight:700; cursor:pointer; padding:8px 4px;">Passer le tuto</button>
              <div style="flex:1;"></div>
              ${!isFirst ? '<button onclick="tutorialPrev()" style="padding:9px 16px; border-radius:9px; border:1px solid var(--border); background:var(--surface-sec); color:var(--text); font-weight:800; cursor:pointer; font-size:0.84rem;">← Précédent</button>' : ''}
              <button onclick="tutorialNext()" style="padding:9px 18px; border-radius:9px; border:none; background:var(--brand-aqua); color:#fff; font-weight:900; cursor:pointer; font-size:0.84rem;">${isLast ? 'Terminer ✓' : 'Suivant →'}</button>
            </div>
          </div>
        `;
    }
})();
