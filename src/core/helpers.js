/**
 * Helpers transverses — chargé EN PREMIER (avant toutes les features).
 * Classic script (pas d'ES modules) : fonctions exposées globalement via `window`.
 *
 * - escapeHTML(str)     — neutralise &, <, >, ', " pour prévenir les injections XSS.
 * - triggerHaptic()     — vibration 30 ms (Android/Chrome) ou fallback son iOS.
 * - playSound(type)     — fanfare "success" via Web Audio API, sans fichier audio.
 *
 * Dépendances inline :
 *   - appSettings.sound / appSettings.haptic (initialisé dans <head>, anti-FOUC)
 */

window.escapeHTML = function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
};

window.triggerHaptic = function triggerHaptic() {
  if (!appSettings.haptic) return;

  // Android / Chrome : Vibration API standard
  if (navigator.vibrate) {
    try { navigator.vibrate(30); } catch (err) {}
    return;
  }

  // iOS Safari : pas de vibration web possible — fallback son très discret
  if (appSettings.sound) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1000;
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch (err) {}
  }
};

window.playSound = function playSound(type) {
  if (!appSettings.sound) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playNote = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };
    if (type === 'success') {
      playNote(523.25, 0,   0.2);
      playNote(659.25, 0.1, 0.2);
      playNote(783.99, 0.2, 0.2);
      playNote(1046.50, 0.3, 0.5);
    }
  } catch (e) {
    console.log('Audio non supporté par ce navigateur.');
  }
};
