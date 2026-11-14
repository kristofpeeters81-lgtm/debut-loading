// DEBUT LOADING… — opstart en de schil van de app (kopbalk met terugknop, schermen, updatemelding).
// Alles draait op de tablet: geen internet nodig na de eerste keer, niets wordt verstuurd.

import './styles.css';
import { NavStack, SCREENS, hashFor, parseHash, type ScreenId } from './app/router';
import { loadSettings, settings, updateSettings } from './app/state';
import { setupOfflineAndUpdates } from './app/update';
import { requestPersistence, type Persistence } from './storage/db';
import { mountHome, mountPlaceholder, mountSettings } from './screens/basic';
import { mountLuisteroor } from './screens/luisteroor';
import { mountKlanktest } from './screens/klanktest';
import { el } from './ui/dom';

const root = document.getElementById('app');
if (!root) throw new Error('#app ontbreekt');
const app: HTMLElement = root;

// ---------- Schil ----------
const bar = el('header', 'topbar');
const backBtn = el('button', 'back', '←');
backBtn.setAttribute('aria-label', 'Terug');
const title = el('h1', 'title', '');
bar.append(backBtn, title);

const banner = el('div', 'update-banner');
banner.hidden = true;
const content = el('main', 'content');
app.append(bar, banner, content);

const nav = new NavStack(parseHash(location.hash));
let cleanup: (() => void) | null = null;
let persistence: Persistence = 'onbekend';

function show(id: ScreenId): void {
  cleanup?.();
  cleanup = null;
  content.replaceChildren();
  window.scrollTo(0, 0);

  const info = SCREENS[id];
  title.textContent = id === 'start' ? 'DEBUT LOADING…' : `${info.icon} ${info.title}`;
  backBtn.hidden = info.parent === null;
  document.body.dataset.screen = id;

  switch (id) {
    case 'start':
      mountHome(content);
      break;
    case 'instellingen':
      mountSettings(content, persistence);
      break;
    case 'luisteroor':
      cleanup = mountLuisteroor(content, {
        notation: settings().notation,
        sensitivity: settings().micSensitivity,
        onSensitivity: (v) => void updateSettings({ micSensitivity: v }),
      });
      break;
    case 'klanktest':
      cleanup = mountKlanktest(content, settings().notation);
      break;
    default:
      mountPlaceholder(content, info);
  }
}

backBtn.addEventListener('click', () => {
  const action = nav.backAction();
  if (action.kind === 'history') history.back();
  else if (action.kind === 'replace') location.replace(hashFor(action.to));
});

window.addEventListener('hashchange', () => {
  const id = parseHash(location.hash);
  nav.visit(id);
  show(id);
});

// ---------- Updatemelding ----------
setupOfflineAndUpdates((apply) => {
  banner.replaceChildren();
  const btn = el('button', 'update-btn', '✨ Nieuwe versie klaar — tik om bij te werken');
  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.textContent = 'Even bijwerken…';
    apply();
  });
  const later = el('button', 'update-later', 'Later');
  later.addEventListener('click', () => {
    banner.hidden = true;
  });
  banner.append(btn, later);
  banner.hidden = false;
});

// ---------- Start ----------
async function start(): Promise<void> {
  await loadSettings();
  persistence = await requestPersistence();
  show(nav.current);
}

void start();
