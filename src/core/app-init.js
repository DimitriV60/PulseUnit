/**
 * App init — point d'entrée au démarrage de PulseUnit.
 * Chargé APRÈS toutes les features (dernier <script src>) puis `appInit()` invoqué inline.
 *
 * Étapes :
 *   1. loadAuth() — comptes Firebase + localStorage
 *   2. Charger doc PULSEUNIT (roster + shiftHistory) + listeners onSnapshot
 *      (PULSEUNIT_DOC, PLANS_DOC, SWAP_DOC)
 *   3. initDates, renderAdminResets, renderAdminUsers
 *   4. Auto-login ou modale d'auth
 *
 * Dépend de (globals inline) :
 *   - roster, shiftHistory, currentUser, authUsers, swapRequests, planStates, planRegime
 *   - _savePending, PULSEUNIT_DOC, PLANS_DOC, SWAP_DOC
 *   - loadAuth, checkAutoLogin, updateHeaderUser, showAuthModal
 *   - renderApp, renderAdminResets, renderAdminUsers, renderPlanCalendrier, renderBourseList
 *   - initDates, checkWorkStatus, loadUserPlan, setAdminSession
 *
 * Expose sur window : appInit.
 */

// Nettoyage présence à la fermeture de page
window.addEventListener('beforeunload', () => setPresence(false));

// ── Point d'entrée principal ──────────────────────────────────────────────────
window.appInit = async function appInit() {
  // 0. Attendre l'auth anonyme Firebase (nécessaire pour les Firestore Security Rules)
  await window._authReady;

  // 0b. Charger le hash admin depuis Firestore (config/admin) — retiré du source
  if (window.db) {
    try {
      const cfgDoc = await window.db.collection('config').doc('admin').get();
      if (cfgDoc.exists && cfgDoc.data().passHash) {
        window.ADMIN_PASS_HASH_REMOTE = cfgDoc.data().passHash;
      }
    } catch (e) {
      console.warn('PulseUnit: config admin non chargée', e);
    }
  }

  // Listeners temps réel — après auth pour éviter les erreurs "permission denied"
  if (PRESENCE_DOC) {
    PRESENCE_DOC.onSnapshot(doc => {
      onlineUsers = (doc.exists && doc.data()) ? doc.data() : {};
      renderAdminUsers();
    });
  }
  if (RESETS_DOC) {
    RESETS_DOC.onSnapshot(doc => {
      if (doc.exists && doc.data().requests) {
        resetRequests = doc.data().requests;
        renderAdminResets();
      }
    });
  }

  // 1. Comptes en premier (avant checkAutoLogin)
  await loadAuth();

  // 2. Firebase : roster + shiftHistory + listeners
  if (PULSEUNIT_DOC) {
    try {
      const doc = await PULSEUNIT_DOC.get();
      if (doc.exists) {
        const data = doc.data();
        if (Array.isArray(data.roster)) roster = data.roster;
        if (data.shiftHistory && typeof data.shiftHistory === 'object') shiftHistory = data.shiftHistory;
      }
    } catch (e) {
      console.warn('Firebase data load failed:', e);
    }

    // Écoute continue : mise à jour auto quand un collègue sauvegarde
    PULSEUNIT_DOC.onSnapshot(doc => {
      if (_savePending || doc.metadata.hasPendingWrites || !doc.exists) return;
      const data = doc.data();
      if (Array.isArray(data.roster)) roster = data.roster;
      if (data.shiftHistory && typeof data.shiftHistory === 'object') shiftHistory = data.shiftHistory;
      renderApp();
    }, err => console.warn('PulseUnit: Firebase hors ligne', err));

    // Écoute planning personnel (sync multi-appareils)
    if (PLANS_DOC) {
      PLANS_DOC.onSnapshot(doc => {
        if (!doc.exists || !currentUser) return;
        const userPlan = doc.data()[currentUser.id];
        if (!userPlan) return;
        if (userPlan.states && typeof userPlan.states === 'object') {
          planStates = userPlan.states;
          localStorage.setItem('pulseunit_plan_states', JSON.stringify(planStates));
        }
        if (userPlan.regime) {
          planRegime = userPlan.regime;
          localStorage.setItem('pulseunit_plan_regime', planRegime);
        }
        const pv = document.getElementById('planning-ca-view');
        if (pv && pv.style.display !== 'none') renderPlanCalendrier();
      }, err => console.warn('PulseUnit: Plans hors ligne', err));
    }

    // Écoute notes de lit (sync multi-appareils)
    if (BEDNOTES_DOC) {
      BEDNOTES_DOC.onSnapshot(doc => {
        if (window._bedNotesSavePending || doc.metadata.hasPendingWrites || !doc.exists) return;
        if (typeof window.applyBedNotesSnapshot === 'function') window.applyBedNotesSnapshot(doc.data());
      }, err => console.warn('PulseUnit: BedNotes hors ligne', err));
    }

    // Écoute bourse d'échange
    if (SWAP_DOC) {
      SWAP_DOC.onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        if (Array.isArray(data.requests)) swapRequests = data.requests;
        renderBourseList();
      }, err => console.warn('PulseUnit: Bourse hors ligne', err));
    }
  }

  // 3. Interface principale
  initDates();
  renderAdminResets();
  renderAdminUsers();

  // 4. Connexion auto ou modale
  if (checkAutoLogin()) {
    document.getElementById('auth-modal').style.display = 'none';
    updateHeaderUser();
    renderApp();
    setTimeout(checkWorkStatus, 0);
    loadUserPlan(currentUser.id).then(() => {
      const pv = document.getElementById('planning-ca-view');
      if (pv && pv.style.display !== 'none') renderPlanCalendrier();
    });
    if (typeof window.loadBedNotes === 'function') window.loadBedNotes().then(() => renderApp());
  } else if (currentUser && authUsers[currentUser.id]) {
    document.getElementById('auth-modal').style.display = 'none';
    updateHeaderUser();
    renderApp();
    setTimeout(checkWorkStatus, 0);
    loadUserPlan(currentUser.id).then(() => {
      const pv = document.getElementById('planning-ca-view');
      if (pv && pv.style.display !== 'none') renderPlanCalendrier();
    });
    if (typeof window.loadBedNotes === 'function') window.loadBedNotes().then(() => renderApp());
  } else {
    currentUser = null;
    setAdminSession(false);
    sessionStorage.removeItem('pulseunit_current_user');
    updateHeaderUser();
    showAuthModal();
  }
  // Bannière "données vides" — visible si Firestore n'a rien renvoyé (problème réseau au boot)
  if (typeof window.checkDataEmptyBanner === 'function') window.checkDataEmptyBanner();
};
