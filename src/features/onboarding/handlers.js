/**
 * Onboarding handlers — tutoriel interactif au premier login.
 *
 * Affiche un overlay multi-étapes pour découvrir les fonctions principales :
 * - Cartes lit, Carte IDE TECH, Menu, Planning, Messages, Annuaire, Profil.
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

    // ── Helpers de mise en forme du contenu ─────────────────────────────
    // Pastille colorée pour les actions clés ("Tap", "Double-tap", etc.)
    const tag = (color, txt) =>
        `<span style="display:inline-block; padding:2px 8px; border-radius:5px; background:${color}; color:#fff; font-weight:900; font-size:0.78rem; letter-spacing:0.3px;">${txt}</span>`;
    const aqua = (txt) => tag('var(--brand-aqua)', txt);
    const ide  = (txt) => tag('var(--ide)', txt);
    const tech = (txt) => tag('var(--tech)', txt);
    const med  = (txt) => tag('var(--med)', txt);
    const crit = (txt) => tag('var(--crit)', txt);

    // Section avec un titre + une liste d'items
    const section = (titre, items) =>
        `<div style="margin-top:14px;"><div style="font-size:0.72rem; color:var(--text-muted); font-weight:900; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:6px;">${titre}</div>` +
        `<ul style="margin:0; padding-left:18px; display:flex; flex-direction:column; gap:6px;">` +
        items.map(i => `<li style="line-height:1.55;">${i}</li>`).join('') +
        `</ul></div>`;

    const STEPS = [
        // ── 1. ACCUEIL ──────────────────────────────────────────────────
        {
            icon: '👋',
            title: 'Bienvenue dans PulseUnit',
            body:
                `<div style="margin-bottom:10px;">L'app qui regroupe tout ton outillage de garde en réa :</div>` +
                `<ul style="margin:0; padding-left:18px; display:flex; flex-direction:column; gap:6px;">` +
                `<li>🛏 <strong>Tableau des lits</strong> RÉA + USIP</li>` +
                `<li>📅 <strong>Planning & Suivi RH</strong></li>` +
                `<li>💬 <strong>Messagerie d'équipe</strong></li>` +
                `<li>📚 <strong>Outils cliniques</strong> (calculateurs, protocoles, lexique)</li>` +
                `</ul>` +
                `<div style="margin-top:12px;">8 étapes courtes pour faire le tour. Tu peux passer à tout moment.</div>`,
            note: ''
        },

        // ── 2. CARTES LIT ───────────────────────────────────────────────
        {
            icon: '🛏',
            title: 'Le tableau des lits',
            body:
                section('Pour t\'attribuer un lit', [
                    `${aqua('1. Tap')} sur ton nom dans <strong>Effectif</strong> → fond bleuté`,
                    `${aqua('2. Tap')} sur le lit voulu → tu es affecté <span style="color:var(--ide);font-weight:900;">IDE</span> ou <span style="color:var(--as);font-weight:900;">AS</span> selon ton rôle`,
                    `Re-tap sur le même lit pour te retirer`,
                ]) +
                section('Boutons en haut à droite du lit', [
                    `${med('⚠')} <strong>BMR / Isolement</strong>`,
                    `${tag('#d946ef', '💧')} <strong>Dialyse / CVVH</strong>`,
                    `${crit('⚡')} <strong>Patient critique</strong>`,
                    `${tag('var(--text-muted)', '×')} Fermer le lit`,
                ]) +
                section('Barre de progression sous le lit', [
                    `Checklist chambre (BAVU, alarmes scope, oxygène, etc.) — tap pour la dérouler`,
                    `Verte <strong style="color:var(--as);">✓ OK</strong> = tous les points validés`,
                ]),
            note:
                `${aqua('Double-tap')} sur un lit → ouvre la <strong>note du lit</strong> : observations privées, surveillance horaire partagée IDE+AS, et tech notes. 7 emplacements / lit, conservés 7 jours.`
        },

        // ── 3. CARTE IDE TECH ───────────────────────────────────────────
        {
            icon: '🛠',
            title: 'La carte IDE TECH',
            body:
                section('Prendre le slot tech', [
                    `${aqua('1. Tap')} sur ton nom dans Effectif`,
                    `${aqua('2. Tap')} sur la carte IDE TECH → tu prends le slot`,
                    `Re-tap (toi sélectionné) → tu libères le slot`,
                ]) +
                section('Important', [
                    `Tant que tu es IDE Tech, tu <strong>ne peux pas</strong> être assigné à un lit en même temps`,
                    `Tap la <strong>barre des tâches</strong> → liste filtrée jour/nuit, % sauvegardé par garde`,
                    `${aqua('Double-tap')} (sans sélection) → tes notes perso 7 gardes`,
                ]),
            note:
                `<strong>Marqueurs latéraux des cartes</strong> :<br>` +
                `${tech('▌')} bordure GAUCHE = tech note présente (IDE Tech / admin)<br>` +
                `${aqua('▌')} bordure DROITE = ma note IDE/AS perso présente`
        },

        // ── 4. MENU ─────────────────────────────────────────────────────
        {
            icon: '☰',
            title: 'Le menu principal',
            body:
                `<div style="margin-bottom:8px;">Le bouton <strong>☰</strong> en haut à gauche ouvre toutes les sections :</div>` +
                `<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:6px;">` +
                `<div>📅 Planning</div><div>💬 Messages</div>` +
                `<div>📞 Annuaire</div><div>🧮 Calculateurs</div>` +
                `<div>📋 Protocoles</div><div>🦠 Pathologies</div>` +
                `<div>📖 Lexique</div><div>✅ Checklists</div>` +
                `<div>🫁 Respirateur</div><div>🔄 Bourse d'échange</div>` +
                `</div>`,
            note:
                `La barre <strong>🔍 Recherche</strong> en haut du dashboard cherche dans <em>toutes</em> les sections en même temps.`
        },

        // ── 5. PLANNING & RH ────────────────────────────────────────────
        {
            icon: '📅',
            title: 'Planning & Suivi RH',
            body:
                section('Calendrier annuel', [
                    `Pose tes <strong>CA</strong>, repos, formations, heures supp.`,
                    `Bouton <strong>📷 Importer mon planning</strong> : photo de Digihops → IA lit ta ligne automatiquement`,
                ]) +
                section('Suivi RH', [
                    `Compteurs CA / RCV / Frac auto-calculés (Décret 2002-8)`,
                    `Tableau débit/crédit horaire mensuel style Digihops`,
                    `Bouton <strong>📄 PDF</strong> pour la DRH`,
                ]),
            note: `Les jours futurs ne comptent pas dans le débit/crédit annuel — seul ce qui est réalisé est compté.`
        },

        // ── 6. MESSAGES ─────────────────────────────────────────────────
        {
            icon: '💬',
            title: 'Messagerie d\'équipe',
            body:
                section('DM 1-à-1', [
                    `Avec n'importe quel collègue du roster`,
                    `Sync temps réel multi-appareils, persistance à vie`,
                ]) +
                section('Groupes par rôle', [
                    `IDE · AS · Réa · USIP · <strong>Toute l'équipe</strong>`,
                    `Mentions <strong>@prénom</strong>, réactions emoji, réponses`,
                ]),
            note:
                `Pastille rouge sur 💬 = nombre total de non-lus. Mode <strong>🌙 Ne pas déranger</strong> dans Préférences pour les nuits.`
        },

        // ── 7. ANNUAIRE ─────────────────────────────────────────────────
        {
            icon: '📞',
            title: 'Annuaire GHPSO',
            body:
                `<div style="margin-bottom:8px;">Tous les numéros internes (Creil + Senlis), 3 onglets :</div>` +
                `<ul style="margin:0; padding-left:18px; display:flex; flex-direction:column; gap:6px;">` +
                `<li>📋 <strong>Annuaire</strong> alphabétique</li>` +
                `<li>🏢 <strong>Par étage</strong></li>` +
                `<li>⭐ <strong>Favoris</strong> — épingle tes numéros de garde</li>` +
                `</ul>`,
            note: `Tap un numéro → appel direct depuis ton téléphone.`
        },

        // ── 8. PROFIL & RGPD ────────────────────────────────────────────
        {
            icon: '👤',
            title: 'Mon compte & RGPD',
            body:
                section('Menu ☰ → 👤 Mon compte', [
                    `<strong>Profil</strong> : type d'agent (Jour / Nuit / Alterné), modifiable`,
                    `<strong>Préférences</strong> : thème, sons, haptique, ne pas déranger`,
                    `<strong>Sécurité</strong> : changer mon code PIN`,
                    `<strong>Plus</strong> : 📦 export RGPD (.json) · 🎓 revoir ce tuto`,
                ]),
            note:
                `Bug ou idée d'amélioration ? Menu → <strong>🐛 Signaler un bug</strong> ouvre WhatsApp pré-rempli.`
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
            ov.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.82); z-index:9000; display:flex; justify-content:center; align-items:flex-start; backdrop-filter:blur(6px); padding:20px; overflow-y:auto;';
            document.body.appendChild(ov);
        }

        const total = STEPS.length;
        const pct = Math.round(((_step + 1) / total) * 100);
        const isFirst = _step === 0;
        const isLast = _step === total - 1;

        ov.innerHTML = `
          <div style="background:var(--surface); border-radius:18px; max-width:480px; width:100%; padding:24px 22px 18px; box-shadow:0 25px 70px rgba(0,0,0,0.5); border:1px solid var(--border); position:relative; margin-top:max(20px, env(safe-area-inset-top)); margin-bottom:20px;">
            <button data-action="tutorialSkip" title="Passer" aria-label="Fermer le tutoriel" style="position:absolute; top:10px; right:12px; background:var(--surface-sec); border:1px solid var(--border); border-radius:50%; width:32px; height:32px; color:var(--text-muted); font-size:1.1rem; cursor:pointer; line-height:1; display:flex; align-items:center; justify-content:center;">×</button>

            <div style="display:flex; align-items:center; gap:14px; margin-bottom:16px; padding-right:36px;">
              <div style="font-size:2.4rem; flex-shrink:0; line-height:1; width:56px; height:56px; display:flex; align-items:center; justify-content:center; background:rgba(64,206,234,0.10); border-radius:14px;">${s.icon}</div>
              <div style="flex:1; min-width:0;">
                <div style="font-size:0.7rem; color:var(--brand-aqua); font-weight:900; letter-spacing:1.2px; text-transform:uppercase; margin-bottom:3px;">Étape ${_step + 1} / ${total}</div>
                <div style="font-size:1.25rem; font-weight:900; color:var(--text); line-height:1.2;">${s.title}</div>
              </div>
            </div>

            <div style="font-size:0.92rem; line-height:1.65; color:var(--text); font-weight:600;">${s.body}</div>

            ${s.note ? `<div style="margin-top:16px; padding:12px 14px; background:rgba(64,206,234,0.10); border-left:4px solid var(--brand-aqua); border-radius:0 10px 10px 0; font-size:0.85rem; line-height:1.55; color:var(--text); font-weight:600;"><div style="font-weight:900; color:var(--brand-aqua); font-size:0.72rem; letter-spacing:0.6px; text-transform:uppercase; margin-bottom:4px;">💡 Astuce</div>${s.note}</div>` : ''}

            <div style="margin-top:20px; height:5px; background:var(--surface-sec); border-radius:3px; overflow:hidden;">
              <div style="height:100%; background:linear-gradient(90deg, var(--brand-aqua), var(--ide)); width:${pct}%; transition:width 0.35s;"></div>
            </div>

            <div style="display:flex; gap:8px; margin-top:14px; align-items:center;">
              <button data-action="tutorialSkip" style="background:none; border:none; color:var(--text-muted); font-size:0.8rem; font-weight:700; cursor:pointer; padding:9px 4px;">Passer</button>
              <div style="flex:1;"></div>
              ${!isFirst ? '<button data-action="tutorialPrev" style="padding:10px 18px; border-radius:10px; border:1px solid var(--border); background:var(--surface-sec); color:var(--text); font-weight:800; cursor:pointer; font-size:0.88rem;">← Précédent</button>' : ''}
              <button data-action="tutorialNext" style="padding:10px 22px; border-radius:10px; border:none; background:var(--brand-aqua); color:#fff; font-weight:900; cursor:pointer; font-size:0.88rem; box-shadow:0 4px 12px rgba(64,206,234,0.35);">${isLast ? 'Terminer ✓' : 'Suivant →'}</button>
            </div>
          </div>
        `;
    }
})();
