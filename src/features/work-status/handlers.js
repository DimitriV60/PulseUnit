/**
 * Work status — détermine si l'utilisateur travaille sur la garde courante
 * et gère la modale « Bonjour, travaillez-vous ? ».
 *
 * Dépend de (inline, portée lexicale) :
 *   - currentUser, currentShiftKey, shiftHistory, planStates
 *   - isShiftLocked, isAdmin, initShiftData, saveData, toggleSelection,
 *     renderApp, showToast, getPlanDefaultState
 * Expose sur window : checkWorkStatus, handleWorkChoice.
 */

window.checkWorkStatus = function checkWorkStatus() {
  if (!currentUser || isShiftLocked(currentShiftKey) || isAdmin()) return;
  initShiftData(currentShiftKey);
  const h = shiftHistory[currentShiftKey];
  const dateOnly = currentShiftKey.split('-').slice(0, 3).join('-');
  const meds = shiftHistory[dateOnly + '-meds'] || [];

  const isAlreadyActive = (h.activeStaffIds || []).includes(currentUser.id)
                       || h.techIdeId === currentUser.id
                       || meds.includes(currentUser.id);
  if (isAlreadyActive) return;

  const wsKey = `pu_ws_${currentShiftKey}_${currentUser.id}`;
  if (localStorage.getItem(wsKey) !== null) return;

  // États planning → assignation automatique silencieuse
  const AUTO_STATES = new Set(['jour', 'nuit', 'formation', 'hs_j', 'hs_n', 'hs']);
  const explicitState = planStates[dateOnly];
  const effectiveState = explicitState || getPlanDefaultState(dateOnly);

  // Ne pas auto-placer si le type planning ne correspond pas à la garde courante
  // (ex: planning='nuit' mais on est en shift jour → attendre l'ouverture de la nuit)
  const shiftType = currentShiftKey.includes('-nuit') ? 'nuit' : 'jour';
  if ((effectiveState === 'nuit' || effectiveState === 'hs_n') && shiftType === 'jour') return;
  if ((effectiveState === 'jour' || effectiveState === 'hs_j') && shiftType === 'nuit') return;

  if (AUTO_STATES.has(effectiveState)) {
    localStorage.setItem(wsKey, '1');
    handleWorkChoice(true);
    return;
  }

  // 'travail' (jour de semaine non renseigné) → poser la question
  if (effectiveState === 'travail') {
    // Nettoyage des réponses périmées (> 4 jours)
    const cutoffStr = (() => { const d = new Date(); d.setDate(d.getDate() - 4); return d.toISOString().split('T')[0]; })();
    Object.keys(localStorage).forEach(k => {
      if (!k.startsWith('pu_ws_')) return;
      if (k.slice(6, 16) < cutoffStr) localStorage.removeItem(k);
    });
    const modal = document.getElementById('work-status-modal');
    if (!modal) return;
    document.getElementById('work-title').textContent = `Bonjour ${currentUser.firstName} !`;
    document.getElementById('work-desc').textContent = `Travaillez-vous sur la garde de ${currentShiftKey.includes('-nuit') ? 'NUIT' : 'JOUR'} actuelle ?`;
    modal.style.display = 'flex';
    return;
  }
  // Autres états (ca, rh, rcn, maladie, ferie…) → rien
};

window.handleWorkChoice = function handleWorkChoice(isWorking) {
  const modal = document.getElementById('work-status-modal');
  if (modal) modal.style.display = 'none';
  if (!currentUser) return;

  // Mémoriser la réponse pour cette garde (évite de redemander)
  localStorage.setItem(`pu_ws_${currentShiftKey}_${currentUser.id}`, isWorking ? '1' : '0');

  if (isWorking) {
    const dateOnly = currentShiftKey.split('-').slice(0, 3).join('-');

    if (currentUser.role === 'med') {
      // Médecin : slot médecin partagé pour la journée
      if (!shiftHistory[dateOnly + '-meds']) shiftHistory[dateOnly + '-meds'] = [null, null, null];
      if (!shiftHistory[dateOnly + '-meds'].includes(currentUser.id)) {
        const empty = shiftHistory[dateOnly + '-meds'].indexOf(null);
        if (empty !== -1) shiftHistory[dateOnly + '-meds'][empty] = currentUser.id;
      }
    } else {
      // IDE/AS/Tech : garde courante
      initShiftData(currentShiftKey);
      const h = shiftHistory[currentShiftKey];
      if (!h.activeStaffIds.includes(currentUser.id)) h.activeStaffIds.push(currentUser.id);
    }
    saveData();
    showToast('✅ Ajouté à la garde — cliquez sur un lit pour vous y assigner');
    if (currentUser.role !== 'med') {
      toggleSelection(currentUser.id);
    } else {
      renderApp();
    }
  } else {
    const tag = document.getElementById('app-mode-tag');
    if (tag) {
      tag.textContent = '👁 Mode Lecture';
      tag.style.background = 'rgba(255,255,255,0.08)';
      tag.style.color = 'var(--text-muted)';
      tag.style.display = 'block';
    }
    showToast('👁 Mode consultation — lecture seule');
    renderApp();
  }
};
