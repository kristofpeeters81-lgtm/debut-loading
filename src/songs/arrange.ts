// Een liedje klaarzetten voor een instrument (vallende noten voor alle instrumenten).
// - Keyboard: zoals het is (al binnen het bereik van de Casio).
// - Gitaar/bas: in het bereik van het instrument (per octaaf), elke noot krijgt een snaar + fret (zo laag mogelijk).
// - Zang: naar het zangbereik van het profiel (als dat gemeten is), anders rond C4–C5.
// - Drum: de app maakt een eenvoudige beat op het ritme van het liedje (basdrum, snare, hi-hat, crash).
// Pure functies, goed te testen.

import type { InstrumentId } from '../app/settings';
import type { DrumPad } from '../audio/synth';
import type { Song, SongNote } from './songs';

export const GUITAR_STRINGS = [40, 45, 50, 55, 59, 64]; // laag → hoog
export const BASS_STRINGS = [28, 33, 38, 43];
export const MAX_FRET = 12;

export interface Placed {
  string: number; // index in de lijst laag → hoog
  fret: number;
}

/** Plek op de hals met de laagste fret (bij gelijke fret: de dunnere snaar). */
export function placeOnNeck(midi: number, strings: number[], maxFret = MAX_FRET): Placed | null {
  let best: Placed | null = null;
  strings.forEach((open, s) => {
    const fret = midi - open;
    if (fret < 0 || fret > maxFret) return;
    if (!best || fret < best.fret || (fret === best.fret && s > best.string)) best = { string: s, fret };
  });
  return best;
}

/** Schuif het liedje per octaaf zodat de mediaan rond `center` ligt, en elke noot binnen [low, high]. */
function fitRange(notes: SongNote[], center: number, low: number, high: number): SongNote[] {
  const pitches = notes.map((n) => n.midi).sort((a, b) => a - b);
  const median = pitches[Math.floor(pitches.length / 2)] ?? center;
  const shift = Math.round((center - median) / 12) * 12;
  return notes.map((n) => {
    let m = n.midi + shift;
    while (m < low) m += 12;
    while (m > high) m -= 12;
    return { ...n, midi: m };
  });
}

/** Eenvoudige beat (zoals drumles 3): crash op het begin, dan basdrum – hi-hat – snare – hi-hat per maat van 4. */
export function drumPart(song: Song): SongNote[] {
  const end = Math.max(...song.notes.map((n) => n.beat + n.len));
  const bar = song.beatsPerBar;
  const out: SongNote[] = [];
  for (let b = 0; b < Math.ceil(end); b++) {
    const inBar = b % bar;
    const pad: DrumPad = b === 0 ? 'crash' : inBar === 0 ? 'kick' : inBar === Math.floor(bar / 2) ? 'snare' : 'hihat';
    out.push({ midi: 0, beat: b, len: 1, pad });
  }
  return out;
}

export function arrangeFor(song: Song, inst: InstrumentId, voiceRange?: { low: number; high: number } | null): Song {
  switch (inst) {
    case 'gitaar':
      // Rond de B- en hoge E-snaar (E4), binnen E2–E5.
      return { ...song, notes: fitRange(song.notes, 64, 40, 64 + MAX_FRET) };
    case 'bas':
      // Twee octaven lager dan het keyboard, binnen E1–G3.
      return { ...song, notes: fitRange(song.notes, 40, 28, 43 + MAX_FRET) };
    case 'zang': {
      const low = voiceRange?.low ?? 57;
      const high = voiceRange?.high ?? 76;
      return { ...song, notes: fitRange(song.notes, Math.round((low + high) / 2), low, Math.max(high, low + 11)) };
    }
    case 'drum':
      return { ...song, notes: drumPart(song) };
    default:
      return song;
  }
}

/** Sterren-id per liedje en instrument (keyboard behoudt de oude id). */
export function songStarKey(id: string, inst: InstrumentId): string {
  return inst === 'keyboard' ? `song:${id}` : `song:${id}:${inst}`;
}
