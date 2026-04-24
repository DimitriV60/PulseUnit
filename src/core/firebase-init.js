/**
 * Firebase bootstrap — chargé juste après la CDN Firebase,
 * AVANT tous les handlers qui en dépendent.
 *
 * Expose sur window :
 *   - db                (firebase.firestore() ou null)
 *   - PULSEUNIT_DOC     (pulseunit/shared — roster + shiftHistory + checklist + tasks)
 *   - AUTH_DOC          (pulseunit/auth    — comptes utilisateurs)
 *   - RESETS_DOC        (pulseunit/resets  — demandes reset PIN)
 *   - PRESENCE_DOC      (pulseunit/presence — utilisateurs en ligne)
 *   - SWAP_DOC          (pulseunit/swaps   — bourse d'échanges de gardes)
 *   - PLANS_DOC         (pulseunit/plans   — planning personnel par user)
 */

window.FIREBASE_CONFIG = {
  apiKey:            'AIzaSyBtzRiQmNe4HWRsxJp_hexxOOCDjmPBCrs',
  authDomain:        'pulseunit-c9c5c.firebaseapp.com',
  projectId:         'pulseunit-c9c5c',
  storageBucket:     'pulseunit-c9c5c.firebasestorage.app',
  messagingSenderId: '939253358188',
  appId:             '1:939253358188:web:5aff65e5495084cc574249'
};

window.db = null;
window.PULSEUNIT_DOC = null;
window.AUTH_DOC = null;
window.RESETS_DOC = null;
window.PRESENCE_DOC = null;
window.SWAP_DOC = null;
window.PLANS_DOC = null;
window.ADMIN_PASS_HASH_REMOTE = null;

// Promesse résolue quand l'auth anonyme Firebase est prête.
// app-init.js await cette promesse avant tout accès Firestore.
window._authReady = Promise.resolve();

if (window.FIREBASE_CONFIG.apiKey !== 'VOTRE_API_KEY') {
  try {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    window.db = firebase.firestore();
    window.PULSEUNIT_DOC = window.db.collection('pulseunit').doc('shared');
    window.AUTH_DOC      = window.db.collection('pulseunit').doc('auth');
    window.RESETS_DOC    = window.db.collection('pulseunit').doc('resets');
    window.PRESENCE_DOC  = window.db.collection('pulseunit').doc('presence');
    window.SWAP_DOC      = window.db.collection('pulseunit').doc('swaps');
    window.PLANS_DOC     = window.db.collection('pulseunit').doc('plans');

    // Auth anonyme — satisfait les Firestore Security Rules (request.auth != null)
    window._authReady = new Promise(resolve => {
      const auth = firebase.auth();
      const unsub = auth.onAuthStateChanged(user => {
        if (user) {
          unsub();
          resolve();
        } else {
          auth.signInAnonymously().catch(e => {
            console.warn('PulseUnit: auth anonyme échouée', e);
            resolve(); // continuer en mode dégradé
          });
        }
      });
    });

    console.log('PulseUnit: Firebase connecté ✓');
  } catch (e) {
    console.error('PulseUnit: erreur init Firebase', e);
  }
} else {
  console.warn('PulseUnit: Firebase non configuré — mode localStorage uniquement');
}
