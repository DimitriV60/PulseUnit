// PulseUnit — Calculateurs cliniques (15+ calculs : IBW, PAM, P/F, ΔP, PSE, GCS, RASS, etc.).
// Extrait d'index.html (était aux lignes 1794-2363).
// Expose window.CALCULATORS_DATA pour cohabiter avec les scripts inline d'index.html
// pendant la migration vers l'architecture feature-based.

  window.CALCULATORS_DATA = [

  /* ===== GROUPE 1 : SCORES CLINIQUES ===== */
  {
    id: 'glasgow', icon: '🧠', title: 'Score de Glasgow',
    html: `
      <div style="font-size:0.78rem; color:var(--ide); background:var(--ide-glow); border:1px solid rgba(96,206,234,0.3); border-radius:8px; padding:10px; margin-bottom:12px; font-weight:700;">
        ⚠️ GCS ≤ 8 = indication d'intubation. Toujours noter Y + V + M séparément.
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Y — Ouverture des yeux</span>
        <select id="calc_gcs_y" class="calc-select" onchange="execCalcLive('glasgow')">
          <option value="">-- Choisir --</option>
          <option value="4">4 — Spontanée</option>
          <option value="3">3 — À la demande verbale</option>
          <option value="2">2 — À la douleur</option>
          <option value="1">1 — Aucune</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">V — Réponse verbale</span>
        <select id="calc_gcs_v" class="calc-select" onchange="execCalcLive('glasgow')">
          <option value="">-- Choisir --</option>
          <option value="5">5 — Orientée, normale</option>
          <option value="4">4 — Confuse</option>
          <option value="3">3 — Mots inappropriés</option>
          <option value="2">2 — Sons incompréhensibles</option>
          <option value="1">1 — Aucune</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">M — Réponse motrice</span>
        <select id="calc_gcs_m" class="calc-select" onchange="execCalcLive('glasgow')">
          <option value="">-- Choisir --</option>
          <option value="6">6 — Obéit aux ordres</option>
          <option value="5">5 — Localise la douleur</option>
          <option value="4">4 — Évitement inadapté (retrait)</option>
          <option value="3">3 — Flexion stéréotypée</option>
          <option value="2">2 — Extension stéréotypée</option>
          <option value="1">1 — Aucune réponse</option>
        </select>
      </div>
      <div class="calc-result-box" id="res_gcs_box" style="display:none;">
        <div class="calc-result-title">SCORE GCS</div>
        <div class="calc-result-val" id="res_gcs_val">--</div>
        <div class="calc-result-sub" id="res_gcs_sub">--</div>
        <div style="margin-top:8px; font-size:0.75rem; color:var(--text-muted); font-weight:700;" id="res_gcs_detail">--</div>
      </div>
    `
  },
  {
    id: 'rass', icon: '😴', title: 'Score RASS',
    html: `
      <div style="font-size:0.78rem; color:var(--as); background:var(--as-glow); border:1px solid rgba(64,206,92,0.3); border-radius:8px; padding:10px; margin-bottom:12px; font-weight:700;">
        🎯 Cible habituelle : RASS -1 à 0. RASS -4/-5 si curarisation ou SDRA sévère.
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Score RASS observé</span>
        <select id="calc_rass_score" class="calc-select" onchange="execCalcLive('rass')">
          <option value="">-- Choisir --</option>
          <option value="4">+4 — Combatif, danger immédiat</option>
          <option value="3">+3 — Très agité, arrache cathéters</option>
          <option value="2">+2 — Agité, mouvements fréquents</option>
          <option value="1">+1 — Anxieux, sans mouvements agressifs</option>
          <option value="0"> 0 — Éveillé et calme</option>
          <option value="-1">-1 — Somnolent (contact visuel > 10 sec)</option>
          <option value="-2">-2 — Réveil bref (contact < 10 sec)</option>
          <option value="-3">-3 — Mouvements à la voix (sans contact)</option>
          <option value="-4">-4 — Immobile, réagit à la douleur</option>
          <option value="-5">-5 — Aucune réaction à la voix ni à la douleur</option>
        </select>
      </div>
      <div class="calc-result-box" id="res_rass_box" style="display:none;">
        <div class="calc-result-title">RASS</div>
        <div class="calc-result-val" id="res_rass_val">--</div>
        <div class="calc-result-sub" id="res_rass_sub">--</div>
      </div>
    `
  },
  {
    id: 'waterlow', icon: '🛡️', title: 'Score Waterlow',
    html: `
      <div style="font-size:0.78rem; color:var(--med); background:var(--med-glow); border:1px solid rgba(245,158,11,0.3); border-radius:8px; padding:10px; margin-bottom:12px; font-weight:700;">
        Risque escarre : ≥10 à risque · ≥15 haut risque · ≥20 très haut risque
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Corpulence / IMC</span>
        <select id="wl_corp" class="calc-select" onchange="execCalcLive('waterlow')">
          <option value="">--</option>
          <option value="0">Normale (IMC 20-24) — 0</option>
          <option value="1">Supérieure à la normale — 1</option>
          <option value="2">Obèse (IMC > 30) — 2</option>
          <option value="3">Inférieure à la normale (maigreur) — 3</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Aspect de la peau</span>
        <select id="wl_peau" class="calc-select" onchange="execCalcLive('waterlow')">
          <option value="">--</option>
          <option value="0">Saine — 0</option>
          <option value="1">Papier de soie / Fiévreuse — 1</option>
          <option value="1">Sèche — 1</option>
          <option value="1">Œdémateuse — 1</option>
          <option value="2">Cyanosée / Froide — 2</option>
          <option value="3">Cassante / Taches — 3</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Sexe et âge</span>
        <select id="wl_sexage" class="calc-select" onchange="execCalcLive('waterlow')">
          <option value="">--</option>
          <option value="1">Homme — 1</option>
          <option value="2">Femme — 2</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Tranche d'âge</span>
        <select id="wl_age" class="calc-select" onchange="execCalcLive('waterlow')">
          <option value="">--</option>
          <option value="1">14–49 ans — 1</option>
          <option value="2">50–64 ans — 2</option>
          <option value="3">65–74 ans — 3</option>
          <option value="4">75–80 ans — 4</option>
          <option value="5">> 80 ans — 5</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Continence</span>
        <select id="wl_cont" class="calc-select" onchange="execCalcLive('waterlow')">
          <option value="">--</option>
          <option value="0">Normale — 0</option>
          <option value="1">Sonde urinaire / Incontinent urinaire occasionnel — 1</option>
          <option value="2">Incontinent urinaire — 2</option>
          <option value="3">Incontinent urinaire + fécal — 3</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Mobilité</span>
        <select id="wl_mob" class="calc-select" onchange="execCalcLive('waterlow')">
          <option value="">--</option>
          <option value="0">Normale — 0</option>
          <option value="1">Agité / Nerveux — 1</option>
          <option value="2">Apathique — 2</option>
          <option value="3">Restreinte — 3</option>
          <option value="4">Inerte — 4</option>
          <option value="5">Opéré / Traumatisé — 5</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Nutrition</span>
        <select id="wl_nutri" class="calc-select" onchange="execCalcLive('waterlow')">
          <option value="">--</option>
          <option value="0">Normale — 0</option>
          <option value="1">Sonde nasogastrique / Liquides seuls — 1</option>
          <option value="2">Nutrition parentérale — 2</option>
          <option value="3">Nil per os / Anorexie — 3</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Facteur de risque spécial</span>
        <select id="wl_special" class="calc-select" onchange="execCalcLive('waterlow')">
          <option value="">--</option>
          <option value="0">Aucun — 0</option>
          <option value="1">Tabagisme — 1</option>
          <option value="2">Anémie (Hb < 8) — 2</option>
          <option value="5">Insuffisance cardiaque / Vasculaire périphérique — 5</option>
          <option value="5">Cachexie — 5</option>
          <option value="6">Déficit neurologique (diabète, parésie, SEP) — 6</option>
          <option value="8">Maladie terminale — 8</option>
        </select>
      </div>
      <div class="calc-result-box" id="res_wl_box" style="display:none;">
        <div class="calc-result-title">SCORE WATERLOW</div>
        <div class="calc-result-val" id="res_wl_val">--</div>
        <div class="calc-result-sub" id="res_wl_sub">--</div>
      </div>
    `
  },
  {
    id: 'sevrage', icon: '🍺', title: 'Score de Sevrage Alcoolique',
    html: `
      <div style="font-size:0.78rem; color:var(--crit); background:var(--crit-glow); border:1px solid rgba(239,68,68,0.3); border-radius:8px; padding:10px; margin-bottom:12px; font-weight:700; line-height:1.5;">
        ⚠️ Vérifier le protocole de service en vigueur dans le service. Score indicatif basé sur le Cushman simplifié. Évaluation toutes les 4-8H lors du sevrage.
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Tremblements</span>
        <select id="sv_trem" class="calc-select" onchange="execCalcLive('sevrage')">
          <option value="">--</option>
          <option value="0">Absents — 0</option>
          <option value="1">Légers (mains) — 1</option>
          <option value="2">Modérés (bras étendus) — 2</option>
          <option value="3">Sévères (au repos) — 3</option>
          <option value="4">Très sévères (corps entier) — 4</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Transpiration</span>
        <select id="sv_sueur" class="calc-select" onchange="execCalcLive('sevrage')">
          <option value="">--</option>
          <option value="0">Aucune — 0</option>
          <option value="1">Légère (paumes moites) — 1</option>
          <option value="2">Perles de sueur visibles — 2</option>
          <option value="3">Ruissellement de sueur — 3</option>
          <option value="4">Sueurs profuses — 4</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Agitation</span>
        <select id="sv_agit" class="calc-select" onchange="execCalcLive('sevrage')">
          <option value="">--</option>
          <option value="0">Aucune — 0</option>
          <option value="1">Légèrement anxieux — 1</option>
          <option value="2">Modérément agité — 2</option>
          <option value="3">Très agité — 3</option>
          <option value="4">Panique — 4</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Hallucinations</span>
        <select id="sv_hall" class="calc-select" onchange="execCalcLive('sevrage')">
          <option value="">--</option>
          <option value="0">Aucune — 0</option>
          <option value="1">Légères (sons distants) — 1</option>
          <option value="2">Modérées (sons proches) — 2</option>
          <option value="3">Hallucinations visuelles — 3</option>
          <option value="4">Hallucinations persistantes — 4</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Convulsions (antécédent ou risque)</span>
        <select id="sv_conv" class="calc-select" onchange="execCalcLive('sevrage')">
          <option value="">--</option>
          <option value="0">Non — 0</option>
          <option value="2">Risque modéré (ATCD) — 2</option>
          <option value="4">Convulsions en cours / Haut risque — 4</option>
        </select>
      </div>
      <div class="calc-result-box" id="res_sv_box" style="display:none;">
        <div class="calc-result-title">SCORE DE SEVRAGE</div>
        <div class="calc-result-val" id="res_sv_val">--</div>
        <div class="calc-result-sub" id="res_sv_sub">--</div>
      </div>
    `
  },

  /* ===== GROUPE 2 : VENTILATION ===== */
  {
    id: 'ibw', icon: '⚖️', title: 'Poids prédit & Volume courant',
    html: `
      <div class="calc-form-group">
        <span class="calc-label">Sexe</span>
        <select id="calc_ibw_sexe" class="calc-select">
          <option value="H">Homme</option>
          <option value="F">Femme</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Taille (cm)</span>
        <input type="number" id="calc_ibw_taille" class="calc-input" placeholder="ex: 170">
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Objectif mL/kg PP</span>
        <select id="calc_ibw_objectif" class="calc-select">
          <option value="6">6 mL/kg (SDRA)</option>
          <option value="7" selected>7 mL/kg</option>
          <option value="8">8 mL/kg</option>
        </select>
      </div>
      <button class="btn-calc" onclick="execCalc('ibw')">Calculer</button>
      <div class="calc-result-box" id="res_ibw_box" style="display:none;">
        <div class="calc-result-title">POIDS IDÉAL PRÉDIT</div>
        <div class="calc-result-val" id="res_ibw_poids">-- kg</div>
        <div class="calc-result-title" style="margin-top:10px;">VOLUME COURANT CIBLE</div>
        <div class="calc-result-val" id="res_ibw_vt">-- mL</div>
        <div class="calc-result-sub" id="res_ibw_sub">--</div>
      </div>
    `
  },
  {
    id: 'pf', icon: '💨', title: 'Rapport P/F (SDRA)',
    html: `
      <div class="calc-form-group">
        <span class="calc-label">PaO2 (mmHg)</span>
        <input type="number" id="calc_pf_pao2" class="calc-input" placeholder="ex: 80">
      </div>
      <div class="calc-form-group">
        <span class="calc-label">FiO2 (%)</span>
        <input type="number" id="calc_pf_fio2" class="calc-input" placeholder="ex: 60">
      </div>
      <button class="btn-calc" onclick="execCalc('pf')">Calculer</button>
      <div class="calc-result-box" id="res_pf_box" style="display:none;">
        <div class="calc-result-title">RAPPORT P/F</div>
        <div class="calc-result-val" id="res_pf_val">-- mmHg</div>
        <div class="calc-result-sub" id="res_pf_sub">--</div>
      </div>
    `
  },
  {
    id: 'dp', icon: '🫁', title: 'Driving Pressure (ΔP)',
    html: `
      <div class="calc-form-group">
        <span class="calc-label">Pression de plateau (cmH₂O)</span>
        <input type="number" id="calc_dp_pplat" class="calc-input" placeholder="ex: 26">
      </div>
      <div class="calc-form-group">
        <span class="calc-label">PEEP totale (cmH₂O)</span>
        <input type="number" id="calc_dp_peep" class="calc-input" placeholder="ex: 10">
      </div>
      <button class="btn-calc" onclick="execCalc('dp')">Calculer</button>
      <div class="calc-result-box" id="res_dp_box" style="display:none;">
        <div class="calc-result-title">DRIVING PRESSURE</div>
        <div class="calc-result-val" id="res_dp_val">-- cmH₂O</div>
        <div class="calc-result-sub" id="res_dp_sub">--</div>
      </div>
    `
  },

  /* ===== GROUPE 3 : HÉMODYNAMIQUE ===== */
  {
    id: 'pam', icon: '❤️', title: 'PAM',
    html: `
      <div class="calc-form-group">
        <span class="calc-label">PAS (mmHg)</span>
        <input type="number" id="calc_pam_pas" class="calc-input" placeholder="ex: 120">
      </div>
      <div class="calc-form-group">
        <span class="calc-label">PAD (mmHg)</span>
        <input type="number" id="calc_pam_pad" class="calc-input" placeholder="ex: 75">
      </div>
      <button class="btn-calc" onclick="execCalc('pam')">Calculer</button>
      <div class="calc-result-box" id="res_pam_box" style="display:none;">
        <div class="calc-result-title">PAM</div>
        <div class="calc-result-val" id="res_pam_val">-- mmHg</div>
        <div class="calc-result-sub" id="res_pam_sub">--</div>
      </div>
    `
  },
  {
    id: 'pse', icon: '⏱️', title: 'Débit PSE',
    html: `
      <div class="calc-form-group">
        <span class="calc-label">Dose prescrite</span>
        <input type="number" id="calc_pse_dose" class="calc-input" placeholder="ex: 5">
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Unité</span>
        <select id="calc_pse_unit" class="calc-select">
          <option value="mgh">mg/h</option>
          <option value="ugh">µg/h</option>
          <option value="mgkgh">mg/kg/h</option>
          <option value="ugkgh">µg/kg/h</option>
          <option value="ugkgmin">µg/kg/min</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Poids (kg)</span>
        <input type="number" id="calc_pse_poids" class="calc-input" placeholder="ex: 70">
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Concentration (mg/mL)</span>
        <input type="number" id="calc_pse_conc" class="calc-input" placeholder="ex: 1">
      </div>
      <button class="btn-calc" onclick="execCalc('pse')">Calculer</button>
      <div class="calc-result-box" id="res_pse_box" style="display:none;">
        <div class="calc-result-title">DÉBIT PSE</div>
        <div class="calc-result-val" id="res_pse_val">-- mL/h</div>
      </div>
    `
  },

  /* ===== GROUPE 4 : MÉDICAMENTS ===== */
  {
    id: 'dosekg', icon: '💊', title: 'Dose / kg → Totale',
    html: `
      <div class="calc-form-group">
        <span class="calc-label">Poids (kg)</span>
        <input type="number" id="calc_dose_poids" class="calc-input" placeholder="ex: 70">
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Dose par kg</span>
        <input type="number" id="calc_dose_val" class="calc-input" placeholder="ex: 0.5">
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Unité</span>
        <select id="calc_dose_unit" class="calc-select">
          <option value="mg">mg</option>
          <option value="µg">µg</option>
          <option value="UI">UI</option>
          <option value="mL">mL</option>
        </select>
      </div>
      <button class="btn-calc" onclick="execCalc('dosekg')">Calculer</button>
      <div class="calc-result-box" id="res_dose_box" style="display:none;">
        <div class="calc-result-title">DOSE TOTALE</div>
        <div class="calc-result-val" id="res_dose_total">--</div>
      </div>
    `
  },
  {
    id: 'convmgml', icon: '🔄', title: 'Conversion mg ↔ mL',
    html: `
      <div class="calc-form-group">
        <span class="calc-label">Quantité</span>
        <input type="number" id="calc_conv_qte" class="calc-input" placeholder="ex: 50">
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Unité de départ</span>
        <select id="calc_conv_unit" class="calc-select">
          <option value="mg">mg → mL</option>
          <option value="ml">mL → mg</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Concentration (mg/mL)</span>
        <input type="number" id="calc_conv_conc" class="calc-input" placeholder="ex: 2">
      </div>
      <button class="btn-calc" onclick="execCalc('convmgml')">Calculer</button>
      <div class="calc-result-box" id="res_conv_box" style="display:none;">
        <div class="calc-result-title">RÉSULTAT</div>
        <div class="calc-result-val" id="res_conv_res">--</div>
      </div>
    `
  },

  /* ===== GROUPE 5 : SURVEILLANCE ===== */
  {
    id: 'diurese', icon: '💧', title: 'Diurèse horaire',
    html: `
      <div class="calc-form-group">
        <span class="calc-label">Poids (kg)</span>
        <input type="number" id="calc_diu_poids" class="calc-input" placeholder="ex: 70">
      </div>
      <button class="btn-calc" onclick="execCalc('diurese')">Calculer</button>
      <div class="calc-result-box" id="res_diu_box" style="display:none;">
        <div class="calc-result-title">DIURÈSE HORAIRE CIBLE</div>
        <div class="calc-result-val" id="res_diu_val">-- mL/h</div>
        <div class="calc-result-sub">Cible normale : 0.5–1 mL/kg/h. À surveiller.</div>
      </div>
    `
  },
  {
    id: 'imc', icon: '📏', title: 'IMC',
    html: `
      <div class="calc-form-group">
        <span class="calc-label">Poids (kg)</span>
        <input type="number" id="calc_imc_poids" class="calc-input" placeholder="ex: 75">
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Taille (cm)</span>
        <input type="number" id="calc_imc_taille" class="calc-input" placeholder="ex: 170">
      </div>
      <button class="btn-calc" onclick="execCalc('imc')">Calculer</button>
      <div class="calc-result-box" id="res_imc_box" style="display:none;">
        <div class="calc-result-title">IMC</div>
        <div class="calc-result-val" id="res_imc_val">-- kg/m²</div>
        <div class="calc-result-sub" id="res_imc_sub">--</div>
      </div>
    `
  },

  /* ===== GROUPE 6 : RH / ADMINISTRATIF ===== */
  {
    id: 'pct', icon: '📊', title: 'Pourcentages',
    html: `
      <div class="calc-form-group">
        <span class="calc-label">Pourcentage (%)</span>
        <input type="number" id="calc_pct_p" class="calc-input" placeholder="ex: 20">
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Valeur totale</span>
        <input type="number" id="calc_pct_v" class="calc-input" placeholder="ex: 500">
      </div>
      <button class="btn-calc" onclick="execCalc('pct')">Calculer</button>
      <div class="calc-result-box" id="res_pct_box" style="display:none;">
        <div class="calc-result-title">RÉSULTAT</div>
        <div class="calc-result-val" id="res_pct_val">--</div>
      </div>
    `
  },
  {
    id: 'transmission', icon: '🕐', title: 'Heures de transmission',
    html: `
      <div style="background:var(--ide-glow); border:1px solid rgba(96,206,234,0.3); border-radius:8px; padding:12px; margin-bottom:10px; font-size:0.82rem; color:var(--ide); font-weight:700; line-height:1.5;">
        ⏱️ <strong>0,25h</strong> (15 min) de transmission par jour travaillé.<br>
        <span style="color:var(--text-muted);">Source : Guide Temps de Travail — Art. 1.4.4</span>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Jours travaillés</span>
        <input type="number" id="calc_tr_jours" class="calc-input" placeholder="ex: 10" min="1">
      </div>
      <button class="btn-calc" onclick="execCalc('transmission')">Calculer</button>
      <div class="calc-result-box" id="res_tr_box" style="display:none;">
        <div class="calc-result-title">CRÉDIT DE TRANSMISSION</div>
        <div class="calc-result-val" style="color:var(--ide);" id="res_tr_total">-- h</div>
        <div class="calc-result-sub" id="res_tr_sub">0,25 × -- jours = -- h</div>
      </div>
    `
  },
  {
    id: 'conges', icon: '🌴', title: 'Congés HS & Frac.',
    html: `
      <div style="background:var(--ide-glow); border:1px solid rgba(96,206,234,0.3); border-radius:10px; padding:12px 14px; margin-bottom:16px; font-size:0.78rem; color:var(--ide); font-weight:700; line-height:1.6;">
        📋 <strong>Décret 2002-8, Art. 1</strong><br>
        25 jours CA → jusqu'à <strong>+2 j Hors Saison</strong> (nov–avr) et <strong>+1 j Fractionnement</strong> (≥3 périodes de ≥5j)<br>
        <strong>28 jours maximum</strong> — prenables jusqu'au 31 mars N+1.
      </div>
      <button class="btn-primary" style="width:100%; padding:14px; font-size:1rem;" onclick="openCalendrierConges()">
        📅 Ouvrir le simulateur calendrier
      </button>
    `
  },
  {
    id: 'conges_ete', icon: '☀️', title: 'Congés Été FPH',
    html: `
      <div style="background:var(--med-glow); border:1px solid rgba(245,158,11,0.3); border-radius:10px; padding:12px 14px; margin-bottom:16px; font-size:0.78rem; color:var(--med); font-weight:700; line-height:1.7;">
        ☀️ <strong>Décret 2002-8 — FPH Art. 1</strong><br>
        Période estivale : <strong>1er mai → 31 octobre</strong><br>
        Fraction principale : min <strong>10 j consécutifs</strong> · max <strong>20 j consécutifs</strong><br>
        Report possible jusqu'au <strong>31 mars N+1</strong>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Quotité de travail</span>
        <select id="ete_quotite" class="calc-select" onchange="execCalcLive('conges_ete')">
          <option value="100">100 % — Temps plein (25 j)</option>
          <option value="90">90 % (22,5 → 23 j)</option>
          <option value="80">80 % (20 j)</option>
          <option value="70">70 % (17,5 → 18 j)</option>
          <option value="60">60 % (15 j)</option>
          <option value="50">50 % (12,5 → 13 j)</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Mois travaillés sur la période de référence</span>
        <select id="ete_mois" class="calc-select" onchange="execCalcLive('conges_ete')">
          <option value="12">12 mois — Année complète</option>
          <option value="11">11 mois</option>
          <option value="10">10 mois</option>
          <option value="9">9 mois</option>
          <option value="8">8 mois</option>
          <option value="7">7 mois</option>
          <option value="6">6 mois</option>
          <option value="5">5 mois</option>
          <option value="4">4 mois</option>
          <option value="3">3 mois</option>
          <option value="2">2 mois</option>
          <option value="1">1 mois</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Jours CA déjà posés / pris (hors été)</span>
        <input type="number" id="ete_deja" class="calc-input" placeholder="0" min="0" oninput="execCalcLive('conges_ete')">
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Jours souhaités en été (1 mai – 31 oct)</span>
        <input type="number" id="ete_ete" class="calc-input" placeholder="ex : 15" min="0" oninput="execCalcLive('conges_ete')">
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Dont consécutifs (fraction principale)</span>
        <input type="number" id="ete_consec" class="calc-input" placeholder="ex : 15" min="0" oninput="execCalcLive('conges_ete')">
      </div>
      <div class="calc-result-box" id="res_ete_box" style="display:none; flex-direction:column; gap:8px;">
        <div class="calc-result-title">DROITS &amp; SOLDE</div>
        <div class="calc-result-val" id="res_ete_droits">--</div>
        <div class="calc-result-sub" id="res_ete_solde"></div>
        <div id="res_ete_rules" style="margin-top:6px; font-size:0.8rem; line-height:1.8;"></div>
        <div id="res_ete_bonus" style="font-size:0.78rem; color:var(--as); font-weight:700; margin-top:4px;"></div>
      </div>
    `
  },
  /* ===== GROUPE NUTRITION ===== */
  {
    id: 'calorique', icon: '🍽️', title: 'Besoins caloriques — Harris-Benedict',
    html: `
      <div class="calc-form-group">
        <span class="calc-label">Contexte</span>
        <select id="cal_contexte" class="calc-select" onchange="calUpdateContexte()">
          <option value="lambda">Personne lambda</option>
          <option value="rea">Réanimation / Hospitalier</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Sexe</span>
        <select id="cal_sexe" class="calc-select" onchange="execCalcLive('calorique')">
          <option value="H">Homme</option>
          <option value="F">Femme</option>
        </select>
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Âge (ans)</span>
        <input type="number" id="cal_age" class="calc-input" placeholder="ex : 35" min="15" max="110" oninput="execCalcLive('calorique')">
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Poids (kg)</span>
        <input type="number" id="cal_poids" class="calc-input" placeholder="ex : 70" min="30" max="250" step="0.5" oninput="execCalcLive('calorique')">
      </div>
      <div class="calc-form-group">
        <span class="calc-label">Taille (cm)</span>
        <input type="number" id="cal_taille" class="calc-input" placeholder="ex : 175" min="100" max="220" oninput="execCalcLive('calorique')">
      </div>
      <div class="calc-form-group" id="cal_activite_row">
        <span class="calc-label">Niveau d'activité physique</span>
        <select id="cal_activite" class="calc-select" onchange="execCalcLive('calorique')">
          <option value="1.2">Sédentaire (bureau, peu de sport)</option>
          <option value="1.375">Légèrement actif (1–3 séances/sem)</option>
          <option value="1.55" selected>Modérément actif (3–5 séances/sem)</option>
          <option value="1.725">Très actif (6–7 séances/sem)</option>
          <option value="1.9">Extrêmement actif (sportif intensif)</option>
        </select>
      </div>
      <div class="calc-form-group" id="cal_activite_rea_row" style="display:none;">
        <span class="calc-label">Facteur d'activité (réa)</span>
        <select id="cal_activite_rea" class="calc-select" onchange="execCalcLive('calorique')">
          <option value="1.0">1.0 — Alité, sédaté / ventilé immobile</option>
          <option value="1.1" selected>1.1 — Alité, éveillé</option>
          <option value="1.2">1.2 — Levé au fauteuil</option>
          <option value="1.3">1.3 — Kiné régulière</option>
        </select>
      </div>
      <div class="calc-form-group" id="cal_stress_row" style="display:none;">
        <span class="calc-label">Facteur de stress / agression</span>
        <select id="cal_stress" class="calc-select" onchange="execCalcLive('calorique')">
          <option value="1.0">1.0 — Post-op simple, stable</option>
          <option value="1.1" selected>1.1 — Infection légère / trauma modéré</option>
          <option value="1.2">1.2 — Sepsis, trauma majeur</option>
          <option value="1.3">1.3 — Sepsis sévère / défaillance multi-organe</option>
          <option value="1.5">1.5 — Brûlures étendues (> 20 % SCT)</option>
          <option value="1.7">1.7 — Brûlures massives / grand polytraumatisé</option>
        </select>
      </div>
      <div class="calc-result-box" id="res_cal_box" style="display:none; flex-direction:column; gap:10px;">
        <div class="calc-result-title">BESOINS ÉNERGÉTIQUES</div>
        <div style="display:flex; justify-content:space-between; align-items:baseline; gap:8px;">
          <span style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">Métabolisme de base (MB)</span>
          <span class="calc-result-val" id="res_cal_mb" style="font-size:1.3rem;">--</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:baseline; gap:8px;">
          <span style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">Dépense journalière (DEJ)</span>
          <span class="calc-result-val" id="res_cal_dej" style="font-size:1.6rem; color:var(--as);">--</span>
        </div>
        <div style="border-top:1px solid var(--border); padding-top:8px; font-size:0.82rem; line-height:1.9; color:var(--text-muted); font-weight:700;" id="res_cal_detail"></div>
        <div style="font-size:0.78rem; color:var(--med); font-weight:700; margin-top:2px;" id="res_cal_warn"></div>
      </div>
    `
  },
  ];
