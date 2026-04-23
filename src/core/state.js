/**
 * State — variables d'état partagées entre features.
 *
 * Déclarées avec `var` (= window.X) pour être accessibles depuis tous les scripts
 * classiques sans qualification window. Chargé en premier dans <body>, avant tous
 * les feature handlers.
 *
 * ⚠ Ne contient que les initialisations — toute la logique est dans les handlers.
 */

// ── Shift / Beds ──────────────────────────────────────────────────────────────
var roster       = JSON.parse(localStorage.getItem('reapro_roster'))  || [{ id: '1', firstName: 'Martin', lastName: 'D.', role: 'ide' }];
var shiftHistory = JSON.parse(localStorage.getItem('reapro_history')) || {};
var pendingSpecType    = null;
var currentShiftKey    = '';
var selectedStaffForTap = null;

// ── Auth / Admin ──────────────────────────────────────────────────────────────
var currentUser    = JSON.parse(sessionStorage.getItem('pulseunit_current_user')) || null;
var authUsers      = {};
var resetRequests  = [];
var _savePending   = false;   // bloque onSnapshot pendant un écrit local en cours
var selectedRole   = '';

// ── Presence ──────────────────────────────────────────────────────────────────
var onlineUsers  = {};        // { userId: { firstName, lastName, role, lastSeen } }

// ── Bourse ───────────────────────────────────────────────────────────────────
var swapRequests = [];        // demandes de permutation de gardes
