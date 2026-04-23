// PulseUnit — Simulateur respirateur : scénarios + config paramètres + zones cliniques.
// Extrait d'index.html (était aux lignes 5766-5811).
// Expose window.RV_SCENARIOS, window.RV_CFG, window.RV_ZONES pour cohabiter avec
// les scripts inline d'index.html pendant la migration vers feature-based.

  // ── Scénarios (compliance + résistance) ──────────────────
  window.RV_SCENARIOS = [
    {id:'standard', label:'✅ Normal',          color:'#22c55e',
      v:{peep:5,  fio2:40, fr:16, pcabove:14, comp:50, res:10}},
    {id:'sdra_sev', label:'🔴 SDRA sévère',     color:'#dc2626',
      v:{peep:16, fio2:90, fr:22, pcabove:10, comp:18, res:12}},
    {id:'sdra_mod', label:'🟠 SDRA modéré',     color:'#f97316',
      v:{peep:10, fio2:65, fr:20, pcabove:13, comp:28, res:11}},
    {id:'bpco',     label:'💨 BPCO',             color:'#a855f7',
      v:{peep:4,  fio2:35, fr:12, pcabove:15, comp:60, res:35}},
    {id:'asthme',   label:'⚡ Asthme aigu',      color:'#f59e0b',
      v:{peep:2,  fio2:50, fr:9,  pcabove:16, comp:55, res:55}},
    {id:'oap',      label:'💧 OAP',              color:'#38bdf8',
      v:{peep:10, fio2:70, fr:20, pcabove:14, comp:22, res:15}},
    {id:'prone',    label:'🔄 Décubitus ventral',color:'#0ea5e9',
      v:{peep:16, fio2:80, fr:22, pcabove:10, comp:25, res:12}},
    {id:'sevrage',  label:'🌱 Sevrage VS-AI',    color:'#84cc16',
      v:{peep:5,  fio2:35, fr:16, pcabove:8,  comp:55, res:9}},
  ];

  // ── Config paramètres ─────────────────────────────────────
  window.RV_CFG = {
    vt:      {min:200, max:900, step:10, unit:'mL',       label:'Volume Courant VT'},
    pcabove: {min:0,   max:40,  step:1,  unit:'cmH₂O',    label:'Pression motrice PC▲PEEP'},
    peep:    {min:0,   max:24,  step:1,  unit:'cmH₂O',    label:'PEEP'},
    fr:      {min:4,   max:40,  step:1,  unit:'/min',      label:'Fréquence réglée'},
    fio2:    {min:21,  max:100, step:1,  unit:'%',         label:'FiO₂'},
    comp:    {min:10,  max:100, step:1,  unit:'mL/cmH₂O', label:'Compliance pulmonaire'},
    res:     {min:5,   max:60,  step:1,  unit:'cmH₂O/L/s',label:'Résistance voies aériennes'},
    pplat:   {readonly:true, label:'Pression Plateau — calculée'},
    pcrete:  {readonly:true, label:'Pression de crête — calculée'},
    poids:   {min:30,  max:150, step:1,  unit:'kg PP',     label:'Poids Idéal Prédit'},
  };

  // ── Zones cliniques ───────────────────────────────────────
  window.RV_ZONES = {
    vt:    [{min:0,max:280,label:'Trop bas',color:'#ef4444',sev:3},{min:280,max:420,label:'Protecteur SDRA',color:'#38bdf8',sev:0},{min:420,max:560,label:'Normal',color:'#22c55e',sev:0},{min:560,max:700,label:'Élevé',color:'#f59e0b',sev:1},{min:700,max:901,label:'Volutraumatisme',color:'#ef4444',sev:3}],
    peep:  [{min:0,max:4,label:'Insuffisante',color:'#ef4444',sev:3},{min:4,max:8,label:'Standard',color:'#22c55e',sev:0},{min:8,max:12,label:'Modérée',color:'#38bdf8',sev:0},{min:12,max:18,label:'Élevée',color:'#f59e0b',sev:2},{min:18,max:25,label:'Très élevée',color:'#ef4444',sev:3}],
    fio2:  [{min:21,max:41,label:'Basse',color:'#22c55e',sev:0},{min:41,max:61,label:'Modérée',color:'#38bdf8',sev:0},{min:61,max:80,label:'Élevée',color:'#f59e0b',sev:1},{min:80,max:95,label:'Très élevée',color:'#f97316',sev:2},{min:95,max:101,label:'Urgence',color:'#ef4444',sev:3}],
    fr:    [{min:0,max:8,label:'Très basse',color:'#f59e0b',sev:2},{min:8,max:14,label:'Basse',color:'#38bdf8',sev:0},{min:14,max:22,label:'Normale',color:'#22c55e',sev:0},{min:22,max:30,label:'Élevée',color:'#f59e0b',sev:1},{min:30,max:41,label:'Très élevée',color:'#ef4444',sev:3}],
    pcrete:[{min:0,max:25,label:'Normale',color:'#22c55e',sev:0},{min:25,max:35,label:'Modérée',color:'#38bdf8',sev:0},{min:35,max:45,label:'Élevée',color:'#f59e0b',sev:2},{min:45,max:71,label:'Critique',color:'#ef4444',sev:3}],
    pplat: [{min:0,max:25,label:'Excellente',color:'#22c55e',sev:0},{min:25,max:30,label:'Acceptable',color:'#38bdf8',sev:0},{min:30,max:35,label:'Limite',color:'#f59e0b',sev:2},{min:35,max:51,label:'Dangereuse',color:'#ef4444',sev:3}],
    comp:  [{min:0,max:20,label:'Très réduite — SDRA',color:'#ef4444',sev:3},{min:20,max:35,label:'Réduite',color:'#f97316',sev:2},{min:35,max:55,label:'Modérée',color:'#f59e0b',sev:1},{min:55,max:80,label:'Normale',color:'#22c55e',sev:0},{min:80,max:101,label:'Élevée — emphysème',color:'#38bdf8',sev:1}],
    res:   [{min:0,max:10,label:'Normale',color:'#22c55e',sev:0},{min:10,max:20,label:'Légèrement élevée',color:'#f59e0b',sev:1},{min:20,max:35,label:'Élevée — BPCO',color:'#f97316',sev:2},{min:35,max:61,label:'Très élevée — asthme',color:'#ef4444',sev:3}],
    dp:    [{min:0,max:10,label:'Excellent',color:'#22c55e',sev:0},{min:10,max:14,label:'Acceptable ≤14',color:'#38bdf8',sev:0},{min:14,max:20,label:'Élevée >14',color:'#f97316',sev:2},{min:20,max:51,label:'Critique',color:'#ef4444',sev:3}],
  };
