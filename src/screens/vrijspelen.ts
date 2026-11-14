// Vrij spelen (blok 6): keyboard, gitaarhals, bashals en drumpads op het scherm, met de klankmotor van blok 4.
// Meerdere vingers tegelijk (akkoorden), en over de toetsen glijden speelt elke toets die je raakt.
// De noot die klinkt, verschijnt groot bovenaan, in letters of do-re-mi.

import { engine, type Voice } from '../audio/engine';
import { DRUM_PADS, type DrumPad } from '../audio/synth';
import { noteName, octaveOf, pitchClass } from '../dsp/notes';
import { settings, updateSettings } from '../app/state';
import { INSTRUMENT_CHOICES, type InstrumentId, type Notation } from '../app/settings';
import { el } from '../ui/dom';
import { hashFor } from '../app/router';
import { mountSinging } from './zingen';
import { icon } from '../ui/icons';

/** Bereik van het referentiekeyboard (Casio SA-76): F2–C6. */
export const KEYBOARD_MIN = 41;
export const KEYBOARD_MAX = 84;
const WHITE_PCS = new Set([0, 2, 4, 5, 7, 9, 11]);
/** Een vaste kleur per letter, zoals later in het spel met vallende noten. */
export const LETTER_COLORS = ['#ff4fd8', '#ff9f4f', '#ffe45c', '#5dff9b', '#3ff0ff', '#6f8bff', '#b46bff'];
const COLOR_OF_PC = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6].map((i) => LETTER_COLORS[i]);

export const GUITAR_OPEN = [64, 59, 55, 50, 45, 40]; // hoge E bovenaan, zoals in tabs
export const BASS_OPEN = [43, 38, 33, 28];
const FRETS = 12;
const FRET_DOTS = new Set([3, 5, 7, 9, 12]);

const isWhite = (m: number): boolean => WHITE_PCS.has(pitchClass(m));

/** Witte toetsen in [min, max] vanaf `startWhite` (index), `count` stuks. */
export function visibleWhites(startMidi: number, count: number): number[] {
  const out: number[] = [];
  for (let m = startMidi; m <= KEYBOARD_MAX && out.length < count; m++) if (isWhite(m)) out.push(m);
  return out;
}

/** Laagste witte toets zodat er `count` witte toetsen passen en we binnen F2–C6 blijven. */
export function clampStart(start: number, count: number): number {
  const allWhites: number[] = [];
  for (let m = KEYBOARD_MIN; m <= KEYBOARD_MAX; m++) if (isWhite(m)) allWhites.push(m);
  const maxIndex = Math.max(0, allWhites.length - count);
  let idx = allWhites.findIndex((m) => m >= start);
  if (idx < 0) idx = maxIndex;
  return allWhites[Math.min(idx, maxIndex)];
}

type Press = (target: HTMLElement) => (() => void) | null;

/**
 * Maakt een speelvlak: elke vinger (pointer) apart, glijden van toets naar toets speelt de nieuwe toets.
 * Elementen met `data-play` zijn bespeelbaar.
 */
function bindPlayable(area: HTMLElement, press: Press): void {
  const active = new Map<number, { el: HTMLElement; stop: (() => void) | null }>();
  const at = (x: number, y: number): HTMLElement | null => {
    const hit = document.elementFromPoint(x, y);
    const target = hit instanceof Element ? hit.closest<HTMLElement>('[data-play]') : null;
    return target && area.contains(target) ? target : null;
  };
  const start = (id: number, target: HTMLElement): void => {
    target.classList.add('down');
    active.set(id, { el: target, stop: press(target) });
  };
  const end = (id: number): void => {
    const cur = active.get(id);
    if (!cur) return;
    cur.stop?.();
    cur.el.classList.remove('down');
    active.delete(id);
  };
  area.addEventListener('pointerdown', (e) => {
    const target = at(e.clientX, e.clientY);
    if (!target) return;
    e.preventDefault();
    end(e.pointerId);
    start(e.pointerId, target);
  });
  area.addEventListener('pointermove', (e) => {
    const cur = active.get(e.pointerId);
    if (!cur) return;
    const target = at(e.clientX, e.clientY);
    if (target && target !== cur.el) {
      end(e.pointerId);
      start(e.pointerId, target);
    }
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    area.addEventListener(type, (e) => end(e.pointerId));
  }
  area.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') end(e.pointerId);
  });
}

export function mountVrijSpelen(app: HTMLElement): () => void {
  const notation = (): Notation => settings().notation;
  let current: InstrumentId = settings().instrument;
  let teardown: (() => void) | null = null;

  // Bovenaan: keuze van instrument + grote noot
  const tabs = el('div', 'chips play-tabs');
  tabs.setAttribute('role', 'tablist');
  const display = el('div', 'note-display');
  const big = el('div', 'note-display-big', '–');
  const sub = el('div', 'note-display-sub', 'Tik op een toets');
  display.append(big, sub);
  const head = el('div', 'play-head');
  head.append(tabs, display);
  const surface = el('section', 'play-surface');
  app.append(head, surface);

  const show = (midi: number, voice: string): void => {
    big.textContent = noteName(midi, notation(), false);
    big.style.color = COLOR_OF_PC[pitchClass(midi)];
    const other = noteName(midi, notation() === 'doremi' ? 'letters' : 'doremi', false);
    sub.textContent = `${other} · octaaf ${octaveOf(midi)} · ${voice}`;
    display.dataset.midi = String(midi);
    display.classList.remove('pulse');
    void display.offsetWidth;
    display.classList.add('pulse');
  };

  const playNote =
    (voice: Voice, label: string): Press =>
    (target) => {
      const midi = Number(target.dataset.midi);
      const h = engine.noteOn(voice, midi);
      show(midi, label);
      return voice === 'piano' ? () => h.stop() : null;
    };

  // ---------- Keyboard ----------
  function buildKeyboard(): () => void {
    let start = clampStart(48, 15); // standaard rond C3–C5
    const wrap = el('div', 'kb-wrap');
    const nav = el('div', 'kb-nav');
    const down = el('button', 'icon-btn kb-oct');
    down.append(icon('back', 'var(--text)', 24));
    down.setAttribute('aria-label', 'Octaaf lager');
    const range = el('span', 'kb-range', '');
    const up = el('button', 'icon-btn kb-oct flip');
    up.append(icon('back', 'var(--text)', 24));
    up.setAttribute('aria-label', 'Octaaf hoger');
    nav.append(down, range, up);
    const kb = el('div', 'keyboard');
    wrap.append(nav, kb);
    surface.append(wrap);
    bindPlayable(kb, playNote('piano', 'keyboard'));

    const whiteCount = (): number => Math.max(8, Math.min(22, Math.floor(kb.clientWidth / 58) || 15));
    const render = (): void => {
      const count = whiteCount();
      start = clampStart(start, count);
      const whites = visibleWhites(start, count);
      kb.replaceChildren();
      const w = 100 / whites.length;
      whites.forEach((m, i) => {
        const key = el('div', 'key white');
        key.dataset.play = '';
        key.dataset.midi = String(m);
        key.style.left = `${i * w}%`;
        key.style.width = `${w}%`;
        const dot = el('span', 'key-dot');
        dot.style.background = COLOR_OF_PC[pitchClass(m)];
        const isC = pitchClass(m) === 0;
        key.append(dot, el('span', 'key-label', isC ? noteName(m, notation()) : noteName(m, notation(), false)));
        kb.append(key);
        const black = m + 1;
        if (!isWhite(black) && black <= KEYBOARD_MAX && i < whites.length - 1) {
          const bk = el('div', 'key black');
          bk.dataset.play = '';
          bk.dataset.midi = String(black);
          bk.style.left = `${(i + 1) * w - w * 0.3}%`;
          bk.style.width = `${w * 0.6}%`;
          kb.append(bk);
        }
      });
      range.textContent = `${noteName(whites[0], notation())} – ${noteName(whites[whites.length - 1], notation())}`;
      down.disabled = whites[0] <= KEYBOARD_MIN;
      up.disabled = whites[whites.length - 1] >= KEYBOARD_MAX;
      engine.prepare('piano', whites);
    };
    down.addEventListener('click', () => {
      start = clampStart(start - 12, whiteCount());
      render();
    });
    up.addEventListener('click', () => {
      start = clampStart(start + 12, whiteCount());
      render();
    });
    const onResize = (): void => render();
    window.addEventListener('resize', onResize);
    requestAnimationFrame(render);
    return () => window.removeEventListener('resize', onResize);
  }

  // ---------- Gitaar / bas ----------
  function buildNeck(voice: 'gitaar' | 'bas', open: number[]): () => void {
    const wrap = el('div', 'neck-wrap');
    const neck = el('div', `neck ${voice}`);
    neck.style.setProperty('--strings', String(open.length));
    // Fretnummers
    neck.append(el('span', 'fret-num corner', ''));
    for (let f = 0; f <= FRETS; f++) neck.append(el('span', 'fret-num', f === 0 ? 'los' : String(f)));
    open.forEach((base, s) => {
      neck.append(el('span', 'string-name', noteName(base, notation(), false)));
      for (let f = 0; f <= FRETS; f++) {
        const midi = base + f;
        const cell = el('div', f === 0 ? 'fret open' : 'fret');
        cell.dataset.play = '';
        cell.dataset.midi = String(midi);
        cell.dataset.string = String(s);
        cell.dataset.fret = String(f);
        cell.style.setProperty('--thick', String(voice === 'bas' ? 3 + s : 1 + s * 0.6));
        const tag = el('span', 'fret-note', noteName(midi, notation(), false));
        tag.style.color = COLOR_OF_PC[pitchClass(midi)];
        cell.append(tag);
        neck.append(cell);
      }
    });
    // Stipjes onder de hals, zoals op een echte gitaar
    neck.append(el('span', 'string-name', ''));
    for (let f = 0; f <= FRETS; f++) neck.append(el('span', FRET_DOTS.has(f) ? (f === 12 ? 'fret-dot double' : 'fret-dot') : 'fret-dot none', ''));
    wrap.append(neck);
    const tune = el('a', 'tool-link tune-link');
    tune.href = hashFor('stemmen');
    tune.dataset.screen = 'stemmen';
    tune.append(icon('tuner', 'var(--cyan)', 26), el('span', '', voice === 'gitaar' ? 'Gitaar stemmen' : 'Bas stemmen'));
    surface.append(tune, wrap, el('p', 'small play-hint', 'Bovenste lijn = dunste snaar, zoals in gitaartabs op internet. "los" = de snaar zonder vinger.'));
    bindPlayable(neck, playNote(voice, voice === 'gitaar' ? 'gitaar' : 'bas'));
    const common: number[] = [];
    for (const b of open) common.push(b, b + 2, b + 3, b + 5, b + 7);
    engine.prepare(voice, common);
    return () => undefined;
  }

  // ---------- Drum ----------
  function buildDrums(): () => void {
    const grid = el('div', 'drum-grid');
    const colors = ['#ff4fd8', '#3ff0ff', '#ffe45c', '#5dff9b', '#b46bff', '#6f8bff', '#ff9f4f', '#ff4fd8'];
    DRUM_PADS.forEach((p, i) => {
      const pad = el('div', 'drum-pad');
      pad.dataset.play = '';
      pad.dataset.pad = p.id;
      pad.style.setProperty('--pad', colors[i]);
      pad.append(el('span', '', p.label));
      grid.append(pad);
    });
    surface.append(grid);
    bindPlayable(grid, (target) => {
      const id = target.dataset.pad as DrumPad;
      engine.drum(id);
      big.textContent = DRUM_PADS.find((p) => p.id === id)?.label ?? '';
      big.style.color = getComputedStyle(target).getPropertyValue('--pad');
      sub.textContent = 'drum';
      return null;
    });
    return () => undefined;
  }

  function buildVoice(): () => void {
    return mountSinging(surface, (m) => show(m, 'zang'));
  }

  const select = (id: InstrumentId): void => {
    teardown?.();
    engine.stopAll();
    current = id;
    surface.replaceChildren();
    surface.dataset.instrument = id;
    big.textContent = '–';
    big.style.color = '';
    sub.textContent = id === 'drum' ? 'Tik op een pad' : 'Tik op een toets of snaar';
    for (const t of tabs.querySelectorAll<HTMLButtonElement>('.chip')) {
      const on = t.dataset.instrument === id;
      t.classList.toggle('on', on);
      t.setAttribute('aria-selected', String(on));
    }
    teardown =
      id === 'keyboard'
        ? buildKeyboard()
        : id === 'gitaar'
          ? buildNeck('gitaar', GUITAR_OPEN)
          : id === 'bas'
            ? buildNeck('bas', BASS_OPEN)
            : id === 'drum'
              ? buildDrums()
              : buildVoice();
  };

  for (const choice of INSTRUMENT_CHOICES) {
    const t = el('button', 'chip', choice.label);
    t.dataset.instrument = choice.id;
    t.setAttribute('role', 'tab');
    t.addEventListener('click', () => {
      void updateSettings({ instrument: choice.id });
      select(choice.id);
    });
    tabs.append(t);
  }
  select(current);

  return () => {
    teardown?.();
    engine.stopAll();
  };
}
