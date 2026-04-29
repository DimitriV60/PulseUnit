// PulseUnit — Module export PDF du récap annuel planning.
// Charge dynamiquement jsPDF + jspdf-autotable depuis CDN (PWA sans build step).
// Expose window.PlanPdfExport.

(function () {
  'use strict';

  // URLs CDN épinglées pour reproductibilité offline (cache PWA)
  var JSPDF_URL = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
  var AUTOTABLE_URL = 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js';

  // Couleurs de la charte PulseUnit
  var COLOR_TITLE = [30, 58, 95];      // #1e3a5f
  var COLOR_ACCENT = [20, 184, 166];   // #14b8a6
  var COLOR_WARNING = [239, 68, 68];   // #ef4444
  var COLOR_MUTED = [120, 120, 120];
  var COLOR_ALT_ROW = [248, 250, 252];

  // Cache des promesses de chargement
  var _jsPdfPromise = null;
  var _autoTablePromise = null;

  // Charge un script unique en injectant <script> dans <head>.
  function _loadScript(url) {
    return new Promise(function (resolve, reject) {
      // Si déjà présent, on attend juste qu'il soit prêt
      var existing = document.querySelector('script[src="' + url + '"]');
      if (existing) {
        if (existing.dataset.loaded === '1') return resolve();
        existing.addEventListener('load', function () { resolve(); });
        existing.addEventListener('error', function () { reject(new Error('Échec chargement ' + url)); });
        return;
      }
      var s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = function () { s.dataset.loaded = '1'; resolve(); };
      s.onerror = function () { reject(new Error('Échec chargement ' + url)); };
      document.head.appendChild(s);
    });
  }

  // Tente d'enregistrer le script en cache PWA pour usage offline ultérieur.
  // Best-effort : si pas de SW dispo, on log et on continue.
  function _tryCachePwa(urls) {
    try {
      if ('caches' in window) {
        caches.open('pulseunit-cdn-v1').then(function (cache) {
          urls.forEach(function (u) {
            cache.add(u).catch(function (err) {
              console.warn('[PlanPdfExport] cache.add failed', u, err);
            });
          });
        }).catch(function (err) {
          console.warn('[PlanPdfExport] caches.open failed', err);
        });
      }
    } catch (e) {
      console.warn('[PlanPdfExport] PWA cache unavailable', e);
    }
  }

  function _loadJsPdf() {
    if (_jsPdfPromise) return _jsPdfPromise;
    _jsPdfPromise = _loadScript(JSPDF_URL).then(function () {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        throw new Error('jsPDF non disponible après chargement');
      }
      _tryCachePwa([JSPDF_URL]);
      return window.jspdf.jsPDF;
    });
    return _jsPdfPromise;
  }

  function _loadJsPdfAutoTable() {
    if (_autoTablePromise) return _autoTablePromise;
    _autoTablePromise = _loadJsPdf().then(function () {
      return _loadScript(AUTOTABLE_URL);
    }).then(function () {
      _tryCachePwa([AUTOTABLE_URL]);
      return true;
    });
    return _autoTablePromise;
  }

  function _formatProfile(p) {
    switch (p) {
      case 'jour-fixe': return 'Jour fixe';
      case 'nuit-fixe': return 'Nuit fixe';
      case 'alterne': return 'Alterné';
      default: return _safe(p);
    }
  }

  // Convertit null/undefined en '—' et coerce le reste en string.
  function _safe(s) {
    if (s === null || s === undefined || s === '') return '—';
    return String(s);
  }

  function _toast(msg) {
    if (typeof window.showToast === 'function') {
      try { window.showToast(msg); return; } catch (e) { /* fallback */ }
    }
    try { alert(msg); } catch (e) { /* noop */ }
  }

  // Formate un nb d'heures décimal (ex 2.75) en "HHhMM" signé
  function _fmtHours(h) {
    if (h === null || h === undefined || isNaN(h)) return '—';
    var sign = h < 0 ? '-' : '';
    var abs = Math.abs(h);
    var hh = Math.floor(abs);
    var mm = Math.round((abs - hh) * 60);
    if (mm === 60) { hh += 1; mm = 0; }
    return sign + (hh < 10 ? '0' + hh : hh) + 'h' + (mm < 10 ? '0' + mm : mm);
  }

  function _fmtTransmission(gardes) {
    var totalMin = (gardes || 0) * 25;
    var hh = Math.floor(totalMin / 60);
    var mm = totalMin % 60;
    return (hh < 10 ? '0' + hh : hh) + 'h' + (mm < 10 ? '0' + mm : mm);
  }

  function _fileName(year, user) {
    var ln = (user && user.lastName ? user.lastName : 'agent').replace(/\s+/g, '');
    var fn = (user && user.firstName ? user.firstName : '').replace(/\s+/g, '');
    return 'PulseUnit_recap_' + year + '_' + ln + (fn ? '_' + fn : '') + '.pdf';
  }

  function _setColor(doc, fnName, rgb) {
    doc[fnName](rgb[0], rgb[1], rgb[2]);
  }

  // Renvoie le Y courant du document (suit la position d'écriture cumulée)
  function _ensurePage(doc, currentY, needed, marginBottom) {
    var pageH = doc.internal.pageSize.getHeight();
    if (currentY + needed > pageH - marginBottom) {
      doc.addPage();
      return 20;
    }
    return currentY;
  }

  // Dessine un titre de section avec barre accent
  function _sectionTitle(doc, text, y) {
    _setColor(doc, 'setDrawColor', COLOR_ACCENT);
    _setColor(doc, 'setFillColor', COLOR_ACCENT);
    doc.rect(15, y - 3.5, 1.5, 5, 'F');
    _setColor(doc, 'setTextColor', COLOR_TITLE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(text, 19, y);
    return y + 5;
  }

  // Section en-tête : titre, sous-titre, date génération.
  function _drawHeader(doc, year, user, profile) {
    var pageW = doc.internal.pageSize.getWidth();
    _setColor(doc, 'setTextColor', COLOR_TITLE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Récapitulatif annuel planning — ' + year, 15, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    var subtitle = _safe(user && user.firstName) + ' ' + _safe(user && user.lastName) +
      ' — ' + _safe(user && user.role) + ' — ' + _formatProfile(profile);
    doc.text(subtitle, 15, 27);

    // Date génération à droite
    _setColor(doc, 'setTextColor', COLOR_MUTED);
    doc.setFontSize(9);
    var now = new Date();
    var dateStr = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    doc.text('Généré le ' + dateStr, pageW - 15, 20, { align: 'right' });

    // Trait accent horizontal
    _setColor(doc, 'setDrawColor', COLOR_ACCENT);
    doc.setLineWidth(0.5);
    doc.line(15, 32, pageW - 15, 32);

    return 40;
  }

  // Pied de page sur chaque page.
  function _drawFooter(doc) {
    var pageCount = doc.internal.getNumberOfPages();
    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    var iso = new Date().toISOString().slice(0, 10);
    for (var i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      _setColor(doc, 'setTextColor', COLOR_MUTED);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      var footer = 'Généré par PulseUnit le ' + iso + ' — Données indicatives, source de vérité = Digihops GHPSO';
      doc.text(footer, pageW / 2, pageH - 8, { align: 'center' });
      doc.text(i + ' / ' + pageCount, pageW - 15, pageH - 8, { align: 'right' });
    }
  }

  // Compteurs de congés (CA / CA-HP / Frac / RCV)
  // Reste = Total - posed (le reliquat N-1 est affiché en sous-ligne séparée).
  // Cohérent avec l'UI Suivi RH : posed = année courante uniquement, n1 = reliquat.
  function _drawCountersSection(doc, y, ca, caHp, frac, rcv) {
    y = _sectionTitle(doc, 'Compteurs de congés', y);

    var rows = [];
    var subRowIndices = []; // indices des sous-lignes "↳ reliquat N-1"
    function _pushCat(label, c) {
      var posed = (c && c.posed) || 0;
      var n1    = (c && c.n1) || 0;
      var total = (c && c.total) || 0;
      var rest  = Math.max(0, total - posed);
      rows.push([label, _safe(posed), _safe(total), _safe(rest)]);
      if (n1 > 0) {
        rows.push(['↳ reliquat N-1', _safe(n1), '', '']);
        subRowIndices.push(rows.length - 1);
      }
    }
    _pushCat('CA', ca);
    _pushCat('CA-HP', caHp);
    _pushCat('Fractionné', frac);

    var rcvEligible = !!(rcv && rcv.eligible);
    var rcvRowIdx = rows.length;
    if (rcvEligible) {
      _pushCat('RCV', rcv);
    } else {
      rows.push(['RCV', 'Non éligible', 'Non éligible', 'Non éligible']);
    }

    doc.autoTable({
      startY: y,
      head: [['Type', 'Posé', 'Total', 'Reste']],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 2.5, textColor: [40, 40, 40] },
      headStyles: { fillColor: COLOR_ACCENT, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLOR_ALT_ROW },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' }
      },
      didParseCell: function (data) {
        if (data.section !== 'body') return;
        if (subRowIndices.indexOf(data.row.index) !== -1) {
          data.cell.styles.textColor = COLOR_MUTED;
          data.cell.styles.fontStyle = 'italic';
          data.cell.styles.fontSize = 9;
        }
        if (!rcvEligible && data.row.index === rcvRowIdx) {
          data.cell.styles.textColor = COLOR_MUTED;
          data.cell.styles.fontStyle = 'italic';
        }
      },
      margin: { left: 15, right: 15 }
    });

    return doc.lastAutoTable.finalY + 8;
  }

  // Section heures travaillées : totaux + tableau mensuel débit/crédit
  function _drawHoursSection(doc, y, recap, debitCreditTable) {
    y = _ensurePage(doc, y, 25, 25);
    y = _sectionTitle(doc, 'Heures travaillées', y);

    _setColor(doc, 'setTextColor', [40, 40, 40]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    var theoTotal = recap && recap.totalTheoretical;
    var realTotal = recap && recap.totalRealized;
    var dcAnnual = recap && recap.annualDebitCredit;
    var theoAnnual = recap && recap.annualTheoreticalContract;

    doc.text('Total heures théoriques (à ce jour) : ' + _fmtHours(theoTotal), 19, y);
    y += 5;
    doc.text('Total heures réalisées : ' + _fmtHours(realTotal), 19, y);
    y += 5;
    var dcLabel = 'Débit/crédit annuel : ' + _fmtHours(dcAnnual);
    doc.text(dcLabel, 19, y);
    y += 5;
    if (theoAnnual !== undefined && theoAnnual !== null) {
      doc.text('Réalisées / Théoriques contractuelles : ' +
               _fmtHours(realTotal) + ' / ' + _fmtHours(theoAnnual), 19, y);
      y += 5;
    }
    y += 2;

    // Tableau mensuel style Digihops
    var monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    var rows = [];
    var arr = Array.isArray(debitCreditTable) ? debitCreditTable : [];
    for (var m = 0; m < 12; m++) {
      var entry = arr[m] || {};
      rows.push([
        monthNames[m],
        _fmtHours(entry.debitCredit !== undefined ? entry.debitCredit : null),
        _fmtHours(entry.cumul !== undefined ? entry.cumul : null)
      ]);
    }

    doc.autoTable({
      startY: y,
      head: [['Mois', 'Débit/crédit', 'Cumul']],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: COLOR_ACCENT, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLOR_ALT_ROW },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { halign: 'center' },
        2: { halign: 'center' }
      },
      margin: { left: 15, right: 15 }
    });

    return doc.lastAutoTable.finalY + 8;
  }

  // Section jours travaillés / repos
  function _drawWorkRestSection(doc, y, recap) {
    y = _ensurePage(doc, y, 50, 25);
    y = _sectionTitle(doc, 'Jours travaillés / Repos', y);

    var r = recap || {};
    var counts = r.counts || {};

    _setColor(doc, 'setTextColor', [40, 40, 40]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    var nbJ = counts.jour || 0;
    var nbN = counts.nuit || 0;
    var nbHsj = counts.hs_j || 0;
    var nbHsn = counts.hs_n || 0;
    var nbFo = counts.formation || 0;
    var totalWorked = nbJ + nbN + nbHsj + nbHsn + nbFo;

    var bullets = [
      'Jours (J) : ' + nbJ,
      'Nuits (N) : ' + nbN,
      'Heures supp jour (HSJ) : ' + nbHsj,
      'Heures supp nuit (HSN) : ' + nbHsn,
      'Formation (FO) : ' + nbFo
    ];
    bullets.forEach(function (b) {
      doc.text('• ' + b, 19, y);
      y += 5;
    });
    doc.setFont('helvetica', 'bold');
    doc.text('Total jours travaillés : ' + totalWorked, 19, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    var nbRh = counts.rh || 0;
    var nbRc = counts.rc || 0;
    var nbRcn = counts.rcn || 0;
    var nbJf = counts.ferie || 0;
    var nbAm = counts.maladie || 0;

    doc.text('Détail repos & absences :', 19, y);
    y += 5;
    var rest = [
      'Repos hebdo (RH) : ' + nbRh,
      'Récup compensateur (RC) : ' + nbRc,
      'Récup compensateur nuit (RCN) : ' + nbRcn,
      'Jours fériés (JF) : ' + nbJf,
      'Maladie (AM) : ' + nbAm
    ];
    rest.forEach(function (b) {
      doc.text('• ' + b, 23, y);
      y += 5;
    });

    return y + 4;
  }

  // Section primes & spécial : fériés, week-ends, transmissions
  function _drawPrimesSection(doc, y, recap) {
    y = _ensurePage(doc, y, 35, 25);
    y = _sectionTitle(doc, 'Primes & spécial', y);

    var r = recap || {};
    var counts = r.counts || {};
    var feriesTravailles = r.feriesWorked !== undefined ? r.feriesWorked : (r.holidaysWorked || 0);
    var dimanches = r.sundaysWorked || 0;
    var dow = r.workedByDow || { lun:0, mar:0, mer:0, jeu:0, ven:0, sam:0, dim:0 };
    // Transmissions = J + N + HSJ + HSN (cohérent avec l'UI Suivi RH)
    var nbGardes = (counts.jour || 0) + (counts.nuit || 0) + (counts.hs_j || 0) + (counts.hs_n || 0);
    var transmTotal = _fmtTransmission(nbGardes);

    _setColor(doc, 'setTextColor', [40, 40, 40]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    doc.text('Fériés travaillés : ' + feriesTravailles, 19, y);
    y += 5;
    doc.text('Dimanches travaillés (prime) : ' + dimanches, 19, y);
    y += 5;
    doc.text('Heures de transmission cumulées : ' + nbGardes +
             ' gardes × 0h25 = ' + transmTotal, 19, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Jours travaillés par jour de la semaine :', 19, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text('L : ' + (dow.lun || 0) + '   M : ' + (dow.mar || 0) +
             '   M : ' + (dow.mer || 0) + '   J : ' + (dow.jeu || 0) +
             '   V : ' + (dow.ven || 0) + '   S : ' + (dow.sam || 0) +
             '   D : ' + (dow.dim || 0), 19, y);
    y += 6;

    return y;
  }

  // Section CA consécutifs : tableau périodes avec marquage rouge si > 31j
  function _drawConsecutiveCASection(doc, y, consecutiveCA) {
    y = _ensurePage(doc, y, 30, 25);
    y = _sectionTitle(doc, 'CA consécutifs', y);

    var arr = Array.isArray(consecutiveCA) ? consecutiveCA : [];
    if (arr.length === 0) {
      _setColor(doc, 'setTextColor', COLOR_MUTED);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.text('Aucune période de CA consécutifs détectée.', 19, y);
      return y + 8;
    }

    var fmtFR = function (ds) {
      if (!ds || typeof ds !== 'string') return _safe(ds);
      var parts = ds.split('-');
      return (parts.length === 3) ? (parts[2] + '/' + parts[1] + '/' + parts[0]) : _safe(ds);
    };
    var rows = arr.map(function (p) {
      return [fmtFR(p.start), fmtFR(p.end), _safe(p.days)];
    });

    doc.autoTable({
      startY: y,
      head: [['Début', 'Fin', 'Jours calendaires']],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 2.5 },
      headStyles: { fillColor: COLOR_ACCENT, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLOR_ALT_ROW },
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'center' },
        2: { halign: 'center', fontStyle: 'bold' }
      },
      didParseCell: function (data) {
        // Marque toute la ligne en rouge si > 31j calendaires
        if (data.section === 'body') {
          var p = arr[data.row.index];
          if (p && Number(p.days) > 31) {
            data.cell.styles.textColor = COLOR_WARNING;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { left: 15, right: 15 }
    });

    var endY = doc.lastAutoTable.finalY;
    // Légende si dépassement détecté
    var hasOver = arr.some(function (p) { return Number(p.days) > 31; });
    if (hasOver) {
      _setColor(doc, 'setTextColor', COLOR_WARNING);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('⚠ Périodes en rouge > 31 jours calendaires (limite RH).', 19, endY + 5);
      endY += 7;
    }

    return endY + 6;
  }

  /**
   * Génère et télécharge le récap PDF annuel.
   * Voir spec : raw/PulseUnit/wiki/Intelligence/Refonte Module Planning.md
   *
   * @param {Object} args
   * @param {number} args.year
   * @param {{firstName, lastName, role}} args.user
   * @param {'jour-fixe'|'nuit-fixe'|'alterne'} args.profile
   * @param {Object} args.recap                  PlanEngine.yearlyRecap()
   * @param {Array}  args.debitCreditTable       PlanEngine.yearlyDebitCreditTable()
   * @param {{posed,total}} args.ca
   * @param {{posed,total}} args.caHp
   * @param {{posed,total}} args.frac
   * @param {{posed,total,eligible}} args.rcv
   * @param {Array} args.consecutiveCA           PlanEngine.consecutiveCAPeriods()
   * @returns {Promise<void>}
   */
  function exportYearlyRecap(args) {
    args = args || {};
    var year = args.year || new Date().getFullYear();
    var user = args.user || {};
    var profile = args.profile || 'alterne';
    var recap = args.recap || {};
    var debitCreditTable = args.debitCreditTable || [];
    var ca = args.ca || { posed: 0, total: 0 };
    var caHp = args.caHp || { posed: 0, total: 0 };
    var frac = args.frac || { posed: 0, total: 0 };
    var rcv = args.rcv || { posed: 0, total: 0, eligible: false };
    var consecutiveCA = args.consecutiveCA || [];

    return _loadJsPdfAutoTable().then(function () {
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

      var y = _drawHeader(doc, year, user, profile);
      y = _drawCountersSection(doc, y, ca, caHp, frac, rcv);
      y = _drawHoursSection(doc, y, recap, debitCreditTable);
      y = _drawWorkRestSection(doc, y, recap);
      y = _drawPrimesSection(doc, y, recap);
      y = _drawConsecutiveCASection(doc, y, consecutiveCA);

      _drawFooter(doc);

      doc.save(_fileName(year, user));
    }).catch(function (err) {
      console.error('[PlanPdfExport] échec export', err);
      _toast('⛔ Export PDF indisponible (offline ?)');
      return Promise.reject(err);
    });
  }

  window.PlanPdfExport = {
    exportYearlyRecap: exportYearlyRecap,
    _loadJsPdf: _loadJsPdf,
    _loadJsPdfAutoTable: _loadJsPdfAutoTable,
    _formatProfile: _formatProfile,
    _safe: _safe
  };
})();
