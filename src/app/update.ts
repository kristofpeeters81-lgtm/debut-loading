// Offline werken + updates via een melding.
// De service worker (gemaakt bij de build, zie vite.config.ts) bewaart de app op de tablet.
// Een nieuwe versie installeert zich op de achtergrond en WACHT; de app toont dan een melding.
// Pas na een tik op de melding wordt de nieuwe versie gebruikt, zodat er nooit iets verandert midden in een liedje.

export function setupOfflineAndUpdates(showUpdate: (apply: () => void) => void): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;

  let reloading = false;
  sw.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  const offer = (waiting: ServiceWorker): void => {
    // Bij de allereerste installatie is er nog geen oude versie: dan geen melding.
    if (!sw.controller) return;
    showUpdate(() => waiting.postMessage({ type: 'SKIP_WAITING' }));
  };

  window.addEventListener('load', () => {
    sw.register('./sw.js')
      .then((reg) => {
        if (reg.waiting) offer(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && reg.waiting) offer(reg.waiting);
          });
        });
        // Telkens de app terug in beeld komt: kijken of er een nieuwe versie is (lukt enkel met internet).
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => undefined);
        });
      })
      .catch(() => {
        // Geen service worker: de app werkt gewoon, alleen niet offline.
      });
  });
}
