// Lessen (blok 8): de lijst met lessen als een pad, met sterren per les. Alles is vrij te kiezen;
// de eerste les zonder sterren is gemarkeerd als "Volgende".

import { LESSONS, MAX_STARS } from '../lessons/content';
import { activeProfile } from '../app/state';
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

export function mountLessen(app: HTMLElement): void {
  const stars = activeProfile()?.stars ?? {};
  const nextId = LESSONS.find((l) => !stars[l.id])?.id;
  const intro = el('p', 'sub lessons-intro', 'Keyboard · speel op je echte keyboard, de app luistert mee.');
  const path = el('ol', 'lesson-path');
  LESSONS.forEach((l, i) => {
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
  app.append(intro, path, el('p', 'small', 'Gitaar, bas, drum en zang krijgen later hun eigen lessen.'));
}
