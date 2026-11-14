// Speelvlakken voor de lessen: keyboard, gitaar-/bashals, drumpads en zingen.
// Elk vlak kan tonen wat er gespeeld moet worden (oplichten) en een korte flits geven (goed, fout, voorspelen).

import { DRUM_PADS, type DrumPad } from '../audio/synth';
import { noteName, pitchClass } from '../dsp/notes';
import { settings } from '../app/state';
import { CHORDS, type ChordName } from '../lessons/content';
import type { Token } from '../lessons/run';
import { BASS_OPEN, GUITAR_OPEN, LETTER_COLORS } from './vrijspelen';
import { el } from '../ui/dom';

export const COLOR_OF_PC = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6].map((i) => LETTER_COLORS[i]);
export type FlashKind = 'ok' | 'wrong' | 'demo';

export interface Surface {
  el: HTMLElement;
  /** Licht op wat gespeeld moet worden (null = niets). `hint` = geel (na 2 foutjes). */
  target(token: Token | null, hint?: boolean): void;
  flash(token: Token, kind: FlashKind): void;
}

const isWhite = (m: number): boolean => [0, 2, 4, 5, 7, 9, 11].includes(pitchClass(m));
const chordOf = (t: Token): ChordName | null => (typeof t === 'string' && t.startsWith('chord:') ? (t.slice(6) as ChordName) : null);

function flashEl(k: HTMLElement | undefined, kind: FlashKind): void {
  if (!k) return;
  k.classList.remove('flash-ok', 'flash-wrong', 'flash-demo');
  void k.offsetWidth;
  k.classList.add(`flash-${kind}`);
}

/** Keyboard van `from` (een C) tot `to`, met letters en kleurstipjes. */
export function keyboardSurface(from: number, to: number, onTap: (midi: number) => void): Surface {
  const kb = el('div', 'keyboard lesson-kb');
  const whites: number[] = [];
  for (let m = from; m <= to; m++) if (isWhite(m)) whites.push(m);
  const w = 100 / whites.length;
  const keys = new Map<number, HTMLElement>();
  whites.forEach((m, i) => {
    const key = el('div', 'key white');
    key.dataset.midi = String(m);
    key.style.left = `${i * w}%`;
    key.style.width = `${w}%`;
    const dot = el('span', 'key-dot');
    dot.style.background = COLOR_OF_PC[pitchClass(m)];
    key.append(dot, el('span', 'key-label', noteName(m, settings().notation, pitchClass(m) === 0)));
    kb.append(key);
    keys.set(m, key);
    if (!isWhite(m + 1) && m + 1 <= to && i < whites.length - 1) {
      const bk = el('div', 'key black');
      bk.dataset.midi = String(m + 1);
      bk.style.left = `${(i + 1) * w - w * 0.3}%`;
      bk.style.width = `${w * 0.6}%`;
      kb.append(bk);
      keys.set(m + 1, bk);
    }
  });
  kb.addEventListener('pointerdown', (e) => {
    const t = e.target instanceof Element ? e.target.closest<HTMLElement>('.key') : null;
    if (!t) return;
    e.preventDefault();
    onTap(Number(t.dataset.midi));
  });
  /** Dezelfde toets, of anders dezelfde letter in het getoonde stuk (de octaaf telt niet mee). */
  const keyFor = (midi: number): HTMLElement | undefined => {
    if (keys.has(midi)) return keys.get(midi);
    const m = [...keys.keys()].find((k) => pitchClass(k) === pitchClass(midi));
    return m === undefined ? undefined : keys.get(m);
  };
  return {
    el: kb,
    target(token, hint = false) {
      for (const k of keys.values()) k.classList.remove('target', 'hint');
      if (token === null) return;
      const chord = chordOf(token);
      const notes = chord ? CHORDS[chord].keyboard : typeof token === 'number' ? [token] : [];
      for (const n of notes) keyFor(n)?.classList.add(hint ? 'hint' : 'target');
    },
    flash(token, kind) {
      if (typeof token === 'number') flashEl(keyFor(token), kind);
    },
  };
}

/** Gitaar- of bashals met losse snaar + frets 1–5. Dunste snaar bovenaan, zoals in tabs. */
export function neckSurface(voice: 'gitaar' | 'bas', onTap: (midi: number) => void): Surface {
  const open = voice === 'gitaar' ? GUITAR_OPEN : BASS_OPEN; // hoog → laag
  const FRETS = 5;
  const neck = el('div', `neck lesson-neck ${voice}`);
  neck.append(el('span', 'fret-num corner', ''));
  for (let f = 0; f <= FRETS; f++) neck.append(el('span', 'fret-num', f === 0 ? 'los' : String(f)));
  const cells = new Map<string, HTMLElement>();
  open.forEach((base, s) => {
    neck.append(el('span', 'string-name', noteName(base, settings().notation, false)));
    for (let f = 0; f <= FRETS; f++) {
      const cell = el('div', f === 0 ? 'fret open' : 'fret');
      cell.dataset.midi = String(base + f);
      cell.dataset.string = String(s);
      cell.dataset.fret = String(f);
      cell.style.setProperty('--thick', String(voice === 'bas' ? 3 + s : 1 + s * 0.6));
      const tag = el('span', 'fret-note', noteName(base + f, settings().notation, false));
      tag.style.color = COLOR_OF_PC[pitchClass(base + f)];
      cell.append(tag);
      neck.append(cell);
      cells.set(`${s}:${f}`, cell);
    }
  });
  neck.addEventListener('pointerdown', (e) => {
    const t = e.target instanceof Element ? e.target.closest<HTMLElement>('.fret') : null;
    if (!t) return;
    e.preventDefault();
    onTap(Number(t.dataset.midi));
  });
  /** Plaats met de laagste fret voor deze noot (exacte noot eerst, anders dezelfde letter). */
  const placeFor = (midi: number): HTMLElement | undefined => {
    let best: { s: number; f: number } | null = null;
    for (const exact of [true, false]) {
      open.forEach((base, s) => {
        for (let f = 0; f <= FRETS; f++) {
          const ok = exact ? base + f === midi : pitchClass(base + f) === pitchClass(midi);
          if (ok && (!best || f < best.f)) best = { s, f };
        }
      });
      if (best) break;
    }
    const b = best as { s: number; f: number } | null;
    return b ? cells.get(`${b.s}:${b.f}`) : undefined;
  };
  /** Akkoordgreep: de noten liggen op de dunste n snaren (van laag naar hoog). */
  const chordPlaces = (name: ChordName): HTMLElement[] => {
    const notes = CHORDS[name].gitaar;
    const lowToHigh = [...open].reverse();
    const out: HTMLElement[] = [];
    notes.forEach((n, i) => {
      const stringLow = lowToHigh.length - notes.length + i;
      const f = n - lowToHigh[stringLow];
      const s = open.length - 1 - stringLow;
      const c = cells.get(`${s}:${f}`);
      if (c) out.push(c);
    });
    return out;
  };
  return {
    el: neck,
    target(token, hint = false) {
      for (const c of cells.values()) c.classList.remove('target', 'hint');
      if (token === null) return;
      const chord = chordOf(token);
      const places = chord ? chordPlaces(chord) : typeof token === 'number' ? [placeFor(token)] : [];
      for (const p of places) p?.classList.add(hint ? 'hint' : 'target');
    },
    flash(token, kind) {
      if (typeof token === 'number') flashEl(placeFor(token), kind);
    },
  };
}

const PAD_COLORS = ['#ff4fd8', '#3ff0ff', '#ffe45c', '#5dff9b', '#b46bff', '#6f8bff', '#ff9f4f', '#ff4fd8'];

export function drumSurface(onTap: (pad: DrumPad) => void): Surface {
  const grid = el('div', 'drum-grid lesson-drums');
  const pads = new Map<string, HTMLElement>();
  DRUM_PADS.forEach((p, i) => {
    const pad = el('div', 'drum-pad');
    pad.dataset.pad = p.id;
    pad.style.setProperty('--pad', PAD_COLORS[i]);
    pad.append(el('span', '', p.label));
    grid.append(pad);
    pads.set(p.id, pad);
  });
  grid.addEventListener('pointerdown', (e) => {
    const t = e.target instanceof Element ? e.target.closest<HTMLElement>('.drum-pad') : null;
    if (!t) return;
    e.preventDefault();
    onTap(t.dataset.pad as DrumPad);
  });
  return {
    el: grid,
    target(token, hint = false) {
      for (const p of pads.values()) p.classList.remove('target', 'hint');
      if (typeof token === 'string') pads.get(token)?.classList.add(hint ? 'hint' : 'target');
    },
    flash(token, kind) {
      if (typeof token === 'string') flashEl(pads.get(token), kind);
    },
  };
}

/** Zingen: toont welke toon je zingt t.o.v. de gevraagde toon (hoger, lager, juist). */
export function singSurface(onListen: () => void): Surface & { live(midiFloat: number | null, want: number | null, holdPart: number): void } {
  const box = el('div', 'sing-box');
  const listen = el('button', 'pad wide sing-listen', 'Hoor de toon');
  listen.addEventListener('click', onListen);
  const now = el('div', 'sing-now', '');
  const meter = el('div', 'sing-hold');
  const fill = el('div', 'sing-hold-fill');
  meter.append(fill);
  box.append(listen, now, meter, el('p', 'small', 'Zing de toon en houd hem vast tot de balk vol is. Hoog of laag zingen mag allebei.'));
  return {
    el: box,
    target() {
      fill.style.width = '0%';
    },
    flash(_token, kind) {
      flashEl(meter, kind);
    },
    live(m, want, holdPart) {
      fill.style.width = `${Math.round(Math.min(1, holdPart) * 100)}%`;
      if (m === null || want === null) {
        now.textContent = m === null ? 'Ik hoor nog niets…' : '';
        now.className = 'sing-now';
        return;
      }
      // Afwijking tot de dichtstbijzijnde octaaf van de gevraagde toon (in halve tonen).
      let d = (m - want) % 12;
      if (d > 6) d -= 12;
      if (d < -6) d += 12;
      const word = Math.abs(d) < 0.5 ? 'Juist!' : d < 0 ? 'Iets hoger' : 'Iets lager';
      now.textContent = `${noteName(Math.round(m), settings().notation, false)} · ${word}`;
      now.className = `sing-now ${Math.abs(d) < 0.5 ? 'ok' : 'off'}`;
    },
  };
}
