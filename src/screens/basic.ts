// Eenvoudige schermen van blok 2: startscherm, lege schermen ("komt in blok X") en instellingen.
// Sober opgemaakt; de echte stijl komt in blok 3.

import { HOME_BUTTONS, SCREENS, hashFor, type ScreenId, type ScreenInfo } from '../app/router';
import { settings, updateSettings } from '../app/state';
import type { Notation } from '../app/settings';
import type { Persistence } from '../storage/db';
import { el } from '../ui/dom';

export function mountHome(app: HTMLElement): void {
  const intro = el('p', 'sub', 'Van slaapkamer tot wereldtournee. 🎤');
  const grid = el('nav', 'home-grid');
  for (const id of HOME_BUTTONS) {
    const info = SCREENS[id];
    const a = el('a', 'home-btn');
    a.href = hashFor(id);
    a.dataset.screen = id;
    a.append(el('span', 'home-icon', info.icon), el('span', 'home-label', info.title));
    grid.append(a);
  }
  app.append(intro, grid);
}

export function mountPlaceholder(app: HTMLElement, info: ScreenInfo): void {
  const card = el('section', 'card placeholder');
  card.append(el('div', 'placeholder-icon', info.icon), el('p', '', `Dit scherm komt in ${info.comesIn ?? 'een later blok'}.`));
  app.append(card);
}

export function mountSettings(app: HTMLElement, persistence: Persistence): void {
  // Notennamen
  const names = el('section', 'card');
  names.append(el('h2', '', 'Notennamen'));
  const row = el('div', 'choice-row');
  const options: [Notation, string][] = [
    ['letters', 'C D E F G A B'],
    ['doremi', 'do re mi fa sol la si'],
  ];
  const status = el('p', 'small', '');
  const buttons = options.map(([value, label]) => {
    const b = el('button', 'choice', label);
    b.dataset.notation = value;
    b.addEventListener('click', () => {
      void updateSettings({ notation: value }).then((saved) => {
        status.textContent = saved ? '' : '⚠️ Kon niet bewaren op deze tablet.';
      });
      render();
    });
    return b;
  });
  const render = (): void => {
    for (const b of buttons) b.classList.toggle('on', b.dataset.notation === settings().notation);
  };
  render();
  row.append(...buttons);
  names.append(row, status);

  // Hulpjes
  const tools = el('section', 'card');
  tools.append(el('h2', '', 'Hulpjes'));
  const toolLinks: [ScreenId, string][] = [
    ['luisteroor', 'Luisteroor: wat hoort de tablet?'],
    ['klanktest', 'Klanktest: alle klanken van de app uitproberen'],
  ];
  for (const [id, text] of toolLinks) {
    const a = el('a', 'tool-link');
    a.href = hashFor(id);
    a.dataset.screen = id;
    a.append(el('span', 'home-icon', SCREENS[id].icon), el('span', '', text));
    tools.append(a);
  }

  // Over de app
  const about = el('section', 'card');
  about.append(el('h2', '', 'Over de app'));
  const persistText: Record<Persistence, string> = {
    blijvend: '✅ Bewaard op deze tablet (Android ruimt het niet zomaar op).',
    tijdelijk: 'ℹ️ Bewaard op deze tablet. Zet de app op het startscherm, dan wordt het blijvend bewaard.',
    onbekend: 'ℹ️ Bewaard op deze tablet.',
  };
  about.append(
    el('p', 'small', '🔒 Alles blijft op deze tablet. De app stuurt niets naar het internet en gebruikt geen AI.'),
    el('p', 'small', persistText[persistence]),
    el('p', 'small', `Versie: ${__BUILD_TIME__}`),
  );

  app.append(names, tools, about);
}
