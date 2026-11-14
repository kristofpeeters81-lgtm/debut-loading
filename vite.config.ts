import { createHash } from 'node:crypto';
import { defineConfig, type Plugin } from 'vite';

/**
 * Veiligheidsregel (Content-Security-Policy) voor de gepubliceerde website:
 * `connect-src 'none'` laat de browser elke poging van de app om iets naar het internet te sturen blokkeren.
 * Enkel in de build: de ontwikkelserver heeft een websocket nodig.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'music-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
    },
  };
}

/** Bestanden uit `public/` die de service worker ook moet bewaren. */
const PUBLIC_FILES = ['./manifest.webmanifest', './favicon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];

/**
 * Service worker voor offline gebruik: bewaart alle bestanden van de app op de tablet.
 * Gebaseerd op die van SingApp, met één verschil: een nieuwe versie neemt NIET vanzelf over.
 * Ze wacht tot de app het bericht SKIP_WAITING stuurt (na een tik op de updatemelding, zie src/app/update.ts).
 */
function serviceWorkerPlugin(): Plugin {
  return {
    name: 'music-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const all = ['./', ...files.map((f) => `./${f}`), ...PUBLIC_FILES];
      const version = createHash('sha256').update(all.join('|')).digest('hex').slice(0, 12);
      const sw = `// DEBUT LOADING… service worker — gegenereerd bij de build. Bewaart de app voor offline gebruik.
const CACHE = 'debut-loading-${version}';
const FILES = ${JSON.stringify(all)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
});
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('debut-loading-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    // ignoreVary: scripts met "crossorigin" sturen een Origin mee; zonder dit vindt de cache ze niet terug als de server "Vary: Origin" zet.
    caches.match(e.request, { ignoreSearch: true, ignoreVary: true }).then((hit) => {
      if (hit) return hit;
      if (e.request.mode === 'navigate') return caches.match('./');
      return fetch(e.request);
    }),
  );
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: sw });
    },
  };
}

const pad = (n: number): string => String(n).padStart(2, '0');
const now = new Date();
const BUILD_TIME = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

export default defineConfig({
  base: './',
  plugins: [cspPlugin(), serviceWorkerPlugin()],
  define: { __BUILD_TIME__: JSON.stringify(BUILD_TIME) },
  // Eigen vaste poorten (SingApp gebruikt 5317/4317).
  server: { port: 5318, strictPort: true },
  preview: { port: 4318, strictPort: true },
  build: {
    target: 'es2018',
    modulePreload: { polyfill: false },
  },
});
