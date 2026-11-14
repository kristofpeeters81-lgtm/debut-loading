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

export default defineConfig({
  base: './',
  plugins: [cspPlugin()],
  // Eigen vaste poorten (SingApp gebruikt 5317/4317).
  server: { port: 5318, strictPort: true },
  preview: { port: 4318, strictPort: true },
  build: {
    target: 'es2018',
    modulePreload: { polyfill: false },
  },
});
