/**
 * Custom Auth — pont entre PulseUnit et le Worker Cloudflare qui signe les
 * Firebase Custom Tokens avec un Service Account (P1.4 audit 2026-04-30).
 *
 * Stratégie : tente le Worker en premier (signInWithCustomToken → uid réel +
 * claim role/admin lisibles côté Firestore Rules). Si le Worker n'est pas
 * configuré (FIREBASE_SA_KEY absent → 503) ou en cas d'erreur réseau, fallback
 * sur signInAnonymously pour préserver la disponibilité (mode dégradé legacy).
 *
 * Expose :
 *   - window.customAuth.loginWithPin(userId, pin)   → { ok, requirePinChange?, fallback? }
 *   - window.customAuth.loginAdmin(user, pass)      → { ok, fallback? }
 *   - window.customAuth.logout()                    → désauth Firebase puis re-anonyme
 *
 * Dépend de Firebase v9 compat global (firebase.auth().signInWithCustomToken).
 */

(function () {
  const SCAN_WORKER_URL = 'https://pulseunit-scan.dimitri-valentin.workers.dev';

  async function _post(path, body) {
    const resp = await fetch(SCAN_WORKER_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await resp.json().catch(() => ({}));
    return { ok: resp.ok, status: resp.status, json };
  }

  async function _signInWithFallback(token) {
    if (!window.firebase || !firebase.auth) return false;
    try {
      await firebase.auth().signInWithCustomToken(token);
      return true;
    } catch (e) {
      console.warn('[custom-auth] signInWithCustomToken failed', e);
      return false;
    }
  }

  async function _ensureAnonFallback() {
    if (!window.firebase || !firebase.auth) return;
    if (firebase.auth().currentUser) {
      try { await firebase.auth().signOut(); } catch (e) {}
    }
    try { await firebase.auth().signInAnonymously(); } catch (e) {
      console.warn('[custom-auth] anon fallback failed', e);
    }
  }

  window.customAuth = {
    /**
     * Tente le login via Worker /login. Si succès → signInWithCustomToken.
     * Si Worker 503 (SA non configuré) ou réseau KO → renvoie {fallback:true},
     * l'appelant doit alors faire la validation legacy côté client + signInAnonymously.
     */
    async loginWithPin(userId, pin) {
      try {
        const { ok, status, json } = await _post('/login', { userId, pin });
        if (ok && json.token) {
          const signed = await _signInWithFallback(json.token);
          if (signed) {
            return {
              ok: true,
              uid: json.uid,
              role: json.role,
              requirePinChange: !!json.requirePinChange
            };
          }
          return { ok: false, error: 'sign_in_failed', fallback: true };
        }
        // 503 = pas configuré, 404 = user inconnu, 401 = bad pin, 403 = blocked, 429 = rate
        if (status === 503) return { ok: false, error: 'auth_not_configured', fallback: true };
        return { ok: false, error: json.error || 'login_failed', status };
      } catch (e) {
        console.warn('[custom-auth] loginWithPin network error', e);
        return { ok: false, error: 'network', fallback: true };
      }
    },

    async loginAdmin(user, pass) {
      try {
        const { ok, status, json } = await _post('/admin-login', { user, pass });
        if (ok && json.token) {
          const signed = await _signInWithFallback(json.token);
          if (signed) return { ok: true, admin: true };
          return { ok: false, error: 'sign_in_failed', fallback: true };
        }
        if (status === 503) return { ok: false, error: 'auth_not_configured', fallback: true };
        return { ok: false, error: json.error || 'login_failed', status };
      } catch (e) {
        return { ok: false, error: 'network', fallback: true };
      }
    },

    /** Déconnexion : revient sur auth anonyme (pour préserver les reads Firestore actifs). */
    async logout() {
      await _ensureAnonFallback();
    },

    /**
     * Audit log — append-only via Worker /audit (P2.1).
     * Fire-and-forget : les erreurs ne doivent pas bloquer le user flow.
     * action ∈ VALID_AUDIT_ACTIONS côté worker.
     */
    audit(action, target, details) {
      try {
        const actor = (window.currentUser && window.currentUser.id) || null;
        // Pas d'await : le journal est best-effort
        _post('/audit', { actor, action, target: target || null, details: details || null })
          .catch(e => console.warn('[audit] failed', action, e));
      } catch (e) { /* never block UI */ }
    }
  };
})();
