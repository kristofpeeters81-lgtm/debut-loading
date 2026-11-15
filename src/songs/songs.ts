// Liedjes voor het spel met vallende noten (blok 9). Enkel publiek domein (traditioneel, Beethoven, 19e eeuw).
// Noten met ritme: `beat` = start in tellen (kwartnoten), `len` = lengte in tellen.
// Later komen hier ook geladen MIDI-liedjes (blok 10), naspeelstudio (blok 11) en eigen nummers (blok 12) bij.

import type { ChordName } from '../lessons/content';
import type { DrumPad } from '../audio/synth';

export interface SongNote {
  midi: number;
  beat: number;
  len: number;
  /** Enkel voor drum: welke pad (dan is `midi` 0). */
  pad?: DrumPad;
}

export interface Song {
  id: string;
  title: string;
  /** Tempo in tellen per minuut bij 100%. */
  bpm: number;
  beatsPerBar: number;
  notes: SongNote[];
  /** Begeleiding: één akkoord per maat (de app speelt de grondtoon op de bas + een drumritme). */
  chords?: ChordName[];
  /** Herkomst, voor de duidelijkheid. */
  source: string;
  /** Naspeelstudio: id van de mp3 die als begeleiding meespeelt (1 tel = 1 seconde in de mp3). */
  audio?: string;
  /** Lettergreep per noot (meelezen). */
  lyrics?: string[];
  /** Eigen nummer met partijen per instrument: de app speelt de andere partijen mee (bandmodus). */
  band?: boolean;
}

/** Maakt noten van [midi, lengte]-paren die na elkaar komen. Rust = midi 0. */
function seq(parts: [number, number][], startBeat = 0): SongNote[] {
  const out: SongNote[] = [];
  let beat = startBeat;
  for (const [midi, len] of parts) {
    if (midi > 0) out.push({ midi, beat, len });
    beat += len;
  }
  return out;
}

const G3 = 55;
const C = 60;
const D = 62;
const E = 64;
const F = 65;
const G = 67;
const A = 69;
const R = 0;

const twice = <T>(a: T[]): T[] => [...a, ...a];

export const SONGS: Song[] = [
  {
    id: 'kortjakje',
    title: 'Altijd is Kortjakje ziek',
    bpm: 100,
    beatsPerBar: 4,
    source: 'Traditioneel',
    chords: ['C', 'F', 'C', 'G', 'C', 'C', 'C', 'G', 'C', 'F', 'C', 'G'],
    notes: seq([
      [C, 1], [C, 1], [G, 1], [G, 1], [A, 1], [A, 1], [G, 2],
      [F, 1], [F, 1], [E, 1], [E, 1], [D, 1], [D, 1], [C, 2],
      [G, 1], [G, 1], [F, 1], [F, 1], [E, 1], [E, 1], [D, 2],
      [G, 1], [G, 1], [F, 1], [F, 1], [E, 1], [E, 1], [D, 2],
      [C, 1], [C, 1], [G, 1], [G, 1], [A, 1], [A, 1], [G, 2],
      [F, 1], [F, 1], [E, 1], [E, 1], [D, 1], [D, 1], [C, 2],
    ]),
  },
  {
    id: 'jacob',
    title: 'Vader Jacob',
    bpm: 100,
    beatsPerBar: 4,
    source: 'Traditioneel',
    chords: new Array<ChordName>(8).fill('C'),
    notes: seq([
      ...twice<[number, number]>([[C, 1], [D, 1], [E, 1], [C, 1]]),
      ...twice<[number, number]>([[E, 1], [F, 1], [G, 2]]),
      ...twice<[number, number]>([[G, 0.5], [A, 0.5], [G, 0.5], [F, 0.5], [E, 1], [C, 1]]),
      ...twice<[number, number]>([[C, 1], [G3, 1], [C, 2]]),
    ]),
  },
  {
    id: 'ode',
    title: 'Ode an die Freude',
    bpm: 100,
    beatsPerBar: 4,
    source: 'Ludwig van Beethoven (1824)',
    chords: ['C', 'G', 'C', 'G', 'C', 'G', 'C', 'C'],
    notes: seq([
      [E, 1], [E, 1], [F, 1], [G, 1], [G, 1], [F, 1], [E, 1], [D, 1],
      [C, 1], [C, 1], [D, 1], [E, 1], [E, 1.5], [D, 0.5], [D, 2],
      [E, 1], [E, 1], [F, 1], [G, 1], [G, 1], [F, 1], [E, 1], [D, 1],
      [C, 1], [C, 1], [D, 1], [E, 1], [D, 1.5], [C, 0.5], [C, 2],
    ]),
  },
  {
    id: 'mary',
    title: 'Mary had a little lamb',
    bpm: 100,
    beatsPerBar: 4,
    source: 'Traditioneel (1830)',
    chords: ['C', 'G', 'C', 'C', 'C', 'G', 'G', 'C'],
    notes: seq([
      [E, 1], [D, 1], [C, 1], [D, 1], [E, 1], [E, 1], [E, 2],
      [D, 1], [D, 1], [D, 2], [E, 1], [G, 1], [G, 2],
      [E, 1], [D, 1], [C, 1], [D, 1], [E, 1], [E, 1], [E, 1], [E, 1],
      [D, 1], [D, 1], [E, 1], [D, 1], [C, 4],
    ]),
  },
  {
    id: 'saints',
    title: 'When the Saints',
    bpm: 120,
    beatsPerBar: 4,
    source: 'Traditioneel',
    chords: ['C', 'C', 'C', 'C', 'C', 'G', 'G', 'G'],
    notes: seq([
      [R, 1], [C, 1], [E, 1], [F, 1], [G, 4],
      [R, 1], [C, 1], [E, 1], [F, 1], [G, 4],
      [R, 1], [C, 1], [E, 1], [F, 1], [G, 2], [E, 2],
      [C, 2], [E, 2], [D, 4],
    ]),
  },
  {
    id: 'jingle',
    title: 'Jingle Bells',
    bpm: 120,
    beatsPerBar: 4,
    source: 'James Lord Pierpont (1857)',
    chords: ['C', 'C', 'C', 'C', 'F', 'C', 'G', 'G'],
    notes: seq([
      [E, 1], [E, 1], [E, 2], [E, 1], [E, 1], [E, 2],
      [E, 1], [G, 1], [C, 1.5], [D, 0.5], [E, 4],
      [F, 1], [F, 1], [F, 1.5], [F, 0.5], [F, 1], [E, 1], [E, 1], [E, 0.5], [E, 0.5],
      [E, 1], [D, 1], [D, 1], [E, 1], [D, 2], [G, 2],
    ]),
  },
];

export function songById(id: string): Song | undefined {
  return SONGS.find((s) => s.id === id);
}

export function songLength(song: Song): number {
  return Math.max(...song.notes.map((n) => n.beat + n.len));
}

/** Sterren-id van een liedje in het profiel (naast de lessen). */
export const songStarId = (id: string): string => `song:${id}`;
