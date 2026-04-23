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
    console.log('PulseUnit: Firebase connecté ✓');
  } catch (e) {
    console.error('PulseUnit: erreur init Firebase', e);
  }
} else {
  console.warn('PulseUnit: Firebase non configuré — mode localStorage uniquement');
}
