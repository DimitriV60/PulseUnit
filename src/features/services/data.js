// PulseUnit — Services & contacts externes (urgences, SAMU, etc.).
// Extrait d'index.html (était aux lignes 3923-4059).
// Expose window.SERVICES_DATA pour cohabiter avec les scripts inline d'index.html
// pendant la migration vers l'architecture feature-based.

  window.SERVICES_DATA = [
    {
      cat: "Réanimation — Creil",
      icon: "🏥",
      floor: "RDC",
      site: "Creil",
      entries: [
        { name: "Poste soignant", num: "0344616086", display: "(61) 6086" },
        { name: "IDE technique", num: "0344617125", display: "(61) 7125" },
        { name: "Bureau cadre", num: "0344616082", display: "(61) 6082" },
        { name: "Réanimateur de garde — REA 1", num: "0344611862", display: "(61) 1862", reveal: "03 44 61 18 62" },
        { name: "Réanimateur de garde — REA 2", num: "0344611822", display: "(61) 1822", reveal: "03 44 61 18 22" },
        { name: "Services de nuit", num: "0344616062", display: "(61) 6062" },
      ]
    },
    {
      cat: "Urgences & UMJ — Creil",
      icon: "🚨",
      floor: "RDC",
      site: "Creil",
      entries: [
        { name: "Urgences — accueil", num: "0344616063", display: "(61) 6063" },
        { name: "Urgences — standard", num: "0344616100", display: "(61) 6100" },
        { name: "Urgences pédiatriques", num: "", display: "" },
        { name: "UMJ", num: "0344616073", display: "(61) 6073" },
        { name: "CPOT", num: "0344616082", display: "(61) 6082" },
        { name: "CPOT — mobile", num: "0632161424", display: "06 32 16 14 24" },
      ]
    },
    {
      cat: "Biologie & Imagerie — Creil",
      icon: "🔬",
      floor: "RDC / Sous-sol",
      site: "Creil",
      entries: [
        { name: "Laboratoires", num: "0344616530", display: "(61) 6530" },
        { name: "Imagerie médicale", num: "0344616121", display: "(61) 6121" },
        { name: "Coronarographie", num: "0344616953", display: "(61) 6953" },
      ]
    },
    {
      cat: "Pharmacie — Creil",
      icon: "💊",
      floor: "Sous-sol",
      site: "Creil",
      entries: [
        { name: "Pharmacie hospitalière", num: "0344616883", display: "(61) 6883" },
      ]
    },
    {
      cat: "Cardiologie & USC — Creil",
      icon: "❤️",
      floor: "Étage 5",
      site: "Creil",
      entries: [
        { name: "Cardiologie", num: "0344616523", display: "(61) 6523" },
        { name: "Cardiologie 2", num: "0344616538", display: "(61) 6538" },
        { name: "USIC", num: "0344616537", display: "(61) 6537" },
      ]
    },
    {
      cat: "Blocs & Chirurgies — Creil",
      icon: "🔪",
      floor: "Étage 1 / 2",
      site: "Creil",
      entries: [
        { name: "Bloc opératoire 1", num: "0344616153", display: "(61) 6153" },
        { name: "Bloc opératoire 2", num: "0344616150", display: "(61) 6150" },
        { name: "Anesthésie", num: "0344616153", display: "(61) 6153" },
        { name: "Chirurgie digestive", num: "0344616223", display: "(61) 6223" },
        { name: "Chirurgie ambulatoire", num: "0344616123", display: "(61) 6123" },
        { name: "Chirurgie orthopédique", num: "0344616144", display: "(61) 6144" },
        { name: "Chirurgie urologique", num: "0344616243", display: "(61) 6243" },
        { name: "Chirurgie maxillo-faciale", num: "0344616143", display: "(61) 6143" },
        { name: "RAAC — chir. digestive", num: "0344616243", display: "(61) 6243" },
      ]
    },
    {
      cat: "Spécialités médicales — Creil",
      icon: "⚕️",
      floor: "Étages 2 à 6",
      site: "Creil",
      entries: [
        { name: "Neurologie (Étage 4)", num: "0344616433", display: "(61) 6433" },
        { name: "Pneumologie (Étage 5)", num: "0344616546", display: "(61) 6546" },
        { name: "Pneumologie — standard", num: "0344616500", display: "(61) 6500" },
        { name: "Médecine polyvalente (Étage 2)", num: "0344616264", display: "(61) 6264" },
        { name: "Néphrologie-hémodialyse (Sous-sol)", num: "0344616093", display: "(61) 6093" },
        { name: "Néphrologie 2", num: "0344616094", display: "(61) 6094" },
        { name: "Ophtalmologie (Étage 1)", num: "0344616972", display: "(61) 6972" },
        { name: "Dermatologie", num: "0344616500", display: "(61) 6500" },
        { name: "Gynécologie", num: "0344616982", display: "(61) 6982" },
        { name: "Pédiatrie (Étage 6)", num: "0344616623", display: "(61) 6623" },
      ]
    },
    {
      cat: "Oncologie — Creil",
      icon: "🎗️",
      floor: "Étage 3",
      site: "Creil",
      entries: [
        { name: "Oncologie", num: "0344616456", display: "(61) 6456" },
        { name: "HDJ Oncologie", num: "0344616302", display: "(61) 6302" },
        { name: "Onco-thoracique", num: "0344616517", display: "(61) 6517" },
        { name: "Structure douleur chronique", num: "0344616453", display: "(61) 6453" },
        { name: "Équipe mobile soins palliatifs", num: "0344616513", display: "(61) 6513" },
      ]
    },
    {
      cat: "Hygiène & Stérilisation — Creil",
      icon: "🧴",
      floor: "Sous-sol",
      site: "Creil",
      entries: [
        { name: "Hygiène hospitalière (EOH)", num: "0344616562", display: "(61) 6562" },
        { name: "Stérilisation", num: "0344616892", display: "(61) 6892" },
      ]
    },
    {
      cat: "Logistique & Supports — Creil",
      icon: "🔧",
      floor: "—",
      site: "Creil",
      entries: [
        { name: "Standard général Creil", num: "0344616000", display: "(61) 6000" },
        { name: "Brancardage", num: "", display: "" },
        { name: "Biomédical", num: "", display: "" },
        { name: "Informatique (DIM / SI)", num: "", display: "" },
      ]
    },
    {
      cat: "Site de Senlis",
      icon: "🏨",
      floor: "—",
      site: "Senlis",
      entries: [
        { name: "Standard général Senlis", num: "0344217100", display: "(21) 7100" },
        { name: "Maternité", num: "0344217405", display: "(21) 7405" },
        { name: "Néonatologie & Réa Néonatale", num: "0344217032", display: "(21) 7032" },
        { name: "Gériatrie", num: "0344217002", display: "(21) 7002" },
        { name: "SMR", num: "0344217002", display: "(21) 7002" },
        { name: "Médecine polyvalente", num: "0344217025", display: "(21) 7025" },
        { name: "Cardiologie", num: "0344217072", display: "(21) 7072" },
        { name: "Pharmacie", num: "0344217014", display: "(21) 7014" },
        { name: "Laboratoires", num: "0344217024", display: "(21) 7024" },
        { name: "Imagerie médicale", num: "0344217015", display: "(21) 7015" },
        { name: "Unité de soins palliatifs", num: "0344217260", display: "(21) 7260" },
        { name: "Unité de sommeil", num: "0344217112", display: "(21) 7112" },
        { name: "Structure douleur chronique", num: "0344217152", display: "(21) 7152" },
        { name: "Gynécologie", num: "0344217293", display: "(21) 7293" },
        { name: "Pédiatrie", num: "0344217326", display: "(21) 7326" },
        { name: "SSR neurovasculaire (HDJ)", num: "0344217226", display: "(21) 7226" },
        { name: "Hépato-gastro-entérologie", num: "0344217323", display: "(21) 7323" },
        { name: "Diététique", num: "0344217038", display: "(21) 7038" },
        { name: "EHPAD", num: "0344217333", display: "(21) 7333" },
        { name: "Services de nuit", num: "0344217239", display: "(21) 7239" },
      ]
    },
    // ═══ Annuaire V2 — extrait de raw/docs/annuaire telephonique 2 ghpso.xls ═══
    {
      cat: "Consultations externes — Creil",
      icon: "👨‍⚕️",
      floor: "RDC",
      site: "Creil",
      entries: [
        { name: "Cs allergo", num: "0344616427", display: "(61) 6427" },
        { name: "Cs chir vasc", num: "0344616364", display: "(61) 6364" },
        { name: "Cs ORL", num: "0344616368", display: "(61) 6368" },
        { name: "Cs Stomato", num: "0344616976", display: "(61) 6976" },
        { name: "Cs OPH", num: "0344616971", display: "(61) 6971" },
        { name: "Cs Dermato", num: "0344616949", display: "(61) 6949" },
        { name: "Cs anesthésie", num: "0344616928", display: "(61) 6928" },
        { name: "Cs Douleur", num: "0344616938", display: "(61) 6938" },
        { name: "Cs sage femme", num: "0344616981", display: "(61) 6981" },
      ]
    },
    {
      cat: "Avis spécialistes — Creil",
      icon: "🩺",
      floor: "—",
      site: "Creil",
      entries: [
        { name: "Avis pneumo", num: "0344612197", display: "(61) 2197" },
        { name: "Avis gastro", num: "0344616403", display: "(61) 6403" },
        { name: "Avis diabéto", num: "", display: "bip 1890" },
        { name: "Avis Neuro", num: "0344616455", display: "(61) 6455 / (61) 6453" },
        { name: "Avis Dermato", num: "0344616949", display: "(61) 6949" },
        { name: "Avis OPH", num: "0344616971", display: "(61) 6971" },
        { name: "Avis ORL", num: "0344616974", display: "(61) 6974" },
        { name: "Avis Stomato", num: "0344616976", display: "(61) 6976" },
        { name: "Avis SMP", num: "0344616268", display: "(61) 6268" },
        { name: "Avis uro", num: "", display: "bip 1886" },
        { name: "Fax avis spécialistes", num: "0344616540", display: "Fax (61) 6540" },
      ]
    },
    {
      cat: "RDV Examens — Creil",
      icon: "📅",
      floor: "RDC",
      site: "Creil",
      entries: [
        { name: "FOGD / Coloscopie", num: "0344616957", display: "(61) 6957" },
        { name: "Coloscopie sans AG", num: "0344616993", display: "(61) 6993" },
        { name: "Fibroscopie B", num: "0344616994", display: "(61) 6994" },
        { name: "EEG", num: "0344616969", display: "(61) 6969" },
        { name: "Psychologue", num: "0344616516", display: "(61) 6516 / bip 074" },
        { name: "Dr Quentin", num: "0344616511", display: "(61) 6511" },
      ]
    },
    {
      cat: "Cardiologie / USIC — détails (V2)",
      icon: "❤️",
      floor: "Étage 5",
      site: "Creil",
      entries: [
        { name: "Cardiologie — IDE", num: "0344616526", display: "(61) 6526" },
        { name: "Cardiologie — Cadre", num: "0344616522", display: "(61) 6522" },
        { name: "Cardio garde — médecin", num: "0344612098", display: "(61) 2098" },
        { name: "USIC (étage 5)", num: "0344616536", display: "(61) 6536" },
      ]
    },
    {
      cat: "Pneumologie — Creil",
      icon: "🫁",
      floor: "Étage 5",
      site: "Creil",
      entries: [
        { name: "Cadre Pneumologie", num: "0344616542", display: "(61) 6542" },
      ]
    },
    {
      cat: "SMP & Néphrologie — Creil",
      icon: "🫘",
      floor: "Étages 4-5",
      site: "Creil",
      entries: [
        { name: "SMP — Cadre", num: "0344616262", display: "(61) 6262" },
        { name: "SMP — Poste IDE", num: "0344616266", display: "(61) 6266" },
        { name: "SMP Senlis", num: "03217029", display: "(21) 7029" },
        { name: "Dr Bangoura (SMP)", num: "0344616468", display: "(61) 6468" },
        { name: "Dr Demontis (Hémodialyse)", num: "0344616095", display: "(61) 6095" },
        { name: "Néphrologue de garde", num: "0344616174", display: "(61) 6174" },
      ]
    },
    {
      cat: "Hépato-Gastro — Creil",
      icon: "🫃",
      floor: "Étage 4",
      site: "Creil",
      entries: [
        { name: "Hépato-gastro — Cadre", num: "0344616442", display: "(61) 6442" },
        { name: "Hépato-gastro — Poste IDE", num: "0344616446", display: "(61) 6446" },
        { name: "Endoscopie", num: "0344616957", display: "(61) 6957 / (61) 6440" },
      ]
    },
    {
      cat: "Pôle FME — Maternité & Pédiatrie",
      icon: "👶",
      floor: "Étage 6 (Creil) / Senlis",
      site: "Creil",
      entries: [
        { name: "Sage-femme — Creil", num: "0344616346", display: "(61) 6346" },
        { name: "Maternité — Senlis", num: "03217598", display: "(21) 7598" },
        { name: "Maternité — Cadre", num: "0344616622", display: "(61) 6622" },
        { name: "Maternité — IDE", num: "0344616625", display: "(61) 6625" },
        { name: "Néonat — Creil", num: "0344616647", display: "(61) 6647 / (61) 6645" },
        { name: "Néonat — Senlis", num: "03217020", display: "(21) 7020" },
        { name: "Nourrissons", num: "0344616626", display: "(61) 6626" },
        { name: "Unité Kangourou — Senlis", num: "03217592", display: "(21) 7592" },
        { name: "Urgences pédiatriques — IDE", num: "0344616633", display: "(61) 6633" },
        { name: "Urgences pédiatriques — Interne", num: "", display: "bip 1873" },
        { name: "Pédiatre de garde", num: "", display: "bip 1867" },
        { name: "Gynéco de garde", num: "", display: "bip 1865" },
      ]
    },
    {
      cat: "Anesthésie & Bloc opératoire — Creil",
      icon: "💉",
      floor: "Étage 1",
      site: "Creil",
      entries: [
        { name: "Bloc op — Cadre", num: "0344616151", display: "(61) 6151" },
        { name: "Bloc op — Salle transfert", num: "0344617158", display: "(61) 7158" },
        { name: "Bloc op — IDE coordinatrice", num: "0344616337", display: "(61) 6337" },
        { name: "Salle de réveil (SSPI)", num: "0344616157", display: "(61) 6157 / (61) 7157" },
        { name: "MAR / Anesthésiste de garde", num: "", display: "bip 1861" },
        { name: "Anesthésie — Interne de garde", num: "", display: "bip 1871" },
        { name: "IADE", num: "", display: "bip 1881" },
        { name: "IBODE", num: "", display: "bip 1877" },
        { name: "Anesthésie — Senlis", num: "03217116", display: "(21) 7116" },
      ]
    },
    {
      cat: "Réanimation — Creil (compléments V2)",
      icon: "🏥",
      floor: "RDC",
      site: "Creil",
      entries: [
        { name: "Cadre supérieur", num: "0344616072", display: "(61) 6072" },
        { name: "Secrétariat (Véronique)", num: "0344616083", display: "(61) 6083" },
        { name: "Office", num: "0344617086", display: "(61) 7086" },
        { name: "Réa — IDE référente", num: "0344616075", display: "(61) 6075" },
        { name: "Réa — IDE / USC", num: "0344616158", display: "(61) 6158" },
        { name: "Agent amphi", num: "0344616074", display: "bip 1807 / (61) 6074" },
        { name: "Réa — Fax", num: "0344616080", display: "Fax (61) 6080" },
      ]
    },
    {
      cat: "Ambulances",
      icon: "🚑",
      floor: "—",
      site: "Creil",
      entries: [
        { name: "Ambulances Creil", num: "0344612009", display: "(61) 2009" },
        { name: "Ambulances Dhinault", num: "0344612020", display: "(61) 2020" },
        { name: "Ambulances Mouy", num: "0344612083", display: "(61) 2083" },
        { name: "Ambulances Clermont", num: "0344612021", display: "(61) 2021" },
      ]
    },
    {
      cat: "Logistique & Médico-technique — Creil",
      icon: "🔧",
      floor: "Sous-sol / RDC",
      site: "Creil",
      entries: [
        { name: "CPOT (greffe)", num: "0344616012", display: "(61) 6012" },
        { name: "Bed manager", num: "0344612097", display: "(61) 2097" },
        { name: "Flux URAD", num: "0344616053", display: "(61) 6053" },
        { name: "Pharmacie (autre poste)", num: "0344617882", display: "(61) 7882" },
        { name: "Magasin", num: "0344616728", display: "(61) 6728" },
        { name: "Hygiène — IDE", num: "0344616563", display: "(61) 6563" },
        { name: "Hygiène — Documentation", num: "0344616561", display: "(61) 6561" },
        { name: "Diététiciennes", num: "0344616734", display: "(61) 6734" },
        { name: "Cuisine", num: "0344616733", display: "(61) 6733" },
        { name: "Kinésithérapeutes", num: "0344616576", display: "(61) 6576" },
        { name: "Médecine du travail", num: "0344616694", display: "(61) 6694 / (61) 6695" },
        { name: "Reprographie", num: "0344616724", display: "(61) 6724" },
        { name: "Biomédical", num: "0344616774", display: "(61) 6774" },
        { name: "Lingerie", num: "0344617722", display: "(61) 7722" },
        { name: "Self", num: "0344616729", display: "(61) 6729" },
        { name: "Bionettoyage", num: "0344617725", display: "(61) 7725" },
        { name: "UCSA", num: "0344288210", display: "03 44 28 82 10" },
      ]
    },
    {
      cat: "Direction & Administration — Creil",
      icon: "📋",
      floor: "Étage administratif",
      site: "Creil",
      entries: [
        { name: "Économat", num: "0344616765", display: "(61) 6765" },
        { name: "Vaguemestre", num: "0344617721", display: "(61) 7721" },
        { name: "Direction — Secrétariat", num: "0344616003", display: "(61) 6003" },
        { name: "Communication (Mme Dubourg)", num: "0344616719", display: "(61) 6719" },
        { name: "DRH (Mme Portier)", num: "0344616045", display: "(61) 6045" },
        { name: "Direction des soins", num: "0344616036", display: "(61) 6036" },
        { name: "Dépôts coffre", num: "0344616912", display: "(61) 6912" },
        { name: "Contentieux", num: "0344616913", display: "(61) 6913" },
        { name: "Admissions", num: "0344616923", display: "(61) 6923" },
        { name: "Admissions (8h30-17h)", num: "0344617105", display: "(61) 7105" },
        { name: "Dépannage technique", num: "0344618888", display: "(61) 8888" },
        { name: "Hotline / DPI", num: "0344616559", display: "(61) 6559" },
        { name: "CGOS", num: "0344616034", display: "(61) 6034" },
        { name: "HNE", num: "0344612071", display: "(61) 2071" },
        { name: "Sécurité incendie", num: "", display: "bip 1818" },
        { name: "Service technique", num: "0344617777", display: "(61) 7777" },
      ]
    },
  ];
