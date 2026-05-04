/**
 * Gestures — gestes tactiles globaux (drag-to-paint planning + swipe-back).
 *
 * Deux listeners globaux indépendants :
 *   1. Drag-to-paint : touchmove/touchend → peint les cases du planning annuel.
 *      Dépend de : planDrag, planLockedMonths, planYear, getPlanDayState,
 *      applyPlanStateDrag, cyclePlanDay, savePlanData, updatePlanStats.
 *   2. Swipe gauche = retour / fermeture : ferme modales et vues plein écran.
 *      Dépend de : NORMES_REF, setNormesCat, getNormesCurrentCat, closeNormes,
 *      closeNormesRespi, closeProtocoleDetail, closeProtocoles,
 *      closeCalendrierConges, closePlanningCA, closeTasks, closeCalculateurs,
 *      closeLexique, closeCalcModal, closeSideMenu, planDrag.
 *
 * Aucune fonction n'est exposée : listeners installés à l'import.
 */

// ── Drag-to-paint : touchstart non-passif sur les cellules planning ────
// Remplace l'ancien ontouchstart inline (bloqué par CSP strict).
document.addEventListener('touchstart', function(e) {
  const cell = e.target && e.target.closest ? e.target.closest('[data-pcell]') : null;
  if (!cell) return;
  const dateStr = cell.getAttribute('data-pcell');
  if (!dateStr) return;
  if (typeof window.planCellTouchStart === 'function') {
    window.planCellTouchStart(dateStr, e);
  }
}, { passive: false });

// ── Drag-to-paint : touchmove + touchend globaux ───────────────────────
document.addEventListener('touchmove', function(e) {
  if (!planDrag.active) return;
  e.preventDefault();
  const touch = e.touches[0];
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  if (!el) return;
  const cell = el.closest ? el.closest('[id^="plan-d-"]') : null;
  if (!cell) return;
  const dateStr = cell.id.slice(7); // retire 'plan-d-'
  if (planLockedMonths.has(dateStr.slice(0, 7))) return;
  if (dateStr === planDrag.lastDate) return;
  if (!planDrag.moved) {
    planDrag.moved = true;
    applyPlanStateDrag(planDrag.startDate, planDrag.state);
  }
  planDrag.lastDate = dateStr;
  applyPlanStateDrag(dateStr, planDrag.state);
}, { passive: false });

document.addEventListener('touchend', function(e) {
  if (!planDrag.active) return;
  planDrag.active = false;
  if (!planDrag.moved) {
    // Simple tap → cycle normal
    cyclePlanDay(planDrag.startDate);
    return;
  }
  // Fin de glissement → sauvegarder + rafraîchir badges mensuels
  savePlanData();
  for (let m = 1; m <= 12; m++) {
    const mKey = `${planYear}-${String(m).padStart(2, '0')}`;
    const mEl = document.getElementById('plan-mc-' + mKey);
    if (!mEl) continue;
    const nb = new Date(planYear, m, 0).getDate();
    let caC = 0, rcnC = 0;
    for (let dd = 1; dd <= nb; dd++) {
      const s = `${planYear}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      const st = getPlanDayState(s);
      if (st === 'ca' || st === 'can1') caC++;
      if (st === 'rcn') rcnC++;
    }
    let badge = '';
    if (caC > 0) badge += caC + ' CA';
    if (rcnC > 0) badge += (badge ? ' · ' : '') + rcnC + ' RCN';
    mEl.textContent = badge;
  }
  updatePlanStats();
}, { passive: true });

// ── Swipe gauche = retour / fermeture · Swipe droit depuis le bord = ouverture menu ──
(function() {
  let startX = 0, startY = 0, startTarget = null;

  document.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTarget = e.target;
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (planDrag.moved) return; // glissement planning : ignorer
    // Ignorer si le swipe part d'une zone avec scroll horizontal
    if (startTarget && startTarget.closest('[style*="overflow-x"], .lexique-filters, .normes-cat-filters, .horaires-scroll, .planning-scroll, .cl-bed-selector')) return;

    const isVis = id => { const el = document.getElementById(id); return el && el.style.display !== 'none' && el.style.display !== ''; };
    const isHoriz = Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy);

    // Swipe droit depuis le bord gauche (≤ 30px) → ouvre le menu burger
    if (dx > 60 && Math.abs(dy) < Math.abs(dx) && startX <= 30) {
      const menu = document.getElementById('side-menu');
      const menuOpen = menu && menu.style.transform === 'translateX(0)';
      const anyModalOrViewOpen = ['calc-modal', 'tuto-view', 'account-modal', 'admin-login-modal', 'admin-panel-modal', 'bed-note-modal', 'rgpd-modal', 'add-modal', 'normes-view', 'normes-respi-view', 'protocoles-view', 'protocole-detail-view', 'calendrier-conges-view', 'planning-ca-view', 'tasks-view', 'calculateurs-view', 'lexique-view', 'lexique-projet-view', 'securite-view'].some(isVis);
      if (!menuOpen && !anyModalOrViewOpen && typeof openSideMenu === 'function') {
        openSideMenu();
        return;
      }
    }

    // Navigation gauche/droite dans la vue Normes
    if (isVis('normes-view') && isHoriz) {
      const cats = NORMES_REF.map(c => c.id);
      const idx = cats.indexOf(window.getNormesCurrentCat());
      if (Math.abs(dx) >= 250) { closeNormes(); return; }
      if (dx < 0) { setNormesCat(idx < cats.length - 1 ? cats[idx + 1] : cats[0]); return; }
      if (dx > 0) {
        if (idx > 0) { setNormesCat(cats[idx - 1]); return; }
        closeNormes(); return;
      }
      return;
    }

    if (dx > -60 || Math.abs(dy) > Math.abs(dx)) return; // pas un swipe gauche net

    // Priorité : du plus spécifique au plus général
    const isVisible = isVis;
    const menuOpen = () => {
      const m = document.getElementById('side-menu');
      return m && m.style.transform === 'translateX(0)';
    };

    // Modales (priorité max)
    const calcModal = document.getElementById('calc-modal');
    if (calcModal && calcModal.style.display !== 'none' && calcModal.style.display !== '') { closeCalcModal(); return; }

    // Vues plein écran — du plus profond au plus superficiel
    if (isVisible('normes-respi-view'))        { closeNormesRespi(); return; }
    if (isVisible('protocole-detail-view'))    { closeProtocoleDetail(); return; }
    if (isVisible('protocoles-view'))          { closeProtocoles(); return; }
    if (isVisible('calendrier-conges-view'))   { closeCalendrierConges(); return; }
    if (isVisible('planning-ca-view'))         { closePlanningCA(); return; }
    if (isVisible('tasks-view'))               { closeTasks(); return; }
    if (isVisible('calculateurs-view'))        { closeCalculateurs(); return; }
    if (isVisible('lexique-projet-view'))      { document.getElementById('lexique-projet-view').style.display = 'none'; return; }
    if (isVisible('securite-view'))            { document.getElementById('securite-view').style.display = 'none'; return; }
    if (isVisible('lexique-view'))             { closeLexique(); return; }
    if (menuOpen())                            { closeSideMenu(); return; }
  }, { passive: true });
})();

// ── Retour haptique global au clic ───────────────────────────────────────────
document.addEventListener('click', (e) => {
  if (e.target.closest('button, .shift-tab, .staff-card, .bed-card, .a-btn, .med-bed-btn, .task-item, .lex-card, .calc-tile, .sugg-item, .close-menu-btn, .menu-btn, summary, input[type="checkbox"]')) {
    triggerHaptic();
  }
}, true);
