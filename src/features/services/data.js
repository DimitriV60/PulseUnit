// PulseUnit — Services & contacts externes (urgences, SAMU, etc.).
// Extrait d'index.html (était aux lignes 3923-4059).
// Expose window.SERVICES_DATA pour cohabiter avec les scripts inline d'index.html
// pendant la migration vers l'architecture feature-based.

  window.SERVICES_DATA = [
    {
      cat: "Réanimation — Creil",
      icon: "🏥",
      floor: "3e étage",
      site: "Creil",
      entries: [
        { name: "Poste soignant", num: "0344616086", display: "(61) 6086" },
        { name: "IDE technique", num: "0344617125", display: "(61) 7125" },
        { name: "Bureau cadre", num: "0344616082", display: "(61) 6082" },
        { name: "Réanimateur de garde — REA 1", num: "0344611862", display: "03 44 61 18 62" },
        { name: "Réanimateur de garde — REA 2", num: "0344611822", display: "03 44 61 18 22" },
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
      floor: "RDC / 1er étage",
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
      floor: "RDC",
      site: "Creil",
      entries: [
        { name: "Pharmacie hospitalière", num: "0344616883", display: "(61) 6883" },
      ]
    },
    {
      cat: "Cardiologie & USC — Creil",
      icon: "❤️",
      floor: "2e étage",
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
      floor: "2e étage",
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
      floor: "3e / 4e étage",
      site: "Creil",
      entries: [
        { name: "Neurologie", num: "0344616433", display: "(61) 6433" },
        { name: "Pneumologie", num: "0344616546", display: "(61) 6546" },
        { name: "Pneumologie — standard", num: "0344616500", display: "(61) 6500" },
        { name: "Médecine polyvalente", num: "0344616264", display: "(61) 6264" },
        { name: "Néphrologie-hémodialyse", num: "0344616093", display: "(61) 6093" },
        { name: "Néphrologie 2", num: "0344616094", display: "(61) 6094" },
        { name: "Ophtalmologie", num: "0344616972", display: "(61) 6972" },
        { name: "Dermatologie", num: "0344616500", display: "(61) 6500" },
        { name: "Gynécologie", num: "0344616982", display: "(61) 6982" },
        { name: "Pédiatrie", num: "0344616623", display: "(61) 6623" },
      ]
    },
    {
      cat: "Oncologie — Creil",
      icon: "🎗️",
      floor: "4e étage",
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
  ];
