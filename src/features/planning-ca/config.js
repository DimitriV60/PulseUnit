// PulseUnit — Config planning CA (états travaillés + libellés courts).
// Extrait d'index.html. Expose window.PLAN_WORK_STATES et window.PLAN_LABELS.

  window.PLAN_WORK_STATES = new Set(['travail', 'jour', 'nuit', 'hs', 'hs_j', 'hs_n', 'formation']);
  // Libellés courts affichés dans les cases
  window.PLAN_LABELS = { jour:'J', nuit:'N', ca:'CA', can1:'CA-1', ca_hp:'CA-HP', ca_hpn1:'CA-HP1', rcn:'RCN', rh:'RH', hs:'HS', hs_j:'HSJ', hs_n:'HSN', rc:'RC', formation:'FO', ferie:'JF', maladie:'AM', hp:'HP', hpn1:'HP-1', rcv:'RCV', rcvn1:'RCV-1', frac:'FR', fracn1:'FR-1' };
