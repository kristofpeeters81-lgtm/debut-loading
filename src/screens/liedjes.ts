// Liedjes (blok 9): kies een liedje voor het spel met vallende noten. Sterren per liedje, per profiel.

import { SONGS, songStarId } from '../songs/songs';
import { activeProfile } from '../app/state';
import { el } from '../ui/dom';
import { starRow } from './lessen';
import { openSong } from './spel';

export function mountLiedjes(app: HTMLElement): void {
  const stars = activeProfile()?.stars ?? {};
  const intro = el('p', 'sub lessons-intro', 'Keyboard · de noten vallen naar de juiste toets. Speel ze op je keyboard of tik op het scherm.');
  const list = el('ol', 'lesson-path');
  SONGS.forEach((s, i) => {
    const li = el('li', 'lesson-item');
    const card = el('button', 'lesson-card');
    card.dataset.song = s.id;
    const text = el('span', 'lesson-text');
    text.append(el('span', 'lesson-title', s.title), el('span', 'lesson-goal', s.source));
    const right = el('span', 'lesson-right');
    right.append(starRow(stars[songStarId(s.id)] ?? 0));
    card.append(el('span', 'lesson-num', String(i + 1)), text, right);
    card.addEventListener('click', () => openSong(s.id));
    li.append(card);
    list.append(li);
  });
  app.append(
    intro,
    list,
    el('p', 'small', 'Later komen hier ook je eigen MIDI-liedjes (downloadhoek), liedjes uit de naspeelstudio en eigen nummers bij.'),
  );
}
