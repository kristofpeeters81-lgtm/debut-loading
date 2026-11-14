// Startscherm, lege schermen ("komt in blok X") en instellingen. Stijl A · Neon Stage (blok 3).

import { SCREENS, hashFor, type ScreenId, type ScreenInfo } from '../app/router';
import { activeProfile, settings, updateSettings } from '../app/state';
import { INSTRUMENT_CHOICES, type Notation } from '../app/settings';
import type { Persistence } from '../storage/db';
import { avatarSvg } from '../ui/avatar';
import { LESSONS, MAX_STARS } from '../lessons/content';
import { SONGS } from '../songs/songs';
import { el } from '../ui/dom';
import { icon, type IconName } from '../ui/icons';

const TILES: { id: ScreenId; icon: IconName; color: string; sub: string }[] = [
  { id: 'vrij-spelen', icon: 'keys', color: 'var(--cyan)', sub: 'Speel wat je wil' },
  { id: 'lessen', icon: 'star', color: 'var(--pink)', sub: 'Stap voor stap' },
  { id: 'liedjes', icon: 'music', color: 'var(--yellow)', sub: 'Vallende noten' },
  { id: 'downloadhoek', icon: 'download', color: 'var(--green)', sub: 'Liedjes toevoegen' },
];

const SEGMENTS = 20;

/** Laadbalk uit LED-blokjes. `progress` 0..1 (vanaf blok 5: de voortgang van het profiel). */
export function loadingBar(progress: number): HTMLElement {
  const bar = el('div', 'led-bar');
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  bar.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
  // Naar boven afronden: zodra je iets verdiend hebt, brandt er minstens één blokje (anders lijkt het alsof er niets gebeurt).
  const lit = Math.min(SEGMENTS, Math.ceil(progress * SEGMENTS));
  for (let i = 0; i < SEGMENTS; i++) bar.append(el('span', i < lit ? 'seg on' : i === lit ? 'seg next' : 'seg'));
  return bar;
}

export function mountHome(app: HTMLElement): void {
  const home = el('div', 'home');

  // Logo + laadbalk
  const hero = el('section', 'hero');
  const logo = el('h1', 'logo');
  logo.append(el('span', 'logo-debut', 'DEBUT'), el('span', 'logo-loading', 'LOADING…'));
  // Voortgang = verzamelde sterren van dit profiel (lessen + liedjes) t.o.v. alle sterren die te verdienen zijn.
  const stars = Object.values(activeProfile()?.stars ?? {}).reduce((a, b) => a + b, 0);
  const progress = Math.min(1, stars / ((LESSONS.length + SONGS.length) * MAX_STARS));
  const meta = el('div', 'led-meta');
  meta.append(
    el('span', '', `${Math.round(progress * 100)}% geladen`),
    el('span', '', stars ? `${stars} ${stars === 1 ? 'ster' : 'sterren'} verzameld` : 'Je tour begint in je slaapkamer'),
  );
  hero.append(el('p', 'eyebrow', 'Van slaapkamer tot wereldtournee'), logo, loadingBar(progress), meta);

  // Hoofdknoppen
  const tiles = el('nav', 'tiles');
  tiles.setAttribute('aria-label', 'Hoofdmenu');
  for (const t of TILES) {
    const a = el('a', 'tile');
    a.href = hashFor(t.id);
    a.dataset.screen = t.id;
    const text = el('span', 'tile-text');
    text.append(el('span', 'tile-title', SCREENS[t.id].title), el('span', 'tile-sub', t.sub));
    a.append(icon(t.icon, t.color, 40), text);
    tiles.append(a);
  }

  // Podium met avatar + keuze van instrument
  const stage = el('section', 'stage');
  stage.append(el('div', 'beam b1'), el('div', 'beam b2 pink'), el('div', 'beam b3'));
  const figure = el('div', 'stage-figure');
  const chips = el('div', 'chips');
  chips.setAttribute('role', 'radiogroup');
  chips.setAttribute('aria-label', 'Kies je instrument');
  const renderStage = (): void => {
    figure.replaceChildren(avatarSvg(settings().instrument, { stage: true, character: activeProfile()?.character }));
    for (const c of chips.querySelectorAll<HTMLButtonElement>('.chip')) {
      const on = c.dataset.instrument === settings().instrument;
      c.classList.toggle('on', on);
      c.setAttribute('aria-checked', String(on));
    }
  };
  for (const choice of INSTRUMENT_CHOICES) {
    const c = el('button', 'chip', choice.label);
    c.dataset.instrument = choice.id;
    c.setAttribute('role', 'radio');
    c.addEventListener('click', () => {
      void updateSettings({ instrument: choice.id });
      renderStage();
    });
    chips.append(c);
  }
  stage.append(figure, chips);
  renderStage();

  home.append(hero, stage, tiles);
  app.append(home);
}

export function mountPlaceholder(app: HTMLElement, info: ScreenInfo): void {
  const card = el('section', 'card placeholder');
  card.append(
    icon(info.icon, 'var(--cyan)', 72),
    el('p', 'placeholder-title', 'Hier wordt nog gebouwd'),
    el('p', 'muted', `Dit scherm komt in ${info.comesIn ?? 'een later blok'}.`),
  );
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
        status.textContent = saved ? '' : 'Kon niet bewaren op deze tablet.';
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
  const toolLinks: [ScreenId, IconName, string][] = [
    ['luisteroor', 'ear', 'Luisteroor: wat hoort de tablet?'],
    ['klanktest', 'speaker', 'Klanktest: alle klanken van de app uitproberen'],
    ['stemmen', 'tuner', 'Stemapparaat voor gitaar en bas'],
  ];
  for (const [id, ic, text] of toolLinks) {
    const a = el('a', 'tool-link');
    a.href = hashFor(id);
    a.dataset.screen = id;
    a.append(icon(ic, 'var(--cyan)', 30), el('span', '', text));
    tools.append(a);
  }

  // Over de app
  const about = el('section', 'card');
  about.append(el('h2', '', 'Over de app'));
  const persistText: Record<Persistence, string> = {
    blijvend: 'Bewaard op deze tablet (Android ruimt het niet zomaar op).',
    tijdelijk: 'Bewaard op deze tablet. Zet de app op het startscherm, dan wordt het blijvend bewaard.',
    onbekend: 'Bewaard op deze tablet.',
  };
  about.append(
    el('p', 'small', 'Alles blijft op deze tablet. De app stuurt niets naar het internet en gebruikt geen AI.'),
    el('p', 'small', persistText[persistence]),
    el('p', 'small', `Versie: ${__BUILD_TIME__}`),
  );

  app.append(names, tools, about);
}
