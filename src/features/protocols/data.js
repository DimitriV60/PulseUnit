// PulseUnit — Protocoles cliniques (lecture seule).
// Extrait d'index.html (était aux lignes 3898-4165).
// Expose window.PROTOCOLS_DATA pour cohabiter avec les scripts inline d'index.html
// pendant la migration vers l'architecture feature-based.

  window.PROTOCOLS_DATA = [
  {
    id: 'kta',
    title: 'Cathéter Artériel (KTA)',
    subtitle: 'Pose · Prélèvement · Pansement · Surveillance · Ablation',
    ref: 'RD : PRO/SOIN/5-2/17 — Version 0 — 05-08-22',
    color: 'var(--ide)',
    icon: '🩸',
    sections: [
      {
        id: 's1', icon: '📋', title: 'A. POSE — Indications & Avant la pose',
        steps: [
          { icon: '⚕️', text: 'Hémodynamique instable et administration de drogues vasopressives', note: 'Indication principale' },
          { icon: '🩸', text: 'Capital artériel limité et besoin de nombreux GDS', note: 'Indication principale' },
          { icon: '📈', text: 'Surveillance rapprochée de l\'hémodynamique en continue', note: 'Indication principale' },
          { icon: '🖐️', text: 'Voie radiale : réaliser le TEST D\'ALLEN avant la pose', note: '1. Comprimer radiale + cubitale → blanchissement de la main. 2. Relâcher la cubitale. Si recoloration < 10 sec → test positif → voie radiale sûre.' },
          { icon: '✂️', text: 'Voie fémorale : procéder à une dépilation à la tondeuse si nécessaire', note: '' },
          { icon: '💊', text: 'Voie radiale : si possible, appliquer patch Emla® 1H avant la pose', note: 'Pour analgésie locale. Retirer le surplus juste avant l\'antisepsie.' }
        ]
      },
      {
        id: 's2', icon: '🛒', title: 'A. POSE — Matériel IDE',
        steps: [
          { icon: '🧴', text: 'Détergent, désinfectant prêt à l\'emploi', note: '' },
          { icon: '🧤', text: 'Gants à UU + SHA', note: '' },
          { icon: '🗑️', text: 'Sac DASND / DASRI + Collecteur OPCT', note: '' },
          { icon: '🩹', text: 'Compresses stériles + ATS alcoolique (Chlorhexidine 2%)', note: '' },
          { icon: '🎭', text: '2 charlottes + 2 masques chirurgicaux (FFP2 si tuberculose ou Covid-19)', note: '' },
          { icon: '🥼', text: '1 casaque stérile + 1 paire de gants stériles', note: '' },
          { icon: '🟦', text: 'Champs stériles : 1 grand troué (radiale) ou 4 petits (fémorale)', note: '' },
          { icon: '💉', text: 'Seringue 10 mL stérile + aiguille verte + Xylocaïne 10%', note: 'Pour anesthésie locale si patch Emla non utilisé' },
          { icon: '🩺', text: '1 poche de contre-pression + 1 poche NaCl 500 mL', note: '' },
          { icon: '📡', text: '1 câble + 1 module de pression artérielle', note: '' },
          { icon: '🪡', text: '1 fil de suture (Mersutures 75 cm) — code pharma : 331 082', note: '' },
          { icon: '🩹', text: 'Pansement cathéter transparent occlusif (oval, 10x12 ou 15x20)', note: 'Codes pharma : 333164 / 333165 / 331341' },
          { icon: '🩹', text: 'Plaque hydrocolloïde Comfeel® 10x10 — code pharma : 332 295', note: 'À placer sous le KTA sur le bras' },
          { icon: '🔌', text: 'Set de pression (tête + ligne) — code pharma : 329 588', note: '' },
          { icon: '🩸', text: 'KTA radiale 8cm 20G (3F) — code pharma : 331 064', note: 'Ou 8cm 18G (4F) : 329898 — Fémorale 12cm 18G : 329928 / 20cm 18G : 330494' }
        ]
      },
      {
        id: 's3', icon: '👩‍⚕️', title: 'A. POSE — Déroulement IDE',
        steps: [
          { icon: '🎭', text: 'Porter une coiffe + masque chirurgical (FFP2 si tuberculose / Covid-19)', note: '' },
          { icon: '🙌', text: 'Effectuer une FHA', note: '' },
          { icon: '🛒', text: 'Préparer le matériel + préparer et informer le patient', note: '' },
          { icon: '🛏️', text: 'Installer le patient selon la zone d\'implantation choisie par le médecin', note: '' },
          { icon: '🙌', text: 'Effectuer une nouvelle FHA', note: '' },
          { icon: '🧴', text: 'Retirer le surplus d\'Emla® avec une compresse stérile', note: '' },
          { icon: '🌀', text: 'Effectuer une antisepsie cutanée large en technique de l\'escargot', note: '' },
          { icon: '💧', text: 'Installer la poche NaCl 500 mL dans la manchette de pression', note: '' },
          { icon: '⬆️', text: 'Gonfler la manchette de pression à 300 mmHg', note: 'Évite le reflux de sang artériel dans la tubulure et sa coagulation' },
          { icon: '🔌', text: 'Adapter le circuit transducteur à la poche de NaCl (stérilité conservée)', note: '' },
          { icon: '🫧', text: 'Purger le système, vérifier l\'absence de bulles', note: '' },
          { icon: '🩹', text: 'Mettre un pansement hydrocolloïde sur le bras du patient', note: '' },
          { icon: '📡', text: 'Fixer la tête de pression sur la face externe du bras au niveau de la ligne axillaire moyenne', note: '' },
          { icon: '🔌', text: 'Brancher le câble du module à la tête de pression', note: '' }
        ]
      },
      {
        id: 's4', icon: '👨‍⚕️', title: 'A. POSE — Déroulement Médecin',
        steps: [
          { icon: '🎭', text: 'Charlotte + masque chirurgical (FFP2 si tuberculose / Covid-19)', note: '' },
          { icon: '🙌', text: 'Désinfection chirurgicale des mains par FHA', note: '' },
          { icon: '🥼', text: 'Habillage chirurgical stérile — casaque avec aide de l\'IDE', note: '' },
          { icon: '🧤', text: 'Mise des gants stériles', note: '' },
          { icon: '🔍', text: 'Repérer le point de ponction + 2e application d\'ATS alcoolique', note: '' },
          { icon: '🟦', text: 'Installer les champs stériles (1 troué radiale / 4 petits fémorale)', note: '' },
          { icon: '💉', text: 'Anesthésie locale si besoin (Xylocaïne)', note: '' },
          { icon: '🩸', text: 'Ponctionner l\'artère — reflux de sang confirmé', note: '' },
          { icon: '🧵', text: 'Introduire le guide dans l\'aiguille (bout mousse en avant)', note: '' },
          { icon: '🗑️', text: 'Retirer l\'aiguille → collecteur OPCT', note: '' },
          { icon: '🔗', text: 'Glisser le cathéter artériel sur le guide', note: '' },
          { icon: '📌', text: 'Fixer le cathéter à la peau', note: '' },
          { icon: '🧵', text: 'Retirer le guide', note: '' },
          { icon: '🔌', text: 'Installer le système tête de pression + ligne artérielle préalablement purgée', note: '' },
          { icon: '🩹', text: 'Poser le pansement transparent et occlusif', note: '' }
        ]
      },
      {
        id: 's5', icon: '📡', title: 'A. POSE — Mise à zéro (Zéro PA)',
        steps: [
          { icon: '🎯', text: 'Définir le zéro de référence au niveau de l\'oreillette droite (OD) du patient', note: '' },
          { icon: '🔄', text: 'Tourner le robinet → tête de pression en relation avec la pression atmosphérique (bouchon percé — côté patient shunté)', note: '' },
          { icon: '📱', text: 'Sur le scope : appuyer sur "0 Zéro" puis "PA"', note: 'La courbe PA s\'aplatie. Message : "PA zéro en cours" puis "PA zéro effectué"' },
          { icon: '🔄', text: 'Remettre le robinet en position initiale → courbe et chiffres PA réapparaissent', note: '' },
          { icon: '🔔', text: 'Régler les limites d\'alarmes de la PA (systole, diastole, moyenne)', note: '' },
          { icon: '📝', text: 'Tracer la pose : date, heure, site de pose dans le dossier de soins', note: '' },
          { icon: '🏷️', text: 'Identifier la ligne artérielle avec l\'étiquette du kit', note: '' },
          { icon: '🙌', text: 'FHA + désinfection du matériel et des surfaces + élimination déchets', note: '' }
        ]
      },
      {
        id: 's6', icon: '🩸', title: 'B. PRÉLÈVEMENT sur KTA',
        steps: [
          { icon: '🙌', text: 'Effectuer une FHA', note: '' },
          { icon: '🧤', text: 'Mettre des gants UU non stériles', note: '' },
          { icon: '📦', text: 'Ouvrir aseptiquement le matériel + assembler corps vacutainer + adaptateur', note: '' },
          { icon: '🧴', text: 'Imprégner des compresses stériles d\'ATS alcoolique', note: '' },
          { icon: '🔓', text: 'Ouvrir le bouchon du robinet avec compresses imbibées d\'ATS', note: '' },
          { icon: '🔌', text: 'Adapter le système de prélèvement au robinet', note: '' },
          { icon: '🚽', text: 'Purger la tubulure avec un tube de purge (±3 mL) → éliminer dans collecteur OPCT', note: 'Indispensable pour éviter la contamination par le NaCl de la poche' },
          { icon: '🧪', text: 'Introduire les tubes de prélèvement selon l\'ordre recommandé', note: '' },
          { icon: '🔄', text: 'Homogénéiser le sang par retournements lents après remplissage', note: '' },
          { icon: '💨', text: 'Pour GDS : fermer voie patient → adapter seringue GDS → ouvrir voie patient-robinet → la seringue se remplie automatiquement', note: 'Sous pression artérielle sanglante' },
          { icon: '🔒', text: 'Fermer la voie patient → retirer la seringue GDS', note: '' },
          { icon: '🧴', text: 'Purger le sang restant dans le robinet sur compresses ATS', note: '' },
          { icon: '🔩', text: 'Visser un obturateur stérile (manipuler avec compresse ATS)', note: '' },
          { icon: '💧', text: 'Ouvrir voie transducteur-patient → purger le reste de tubulure (languette bleue ou pattes latérales)', note: '' },
          { icon: '🎯', text: 'Refaire un zéro de référence', note: '' },
          { icon: '🏷️', text: 'Étiqueter les tubes — vérifier concordance identité patient', note: '' },
          { icon: '📋', text: 'Remplir le bon d\'analyse + acheminer vers le laboratoire', note: '' },
          { icon: '📝', text: 'Tracer le type d\'analyse et l\'heure dans la feuille journalière', note: '' },
          { icon: '🙌', text: 'FHA + élimination déchets et gants', note: '' }
        ]
      },
      {
        id: 's7', icon: '🩹', title: 'C. RÉFECTION DU PANSEMENT',
        steps: [
          { icon: '🧤', text: 'Mettre gants à UU', note: '' },
          { icon: '🩹', text: 'Retirer le pansement → éliminer gants dans DASND', note: '' },
          { icon: '🙌', text: 'Effectuer une FHA', note: '' },
          { icon: '🧤', text: 'Remettre des gants à UU', note: '' },
          { icon: '📦', text: 'Ouvrir le set à pansement', note: '' },
          { icon: '🧴', text: 'Imbiber les compresses d\'ATS alcoolique', note: '' },
          { icon: '🌀', text: 'Désinfection du point de ponction et des fils aux pinces (technique de l\'escargot)', note: 'Respecter le temps de séchage' },
          { icon: '🩹', text: 'Recouvrir d\'un pansement stérile transparent', note: '' },
          { icon: '🗑️', text: 'Éliminer déchets et gants dans DASND + FHA', note: '' },
          { icon: '📝', text: 'Tracer le soin', note: '' }
        ],
        info: '📅 Fréquences : 1er pansement J2, puis tous les 7 jours (pansement transparent) / 48H si non visible, souillé, décollé ou humide. Changement de ligne : tous les 7 jours.'
      },
      {
        id: 's8', icon: '👁️', title: 'D. SURVEILLANCE',
        steps: [
          { icon: '🩹', text: 'Intégrité du pansement (occlusif, non décollé, non humide)', note: '' },
          { icon: '🔴', text: 'Point de ponction : rougeur, induration, douleur', note: '' },
          { icon: '💧', text: 'Perméabilité du dispositif', note: '' },
          { icon: '⬆️', text: 'Pression dans la poche de contre-pression : maintenir à 300 mmHg', note: '' },
          { icon: '🌡️', text: 'Température du patient', note: '' },
          { icon: '📝', text: 'Tracer la surveillance + date de changement des lignes dans le dossier', note: '' },
          { icon: '🎯', text: 'Faire le zéro régulièrement : au moins 1 fois par équipe et après chaque prélèvement ou mobilisation', note: '' }
        ]
      },
      {
        id: 's9', icon: '⚠️', title: 'E. RISQUES ET COMPLICATIONS',
        steps: [
          { icon: '🟠', text: 'Hématome au point de ponction', note: '' },
          { icon: '🔴', text: 'Lésion de l\'artère', note: '' },
          { icon: '⬆️', text: 'Migration du guide', note: '' },
          { icon: '🦠', text: 'Infection sur cathéter', note: '' },
          { icon: '🩸', text: 'Thrombose artérielle', note: '' },
          { icon: '💔', text: 'Embolies', note: '' },
          { icon: '💉', text: 'Injection accidentelle dans le cathéter', note: '⚠️ RISQUE VITAL — identifier la ligne artérielle' },
          { icon: '🩸', text: 'Déconnection du cathéter avec exsanguination', note: '⚠️ RISQUE VITAL — vérifier les connexions' },
          { icon: '🔄', text: 'Fistules artérioveineuses, anévrysmes et dissections artérielles', note: '' }
        ]
      },
      {
        id: 's10', icon: '🗑️', title: 'F. ABLATION DU KTA',
        steps: [
          { icon: '📋', text: 'Ablation sur prescription médicale dès que le KTA n\'est plus nécessaire, ne fonctionne plus ou en cas d\'inflammation / infection', note: '' },
          { icon: '🙌', text: 'Effectuer une FHA', note: '' },
          { icon: '🧴', text: 'Désinfection du point de ponction et des fils avec compresses ATS', note: '' },
          { icon: '✂️', text: 'Couper les fils qui le maintiennent à la peau (pinces + bistouri)', note: '' },
          { icon: '↩️', text: 'Retirer délicatement le cathéter — vérifier son intégrité', note: '' },
          { icon: '🩺', text: 'Compression manuelle du point de ponction avec compresses stériles jusqu\'à arrêt du saignement', note: '' },
          { icon: '✂️', text: 'L\'AS coupe l\'extrémité du cathéter dans le pot stérile pour mise en culture', note: '' },
          { icon: '🩹', text: 'Mettre un pansement (compressif si trouble hémostase ou voie fémorale)', note: '' },
          { icon: '🏷️', text: 'Étiqueter le pot stérile — remplir bon d\'analyse — acheminer au laboratoire', note: '' },
          { icon: '💪', text: 'Installer un brassard à tension pour la prise des constantes', note: '' },
          { icon: '📝', text: 'Tracer le retrait dans le dossier de soins + surveiller le point de ponction', note: '' },
          { icon: '🙌', text: 'FHA + élimination déchets dans la filière adaptée', note: '' }
        ]
      }
    ]
  },
  {
    id: 'thermogard',
    title: 'Thermogard — Hypothermie Thérapeutique',
    subtitle: 'Post-ACR · Préparation · Montage · Programmation',
    ref: 'RD : PRO/SOIN/5-2/18 — Version 0 — 05-08-22',
    color: 'var(--ide)',
    icon: '🌡️',
    sections: [
      {
        id: 't1', icon: '📋', title: 'A. GÉNÉRALITÉS',
        steps: [
          { icon: '🎯', text: 'Objectif : amener le patient à 34°C le plus précocement possible pendant 24H post-ACR', note: 'Effet protecteur cérébral démontré — améliore le pronostic neurologique' },
          { icon: '🧊', text: 'Fonctionnement : NaCl circule en système clos dans les ballonnets du CVC fémoral 5 voies', note: 'Le refroidissement du sang se fait au contact des ballonnets' },
          { icon: '⏳', text: 'Durée maximale de maintien du CVC : 4 jours', note: '' },
          { icon: '🦠', text: 'Risque infectieux lié au CVC', note: '' },
          { icon: '🩸', text: 'Risque thromboembolique majoré par rapport à un CVC classique (malgré le revêtement hépariné)', note: '⚠️ Retirer le CVC Thermogard dès que possible' }
        ]
      },
      {
        id: 't2', icon: '🛒', title: 'B. PRÉPARATION DU PATIENT ET DU MATÉRIEL',
        steps: [
          { icon: '🫁', text: 'Patient intubé, ventilé, sédaté, curarisé et porteur d\'une sonde thermique', note: 'Conditions préalables OBLIGATOIRES avant montage' },
          { icon: '🖥️', text: 'Moniteur de refroidissement : Thermogard 3000 ALSIUS', note: '' },
          { icon: '📦', text: 'Kit de démarrage réf. 8700-0784-01 ZOLL — Code pharma : 331 497', note: '' },
          { icon: '💉', text: 'CVC fémoral 5 voies réf. 8700-0782-40 ZOLL — Code pharma : 331 496', note: '' },
          { icon: '💧', text: '1 poche de NaCl 500 mL', note: '' },
          { icon: '🌡️', text: 'Sonde thermique — Code pharma : 331 202', note: '' },
          { icon: '🩹', text: 'Compresses stériles + Antiseptique Chlorhexidine alcoolique 2%', note: '' }
        ]
      },
      {
        id: 't3', icon: '🔧', title: 'C. MONTAGE DE LA MACHINE',
        steps: [
          { icon: '🔌', text: 'Brancher le cordon d\'alimentation et mettre sous tension', note: '' },
          { icon: '⏳', text: 'Laisser l\'autotest initial se terminer (quelques minutes)', note: 'La machine effectue un autotest toutes les 4H automatiquement' },
          { icon: '🎮', text: 'Navigation : bouton rotatif pour faire défiler les options → appuyer pour valider', note: '' },
          { icon: '🌀', text: 'Mettre le serpentin dans la cuve de liquide de refroidissement (propylène glycol + eau)', note: 'Niveau de liquide au MAXIMUM — remettre le couvercle' },
          { icon: '⚙️', text: 'Insérer la tubulure dans la pompe à galets avec la manivelle', note: 'Un relief s\'encastre dans la gorge à droite de la pompe — rabattre la poignée — refermer le capot' },
          { icon: '💧', text: 'Connecter le NaCl aseptiquement → placer dans un sac isotherme → suspendre sur le côté de la machine', note: '⚠️ Attention à ne pas clamper les tubulures à la fermeture du couvercle' },
          { icon: '🔄', text: 'Mettre le piège à bulles à l\'ENVERS', note: '' },
          { icon: '▶️', text: 'Appuyer fortement sur le bouton de la pompe à galets — maintenir jusqu\'à remplir le piège à bulles jusqu\'en haut', note: 'Tapoter délicatement pour déloger les bulles d\'air' },
          { icon: '⬆️', text: 'Remettre le piège à bulles à l\'ENDROIT dans son support', note: '' },
          { icon: '⏩', text: 'Continuer à appuyer jusqu\'à purge complète — vérifier que la turbine tourne', note: '' },
          { icon: '🔀', text: 'Acheminer la tubulure en dehors de la machine par les encoches avant de la console', note: '' },
          { icon: '🔒', text: 'Fermer le couvercle supérieur → machine prête', note: '' },
          { icon: '✅', text: 'Le médecin vérifie l\'intégrité des ballonnets du CVC (gonflage à l\'air ou au NaCl)', note: '' },
          { icon: '🔗', text: 'Brancher aseptiquement la tubulure sur les 2 voies EXTÉRIEURES du KT posé', note: '' },
          { icon: '🌡️', text: 'Insérer la sonde thermique dans l\'anus du patient → relier au câble → brancher sur T1', note: '' }
        ]
      },
      {
        id: 't4', icon: '❄️', title: 'D. PROGRAMMATION — Refroidir',
        steps: [
          { icon: '1️⃣', text: 'Sélectionner : Pré-refroidissement → Valider', note: '' },
          { icon: '2️⃣', text: 'Sélectionner : Nouveau patient → Valider', note: '' },
          { icon: '3️⃣', text: 'Sélectionner : Effacer données → Valider', note: '' },
          { icon: '4️⃣', text: 'Mettre la température désirée : 34°C → Valider', note: '' },
          { icon: '5️⃣', text: 'Sélectionner : Puissance maximale → Valider', note: '' },
          { icon: '6️⃣', text: 'Appuyer sur le bouton : RUN', note: '' },
          { icon: '7️⃣', text: 'Sonde de température : sélectionner OUI', note: '' }
        ]
      },
      {
        id: 't5', icon: '🔥', title: 'D. PROGRAMMATION — Réchauffer',
        steps: [
          { icon: '1️⃣', text: 'Mettre sur veille en appuyant sur la molette', note: '' },
          { icon: '2️⃣', text: 'Sélectionner : Fin de procédure OUI + Effacer données', note: '' },
          { icon: '3️⃣', text: 'Éteindre l\'appareil puis le RALLUMER', note: '' },
          { icon: '4️⃣', text: 'Sélectionner : Pré-réchauffement → Valider', note: '' },
          { icon: '5️⃣', text: 'Mettre NON pour changement de température → Valider', note: '' },
          { icon: '6️⃣', text: 'Sélectionner : Débit contrôlé → Valider', note: '' },
          { icon: '7️⃣', text: 'Mettre 0.1°C/heure → Valider', note: '' },
          { icon: '⏳', text: 'Attendre le changement de mode de la machine (quelques minutes)', note: '' }
        ]
      },
      {
        id: 't6', icon: '⏹️', title: 'D. PROGRAMMATION — Arrêt de l\'appareil',
        steps: [
          { icon: '1️⃣', text: 'Mettre en veille en appuyant sur la molette', note: '' },
          { icon: '2️⃣', text: 'Sélectionner : Fin de procédure → Valider', note: '' },
          { icon: '3️⃣', text: 'Désadapter aseptiquement la tubulure Thermogard du CVC → le ballonnet se dégonfle', note: '' },
          { icon: '4️⃣', text: 'Clamper une voie extérieure (voie femelle) du CVC', note: '' },
          { icon: '5️⃣', text: 'Sur l\'autre voie (mâle) : aspirer avec une seringue de 10 mL pour dégonfler les ballonnets', note: '' },
          { icon: '6️⃣', text: 'Mettre un obturateur LL mâle/femelle sur chaque voie', note: '' },
          { icon: '⚠️', text: 'Si le patient n\'a pas d\'autres voies de perfusion : voir le médecin pour poser un CVC classique', note: '' },
          { icon: '🗑️', text: 'Retirer le CVC Thermogard DÈS QUE POSSIBLE pour limiter les risques de thrombose veineuse', note: '⚠️ Risque thromboembolique majoré avec CVC Thermogard vs CVC classique' }
        ]
      }
    ]
  }
  ];
