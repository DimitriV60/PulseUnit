// PulseUnit — Normes de référence cliniques (6 catégories : vitaux, GDS, ventilation, biologie, dialyse, urines).
// Extrait d'index.html (était aux lignes 5469-5809).
// Expose window.NORMES_REF pour cohabiter avec les scripts inline d'index.html
// pendant la migration vers l'architecture feature-based.

  window.NORMES_REF = [
    {
      id: 'VITAUX', icon: '🫀', label: 'Vitaux',
      groups: [
        { title: 'Hémodynamique', rows: [
          { p: 'Fréquence cardiaque',        n: '60 – 100',       u: 'bpm',        a: '< 40 ou > 150' },
          { p: 'PAS',                         n: '100 – 140',      u: 'mmHg',       a: '< 90 ou > 180' },
          { p: 'PAD',                         n: '60 – 90',        u: 'mmHg',       w: '< 50 ou > 110' },
          { p: 'PAM (objectif réa)',           n: '≥ 65',           u: 'mmHg',       a: '< 65 = choc' },
          { p: 'PAM (sepsis / choc septique)', n: '65 – 75',        u: 'mmHg',       a: '< 65 → amines vasoactives' },
          { p: 'PVC',                          n: '5 – 12',         u: 'cmH₂O',     w: '< 3 = hypovolémie' },
          { p: 'ScvO₂ (VCS)',                  n: '70 – 80',        u: '%',          a: '< 65 = hypoperfusion' },
          { p: 'SvO₂ (sang veineux mixte)',    n: '65 – 75',        u: '%',          a: '< 60 = choc/déséquilibre' },
        ]},
        { title: 'Respiratoire', rows: [
          { p: 'Fréquence respiratoire',      n: '12 – 20',        u: '/min',       a: '> 25 ou < 8' },
          { p: 'SpO₂ (standard)',             n: '≥ 95',           u: '%',          a: '< 90 = urgence' },
          { p: 'SpO₂ (BPCO / IRC)',           n: '88 – 92',        u: '%',          w: 'Cible restrictive' },
        ]},
        { title: 'Température & Neurologie', rows: [
          { p: 'Température centrale',        n: '36.5 – 38.0',    u: '°C',         w: '> 38.3 = fièvre / < 36 = hypothermie' },
          { p: 'Cible hypothermie (post-ACR)', n: '32 – 36',        u: '°C',         w: 'Selon protocole TTM 48h' },
          { p: 'Glasgow',                     n: '15',             u: '/15',        a: '≤ 8 = IOT à discuter' },
          { p: 'Glycémie capillaire (cible ICU)', n: '1.40 – 1.80', u: 'g/L',      a: '< 0.70 = hypoglycémie urgente' },
        ]},
      ]
    },
    {
      id: 'GDS', icon: '🩸', label: 'GDS',
      groups: [
        { title: 'Gaz du sang artériels (air ambiant)', rows: [
          { p: 'pH artériel',                 n: '7.35 – 7.45',    u: '',           a: '< 7.20 ou > 7.55' },
          { p: 'PaO₂',                        n: '80 – 100',       u: 'mmHg',       a: '< 60 = hypoxémie' },
          { p: 'PaCO₂',                       n: '35 – 45',        u: 'mmHg',       w: '> 55 = décompensation' },
          { p: 'HCO₃⁻',                       n: '22 – 26',        u: 'mmol/L',     w: '< 18 ou > 30' },
          { p: 'BE (excès base)',              n: '−2 à +2',        u: 'mmol/L',     w: '< −5 = acidose signif.' },
          { p: 'SaO₂',                        n: '95 – 100',       u: '%',          a: '< 90' },
        ]},
        { title: 'Lactates & Oxygénation', rows: [
          { p: 'Lactates',                    n: '0.5 – 1.8',      u: 'mmol/L',     a: '> 4.0 = choc/hypoperf.' },
          { p: 'Rapport P/F (PaO₂/FiO₂)',    n: '> 400',          u: '',           a: '< 200 = SDRA modéré/sév.' },
          { p: 'P/F — SDRA léger',            n: '300 – 400',      u: '',           w: 'CPAP/VNI à discuter' },
          { p: 'P/F — SDRA modéré',           n: '100 – 300',      u: '',           a: 'VM + décubitus si < 150' },
          { p: 'P/F — SDRA sévère',           n: '< 100',          u: '',           a: 'DV systématique' },
        ]},
      ]
    },
    {
      id: 'VENTILATOIRE', icon: '💨', label: 'Ventilation',
      groups: [
        { title: 'Paramètres réglés (VM protection pulmonaire)', rows: [
          { p: 'Volume courant (Vt)',          n: '6 – 8',          u: 'mL/kg IBW',  a: '> 10 = volutrauma' },
          { p: 'Fréquence réglée',             n: '14 – 20',        u: '/min',       w: 'Selon PaCO₂ cible' },
          { p: 'FiO₂',                         n: 'Minimum requis', u: '',           w: 'Réduire dès SpO₂ stable' },
          { p: 'PEEP (standard)',              n: '5 – 8',          u: 'cmH₂O',     w: 'Titration selon FiO₂/SpO₂' },
          { p: 'PEEP (SDRA modéré/sévère)',    n: '8 – 15',         u: 'cmH₂O',     w: 'Selon table ARDSnet' },
          { p: 'Rapport I:E',                  n: '1:2',            u: '',           w: 'Adapter selon pathologie' },
        ]},
        { title: 'Pressions & Mécanique ventilatoire', rows: [
          { p: 'Pression plateau (Pplat)',     n: '< 30',           u: 'cmH₂O',     a: '> 30 = barotrauma' },
          { p: 'Driving pressure (ΔP = Pplat−PEEP)', n: '< 15',    u: 'cmH₂O',     a: '> 15 = surmortalité SDRA' },
          { p: 'Pression de pic',              n: '< 35',           u: 'cmH₂O',     w: '> 40 = alarme circuit' },
          { p: 'Auto-PEEP (PEEPi)',            n: '0',              u: 'cmH₂O',     w: '> 5 = risque hémodynamique' },
          { p: 'Compliance statique',          n: '50 – 80',        u: 'mL/cmH₂O',  w: '< 30 = pathologie sévère' },
          { p: 'Compliance dynamique',         n: '40 – 60',        u: 'mL/cmH₂O',  w: '< 25 = alarme' },
        ]},
        { title: 'Sevrage ventilatoire — Critères IDE', rows: [
          { p: 'SpO₂ sous FiO₂ ≤ 0.40',      n: '≥ 92',           u: '%',          w: 'Prérequis sevrage' },
          { p: 'PEEP lors du sevrage',         n: '≤ 8',            u: 'cmH₂O',     w: 'Avant épreuve VS' },
          { p: 'FR spontanée',                 n: '< 30',           u: '/min',       a: '> 35 = échec VS probable' },
          { p: 'Vt spontané',                  n: '> 5',            u: 'mL/kg',     w: '< 4 = echec VS probable' },
          { p: 'Indice de Tobin (f/Vt)',       n: '< 105',          u: '/L',         a: '> 105 = sevrage difficile' },
          { p: 'Glasgow pour extubation',      n: '≥ 10',           u: '/15',        w: 'Vérifier réflexe toux' },
        ]},
        { title: 'VNI (Ventilation Non Invasive)', rows: [
          { p: 'Fuites masque/casque',         n: '< 20 – 30',      u: 'L/min',      a: '> 30 = efficacité compromise' },
          { p: 'AI (Aide Inspiratoire)',        n: 'Selon confort',  u: 'cmH₂O',     w: 'Cible Vt 6–8 mL/kg' },
          { p: 'Pente (Rise Time)',             n: 'Courte (rapide)',u: '',           w: 'Mieux tolérée si soif d\'air' },
          { p: 'Critères succès VNI',          n: 'SpO₂ ↑ FR ↓',   u: '',           w: 'Amélioration dans 1–2h' },
        ]},
        { title: 'Optiflow / OHFD + Index ROX', rows: [
          { p: 'Débit',                        n: '30 – 60',        u: 'L/min',      w: 'Débuter à 30–40, titrer' },
          { p: 'FiO₂',                         n: '21 – 100',       u: '%',          w: 'Réduire dès SpO₂ stable' },
          { p: 'Température',                  n: '37',             u: '°C',         w: '31–34°C si intolérance chaleur' },
          { p: 'Index ROX = (SpO₂/FiO₂)/FR',  n: '> 4.88',         u: '',           w: '< 2.85 = échec → intubation' },
        ]},
      ]
    },
    {
      id: 'BIO', icon: '🧪', label: 'Biologie',
      groups: [
        { title: 'NFS', rows: [
          { p: 'Hémoglobine (H)',              n: '130 – 175',      u: 'g/L',        a: '< 70 = transfusion ICU' },
          { p: 'Hémoglobine (F)',              n: '120 – 160',      u: 'g/L',        a: '< 70 = transfusion ICU' },
          { p: 'Plaquettes',                   n: '150 – 400',      u: 'G/L',        a: '< 50 = risque hémorragique' },
          { p: 'Leucocytes',                   n: '4 – 10',         u: 'G/L',        w: '> 12 ou < 2' },
          { p: 'Neutrophiles',                 n: '1.8 – 7.7',      u: 'G/L',        a: '< 0.5 = aplasie' },
        ]},
        { title: 'Ionogramme plasmatique', rows: [
          { p: 'Sodium',                       n: '136 – 145',      u: 'mmol/L',     a: '< 125 ou > 155' },
          { p: 'Potassium',                    n: '3.5 – 5.0',      u: 'mmol/L',     a: '< 3.0 ou > 6.0 = urgence' },
          { p: 'Chlore',                       n: '98 – 107',       u: 'mmol/L',     w: '< 90 ou > 115' },
          { p: 'Bicarbonates',                 n: '22 – 26',        u: 'mmol/L',     w: '< 18 ou > 32' },
          { p: 'Calcium ionisé',               n: '1.15 – 1.35',    u: 'mmol/L',     a: '< 0.90 = urgence EER' },
          { p: 'Calcium total',                n: '2.20 – 2.60',    u: 'mmol/L',     w: '< 1.90 ou > 3.00' },
          { p: 'Magnésium',                    n: '0.75 – 1.00',    u: 'mmol/L',     a: '< 0.50 = arythmie' },
          { p: 'Phosphore',                    n: '0.80 – 1.45',    u: 'mmol/L',     a: '< 0.30 = critique' },
          { p: 'Osmolalité',                   n: '280 – 295',      u: 'mOsm/kg',    w: '> 320 = hyperosmolarité' },
        ]},
        { title: 'Rein', rows: [
          { p: 'Urée',                         n: '2.5 – 7.5',      u: 'mmol/L',     w: '> 20 = IRA/IRC avancée' },
          { p: 'Créatinine (H)',               n: '62 – 106',       u: 'µmol/L',     w: '> 200 = IRA/IRC' },
          { p: 'Créatinine (F)',               n: '44 – 80',        u: 'µmol/L',     w: '> 150 = IRA/IRC' },
          { p: 'DFG (CKD-EPI)',                n: '> 60',           u: 'mL/min/1.73m²', a: '< 30 = IRC sévère' },
        ]},
        { title: 'Foie & Pancréas', rows: [
          { p: 'ASAT',                         n: '< 40',           u: 'UI/L',       w: '> 3× N = cytolyse signif.' },
          { p: 'ALAT',                         n: '< 40',           u: 'UI/L',       w: '> 3× N = cytolyse signif.' },
          { p: 'Bilirubine totale',            n: '< 17',           u: 'µmol/L',     w: '> 50 = ictère significatif' },
          { p: 'PAL',                          n: '40 – 130',       u: 'UI/L',       w: '> 3× N = cholestase' },
          { p: 'GGT',                          n: 'H < 55 / F < 38', u: 'UI/L',      w: '> 3× N' },
          { p: 'Lipase',                       n: '< 60',           u: 'UI/L',       a: '> 3× N = pancréatite' },
          { p: 'LDH',                          n: '135 – 225',      u: 'UI/L',       w: '> 2× N' },
        ]},
        { title: 'Coagulation', rows: [
          { p: 'TP',                           n: '70 – 100',       u: '%',          a: '< 50 = IHC / CIVD' },
          { p: 'TCA (ratio)',                  n: '< 1.20',         u: 'ratio P/T',  w: '> 1.5 = héparine ou CIVD' },
          { p: 'INR',                          n: '0.9 – 1.2',      u: '',           a: '> 3.0 = risque hémorragique' },
          { p: 'Fibrinogène',                  n: '2.0 – 4.0',      u: 'g/L',        a: '< 1.0 = CIVD' },
          { p: 'D-Dimères',                    n: '< 500',          u: 'µg/L FEU',   w: '> 500 = TVP/EP possible' },
        ]},
        { title: 'Seuils transfusionnels — SFAR 2021', rows: [
          { p: 'CGR — Hb seuil réa',           n: '< 70',           u: 'g/L',        w: '< 80 si IDM aigu / instabilité' },
          { p: 'CGR — Hb seuil post-op card.', n: '< 80',           u: 'g/L',        w: 'Selon tolérance clinique' },
          { p: 'CPA — Plaquettes prophyl.',    n: '< 10',           u: 'G/L',        w: '< 50 si saignement / geste invasif' },
          { p: 'PFC — indication',             n: 'TP < 40 %',      u: '',           a: '+ saignement actif ou geste urgent' },
          { p: 'Fibrinogène — seuil substitut.', n: '< 1.5',        u: 'g/L',        a: '+ saignement actif → concentré fibr.' },
          { p: 'Ratio transfusion massive',    n: '1:1:1',          u: 'CGR:PFC:CPA', w: 'Protocole hémorragie massive' },
        ]},
        { title: 'Inflammation & Métabolisme', rows: [
          { p: 'CRP',                          n: '< 10',           u: 'mg/L',       w: '> 100 = infection bact.' },
          { p: 'Procalcitonine (PCT)',          n: '< 0.5',          u: 'ng/mL',      a: '> 2 = sepsis / > 10 = choc' },
          { p: 'Albumine',                     n: '35 – 50',        u: 'g/L',        w: '< 25 = dénutrition sévère' },
          { p: 'Glycémie',                     n: '0.70 – 1.10',    u: 'g/L',        a: '< 0.60 ou > 1.80' },
          { p: 'Glycémie cible ICU',           n: '1.40 – 1.80',    u: 'g/L',        w: 'Selon protocole insulin.' },
          { p: 'NT-proBNP (< 75 ans)',         n: '< 125',          u: 'pg/mL',      w: '> 900 = IC probable' },
          { p: 'Troponine Ic Hs (hs-TnI)',     n: 'Selon labo',     u: 'ng/L',       w: '> 99e percentile = SCA' },
          { p: 'Lactates',                     n: '0.5 – 1.8',      u: 'mmol/L',     a: '> 4.0 = choc / hypoperf.' },
        ]},
      ]
    },
    {
      id: 'SCORES', icon: '📊', label: 'Scores',
      groups: [
        { title: 'Sédation — RASS (Richmond Agitation-Sedation Scale)', rows: [
          { p: '+4 Combatif',                  n: 'Violent, danger immédiat', u: '',  a: 'Intervention urgente' },
          { p: '+3 Très agité',                n: 'Arrache dispositifs',      u: '',  a: 'Sédation à revoir' },
          { p: '+2 Agité',                     n: 'Mvts fréquents, désadapté', u: '', w: 'Titrer sédation' },
          { p: '+1 Inquiet',                   n: 'Anxieux, mouvements lents', u: '', w: '' },
          { p: '0 Éveillé & calme',            n: '✅ Cible sédation légère',  u: '',  },
          { p: '−1 Somnolent',                 n: 'Pas pleinement éveillé',   u: '',  },
          { p: '−2 Sédation légère',           n: '✅ Cible réa (−2 à 0)',     u: '',  },
          { p: '−3 Sédation modérée',          n: 'Mvts à stimulation vocale', u: '', w: 'Vérifier si nécessaire' },
          { p: '−4 Sédation profonde',         n: 'Stimulation physique seule', u: '', w: 'Réveil quotidien si possible' },
          { p: '−5 Non réveillable',           n: 'Aucune réponse',            u: '', a: 'Évaluer indication' },
        ]},
        { title: 'Douleur — Patient communicant', rows: [
          { p: 'EVA / EN — Absence',           n: '0',              u: '/10',        },
          { p: 'EVA / EN — Légère',            n: '1 – 3',          u: '/10',        },
          { p: 'EVA / EN — Modérée',           n: '4 – 6',          u: '/10',        w: 'Antalgique à prévoir' },
          { p: 'EVA / EN — Sévère',            n: '7 – 10',         u: '/10',        a: 'Traitement urgent' },
          { p: 'Seuil d\'intervention',        n: '> 3',            u: '/10',        w: 'Protocole antalgique' },
        ]},
        { title: 'Douleur — Patient non communicant / sous VM', rows: [
          { p: 'CPOT — Absence douleur',       n: '0 – 1',          u: '/8',         },
          { p: 'CPOT — Douleur',               n: '≥ 2',            u: '/8',         a: 'Antalgique requis' },
          { p: 'BPS — Absence douleur',        n: '3',              u: '/12',        },
          { p: 'BPS — Douleur probable',       n: '> 5',            u: '/12',        a: 'Antalgique requis' },
        ]},
        { title: 'Confusion — CAM-ICU (évaluation IDE)', rows: [
          { p: 'Début aigu ou fluctuant',      n: 'Oui / Non',      u: '',           w: 'Critère 1 (requis)' },
          { p: 'Inattention',                  n: 'Oui / Non',      u: '',           w: 'Critère 2 (requis)' },
          { p: 'Conscience altérée ou Désorg.', n: 'Au moins 1',     u: '',           w: 'Critère 3 ou 4' },
          { p: 'CAM-ICU positif',              n: 'Critères 1+2+3/4', u: '',         a: 'Délirium → prévention chutes' },
        ]},
        { title: 'Autres scores IDE courants', rows: [
          { p: 'Waterlow (escarre)',           n: '< 10 = faible',   u: '/∞',         w: '> 15 = très haut risque' },
          { p: 'Braden (escarre)',             n: '> 18 = faible',   u: '/23',        a: '< 12 = risque élevé' },
          { p: 'NAS (charge en soins)',        n: '40 – 60',         u: '%',          w: '> 100 = surcharge IDE' },
          { p: 'SOFA (dysfonctions organes)',  n: '0',               u: '/24',        a: '> 11 = mortalité > 50 %' },
          { p: 'qSOFA (dépistage sepsis)',     n: '0',               u: '/3',         a: '≥ 2 = sepsis probable' },
        ]},
      ]
    },
    {
      id: 'NUTRITION', icon: '🍽️', label: 'Nutrition',
      groups: [
        { title: 'Apports nutritionnels cibles (adulte réanimation)', rows: [
          { p: 'Énergie — phase aiguë (J1–J3)', n: '15 – 20',      u: 'kcal/kg/j',  w: 'Éviter sur-alimentation' },
          { p: 'Énergie — phase stable (J4+)',  n: '20 – 25',       u: 'kcal/kg/j',  w: 'Selon calorimétrie si dispo' },
          { p: 'Énergie — réhabilitation',      n: '25 – 30',       u: 'kcal/kg/j',  w: 'Adapter selon activité' },
          { p: 'Protéines — standard',          n: '1.2 – 2.0',     u: 'g/kg/j',     w: 'Augmenter si sarcopénie' },
          { p: 'Protéines — insuffisance rénale (sans EER)', n: '0.8 – 1.2', u: 'g/kg/j', w: 'Éviter sur-charge azotée' },
          { p: 'Protéines — sous EER',          n: '1.5 – 2.5',     u: 'g/kg/j',     w: 'Pertes dialysat à compenser' },
          { p: 'Glucides (max)',                n: '5',              u: 'g/kg/j',     w: 'Éviter hyperglycémie' },
          { p: 'Lipides',                       n: '1.0 – 1.5',     u: 'g/kg/j',     w: '' },
        ]},
        { title: 'Nutrition entérale (NE) — surveillance IDE', rows: [
          { p: 'Démarrage NE',                  n: '< 24 – 48h',    u: '',           w: 'Si hémodynamiquement stable' },
          { p: 'Débit de départ',               n: '20 – 25',       u: 'mL/h',       w: 'Monter progressivement' },
          { p: 'Résidu gastrique (tolérance)',  n: '< 500',         u: 'mL/6h',      a: '> 500 → réduire débit, métoclo.' },
          { p: 'Position tête de lit',          n: '30 – 45°',      u: '',           a: '< 30° = risque inhalation' },
          { p: 'Glycémie sous NE (cible)',      n: '1.40 – 1.80',   u: 'g/L',        a: '> 1.80 → protocole insuline' },
          { p: 'Rinçage SNG',                   n: '30 mL eau',     u: '',           w: 'Avant/après médicaments' },
        ]},
        { title: 'Nutrition parentérale (NP)', rows: [
          { p: 'Indication NP',                 n: 'NE impossible ou insuffisante', u: '', w: 'Après 48–72h si NE < 60%' },
          { p: 'NP complémentaire',             n: 'Si NE < 60% cible après J3', u: '',  w: 'ESPEN 2023' },
          { p: 'Contrôle glycémie sous NP',     n: '1.40 – 1.80',   u: 'g/L',        a: 'Hyperglycémie fréquente' },
          { p: 'Vitamines & oligoéléments',     n: 'Apport quotidien', u: '',         w: 'Thiamine (B1) si alcool/renutr.' },
          { p: 'Phosphore (syndrome renutr.)',  n: '> 0.80',        u: 'mmol/L',     a: '< 0.50 = risque réalimentation' },
        ]},
        { title: 'Surveillance nutritionnelle', rows: [
          { p: 'Albumine',                      n: '35 – 50',       u: 'g/L',        w: '< 30 = dénutrition modérée' },
          { p: 'Préalbumine (transthyrétine)',  n: '0.20 – 0.40',   u: 'g/L',        w: '< 0.10 = dénutrition sévère' },
          { p: 'Bilan azoté',                   n: 'Équilibre ou +', u: '',          w: 'Azote entrant > azote sortant' },
          { p: 'IMC normal',                    n: '18.5 – 25',     u: 'kg/m²',      w: '< 18.5 = maigreur / > 30 = obésité' },
        ]},
      ]
    },
    {
      id: 'DIALYSE', icon: '🫘', label: 'Dialyse',
      groups: [
        { title: 'Stades AKI — KDIGO 2012', rows: [
          { p: 'Stade 1',  n: 'Créat × 1.5–1.9 ou ↑ ≥ 26.5 µmol/L / 48 h', u: '', w: 'Ou diurèse < 0.5 mL/kg/h × 6–12h' },
          { p: 'Stade 2',  n: 'Créat × 2.0–2.9', u: '', w: 'Ou diurèse < 0.5 mL/kg/h × ≥ 12h' },
          { p: 'Stade 3',  n: 'Créat × 3 ou ≥ 354 µmol/L', u: '', a: 'Ou anurie ≥ 12h / diurèse < 0.3 mL/kg/h × 24h' },
        ]},
        { title: 'Paramètres EER (CVVH / CVVHD)', rows: [
          { p: 'Débit sang',                   n: '150 – 250',      u: 'mL/min',     w: 'Adapter selon accès' },
          { p: 'Débit effluent cible',         n: '20 – 25',        u: 'mL/kg/h',    w: 'AKIKI recommande 20 mL/kg/h' },
          { p: 'Bilan horaire',                n: 'Selon objectif', u: '',           w: '0 à négatif (prescription)' },
          { p: 'Température filtre',           n: '≥ 36',           u: '°C',         w: 'Prévenir hypothermie' },
        ]},
        { title: 'Anticoagulation EER', rows: [
          { p: 'Héparine — Anti-Xa',           n: '0.3 – 0.5',      u: 'UI/mL',      a: '> 0.7 = surdosage' },
          { p: 'Héparine — TCA circuit',       n: '50 – 70',        u: 's',          w: 'Ratio circuit/patient' },
          { p: 'Citrate — Ca²⁺ post-filtre',   n: '0.25 – 0.35',    u: 'mmol/L',     a: '> 0.40 = accumulation' },
          { p: 'Citrate — Ca²⁺ retour',        n: '1.15 – 1.35',    u: 'mmol/L',     a: '< 1.00 = hypocalcémie' },
        ]},
      ]
    },
    {
      id: 'URINES', icon: '🚰', label: 'Urines',
      groups: [
        { title: 'Diurèse', rows: [
          { p: 'Diurèse normale',              n: '0.5 – 2.0',      u: 'mL/kg/h',    a: '< 0.5 = oligurie (critère AKI)' },
          { p: 'Volume/24h',                   n: '800 – 2500',     u: 'mL/j',       w: '< 400 = oligo-anurie' },
          { p: 'Polyurie',                     n: '> 3',            u: 'mL/kg/h',    w: 'Éliminer DI central/néphro.' },
          { p: 'Anurie',                       n: '< 100',          u: 'mL/j',       a: 'Indication EER à discuter' },
        ]},
        { title: 'Analyse urinaire', rows: [
          { p: 'Densité urinaire',             n: '1.010 – 1.025',  u: '',           w: '> 1.030 = déshydratation' },
          { p: 'pH urinaire',                  n: '4.5 – 8.0',      u: '',           w: '' },
          { p: 'Osmolalité urinaire',          n: '50 – 1200',      u: 'mOsm/kg',    w: '> 500 = concentrées (pré-rénal)' },
          { p: 'Sodium urinaire',              n: '20 – 220',       u: 'mmol/L',     w: '< 20 = pré-rénal' },
          { p: 'FEna (fraction excrétée Na)',  n: '< 1 %',          u: '%',          w: '> 2% = atteinte rénale' },
          { p: 'Protéinurie',                  n: '< 0.15',         u: 'g/24h',      w: '> 0.30 = néphropathie' },
          { p: 'Rapport Prot/Créat urin.',     n: '< 30',           u: 'mg/mmol',    w: '> 30 = pathologique' },
        ]},
      ]
    },
    {
      id: 'O2', icon: '🫁', label: 'O₂',
      groups: [
        { title: 'Dispositifs O₂ — Débit & FiO₂ estimée', rows: [
          { p: 'Lunettes nasales',             n: '1 – 6',          u: 'L/min',      w: '24–40 % FiO₂ · +4%/L ajouté' },
          { p: 'Masque simple',                n: '5 – 10',         u: 'L/min',      w: '40–60 % FiO₂ · min 5L (CO₂)' },
          { p: 'Masque haute conc. (MHC)',     n: '12 – 15',        u: 'L/min',      a: '80–95 % FiO₂ · sac doit rester gonflé' },
          { p: 'Optiflow / OHFD',              n: '30 – 60',        u: 'L/min',      w: '21–100 % FiO₂ réglable' },
          { p: 'Seuil barboteur',              n: '> 4 – 5',        u: 'L/min',      w: 'Humidification obligatoire au-delà' },
        ]},
        { title: 'Cibles SpO₂ selon contexte', rows: [
          { p: 'Patient standard',             n: '94 – 98',        u: '%',          w: 'Éviter hyperoxie (toxique)' },
          { p: 'BPCO / IRC',                   n: '88 – 92',        u: '%',          w: 'Préserver le stimulus respiratoire' },
          { p: 'Intox. CO / ACR',              n: '100',            u: '%',          a: 'MHC 15 L/min d\'emblée' },
          { p: 'SDRA / Hypoxémie permissive',  n: '88 – 92',        u: '%',          w: 'Éviter barotrauma par excès FiO₂' },
          { p: 'Post-ACR (TTM)',               n: '94 – 98',        u: '%',          w: 'Éviter hyperoxie cérébrale' },
        ]},
        { title: 'Index ROX (succès Optiflow)', rows: [
          { p: 'Formule',                      n: '(SpO₂/FiO₂) ÷ FR', u: '',        w: 'Évaluer à H1, H2, H6, H12' },
          { p: 'Succès Optiflow',              n: '> 4.88',         u: '',           w: 'Poursuite OHFD justifiée' },
          { p: 'Zone intermédiaire',           n: '2.85 – 4.88',    u: '',           w: 'Surveiller étroitement' },
          { p: 'Échec probable',               n: '< 2.85',         u: '',           a: 'Risque intubation — appel médical' },
        ]},
        { title: 'Complications & surveillance', rows: [
          { p: 'Hyperoxie',                    n: 'SpO₂ > 98%',     u: '',           w: 'Réduire débit dès stabilisation' },
          { p: 'Assèchement muqueuses',        n: 'Sans barboteur', u: '',           w: 'Toujours humidifier > 4–5 L/min' },
          { p: 'Escarres appui',               n: 'MHC / lunettes', u: '',           w: 'Contrôler haut des oreilles + nez' },
          { p: 'Encombrement bronchique',      n: 'O₂ sec',         u: '',           w: 'Hydratation + aspiration si besoin' },
        ]},
      ]
    },
    {
      id: 'BACTERIO', icon: '🧫', label: 'Bactério',
      groups: [
        { title: 'Prélèvements microbiologiques', rows: [
          { p: 'Hémocultures (Hémocs)',        n: '2 flacons (aérobie + anaérobie)', u: '', a: 'Avant antibiotiques — asepsie stricte' },
          { p: 'ECBU',                         n: 'Opercule sonde (désinfecté)',      u: '', w: 'Jamais dans le sac collecteur' },
          { p: 'PDP / mini-LBA',               n: 'Via fibroscope',                  u: '', w: 'Pneumopathies sous VM' },
          { p: 'ECBC (aspiration trachéale)',  n: 'Patients intubés',                u: '', w: 'Sécrétions bronchiques' },
          { p: 'Coproculture',                 n: 'Diarrhée sous antibio',           u: '', w: 'Recherche Clostridioides difficile' },
        ]},
        { title: 'Seuils de significativité', rows: [
          { p: 'ECBU',                         n: '≥ 10⁵',          u: 'UFC/mL',     w: 'Infection probable' },
          { p: 'PDP / LBA',                    n: '≥ 10³ – 10⁴',    u: 'UFC/mL',     w: 'Selon technique' },
          { p: 'Examen direct (Gram)',          n: 'H + 2',          u: '',           w: 'Gram+ violet · Gram− rose' },
          { p: 'Culture',                      n: 'H + 24 à 48',    u: '',           w: 'Identification espèce' },
          { p: 'Antibiogramme (S/I/R)',        n: 'H + 48 à 72',    u: '',           w: 'S = efficace · R = résistant' },
        ]},
        { title: 'Marqueurs biologiques', rows: [
          { p: 'PCT',                          n: '< 0.1',          u: 'µg/L',       a: '> 0.5 = sepsis bactérien probable' },
          { p: 'PCT — choc septique',          n: '> 10',           u: 'µg/L',       a: 'Sepsis sévère / choc' },
          { p: 'CRP',                          n: '< 10',           u: 'mg/L',       w: '> 100 = infection significative' },
          { p: 'Leucocytes',                   n: '4 – 10',         u: 'G/L',        a: '< 2 = neutropénie / sepsis grave' },
          { p: 'Pic fébrile > 38.5°C',         n: 'Hémocultures ×2', u: '',          a: 'IMMÉDIATEMENT — avant ATB' },
        ]},
        { title: 'Dépistage BMR / BHRe (1×/semaine)', rows: [
          { p: 'SARM (Staphylocoque doré R)',  n: 'Écouvillon nasal', u: '',          w: 'Résistant méticilline' },
          { p: 'EBLSE (Entérobact. BLSE)',     n: 'Écouvillon rectal', u: '',         w: 'E. coli, Klebsiella résistants' },
          { p: 'ERG (Entérocoque résist.)',     n: 'Écouvillon rectal', u: '',         w: 'Vancomycine-résistant' },
        ]},
        { title: 'Isolements (précautions complémentaires)', rows: [
          { p: '🟡 Contact (jaune)',           n: 'Surblouse + gants', u: '',         w: 'BMR : SARM, EBLSE' },
          { p: '🔵 Air (bleu)',                n: 'Masque FFP2 + chambre seule', u: '', a: 'Tuberculose, Rougeole' },
          { p: '🟢 Gouttelettes (vert)',       n: 'Masque chirurgical', u: '',         w: 'Grippe, Méningite' },
          { p: '⬛ Entérique (C. diff.)',       n: 'Tablier + savon + SHA', u: '',     a: 'SHA APRÈS savon (spores résistantes)' },
        ]},
      ]
    },
  ];
