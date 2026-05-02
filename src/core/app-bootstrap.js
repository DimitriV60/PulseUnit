// PulseUnit — point d'entrée invoquant appInit() après chargement de toutes
// les features (extrait inline d'index.html — P2.2 audit 2026-04-30).
//
// IMPORTANT : ce fichier doit être chargé APRÈS app-init.js qui définit
// window.appInit. L'ordre dans index.html est :
//   ... handlers de toutes les features ...
//   <script src="src/core/app-init.js"></script>
//   <script src="src/core/app-bootstrap.js"></script>

if (typeof window.appInit === 'function') {
  window.appInit();
} else {
  console.error('[bootstrap] window.appInit n\'est pas défini — vérifier l\'ordre des <script src>.');
}
