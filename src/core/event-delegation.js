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
    if (s === '$el') return '__EL__';
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
        return v === '__EL__' ? el : v;
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
})();
