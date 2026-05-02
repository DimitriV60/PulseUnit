// PulseUnit — Service Worker registration + handler de notif click
// (extrait inline d'index.html — P2.2 audit 2026-04-30).

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'notif-click' && typeof window.handleNotifAction === 'function') {
      const action = e.data.data?.action;
      if (action) window.handleNotifAction(action);
    }
  });
}
