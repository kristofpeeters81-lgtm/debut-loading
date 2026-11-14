// DEBUT LOADING… — opstart en de schil van de app (kopbalk met terugknop, schermen, updatemelding).
// Alles draait op de tablet: geen internet nodig na de eerste keer, niets wordt verstuurd.

// Lettertypes zitten in de app zelf (gratis, OFL-licentie), zodat ze ook offline werken.
import '@fontsource/unbounded/latin-600.css';
import '@fontsource/unbounded/latin-900.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-800.css';
import './styles.css';
import { NavStack, SCREENS, hashFor, parseHash, type ScreenId } from './app/router';
import { activeProfile, loadSettings, needsProfileChoice, settings, updateSettings } from './app/state';
import { setupOfflineAndUpdates } from './app/update';
import { requestPersistence, type Persistence } from './storage/db';
import { mountHome, mountPlaceholder, mountSettings } from './screens/basic';
import { mountLuisteroor } from './screens/luisteroor';
import { mountKlanktest } from './screens/klanktest';
import { mountVrijSpelen } from './screens/vrijspelen';
import { mountStemmen } from './screens/stemmen';
import { mountProfileChooser, mountProfileEditor } from './screens/profielen';
import { mountLessen } from './screens/lessen';
import { mountLes } from './screens/les';
import { mountLiedjes } from './screens/liedjes';
import { mountSpel } from './screens/spel';
import { avatarSvg } from './ui/avatar';
import { el } from './ui/dom';
import { icon } from './ui/icons';

const root = document.getElementById('app');
if (!root) throw new Error('#app ontbreekt');
const app: HTMLElement = root;

// ---------- Schil ----------
const bar = el('header', 'topbar');
const backBtn = el('button', 'icon-btn back');
backBtn.setAttribute('aria-label', 'Terug');
backBtn.append(icon('back', 'var(--text)', 26));
const title = el('h1', 'title', '');
const gear = el('a', 'icon-btn gear');
gear.href = hashFor('instellingen');
gear.dataset.screen = 'instellingen';
gear.setAttribute('aria-label', 'Instellingen');
gear.append(icon('gear', 'var(--muted)', 26));
// Op het startscherm: wie speelt er (figuur + naam). Tik = van speler wisselen.
const who = el('a', 'who-chip');
who.href = hashFor('profielen');
who.dataset.screen = 'profielen';
bar.append(backBtn, title, who, gear);

const banner = el('div', 'update-banner');
banner.hidden = true;
const content = el('main', 'content');
app.append(bar, banner, content);

const nav = new NavStack(parseHash(location.hash));
let cleanup: (() => void) | null = null;
let persistence: Persistence = 'onbekend';

function show(id: ScreenId): void {
  // Eerst weten wie er speelt: geen profiel → profiel maken; meerdere → kiezen.
  const choice = needsProfileChoice();
  if (id === 'start' && choice) {
    location.replace(hashFor(choice === 'nieuw' ? 'profiel' : 'profielen'));
    return;
  }

  cleanup?.();
  cleanup = null;
  content.replaceChildren();
  window.scrollTo(0, 0);

  const info = SCREENS[id];
  // Op het startscherm staat het grote logo; daar enkel wie er speelt + het tandwiel rechtsboven.
  title.textContent = id === 'start' ? '' : info.title;
  title.hidden = id === 'start';
  backBtn.hidden = info.parent === null || ((id === 'profiel' || id === 'profielen') && choice !== null);
  gear.hidden = id !== 'start';
  who.hidden = id !== 'start';
  document.body.dataset.screen = id;

  switch (id) {
    case 'start': {
      const p = activeProfile();
      who.replaceChildren();
      if (p) {
        const face = el('span', 'who-avatar');
        face.append(avatarSvg(p.instrument, { character: p.character, glow: false }));
        who.append(face, el('span', 'who-name', p.name));
        who.setAttribute('aria-label', `${p.name} speelt. Tik om van speler te wisselen.`);
      }
      mountHome(content);
      break;
    }
    case 'liedjes':
      mountLiedjes(content);
      break;
    case 'spel':
      cleanup = mountSpel(content);
      break;
    case 'lessen':
      mountLessen(content);
      break;
    case 'les':
      cleanup = mountLes(content);
      break;
    case 'profielen':
      mountProfileChooser(content);
      break;
    case 'profiel':
      mountProfileEditor(content);
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
    case 'vrij-spelen':
      cleanup = mountVrijSpelen(content);
      break;
    case 'stemmen':
      cleanup = mountStemmen(content);
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
  const btn = el('button', 'update-btn', 'Nieuwe versie klaar — tik om bij te werken');
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
