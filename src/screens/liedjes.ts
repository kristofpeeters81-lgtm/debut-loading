// Liedjes (blok 9): kies een liedje voor het spel met vallende noten. Sterren per liedje, per profiel.

import { SONGS, songStarId } from '../songs/songs';
import { activeProfile } from '../app/state';
import { el } from '../ui/dom';
import { starRow } from './lessen';
import { openSong } from './spel';
import { importedSongs } from '../songs/library';
import { hashFor } from '../app/router';
import { icon } from '../ui/icons';

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
  // Mijn liedjes (eigen MIDI-bestanden uit de downloadhoek)
  const mineTitle = el('h2', 'songs-mine-title', 'Mijn liedjes');
  const mine = el('ol', 'lesson-path');
  const own = importedSongs();
  own.forEach((rec, i) => {
    const li = el('li', 'lesson-item');
    const card = el('button', 'lesson-card');
    card.dataset.song = rec.id;
    const text = el('span', 'lesson-text');
    text.append(el('span', 'lesson-title', rec.title), el('span', 'lesson-goal', `Eigen liedje · ${rec.song.notes.length} noten`));
    const right = el('span', 'lesson-right');
    right.append(starRow(stars[songStarId(rec.id)] ?? 0));
    card.append(el('span', 'lesson-num', String(i + 1)), text, right);
    card.addEventListener('click', () => openSong(rec.id));
    li.append(card);
    mine.append(li);
  });
  const toCorner = el('a', 'tool-link');
  toCorner.href = hashFor('downloadhoek');
  toCorner.dataset.screen = 'downloadhoek';
  toCorner.append(icon('download', 'var(--green)', 26), el('span', '', own.length ? 'Nog een liedje toevoegen' : 'Zelf een liedje toevoegen (downloadhoek)'));
  app.append(intro, list, mineTitle, mine, toCorner);
}
