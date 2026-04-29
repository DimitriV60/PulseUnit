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

    // Heures annuelles théoriques par profil (cf. Nomenclature TT GHPSO chap. cycles)
    //  - jour-fixe : 35h hebdo → 1582h annuelles (en repos variables, ≥10 DJF)
    //  - nuit-fixe : 32h30 hebdo → 1482h annuelles (personnel exclusivement nuit)
    //  - alterne   : base 1582h, mêmes droits qu'un agent jour fixe au global
    // Source : Guide DRH GHPSO 2014 chap. 1.4.4
    const ANNUAL_HOURS_BY_PROFILE = {
        'jour-fixe': 1582,
        'nuit-fixe': 1482,
        'alterne':   1582
    };

    // Coefficient de revalorisation des nuits chez un agent NON nuit-fixe
    //  - alterne : 1582 / 1456.5 = 1.0862 (Guide DRH 2014, repos variables)
    //  - jour-fixe : ne fait pas de nuits par définition (mais on garde 1.0 par défaut)
    //  - nuit-fixe : pas de revalorisation (12h plein, c'est leur cycle)
    // Source : "Conversion JOUR-NUIT" — Guide DRH 2014 chap. cycles de travail effectif
    const NIGHT_REVALORIZATION = {
        'jour-fixe': 1.087,  // au cas où un jour-fixe ferait une nuit ponctuelle (HS_n typique)
        'nuit-fixe': 1.000,
        'alterne':   1.087
    };

    // Durée réalisée par état de planning (en heures décimales) — réa GHPSO en cycles 12h
    // Règles :
    //  - jour : 12h effectif (garde 8h-20h, dérogation art. 7 Décret 2002-9)
    //  - nuit : 12h effectif × revalorisation selon profil (cf. NIGHT_REVALORIZATION)
    //  - hs / hs_j : 12h (HS jour comptée comme une garde complète)
    //  - hs_n : 12h × revalorisation nuit (idem nuit normale)
    //  - formation : 7h (forfait demi-journée — pratique réa, en réalité = temps réel effectué)
    //  - ferie travaillé : 12h (équivalent garde complète, le bonus férié est compté à part)
    //  - travail (par défaut) : 0h — case non remplie
    //  - tous les autres (ca/ca_hp/can1/.../rh/rc/rcn/rcv/...) : 0h
    const HOURS_BY_STATE_BASE = {
        jour:      12.0,
        nuit:      12.0,  // revalorisé selon profil dans realizedHoursForMonth
        hs:        12.0,
        hs_j:      12.0,
        hs_n:      12.0,  // revalorisé selon profil aussi (HSN = nuit en HS)
        formation: 7.0,
        ferie:     12.0
    };

    // États dont les heures sont revalorisées chez un agent jour-fixe ou alterné qui fait une nuit
    const NIGHT_LIKE_STATES = new Set(['nuit', 'hs_n']);

    // États qui comptent comme "garde" pour les heures de transmission (15 min/garde)
    const TRANSMISSION_STATES = new Set(['jour', 'nuit', 'hs_j', 'hs_n']);

    // États comptés comme jour travaillé (pour féries travaillés / WE travaillés)
    const WORKED_STATES = new Set(['jour', 'nuit', 'hs', 'hs_j', 'hs_n', 'formation']);

    // États qui constituent une période de CA continue (toutes formes de congés
    // annuels : CA, CA-HP, Fractionné, HP). Le RCV n'est PAS inclus car ce n'est
    // pas un CA au sens du Décret 84-972 art. 5.
    const CA_STATES = new Set([
        'ca', 'can1',
        'ca_hp', 'ca_hpn1',
        'frac', 'fracn1',
        'hp', 'hpn1'
    ]);

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
    // Modèle GHPSO réa (cycles 12h) : on répartit les heures annuelles selon
    // les jours ouvrés (hors WE et fériés) du mois sur l'année, pour préserver
    // le total annuel même quand le calendrier varie (28-31j, 4-5 fériés/mois).
    //
    //   théoriques(mois) = annual_hours × (workdays_mois / workdays_année)
    //
    // Pour jour-fixe / alterné : 1582h/an
    // Pour nuit-fixe : 1482h/an

    function _annualWorkdays(year) {
        const feries = (typeof window !== 'undefined' && typeof window.getJoursFeries === 'function')
            ? window.getJoursFeries(year)
            : new Set();
        let count = 0;
        eachDayInYear(year, (ds, dow) => {
            const isWE = (dow === 0 || dow === 6);
            if (!isWE && !feries.has(ds)) count++;
        });
        return count;
    }

    function _monthWorkdays(year, month) {
        const feries = (typeof window !== 'undefined' && typeof window.getJoursFeries === 'function')
            ? window.getJoursFeries(year)
            : new Set();
        let count = 0;
        eachDayInMonth(year, month, (ds, dow) => {
            const isWE = (dow === 0 || dow === 6);
            if (!isWE && !feries.has(ds)) count++;
        });
        return count;
    }

    function theoreticalHoursForMonth(year, month, profile) {
        const annual = ANNUAL_HOURS_BY_PROFILE[profile];
        if (annual === undefined) return 0;
        const annualW = _annualWorkdays(year);
        if (annualW === 0) return 0;
        const monthW = _monthWorkdays(year, month);
        return annual * (monthW / annualW);
    }

    // --- 2. Heures réalisées mensuelles --------------------------------------
    // Signature étendue avec `profile` (optionnel pour rétro-compatibilité) pour
    // appliquer la revalorisation des nuits chez les agents non-nuit-fixe.

    function realizedHoursForMonth(year, month, planStates, joursFeries, profile) {
        const feries = joursFeries || new Set();
        const nightCoef = (NIGHT_REVALORIZATION[profile] !== undefined) ? NIGHT_REVALORIZATION[profile] : 1.0;
        let total = 0;
        eachDayInMonth(year, month, (ds) => {
            const st = stateOf(planStates, ds);
            const h = HOURS_BY_STATE_BASE[st];
            if (h === undefined) return;
            // Revalorisation des nuits (nuit, hs_n) selon profil
            const factor = NIGHT_LIKE_STATES.has(st) ? nightCoef : 1.0;
            total += h * factor;
        });
        return total;
    }

    // --- 3. Débit/crédit mensuel ---------------------------------------------

    function monthlyDebitCredit(year, month, planStates, joursFeries, profile) {
        return realizedHoursForMonth(year, month, planStates, joursFeries, profile)
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

        // Totaux horaires annuels — passe `profile` pour la revalorisation nuits
        let totalRealized = 0, totalTheoretical = 0;
        for (let m = 1; m <= 12; m++) {
            totalRealized    += realizedHoursForMonth(year, m, planStates, feries, profile);
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

        // Test 1 : journée 'jour' → 12h réalisé (cycle réa GHPSO)
        const t1States = { '2026-01-15': 'jour' };
        const t1 = realizedHoursForMonth(2026, 1, t1States, fakeFeries, 'jour-fixe');
        assert('Une journée jour → 12h', t1 === 12);

        // Test 1bis : nuit chez agent jour-fixe → 12h × 1.087 = 13.044
        const t1bisStates = { '2026-01-15': 'nuit' };
        const t1bis = realizedHoursForMonth(2026, 1, t1bisStates, fakeFeries, 'alterne');
        assert('Nuit alterné → 12h × 1.087 = 13.044', Math.abs(t1bis - 13.044) < 0.001);

        // Test 1ter : nuit chez agent nuit-fixe → 12h pile (pas de revalo)
        const t1ter = realizedHoursForMonth(2026, 1, t1bisStates, fakeFeries, 'nuit-fixe');
        assert('Nuit nuit-fixe → 12h', t1ter === 12);

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
