/**
 * Conges-calendar handlers — Simulateur CA annuel (localStorage).
 * Dépend de :
 *   - triggerHaptic (inline)
 * Expose les fonctions onclick sur window.
 */

let calYear    = new Date().getFullYear();
let calRegime  = 'variable'; // 'fixes' | 'variable' | 'nuit'

let calSelectedCA = new Set(JSON.parse(localStorage.getItem('pulseunit_cal_ca')  || '[]'));
let calWorkedDJF  = new Set(JSON.parse(localStorage.getItem('pulseunit_cal_djf') || '[]'));

function saveCalData() {
    try {
        localStorage.setItem('pulseunit_cal_ca',  JSON.stringify([...calSelectedCA]));
        localStorage.setItem('pulseunit_cal_djf', JSON.stringify([...calWorkedDJF]));
    } catch(e) {}
}

function getJoursFeries(year) {
    const a = year % 19, b = Math.floor(year/100), c2 = year%100;
    const d = Math.floor(b/4), e = b%4, f = Math.floor((b+8)/25);
    const g = Math.floor((b-f+1)/3);
    const h = (19*a + b - d - g + 15) % 30;
    const i = Math.floor(c2/4), k = c2%4;
    const l = (32 + 2*e + 2*i - h - k) % 7;
    const m = Math.floor((a + 11*h + 22*l) / 451);
    const mo = Math.floor((h + l - 7*m + 114) / 31);
    const dy = ((h + l - 7*m + 114) % 31) + 1;
    const easter = new Date(year, mo-1, dy);
    const add = (dt, n) => { const x = new Date(dt); x.setDate(x.getDate()+n); return x; };
    const fmt = dt => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    return new Set([
        `${year}-01-01`,
        fmt(add(easter, 1)),
        `${year}-05-01`,
        `${year}-05-08`,
        fmt(add(easter, 39)),
        fmt(add(easter, 50)),
        `${year}-07-14`,
        `${year}-08-15`,
        `${year}-11-01`,
        `${year}-11-11`,
        `${year}-12-25`,
    ]);
}
window.getJoursFeries = getJoursFeries;

function isWeekend(d)     { const w=d.getDay(); return w===0||w===6; }
function isHorsSaison(s)  { const m=parseInt(s.slice(5,7)); return m<=4||m>=11; }
function isDJF(dateStr, feries) {
    const dt = new Date(dateStr + 'T12:00:00');
    return dt.getDay()===0 || feries.has(dateStr);
}

function getWorkingDays(year) {
    const fer = getJoursFeries(year);
    const days = []; const d = new Date(year,0,1);
    while (d.getFullYear()===year) {
        const s = d.toISOString().slice(0,10);
        if (!isWeekend(d) && !fer.has(s)) days.push(s);
        d.setDate(d.getDate()+1);
    }
    return days;
}

function getPeriodes(year) {
    const wd = getWorkingDays(year); const periods=[]; let cur=[];
    for (const day of wd) {
        if (calSelectedCA.has(day)) { cur.push(day); }
        else { if(cur.length>0){periods.push([...cur]);cur=[];} }
    }
    if(cur.length>0) periods.push(cur);
    return periods;
}

function calcCongesStats(year) {
    const fer = getJoursFeries(year);
    const caW = [...calSelectedCA].filter(d => {
        if (d.slice(0,4)!==String(year)) return false;
        const dt = new Date(d+'T12:00:00');
        return !isWeekend(dt) && !fer.has(d);
    });
    const totalCA = caW.length;
    const hsCA    = caW.filter(d=>isHorsSaison(d)).length;

    let hsBonus = hsCA>=6 ? 2 : hsCA>=3 ? 1 : 0;

    const allPer  = getPeriodes(year);
    const longPer = allPer.filter(p=>p.length>=5);
    const fracBonus = longPer.length>=3 ? 1 : 0;

    let djfCount = 0, rcvBonus = 0;
    if (calRegime === 'variable') {
        djfCount = [...calWorkedDJF].filter(d => {
            if (d.slice(0,4)!==String(year)) return false;
            return isDJF(d, fer);
        }).length;
        rcvBonus = djfCount >= 20 ? 2 : 0;
    }

    return { totalCA, hsCA, hsBonus, allPer, longPer, fracBonus, djfCount, rcvBonus };
}
window.calcCongesStats = calcCongesStats;

function updateCalStats() {
    const s = calcCongesStats(calYear);

    document.getElementById('cstat-total').textContent      = s.totalCA;
    document.getElementById('cstat-hs').textContent         = s.hsCA;
    document.getElementById('cstat-hs-bonus').textContent   = '+' + s.hsBonus;
    document.getElementById('cstat-per').textContent        = s.longPer.length;
    document.getElementById('cstat-frac-bonus').textContent = '+' + s.fracBonus;
    document.getElementById('cstat-djf').textContent        = calRegime==='variable' ? s.djfCount : '—';
    document.getElementById('cstat-rcv-bonus').textContent  = calRegime==='variable' ? '+'+s.rcvBonus : '—';
    document.getElementById('cstat-grand-total').textContent= 25 + s.hsBonus + s.fracBonus + s.rcvBonus;

    document.getElementById('cstat-hs-bonus').style.color =
        s.hsBonus===2 ? 'var(--as)' : s.hsBonus===1 ? 'var(--ide)' : 'var(--text-muted)';
    document.getElementById('cstat-frac-bonus').style.color =
        s.fracBonus===1 ? 'var(--as)' : 'var(--text-muted)';
    document.getElementById('cstat-rcv-bonus').style.color =
        s.rcvBonus===2 ? 'var(--as)' : 'var(--med)';

    const gris = calRegime !== 'variable';
    document.getElementById('cstat-djf').parentElement.style.opacity      = gris ? '0.35' : '1';
    document.getElementById('cstat-rcv-bonus').parentElement.style.opacity= gris ? '0.35' : '1';
}

window.toggleCADay = function toggleCADay(dateStr) {
    if (calSelectedCA.has(dateStr)) calSelectedCA.delete(dateStr);
    else calSelectedCA.add(dateStr);
    saveCalData();
    triggerHaptic();
    const cell = document.getElementById('cal-d-' + dateStr);
    if (cell) {
        const sel = calSelectedCA.has(dateStr);
        cell.className = 'cal-day workday' + (sel ? (isHorsSaison(dateStr) ? ' ca-hs' : ' ca-ete') : '');
    }
    updateCalStats();
    updateCalMonthCount(dateStr.slice(0,7));
};

window.toggleDJFDay = function toggleDJFDay(dateStr) {
    if (calRegime !== 'variable') return;
    if (calWorkedDJF.has(dateStr)) calWorkedDJF.delete(dateStr);
    else calWorkedDJF.add(dateStr);
    saveCalData();
    triggerHaptic();
    const cell = document.getElementById('cal-d-' + dateStr);
    if (cell) {
        const worked = calWorkedDJF.has(dateStr);
        cell.className = 'cal-day djf-dispo' + (worked ? ' djf-worked' : '');
    }
    updateCalStats();
};

function updateCalMonthCount(monthKey) {
    const el = document.getElementById('cal-mc-' + monthKey);
    if (!el) return;
    const ca  = [...calSelectedCA].filter(d=>d.startsWith(monthKey)).length;
    const djf = calRegime==='variable'
        ? [...calWorkedDJF].filter(d=>d.startsWith(monthKey)).length : 0;
    let txt = '';
    if (ca  > 0) txt += ca  + ' CA';
    if (djf > 0) txt += (txt?' · ':'')+djf+' DJF';
    el.textContent = txt;
}

function renderCalMonth(year, month) {
    const fer    = getJoursFeries(year);
    const MOIS   = ['Janvier','Février','Mars','Avril','Mai','Juin',
                    'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const JOURS  = ['L','M','M','J','V','S','D'];
    const mKey   = `${year}-${String(month+1).padStart(2,'0')}`;
    const isHS   = (month<=3||month>=10);
    const nbJ    = new Date(year,month+1,0).getDate();
    let firstDow = new Date(year,month,1).getDay();
    firstDow = firstDow===0 ? 6 : firstDow-1;

    const caC  = [...calSelectedCA].filter(d=>d.startsWith(mKey)).length;
    const djfC = calRegime==='variable'
        ? [...calWorkedDJF].filter(d=>d.startsWith(mKey)).length : 0;
    let badge = '';
    if (caC  > 0) badge += caC  + ' CA';
    if (djfC > 0) badge += (badge?' · ':'')+djfC+' DJF';

    let html = `<div class="cal-month">`;
    html += '<div class="cal-month-header">';
    html += `<span>${MOIS[month]} ${year}`;
    if (isHS) html += ` <span style="font-size:0.65rem;color:var(--ide);margin-left:4px;">❄️ HS</span>`;
    html += `</span><span class="cal-month-count" id="cal-mc-${mKey}">${badge}</span></div>`;
    html += '<div class="cal-grid">';
    JOURS.forEach((j,i) => { html += `<div class="cal-day-label${i>=5?' we':''}">${j}</div>`; });
    for (let e=0;e<firstDow;e++) html += '<div class="cal-day empty"></div>';

    for (let d=1;d<=nbJ;d++) {
        const dt  = new Date(year,month,d);
        const str = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const we  = isWeekend(dt);
        const fer_= fer.has(str);
        const sel = calSelectedCA.has(str);
        const hs  = isHorsSaison(str);
        const djfW= calWorkedDJF.has(str);
        const djfDay = (we||fer_);

        let cls='cal-day ', actionAttr='';

        if (!we && !fer_) {
            cls += 'workday';
            if (sel) cls += (hs?' ca-hs':' ca-ete');
            actionAttr = 'data-action="toggleCADay:' + str + '"';
        } else if (djfDay && calRegime==='variable') {
            cls += djfW ? 'djf-worked' : 'djf-dispo';
            actionAttr = 'data-action="toggleDJFDay:' + str + '"';
        } else if (we) {
            cls += 'weekend';
        } else {
            cls += 'ferie';
        }

        html += '<div class="' + cls + '" id="cal-d-' + str + '" ' + actionAttr + '>' + d + '</div>';
    }
    html += '</div></div>';
    return html;
}
window.renderCalMonth = renderCalMonth;

window.setCalRegime = function setCalRegime(regime) {
    calRegime = regime;
    ['fixes','variable','nuit'].forEach(r => {
        const btn = document.getElementById('rbtn-'+r);
        btn.className = 'cal-regime-btn' + (r===regime ? ' active-'+r : '');
    });
    const legDJF = document.getElementById('cal-legend-djf');
    if (legDJF) legDJF.style.display = regime==='variable' ? 'flex' : 'none';
    window.renderCalendrier();
};

window.renderCalendrier = function renderCalendrier() {
    document.getElementById('cal-year-label').textContent = calYear;
    let html = '';
    for (let m=0;m<12;m++) html += renderCalMonth(calYear,m);
    document.getElementById('cal-scroll').innerHTML = html;
    updateCalStats();
    ['fixes','variable','nuit'].forEach(r => {
        const btn = document.getElementById('rbtn-'+r);
        if (btn) btn.className = 'cal-regime-btn'+(r===calRegime?' active-'+r:'');
    });
    const legDJF = document.getElementById('cal-legend-djf');
    if (legDJF) legDJF.style.display = calRegime==='variable' ? 'flex' : 'none';
};

window.openCalendrierConges = function openCalendrierConges() {
    document.getElementById('calc-modal').style.display = 'none';
    document.getElementById('calendrier-conges-view').style.display = 'flex';
    setTimeout(window.renderCalendrier, 30);
};
window.closeCalendrierConges = function closeCalendrierConges() {
    document.getElementById('calendrier-conges-view').style.display = 'none';
};

window.changeCalYear = function changeCalYear(delta) { calYear += delta; window.renderCalendrier(); };

window.resetCalendrier = function resetCalendrier() {
    if (!confirm('Effacer tous les jours cochés pour ' + calYear + ' ?')) return;
    const y = String(calYear);
    for (const d of [...calSelectedCA]) if (d.startsWith(y)) calSelectedCA.delete(d);
    for (const d of [...calWorkedDJF])  if (d.startsWith(y)) calWorkedDJF.delete(d);
    saveCalData();
    window.renderCalendrier();
};
