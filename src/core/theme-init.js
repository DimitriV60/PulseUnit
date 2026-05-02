// PulseUnit — Theme + appSettings init (extrait inline d'index.html — P2.2 audit 2026-04-30).
// Doit être chargé EN PREMIER dans <head>, sans defer/async (anti-FOUC : applique
// le thème AVANT que le navigateur ne peigne quoi que ce soit). Définit aussi
// appSettings global (sound/haptic/dnd) consommé par helpers.js et notifications.

// Thème : auto (jour/nuit selon heure) | light | dark
var savedTheme = localStorage.getItem("pulseunit_theme") || "auto";

/**
 * Détermine le thème automatiquement selon l'heure.
 * Mode sombre entre 20h et 8h (horaire nuit), clair le reste du temps.
 * @returns {string} "dark" ou "light"
 */
function getAutoTheme() {
  const h = new Date().getHours();
  return (h >= 20 || h < 8) ? "dark" : "light";
}

/**
 * Applique le thème sur l'élément racine <html> via l'attribut data-theme.
 * Si t === "auto", calcule automatiquement le thème selon l'heure.
 * @param {string} t - "auto", "light" ou "dark"
 */
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t === "auto" ? getAutoTheme() : t);
}
applyTheme(savedTheme);

// Settings initialization
var appSettings = JSON.parse(localStorage.getItem('pulseunit_settings')) || { sound: true, haptic: true, dnd: false };
if (typeof appSettings.dnd === 'undefined') appSettings.dnd = false;
