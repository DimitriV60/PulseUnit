// Event delegation pour PulseUnit — remplace les onclick inline (CSP-friendly).
// Format : data-action="fnName" | "fnName:arg" | "fnName:arg1,arg2" | "fn1;fn2" | "fn:$el"
// Helpers globaux complémentaires : hide(id), show(id), setVal(id, v).
(function () {
  'use strict';

  window.hide = function (id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  };
  window.show = function (id, disp) {
    var el = document.getElementById(id);
    if (el) el.style.display = disp || 'flex';
  };
  window.setVal = function (id, v) {
    var el = document.getElementById(id);
    if (el) el.value = v == null ? '' : v;
  };
  window.clickById = function (id) {
    var el = document.getElementById(id);
    if (el) el.click();
  };

  function coerce(s) {
    if (s === '$el')  return '__EL__';
    if (s === '$val') return '__VAL__';   // P2.2 — passe el.value
    if (s === '$ev')  return '__EV__';    // P2.2 — passe l'event entier
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (s === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    return s;
  }

  function dispatch(spec, el, ev) {
    spec.split(';').forEach(function (call) {
      call = call.trim();
      if (!call) return;
      var idx = call.indexOf(':');
      var name = idx === -1 ? call : call.slice(0, idx);
      var rawArgs = idx === -1 ? [] : call.slice(idx + 1).split(',');
      var args = rawArgs.map(function (a) {
        var v = coerce(a.trim());
        if (v === '__EL__')  return el;
        if (v === '__VAL__') return (el && 'value' in el) ? el.value : '';
        if (v === '__EV__')  return ev;
        return v;
      });
      var fn = window[name];
      if (typeof fn === 'function') {
        try { fn.apply(el, args); }
        catch (e) { console.error('[event-delegation] ' + name, e); }
      } else {
        console.warn('[event-delegation] fonction introuvable : ' + name);
      }
    });
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    if (el.tagName === 'A' && (el.getAttribute('href') || '').startsWith('#')) {
      e.preventDefault();
    }
    dispatch(el.dataset.action, el, e);
  }, false);

  // P2.2 — délégation pour événements non-click (input, change, focus, blur, submit).
  // CSP sans 'unsafe-inline' bloque oninput= / onchange= / onsubmit= → on les
  // remplace par data-input= / data-change= / data-focus= / data-blur= / data-submit=
  ['input', 'change', 'focus', 'blur', 'submit', 'keydown', 'keyup'].forEach(function (eventName) {
    var attrName = 'data-' + eventName;
    document.addEventListener(eventName, function (e) {
      // Ces events ne bullent pas tous nativement (focus/blur) — on utilise capture pour
      // les attraper malgré tout sans bricoler.
      var el = e.target;
      if (!el || !el.getAttribute) return;
      var spec = el.getAttribute(attrName);
      if (!spec) return;
      dispatch(spec, el, e);
    }, true /* capture pour focus/blur */);
  });
})();
