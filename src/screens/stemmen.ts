// Stemapparaat (blok 7) voor gitaar en bas. Zegt in woorden of een snaar te laag, juist of te hoog is,
// met een naald. Geen getallen (beslissing blok 1). Tik op een snaar om de juiste toon te horen.

import { engine } from '../audio/engine';
import { startTracker, micErrorText, type Tracker } from '../audio/tracker';
import { Smoother, nearestString, tuneState, type TuneState } from '../audio/tuning';
import { noteName } from '../dsp/notes';
import { settings } from '../app/state';
import { BASS_OPEN, GUITAR_OPEN } from './vrijspelen';
import { el } from '../ui/dom';

type Kind = 'gitaar' | 'bas';
const SETUP: Record<Kind, { strings: number[]; minHz: number; maxHz: number }> = {
  // Van dik naar dun, zoals je ze stemt.
  gitaar: { strings: [...GUITAR_OPEN].reverse(), minHz: 70, maxHz: 420 },
  bas: { strings: [...BASS_OPEN].reverse(), minHz: 35, maxHz: 130 },
};

const STATE_CLASS: Record<TuneState, string> = {
  'veel te laag': 'far',
  'iets te laag': 'near',
  juist: 'ok',
  'iets te hoog': 'near',
  'veel te hoog': 'far',
};

const ADVICE: Record<TuneState, string> = {
  'veel te laag': 'Draai de snaar strakker (hoger).',
  'iets te laag': 'Een klein beetje strakker.',
  juist: 'Juist gestemd!',
  'iets te hoog': 'Een klein beetje losser.',
  'veel te hoog': 'Draai de snaar losser (lager).',
};

export function mountStemmen(app: HTMLElement): () => void {
  let kind: Kind = settings().instrument === 'bas' ? 'bas' : 'gitaar';
  let tracker: Tracker | null = null;
  let alive = true;
  const smoother = new Smoother(5);
  let lastString = -1;
  let lastHeard = 0;

  const tabs = el('div', 'chips tuner-tabs');
  const card = el('section', 'card tuner');
  const big = el('div', 'tuner-note', '–');
  const word = el('div', 'tuner-word', 'Speel één snaar');
  const meter = el('div', 'tuner-meter');
  const zone = el('div', 'tuner-zone');
  const needle = el('div', 'tuner-needle');
  meter.append(el('span', 'tuner-end low', 'te laag'), zone, needle, el('span', 'tuner-end high', 'te hoog'));
  const advice = el('p', 'tuner-advice', '');
  const strings = el('div', 'tuner-strings');
  const startBtn = el('button', 'big', 'Start het stemapparaat');
  const startNote = el('p', 'small', 'De app luistert via de microfoon. Er wordt niets opgenomen.');
  card.append(big, word, meter, advice);
  app.append(tabs, startBtn, startNote, card, strings, el('p', 'small', 'Tik op een snaar hierboven om te horen hoe ze moet klinken.'));

  const renderStrings = (active: number): void => {
    strings.replaceChildren();
    SETUP[kind].strings.forEach((m, i) => {
      const b = el('button', i === active ? 'string-btn on' : 'string-btn', noteName(m, settings().notation, false));
      b.dataset.midi = String(m);
      b.addEventListener('click', () => {
        engine.noteOn(kind, m, 0.9);
      });
      strings.append(b);
    });
  };

  const reset = (): void => {
    big.textContent = '–';
    word.textContent = 'Speel één snaar';
    word.className = 'tuner-word';
    advice.textContent = '';
    needle.style.left = '50%';
    needle.className = 'tuner-needle';
    smoother.reset();
    lastString = -1;
    renderStrings(-1);
  };

  const select = (k: Kind): void => {
    kind = k;
    for (const t of tabs.querySelectorAll<HTMLButtonElement>('.chip')) t.classList.toggle('on', t.dataset.kind === k);
    reset();
  };

  for (const k of ['gitaar', 'bas'] as Kind[]) {
    const t = el('button', 'chip', k === 'gitaar' ? 'Gitaar' : 'Bas');
    t.dataset.kind = k;
    t.addEventListener('click', () => {
      select(k);
      if (tracker) void restart();
    });
    tabs.append(t);
  }
  select(kind);

  const onFrame = (hz: number | null, timeMs: number): void => {
    if (hz === null) {
      if (timeMs - lastHeard > 400 && lastString !== -1) reset();
      return;
    }
    lastHeard = timeMs;
    const { index, cents: raw } = nearestString(hz, SETUP[kind].strings);
    if (index !== lastString) {
      smoother.reset();
      lastString = index;
      renderStrings(index);
    }
    const cents = smoother.push(raw);
    const state = tuneState(cents);
    big.textContent = noteName(SETUP[kind].strings[index], settings().notation, false);
    word.textContent = state;
    word.className = `tuner-word ${STATE_CLASS[state]}`;
    card.dataset.state = state;
    advice.textContent = ADVICE[state];
    needle.style.left = `${50 + Math.max(-50, Math.min(50, cents))}%`;
    needle.className = `tuner-needle ${STATE_CLASS[state]}`;
  };

  async function restart(): Promise<void> {
    tracker?.stop();
    tracker = null;
    try {
      const t = await startTracker({ minHz: SETUP[kind].minHz, maxHz: SETUP[kind].maxHz }, (f) => onFrame(f.hz, f.timeMs));
      if (!alive) t.stop();
      else tracker = t;
    } catch (err) {
      startBtn.hidden = false;
      startBtn.disabled = false;
      startNote.textContent = micErrorText(err);
    }
  }

  startBtn.addEventListener('click', () => {
    startBtn.disabled = true;
    void restart().then(() => {
      if (tracker) {
        startBtn.hidden = true;
        startNote.hidden = true;
      }
    });
  });

  return () => {
    alive = false;
    tracker?.stop();
    engine.stopAll();
  };
}
