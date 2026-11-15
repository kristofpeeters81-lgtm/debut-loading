// Liedjes: kies een instrument en een liedje voor het spel met vallende noten. Sterren per liedje én per instrument.

import { SONGS } from '../songs/songs';
import { songStarKey } from '../songs/arrange';
import { importedSongs, studioSongs } from '../songs/library';
import { activeProfile, settings } from '../app/state';
import { INSTRUMENT_CHOICES, type InstrumentId } from '../app/settings';
import { hashFor } from '../app/router';
import { el } from '../ui/dom';
import { icon } from '../ui/icons';
import { starRow } from './lessen';
import { openSong } from './spel';

const HOW: Record<InstrumentId, string> = {
  keyboard: 'De noten vallen naar de juiste toets. Speel ze op je keyboard of tik op het scherm.',
  gitaar: 'Elke baan is een snaar, het getal is de fret. Speel op je gitaar of tik op de hals.',
  bas: 'Elke baan is een snaar, het getal is de fret. Speel op je bas of tik op de hals.',
  drum: 'Speel een beat mee met het liedje op de drumpads.',
  zang: 'Zing de melodie mee. De app past het liedje aan jouw stem aan.',
};

/** Laatst gekozen instrument (blijft zo als je terugkomt uit een liedje). */
let shown: InstrumentId | null = null;

export function mountLiedjes(app: HTMLElement): void {
  const stars = activeProfile()?.stars ?? {};
  const tabs = el('div', 'chips lesson-tabs');
  const intro = el('p', 'sub lessons-intro', '');
  const list = el('ol', 'lesson-path');
  const mineTitle = el('h2', 'songs-mine-title', 'Mijn liedjes');
  const mine = el('ol', 'lesson-path');
  const own = importedSongs();
  const studio = studioSongs();
  const toCorner = el('a', 'tool-link');
  toCorner.href = hashFor('downloadhoek');
  toCorner.dataset.screen = 'downloadhoek';
  toCorner.append(icon('download', 'var(--green)', 26), el('span', '', own.length ? 'Nog een liedje toevoegen' : 'Zelf een liedje toevoegen (downloadhoek)'));

  const card = (id: string, title: string, sub: string, nr: number, inst: InstrumentId): HTMLElement => {
    const li = el('li', 'lesson-item');
    const c = el('button', 'lesson-card');
    c.dataset.song = id;
    const text = el('span', 'lesson-text');
    text.append(el('span', 'lesson-title', title), el('span', 'lesson-goal', sub));
    const right = el('span', 'lesson-right');
    right.append(starRow(stars[songStarKey(id, inst)] ?? 0));
    c.append(el('span', 'lesson-num', String(nr)), text, right);
    c.addEventListener('click', () => openSong(id, inst));
    li.append(c);
    return li;
  };

  const render = (inst: InstrumentId): void => {
    shown = inst;
    for (const t of tabs.querySelectorAll<HTMLButtonElement>('.chip')) t.classList.toggle('on', t.dataset.instrument === inst);
    intro.textContent = HOW[inst];
    list.replaceChildren(...SONGS.map((s, i) => card(s.id, s.title, s.source, i + 1, inst)));
    mine.replaceChildren(
      ...own.map((r, i) => card(r.id, r.title, `Eigen liedje · ${r.song.notes.length} noten`, i + 1, inst)),
      ...studio.map((r, i) => card(r.id, r.title, `Naspeelstudio · met het echte nummer`, own.length + i + 1, inst)),
    );
    mineTitle.hidden = own.length + studio.length === 0;
  };

  for (const c of INSTRUMENT_CHOICES) {
    const t = el('button', 'chip', c.label);
    t.dataset.instrument = c.id;
    t.addEventListener('click', () => render(c.id));
    tabs.append(t);
  }
  render(shown ?? settings().instrument);
  const toStudio = el('a', 'tool-link');
  toStudio.href = hashFor('studio');
  toStudio.dataset.screen = 'studio';
  toStudio.append(icon('music', 'var(--pink)', 26), el('span', '', 'Naspeelstudio: speel een mp3 na (ook K-pop!)'));
  app.append(tabs, intro, list, mineTitle, mine, toCorner, toStudio);
}
