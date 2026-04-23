// Utilitaires transverses (DOM, sons, haptic, escaping, dates).
// Référence dans index.html : voir ANNUAIRE.md pour les lignes d'origine.

export const $ = sel => document.querySelector(sel);
export const $$ = sel => Array.from(document.querySelectorAll(sel));

export function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function shiftKey(date = new Date(), phase = 'jour') {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}-${phase}`;
}

export function debounce(fn, ms = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export async function sha256Hex(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}
