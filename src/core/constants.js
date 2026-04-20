/**
 * Constantes statiques partagées — chargées AVANT tous les handlers.
 * Exposées sur window pour être accessibles depuis n'importe quel script classique.
 *
 * - ICONS        — SVG inline pour marqueurs lits (bmr, dialyse, crit, closed, check)
 * - CONFIG       — structure des secteurs (RÉA 15 lits + USIP 5 lits)
 * - reaBedsList  — ordre d'affichage des lits RÉA
 */

window.ICONS = {
  bmr:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  dialyse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>',
  crit:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>',
  closed:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
  check:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"></polyline></svg>'
};

window.CONFIG = [
  { type: 'rea',  name: 'RÉANIMATION (15 lits)', beds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16], color: 'var(--brand-blue)' },
  { type: 'usip', name: 'USIP (5 lits)',         beds: [1, 2, 3, 4, 5],                                     color: 'var(--med)'         }
];

window.reaBedsList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16];
