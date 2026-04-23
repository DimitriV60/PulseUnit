/**
 * Projet — Ouverture des vues "Lexique Projet" et "Sécurité & Données".
 * Petites fonctions d'affichage et de bascule pour les sections pliables.
 * Dépend de :
 *   - triggerHaptic (core/helpers.js)
 * Expose sur window : openLexiqueProjet, openSecurite, toggleProjetSection.
 */

window.openLexiqueProjet = function openLexiqueProjet() {
  document.getElementById('lexique-projet-view').style.display = 'flex';
};

window.openSecurite = function openSecurite() {
  document.getElementById('securite-view').style.display = 'flex';
};

window.toggleProjetSection = function toggleProjetSection(id) {
  const body = document.getElementById('body-' + id);
  const chev = document.getElementById('chev-' + id);
  if (!body || !chev) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  chev.classList.toggle('open', !isOpen);
  if (typeof triggerHaptic === 'function') triggerHaptic();
};
