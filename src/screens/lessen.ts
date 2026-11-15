// Lessen: per instrument een pad van lessen met sterren. Alles is vrij te kiezen;
// de eerste les zonder sterren is gemarkeerd als "Volgende".

import { LEVEL_NAMES, MAX_STARS, lessonsFor } from '../lessons/content';
import { activeProfile, settings } from '../app/state';
import { INSTRUMENT_CHOICES, type InstrumentId } from '../app/settings';
import { el } from '../ui/dom';
import { icon } from '../ui/icons';
import { openLesson } from './les';

export function starRow(count: number, size = 26): HTMLElement {
  const row = el('span', 'star-row');
  row.setAttribute('aria-label', `${count} van ${MAX_STARS} sterren`);
  for (let i = 0; i < MAX_STARS; i++) {
    const s = icon('star', i < count ? 'var(--yellow)' : 'var(--line)', size);
    if (i < count) s.setAttribute('fill', 'var(--yellow)');
    row.append(s);
  }
  return row;
}

const HOW: Record<InstrumentId, string> = {
  keyboard: 'Speel op je echte keyboard, de app luistert mee.',
  gitaar: 'Speel op je gitaar, de app luistert mee. Stem eerst even.',
  bas: 'Speel op je bas, de app luistert mee.',
  drum: 'Luister en tik het ritme na op de pads.',
  zang: 'Luister en zing na, de app luistert mee.',
};

/** Laatst gekozen tabblad (blijft zo als je uit een les terugkomt). */
let shown: InstrumentId | null = null;

export function mountLessen(app: HTMLElement): void {
  const stars = activeProfile()?.stars ?? {};
  const tabs = el('div', 'chips lesson-tabs');
  const intro = el('p', 'sub lessons-intro', '');
  const path = el('ol', 'lesson-path');

  const render = (inst: InstrumentId): void => {
    shown = inst;
    for (const t of tabs.querySelectorAll<HTMLButtonElement>('.chip')) t.classList.toggle('on', t.dataset.instrument === inst);
    intro.textContent = HOW[inst];
    const list = lessonsFor(inst);
    const nextId = list.find((l) => !stars[l.id])?.id;
    path.replaceChildren();
    let lastLevel = 0;
    list.forEach((l, i) => {
      const level = l.level ?? 1;
      if (level !== lastLevel) {
        lastLevel = level;
        const ofLevel = list.filter((x) => (x.level ?? 1) === level);
        const got = ofLevel.reduce((s, x) => s + (stars[x.id] ?? 0), 0);
        const head = el('li', 'level-head');
        head.dataset.level = String(level);
        head.append(
          el('span', 'level-name', `Niveau ${level} · ${LEVEL_NAMES[level] ?? ''}`),
          el('span', 'level-stars', `${got} / ${ofLevel.length * MAX_STARS} sterren`),
        );
        path.append(head);
      }
      const li = el('li', 'lesson-item');
      const card = el('button', l.id === nextId ? 'lesson-card next' : 'lesson-card');
      card.dataset.lesson = l.id;
      const num = el('span', 'lesson-num', String(i + 1));
      const text = el('span', 'lesson-text');
      text.append(el('span', 'lesson-title', l.title), el('span', 'lesson-goal', l.goal));
      const right = el('span', 'lesson-right');
      if (l.id === nextId) right.append(el('span', 'lesson-badge', 'Volgende'));
      right.append(starRow(stars[l.id] ?? 0));
      card.append(num, text, right);
      card.addEventListener('click', () => openLesson(l.id));
      li.append(card);
      path.append(li);
    });
  };

  for (const c of INSTRUMENT_CHOICES) {
    const t = el('button', 'chip', c.label);
    t.dataset.instrument = c.id;
    const got = lessonsFor(c.id).reduce((s, l) => s + (stars[l.id] ?? 0), 0);
    if (got) t.title = `${got} sterren`;
    t.addEventListener('click', () => render(c.id));
    tabs.append(t);
  }
  render(shown ?? settings().instrument);
  app.append(tabs, intro, path);
}
