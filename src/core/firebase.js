// Firebase — config, init et références documents.
// NOTE: pendant la transition, Firebase reste initialisé dans index.html.
// Ce module exposera les helpers une fois la migration finalisée.
//
// Docs Firestore utilisés (voir ANNUAIRE.md § Firebase) :
//   - PULSEUNIT_DOC : shift courant, assignments, checklist, tasks
//   - AUTH_DOC      : comptes utilisateurs
//   - RESETS_DOC    : demandes reset PIN
//   - PRESENCE_DOC  : utilisateurs en ligne (heartbeat 60s)
//   - SWAP_DOC      : bourse d'échanges de gardes

export const FIRESTORE_DOCS = {
  PULSEUNIT: 'pulseunit/main',
  AUTH:      'pulseunit/auth',
  RESETS:    'pulseunit/resets',
  PRESENCE:  'pulseunit/presence',
  SWAP:      'pulseunit/swap'
};

// TODO(migration): déplacer ici la config firebase + initializeApp
// et exposer: getDoc, setDoc, onSnapshot, batchSave...
export function getFirebase() {
  return typeof window !== 'undefined' ? window.firebase : null;
}
