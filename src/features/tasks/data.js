// PulseUnit — Tâches IDE techniques (planning quotidien jour/nuit).
// Extrait d'index.html. Expose window.TECH_TASKS.

  /* ===== DATA TACHES IDE TECH ===== */
  const TECH_TASKS = [
    { id: 't1', title: 'Vérifier sortie étiquettes (Médicaments + DM)', shifts: ['ALL'] },
    { id: 't2', title: 'Rangement médicaments et DM', shifts: ['1-J', '1-N', '3-J', '3-N', '5-J', '5-N'] },
    { id: 't3', title: 'Traçabilité stups et albumines', shifts: ['ALL'] },
    { id: 't4', title: 'SARM prélèvements', shifts: ['2-J'] },
    { id: 't5', title: 'Sortir les écouvillons', shifts: ['1-N'] },
    { id: 't6', title: 'Préparation bilans sanguins', shifts: ['ALL-N'] },
    { id: 't7', title: 'Analyse des GDS', shifts: ['ALL-J'], time: 'Matin' },
    { id: 't8', title: 'Traçabilité temp. frigo médicaments', shifts: ['ALL-J'], time: 'Matin' },
    { id: 't9', title: 'Traçabilité dossier mode dégradé', shifts: ['1-J'], time: 'Matin' },
    { id: 't10', title: 'Tests du SOKINOX', shifts: ['ALL'] },
    { id: 't11', title: 'Désinfection générateur ARTIS (Chaleur)', shifts: ['1-J','1-N','2-J','2-N','3-J','3-N','4-J','4-N','5-J','5-N','6-J','6-N'] },
    { id: 't11b', title: 'Désinfection ARTIS (Chaleur CleanCart A + Rinçage)', shifts: ['0-J', '0-N'] },
    { id: 't12', title: 'Vérif/traçabilité chariot urgences / DSA', shifts: ['6-N'] },
    { id: 't13', title: 'Vérif Sac Thomas / boite IOT difficile', shifts: ['6-N'] },
    { id: 't14', title: 'Vérif/traçabilité vidéolaryngoscope', shifts: ['ALL-N'] },
    { id: 't15', title: 'Vérif/traçabilité des 2 boites intubation', shifts: ['ALL'] },
    { id: 't16', title: 'Présence module capno dans sa boite', shifts: ['ALL'] },
    { id: 't17a', title: 'Changement circuits simples (+ de 30 jours)', shifts: ['ALL-N'] },
    { id: 't17b', title: 'Changement circuits avec humidificateur (+ de 15 jours)', shifts: ['ALL-N'] },
    { id: 't17c', title: 'Sortir les filtres respiratoires', shifts: ['ALL-N'] },
    { id: 't18', title: 'Gestion stock solutés CVVH', shifts: ['1-J', '3-J', '5-J'], time: 'Matin' },
    { id: 't19', title: 'Gestion stock fibro UU', shifts: ['1-J', '3-J', '5-J'], time: 'Matin' },
    { id: 't20', title: 'Gestion stocks stup/albu/COPILOTE', shifts: ['6-J'], time: 'Matin' },
    { id: 't21', title: 'Gestion des Obus O2', shifts: ['2-N', '4-N', '0-N'] },
    { id: 't22', title: 'Commande LABO', shifts: ['3-J', '3-N', '5-J', '5-N'] },
    { id: 't23', title: 'Commande Stérilisation (AS de Nuit)', shifts: ['0-N'] }
  ];

  window.TECH_TASKS = TECH_TASKS;
