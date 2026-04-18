// PulseUnit — Store global (pub/sub minimal, zero dépendance).
//
// Usage:
//   import { store } from './core/store.js';
//   store.set({ currentUser: {...} });
//   const unsub = store.subscribe(state => { ... });
//   store.get('currentUser');
//
// Exposé aussi en window.PulseStore pour les scripts inline d'index.html
// pendant la période de transition (avant migration complète en modules ES).

const state = {
  // AUTH
  currentUser: null,
  authUsers: {},
  resetRequests: [],
  adminSessionActive: false,
  selectedRole: null,
  onlineUsers: {},

  // SETTINGS
  savedTheme: 'auto',
  appSettings: { sound: true, haptic: true },

  // SHIFT & BEDS
  currentShiftKey: null,
  roster: [],
  shiftHistory: {},
  selectedStaffForTap: null,

  // FILTRES / NAVIGATION
  currentLexiqueFilter: 'TOUT',
  currentProtoId: null,
  normesCurrentCat: 'VITAUX',
  currentChecklistBed: null,

  // PLANNING
  planYear: new Date().getFullYear(),
  planRegime: 'jour',
  planStates: {},
  planLockedMonths: [],
  planSoldes: {},

  // CONGÉS
  calYear: new Date().getFullYear(),
  calRegime: 'fixes',
  calSelectedCA: [],
  calWorkedDJF: [],

  // RESPIRATEUR
  respiValues: {},
  respiMode: 'PC',
  respiScenario: '',

  // BOURSE
  swapRequests: []
};

const listeners = new Set();

function notify(changedKeys) {
  listeners.forEach(fn => {
    try { fn(state, changedKeys); } catch (e) { console.error('[store] listener error', e); }
  });
}

export const store = {
  get(key) { return key ? state[key] : state; },

  set(partial) {
    const changed = [];
    for (const k in partial) {
      if (state[k] !== partial[k]) {
        state[k] = partial[k];
        changed.push(k);
      }
    }
    if (changed.length) notify(changed);
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  persist(key, storageKey = key) {
    try { localStorage.setItem(storageKey, JSON.stringify(state[key])); }
    catch (e) { console.warn('[store] persist fail', storageKey, e); }
  },

  hydrate(key, storageKey = key, fallback = null) {
    try {
      const raw = localStorage.getItem(storageKey);
      state[key] = raw ? JSON.parse(raw) : fallback;
    } catch { state[key] = fallback; }
  }
};

if (typeof window !== 'undefined') {
  window.PulseStore = store;
}
