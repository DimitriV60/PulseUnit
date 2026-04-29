/**
 * Planning CA — moteur de calcul pur (zéro DOM, zéro Firestore, zéro localStorage).
 * Consommé par : src/features/planning-ca/handlers.js (futurs handlers UI "Suivi RH")
 *                et la vue récap annuelle / export PDF.
 *
 * Toutes les fonctions sont pures : mêmes inputs → mêmes outputs.
 * Les états absents/undefined sont traités comme 'travail' (défense en profondeur,
 * même si l'appelant a normalement déjà résolu les défauts via getPlanDayState).
 *
 * Référentiel : voir wiki/Intelligence/Nomenclature Temps de Travail GHPSO.md
 *               voir wiki/Intelligence/Refonte Module Planning.md
 *
 * Expose : window.PlanEngine
 */

(function () {
    'use strict';

    // --- Constantes métier ---------------------------------------------------

    // Heures théoriques journalières par profil (cf. Nomenclature TT GHPSO chap. cycles)
    //  - jour-fixe : 35h hebdo / 5j  = 7h00/j
    //  - nuit-fixe : 32h30 hebdo / 5j = 6h30/j  (= 6.5)
    //  - alterne   : base jour 7h00/j (les revalorisations J↔N se neutralisent au cumul mensuel)
    const HOURS_PER_DAY_BY_PROFILE = {
        'jour-fixe': 7.0,
        'nuit-fixe': 6.5,
        'alterne':   7.0
    };

    // Durée réalisée par état de planning (en heures décimales)
    // Règles :
    //  - jour : 7h30 effectif (Nomenclature chap. 1.3.2)
    //  - nuit : 10h00 effectif (Nomenclature chap. 1.3.3 — réa typique 20h-08h)
    //  - hs / hs_j / hs_n : 7h (l'HS est décomptée comme journée standard, le détail va sur le compteur dédié)
    //  - formation : 7h (temps réel effectué, on prend la valeur standard d'une journée jour)
    //  - ferie travaillé : 7h30 (équivalent jour, le bonus férié est compté à part via feriesWorked)
    //  - travail (par défaut) : 0h — case non remplie, ne doit pas alimenter le réalisé
    //  - tous les autres (ca/ca_hp/can1/.../rh/rc/rcn/rcv/...) : 0h
    const HOURS_BY_STATE = {
        jour:      7.5,
        nuit:      10.0,
        hs:        7.0,
        hs_j:      7.0,
        hs_n:      7.0,
        formation: 7.0,
        ferie:     7.5  // uniquement si l'agent a travaillé ce jour férié — voir realizedHoursForMonth
    };

    // États qui comptent comme "garde" pour les heures de transmission (15 min/garde)
    const TRANSMISSION_STATES = new Set(['jour', 'nuit', 'hs_j', 'hs_n']);

    // États comptés comme jour travaillé (pour féries travaillés / WE travaillés)
    const WORKED_STATES = new Set(['jour', 'nuit', 'hs', 'hs_j', 'hs_n', 'formation']);

    // États qui constituent une période de CA continue
    const CA_STATES = new Set(['ca', 'can1', 'ca_hp', 'ca_hpn1', 'frac', 'fracn1']);

    // États neutres dans une période de CA (n'interrompent pas, allongent calendarDays)
    const CA_NEUTRAL_STATES = new Set(['rh', 'rc', 'rcn']);

    // Labels mois français (court)
    const MONTH_LABELS = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    // --- Helpers internes ----------------------------------------------------

    function pad2(n) { return String(n).padStart(2, '0'); }

    function dateStr(y, m, d) {
        return `${y}-${pad2(m)}-${pad2(d)}`;
    }

    function daysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    }

    // Itère chaque jour d'un mois et appelle cb(dateStr, dayOfWeek)
    function eachDayInMonth(year, month, cb) {
        const nb = daysInMonth(year, month);
        for (let d = 1; d <= nb; d++) {
            const ds = dateStr(year, month, d);
            const dow = new Date(year, month - 1, d).getDay();
            cb(ds, dow);
        }
    }

    // Itère chaque jour de l'année
    function eachDayInYear(year, cb) {
        for (let m = 1; m <= 12; m++) eachDayInMonth(year, m, cb);
    }

    // Récupère l'état d'un jour, traite undefined comme 'travail' (défense en profondeur)
    function stateOf(planStates, ds) {
        const s = planStates && planStates[ds];
        return s === undefined ? 'travail' : s;
    }

    // --- 1. Heures théoriques mensuelles -------------------------------------

    function theoreticalHoursForMonth(year, month, profile) {
        const hPerDay = HOURS_PER_DAY_BY_PROFILE[profile];
        if (hPerDay === undefined) return 0;
        const feries = (typeof window !== 'undefined' && typeof window.getJoursFeries === 'function')
            ? window.getJoursFeries(year)
            : new Set();
        let workdays = 0;
        eachDayInMonth(year, month, (ds, dow) => {
            const isWE = (dow === 0 || dow === 6);
            if (!isWE && !feries.has(ds)) workdays++;
        });
        return workdays * hPerDay;
    }

    // --- 2. Heures réalisées mensuelles --------------------------------------

    function realizedHoursForMonth(year, month, planStates, joursFeries) {
        const feries = joursFeries || new Set();
        let total = 0;
        eachDayInMonth(year, month, (ds) => {
            const st = stateOf(planStates, ds);
            // Cas spécial : 'ferie' n'apporte des heures que si on l'a explicitement marqué travaillé
            // Dans le modèle PulseUnit, 'ferie' sur un jour férié = férié travaillé (l'agent a saisi ce code).
            // Sur un jour non férié, l'état 'ferie' reste sémantiquement "travaillé en mode férié" → on garde 7.5h.
            if (st === 'ferie') {
                total += HOURS_BY_STATE.ferie;
                return;
            }
            const h = HOURS_BY_STATE[st];
            if (h !== undefined) total += h;
        });
        return total;
    }

    // --- 3. Débit/crédit mensuel ---------------------------------------------

    function monthlyDebitCredit(year, month, planStates, joursFeries, profile) {
        return realizedHoursForMonth(year, month, planStates, joursFeries)
             - theoreticalHoursForMonth(year, month, profile);
    }

    // --- 4. Tableau annuel débit/crédit + cumul ------------------------------

    function yearlyDebitCreditTable(year, planStates, joursFeries, profile) {
        const rows = [];
        let cumul = 0;
        for (let m = 1; m <= 12; m++) {
            const dc = monthlyDebitCredit(year, m, planStates, joursFeries, profile);
            cumul += dc;
            rows.push({
                month: m,
                monthLabel: MONTH_LABELS[m - 1],
                monthName:  MONTH_LABELS[m - 1],
                debitCredit: dc,
                cumul: cumul
            });
        }
        return rows;
    }

    // --- 5. Heures de transmission -------------------------------------------

    function transmissionHours(year, planStates) {
        let gardes = 0;
        eachDayInYear(year, (ds) => {
            const st = stateOf(planStates, ds);
            if (TRANSMISSION_STATES.has(st)) gardes++;
        });
        const totalHours = gardes * 0.25;
        return {
            gardes,
            totalHours,
            formatted: _formatTransmission(totalHours)
        };
    }

    // Format spécifique transmissions : "Xh YYmin" (ex. "2h45min", "0h15min")
    function _formatTransmission(h) {
        const sign = h < 0 ? '-' : '';
        const abs  = Math.abs(h);
        const hh   = Math.floor(abs);
        const mm   = Math.round((abs - hh) * 60);
        return `${sign}${hh}h${pad2(mm)}min`;
    }

    // --- 6. Récap annuel pour export PDF -------------------------------------

    function yearlyRecap(year, planStates, joursFeries, profile) {
        const feries = joursFeries || new Set();

        const daysWorked = { jour: 0, nuit: 0, hs_j: 0, hs_n: 0, formation: 0, total: 0 };
        const daysOff = {
            ca: 0, ca_hp: 0, can1: 0, ca_hpn1: 0,
            frac: 0, fracn1: 0,
            rcv: 0, rcvn1: 0,
            hp: 0, hpn1: 0,
            rh: 0, rc: 0, rcn: 0,
            ferie: 0, maladie: 0
        };

        let feriesWorked = 0;
        const weekendsSet = new Set(); // clés "YYYY-Www" pour dédupliquer
        let samedis = 0, dimanches = 0;

        eachDayInYear(year, (ds) => {
            const st = stateOf(planStates, ds);
            const dt = new Date(ds + 'T12:00:00');
            const dow = dt.getDay(); // 0=dim, 6=sam
            const isHoliday = feries.has(ds);

            // Compteurs travail
            if (st === 'jour') daysWorked.jour++;
            else if (st === 'nuit') daysWorked.nuit++;
            else if (st === 'hs_j') daysWorked.hs_j++;
            else if (st === 'hs_n') daysWorked.hs_n++;
            else if (st === 'formation') daysWorked.formation++;

            // Compteurs absences/repos
            if (Object.prototype.hasOwnProperty.call(daysOff, st)) {
                daysOff[st]++;
            }
            // Note: 'hs' brut (sans suffixe j/n) n'est pas dans daysWorked détaillé ;
            // il existe mais reste rare. On le compte dans total via WORKED_STATES.

            // Fériés travaillés : agent a un état "travaillé" un jour férié,
            // OU a explicitement coché 'ferie' (qui signifie "férié travaillé" dans PulseUnit)
            if (isHoliday && WORKED_STATES.has(st)) feriesWorked++;
            if (st === 'ferie') feriesWorked++; // explicite

            // Week-ends travaillés (samedi=6, dimanche=0)
            if ((dow === 0 || dow === 6) && (WORKED_STATES.has(st) || st === 'ferie')) {
                if (dow === 6) samedis++;
                else dimanches++;
                // On comptabilise 1 par WE (ISO week)
                const week = _isoWeekKey(dt);
                weekendsSet.add(week);
            }
        });

        daysWorked.total = daysWorked.jour + daysWorked.nuit + daysWorked.hs_j + daysWorked.hs_n + daysWorked.formation;

        // Totaux horaires annuels
        let totalRealized = 0, totalTheoretical = 0;
        for (let m = 1; m <= 12; m++) {
            totalRealized    += realizedHoursForMonth(year, m, planStates, feries);
            totalTheoretical += theoreticalHoursForMonth(year, m, profile);
        }

        return {
            daysWorked,
            daysOff,
            feriesWorked,
            weekendsWorked: weekendsSet.size,
            weekendDaysWorked: { samedis, dimanches },
            totalRealizedHours: totalRealized,
            totalTheoreticalHours: totalTheoretical,
            totalDebitCredit: totalRealized - totalTheoretical,
            transmissions: transmissionHours(year, planStates)
        };
    }

    // Clé ISO semaine grossière (année + numéro semaine) pour dédupliquer les WE
    function _isoWeekKey(dt) {
        const target = new Date(dt.valueOf());
        const dayNr = (dt.getDay() + 6) % 7; // 0 = lundi
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() !== 4) {
            target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
        }
        const week = 1 + Math.ceil((firstThursday - target) / 604800000);
        return `${dt.getFullYear()}-W${pad2(week)}`;
    }

    // --- 7. Périodes CA consécutives -----------------------------------------

    function consecutiveCAPeriods(year, planStates, joursFeries) {
        const periods = [];
        let cur = null; // { start, end, lengthDays, lengthCalendarDays }

        const flush = () => {
            if (cur) {
                cur.exceedsLimit = cur.lengthCalendarDays > 31;
                periods.push(cur);
            }
            cur = null;
        };

        eachDayInYear(year, (ds) => {
            const st = stateOf(planStates, ds);

            if (CA_STATES.has(st)) {
                if (!cur) {
                    cur = { start: ds, end: ds, lengthDays: 1, lengthCalendarDays: 1 };
                } else {
                    cur.end = ds;
                    cur.lengthDays++;
                    cur.lengthCalendarDays++;
                }
            } else if (CA_NEUTRAL_STATES.has(st)) {
                // N'interrompt pas une période en cours, l'allonge en calendarDays
                if (cur) {
                    cur.end = ds;
                    cur.lengthCalendarDays++;
                }
                // Si pas de période en cours, on ignore (un RH/RC isolé ne démarre pas)
            } else {
                // Tout autre état (travail/jour/nuit/hs*/formation/ferie/maladie/...) = interruption
                flush();
            }
        });
        flush();

        return periods;
    }

    // --- 8. Soldes posés par poste -------------------------------------------

    function soldesPostes(year, planStates) {
        const counters = {
            ca: 0, can1: 0, ca_hp: 0, ca_hpn1: 0,
            frac: 0, fracn1: 0,
            rcv: 0, rcvn1: 0,
            hp: 0, hpn1: 0,
            rc: 0, rcn: 0
        };
        eachDayInYear(year, (ds) => {
            // On ne compte que les états explicitement saisis (pas les défauts résolus)
            const raw = planStates && planStates[ds];
            if (raw !== undefined && Object.prototype.hasOwnProperty.call(counters, raw)) {
                counters[raw]++;
            }
        });
        return counters;
    }

    // --- 9. Format heures style Digihops -------------------------------------
    // 2.75 → "02h45" ; -2.5 → "-02h30" ; 0 → "00h00"

    function formatHours(hoursDecimal) {
        if (hoursDecimal === 0 || hoursDecimal === null || hoursDecimal === undefined || isNaN(hoursDecimal)) {
            return '00h00';
        }
        const sign = hoursDecimal < 0 ? '-' : '';
        const abs  = Math.abs(hoursDecimal);
        const hh   = Math.floor(abs);
        const mm   = Math.round((abs - hh) * 60);
        // Gérer le carry sur arrondi (ex. 2.999h → 3h00 et non 2h60)
        if (mm === 60) {
            return `${sign}${pad2(hh + 1)}h00`;
        }
        return `${sign}${pad2(hh)}h${pad2(mm)}`;
    }

    // --- Export global -------------------------------------------------------

    if (typeof window !== 'undefined') {
        window.PlanEngine = {
            theoreticalHoursForMonth,
            realizedHoursForMonth,
            monthlyDebitCredit,
            yearlyDebitCreditTable,
            transmissionHours,
            yearlyRecap,
            consecutiveCAPeriods,
            soldesPostes,
            formatHours
        };
    }

    // --- Tests rapides (désactivés — bloc à activer manuellement) ------------
    // Décommenter le `if (false)` en `if (true)` pour exécuter dans une console navigateur.

    if (false) {
        const assert = (label, cond) => console.log((cond ? 'OK  ' : 'FAIL') + ' — ' + label);

        // Stub minimal des jours fériés pour les tests Node
        const fakeFeries = new Set();

        // Test 1 : journée 'jour' → 7.5h réalisé
        const t1States = { '2026-01-15': 'jour' };
        const t1 = realizedHoursForMonth(2026, 1, t1States, fakeFeries);
        assert('Une journée jour → 7.5h', t1 === 7.5);

        // Test 2 : Janvier 2026 plein de 'travail' (par défaut, donc 0h réalisé)
        // → débit/crédit = -theorique
        const t2 = monthlyDebitCredit(2026, 1, {}, fakeFeries, 'jour-fixe');
        const t2theo = theoreticalHoursForMonth(2026, 1, 'jour-fixe');
        assert('Janvier 2026 vide → DC = -théorique', t2 === -t2theo);

        // Test 3 : transmissionHours avec 11 gardes → 2h45
        const t3States = {};
        for (let i = 1; i <= 11; i++) t3States[`2026-01-${pad2(i)}`] = i % 2 ? 'jour' : 'nuit';
        const t3 = transmissionHours(2026, t3States);
        assert('11 gardes → 2.75h',   t3.totalHours === 2.75);
        assert('11 gardes → "2h45min"', t3.formatted === '2h45min');

        // Test 4 : 5 CA + RH au milieu = 1 période de 6 calendarDays
        const t4States = {
            '2026-03-02': 'ca',
            '2026-03-03': 'ca',
            '2026-03-04': 'rh',
            '2026-03-05': 'ca',
            '2026-03-06': 'ca',
            '2026-03-07': 'ca'
        };
        const t4 = consecutiveCAPeriods(2026, t4States, fakeFeries);
        assert('1 seule période détectée', t4.length === 1);
        assert('lengthDays = 5',           t4[0] && t4[0].lengthDays === 5);
        assert('lengthCalendarDays = 6',   t4[0] && t4[0].lengthCalendarDays === 6);

        // Bonus : formatHours
        assert('formatHours(2.75) = "02h45"',  formatHours(2.75)  === '02h45');
        assert('formatHours(-2.5) = "-02h30"', formatHours(-2.5)  === '-02h30');
        assert('formatHours(0) = "00h00"',     formatHours(0)     === '00h00');
    }

})();
