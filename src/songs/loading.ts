// "LOADING" — eerste eigen nummer van DEBUT LOADING… (blok 12). Eigen compositie, eigen tekst (goedgekeurd 2026-11-15).
// Stoer, krachtig, girlgroup-stijl. A-mineur, 112 tellen per minuut, akkoorden Am – F – C – G (zoals keyboardles "Droevig popschema").
// Opbouw (maten van 4 tellen): intro 4 · couplet 8 · aanloop 4 · refrein 8 · rap 8 · couplet 2 8 · drop 4 · refrein 8 · slot 2 = 54 maten.
// Per instrument een makkelijke en een moeilijkere partij; de app speelt mee wat niemand speelt (bandmodus).

import type { ChordName } from '../lessons/content';
import type { InstrumentId } from '../app/settings';
import type { DrumPad } from '../audio/synth';
import { CHORDS } from '../lessons/content';
import type { Song, SongNote } from './songs';

export const LOADING_ID = 'loading';
export const LOADING_BPM = 112;
export type PartLevel = 'makkelijk' | 'moeilijk';

/** Lettergreep + noot: [tekst, midi, tel (binnen de zin), lengte]. */
type Syl = [string, number, number, number];

interface Section {
  name: string;
  start: number; // tel
  bars: number;
  chords: ChordName[];
  lines: { at: number; syl: Syl[] }[];
}

const S = (name: string, start: number, bars: number, chords: ChordName[], lines: { at: number; syl: Syl[] }[] = []): Section => ({
  name,
  start,
  bars,
  chords,
  lines,
});

const AFGC: ChordName[] = ['Am', 'F', 'C', 'G'];

export const SECTIONS: Section[] = [
  S('Intro', 0, 4, AFGC),
  S('Couplet', 16, 8, [...AFGC, ...AFGC], [
    { at: 0, syl: [['Vier', 64, 0, 0.5], ['mei', 64, 0.5, 0.5], ['den.', 62, 1, 1], ['Eén', 60, 2.5, 0.5], ['ga', 62, 3, 0.5], ['ra', 64, 3.5, 0.5], ['ge.', 57, 4, 1.5]] },
    { at: 8, syl: [['Deur', 64, 0, 0.5], ['dicht.', 64, 0.5, 1], ['Mu', 62, 2, 0.5], ['ziek', 64, 2.5, 0.5], ['op', 67, 3, 0.5], ['max.', 64, 3.5, 1.5]] },
    { at: 16, syl: [['Ze', 60, 0, 0.5], ['zei', 60, 0.5, 0.5], ['den:', 62, 1, 0.5], ['"Jul', 64, 1.5, 0.5], ['lie?', 67, 2, 1], ['Echt', 69, 3.5, 0.5], ['niet,', 67, 4, 0.5], ['joh."', 64, 4.5, 1.5]] },
    { at: 24, syl: [['Wij', 64, 0, 0.5], ['zei', 62, 0.5, 0.5], ['den', 60, 1, 0.5], ['niks.', 57, 1.5, 1], ['Wij', 60, 3, 0.5], ['gin', 62, 3.5, 0.5], ['gen', 64, 4, 0.5], ['door.', 57, 4.5, 2.5]] },
  ]),
  S('Aanloop', 48, 4, ['F', 'G', 'Am', 'G'], [
    { at: 0, syl: [['Tik,', 69, 0, 0.5], ['tak,', 69, 0.5, 0.5], ['de', 67, 1, 0.5], ['klok', 69, 1.5, 0.5], ['loopt', 71, 2, 0.5], ['af,', 72, 2.5, 1.5]] },
    { at: 4, syl: [['el', 69, 0, 0.5], ['ke', 69, 0.5, 0.5], ['dag', 71, 1, 0.5], ['een', 72, 1.5, 0.5], ['beet', 74, 2, 0.5], ['je', 72, 2.5, 0.5], ['ster', 74, 3, 0.5], ['ker.', 76, 3.5, 1.5]] },
    { at: 10, syl: [['Lights', 76, 0, 0.5], ['off…', 76, 0.5, 1], ['heart', 74, 2, 0.5], ['beat…', 72, 2.5, 1], ['now.', 76, 4, 2]] },
  ]),
  S('Refrein', 64, 8, [...AFGC, ...AFGC], CHORUS_LINES()),
  S('Rap', 96, 8, [...AFGC, ...AFGC], [
    { at: 0, syl: [['Yeah —', 69, 0, 0.5], ['klein', 64, 0.5, 0.5], ['maar', 64, 1, 0.5], ['fierce,', 67, 1.5, 1], ['kijk', 64, 2.5, 0.5], ['maar', 64, 3, 0.5], ['goed,', 69, 3.5, 0.5]] },
    { at: 4, syl: [['el', 64, 0, 0.5], ['ke', 64, 0.5, 0.5], ['beat', 67, 1, 0.5], ['zegt', 64, 1.5, 0.5], ['wat', 64, 2, 0.5], ['ik', 62, 2.5, 0.5], ['doe.', 64, 3, 1]] },
    { at: 8, syl: [['Main', 69, 0, 0.5], ['cha', 67, 0.5, 0.5], ['rac', 64, 1, 0.5], ['ter,', 64, 1.5, 0.5], ['I', 67, 2, 0.5], ['don’t', 67, 2.5, 0.5], ['fake,', 69, 3, 1]] },
    { at: 12, syl: [['één,', 64, 0, 0.5], ['twee,', 64, 0.5, 0.5], ['drie —', 64, 1, 0.5], ['make', 67, 1.5, 0.5], ['no', 67, 2, 0.5], ['mis', 69, 2.5, 0.5], ['take.', 64, 3, 1]] },
    { at: 16, syl: [['Zij', 64, 0, 0.5], ['twij', 64, 0.5, 0.5], ['fel', 62, 1, 0.5], ['den,', 64, 1.5, 0.5], ['wij', 67, 2, 0.5], ['gin', 67, 2.5, 0.5], ['gen', 69, 3, 0.5], ['door,', 64, 3.5, 1.5]] },
    { at: 22, syl: [['hey!', 76, 0, 1]] },
    { at: 24, syl: [['nu', 64, 0, 0.5], ['roept', 67, 0.5, 0.5], ['de', 67, 1, 0.5], ['he', 69, 1.5, 0.5], ['le', 69, 2, 0.5], ['zaal', 72, 2.5, 0.5], ['in', 69, 3, 0.5], ['koor!', 76, 3.5, 3]] },
  ]),
  S('Couplet 2', 128, 8, [...AFGC, ...AFGC], [
    { at: 0, syl: [['Het', 60, 0, 0.5], ['doek', 64, 0.5, 0.5], ['gaat', 64, 1, 0.5], ['o', 62, 1.5, 0.5], ['pen.', 60, 2, 1], ['De', 60, 4, 0.5], ['zaal', 62, 4.5, 0.5], ['is', 64, 5, 0.5], ['stil.', 57, 5.5, 2]] },
    { at: 8, syl: [['Ie', 64, 0, 0.5], ['der', 64, 0.5, 0.5], ['een', 64, 1, 0.5], ['kijkt.', 67, 1.5, 1], ['Ik', 64, 4, 0.5], ['weet', 67, 4.5, 0.5], ['wat', 69, 5, 0.5], ['ik', 67, 5.5, 0.5], ['wil.', 64, 6, 1.5]] },
    { at: 16, syl: [['Mijn', 60, 0, 0.5], ['squad', 64, 0.5, 1], ['naast', 62, 1.5, 0.5], ['mij,', 60, 2, 1], ['één', 64, 4, 0.5], ['blik', 67, 4.5, 0.5], ['ge', 69, 5, 0.5], ['noeg:', 67, 5.5, 1.5]] },
    { at: 24, syl: [['dit', 64, 0, 0.5], ['is', 64, 0.5, 0.5], ['het', 62, 1, 0.5], ['mo', 64, 1.5, 0.5], ['ment', 67, 2, 1], ['waar', 69, 3, 0.5], ['ik', 67, 3.5, 0.5], ['om', 64, 4, 0.5], ['vroeg.', 69, 4.5, 3]] },
  ]),
  S('Drop', 160, 4, ['Am', 'Am', 'F', 'G'], [
    { at: 0, syl: [['Load', 81, 0, 0.5], ['ing…', 76, 0.5, 1], ['com', 79, 2, 0.5], ['plete.', 81, 2.5, 1], ['(hey!)', 76, 4, 1]] },
    { at: 8, syl: [['Load', 81, 0, 0.5], ['ing…', 76, 0.5, 1], ['com', 79, 2, 0.5], ['plete.', 81, 2.5, 1], ['Let’s', 76, 4, 0.5], ['go!', 81, 4.5, 2.5]] },
  ]),
  S('Refrein', 176, 8, [...AFGC, ...AFGC], CHORUS_LINES()),
  S('Slot', 208, 2, ['Am', 'Am']),
];

/** Het refrein (zelfde als in het voorproefje). */
function CHORUS_LINES(): { at: number; syl: Syl[] }[] {
  return [
    { at: 0, syl: [['We', 76, 0, 0.5], ['don’t', 76, 0.5, 0.5], ['wait,', 74, 1, 1], ['we', 72, 2.5, 0.5], ['don’t', 72, 3, 0.5], ['ask,', 69, 3.5, 0.5]] },
    { at: 4, syl: [['load', 72, 0, 0.5], ['ing', 74, 0.5, 0.5], ['up,', 76, 1, 1.5], ['com', 74, 2.5, 0.5], ['ing in', 72, 3, 0.5], ['fast.', 69, 3.5, 0.5]] },
    { at: 8, syl: [['Hands', 76, 0, 0.5], ['up,', 76, 0.5, 0.5], ['squad', 79, 1, 0.5], ['up,', 79, 1.5, 0.5], ['no', 76, 2, 0.5], ['cap —', 74, 2.5, 1]] },
    { at: 12, syl: [['we', 72, 0, 0.5], ['run', 74, 0.5, 0.5], ['this,', 76, 1, 1], ['we', 72, 2, 0.5], ['run', 74, 2.5, 0.5], ['that!', 71, 3, 1]] },
    { at: 16, syl: [['L', 69, 0, 0.5], ['O', 72, 0.5, 0.5], ['A', 76, 1, 0.5], ['D…', 81, 1.5, 1.5]] },
    { at: 20, syl: [['we’re', 76, 0, 0.5], ['load', 74, 0.5, 0.5], ['ing up,', 76, 1, 2]] },
    { at: 24, syl: [['hey!', 79, 0, 1], ['and', 76, 1.5, 0.5], ['we', 74, 2, 0.5], ['nev', 72, 2.5, 0.5], ['er', 74, 3, 1], ['stop.', 71, 4, 0.5], ['yeah', 69, 5, 3]] },
  ];
}

// ---------- Afgeleide partijen ----------

export const TOTAL_BARS = SECTIONS.reduce((n, s) => n + s.bars, 0);
export const TOTAL_BEATS = TOTAL_BARS * 4;

/** Akkoord per maat over het hele nummer. */
export const LOADING_CHORDS: ChordName[] = SECTIONS.flatMap((s) => s.chords);

/** De zangmelodie met lettergrepen (ook de melodie voor keyboard en lead-gitaar). */
export const MELODY: { note: SongNote; syl: string; section: string }[] = SECTIONS.flatMap((s) =>
  s.lines.flatMap((l) => l.syl.map(([syl, midi, b, len]) => ({ note: { midi, beat: s.start + l.at + b, len }, syl, section: s.name }))),
);

const rootOf = (c: ChordName, octaveBase: number): number => octaveBase + ((CHORDS[c].root - (octaveBase % 12) + 12) % 12);
const bars = (fn: (bar: number, chord: ChordName) => SongNote[]): SongNote[] => LOADING_CHORDS.flatMap((c, bar) => fn(bar, c));
const isSection = (bar: number, ...names: string[]): boolean => {
  let start = 0;
  for (const s of SECTIONS) {
    if (bar >= start && bar < start + s.bars) return names.includes(s.name);
    start += s.bars;
  }
  return false;
};
const sectionStartBar = (name: string): number => {
  let start = 0;
  for (const s of SECTIONS) {
    if (s.name === name) return start;
    start += s.bars;
  }
  return -1;
};

const melodyOnly = (filter?: (section: string) => boolean): SongNote[] => MELODY.filter((m) => !filter || filter(m.section)).map((m) => m.note);
const drums = (pads: [DrumPad, number][], bar: number): SongNote[] => pads.map(([pad, b]) => ({ midi: 0, pad, beat: bar * 4 + b, len: 0.5 }));

export const PARTS: Record<InstrumentId, Record<PartLevel, SongNote[]>> = {
  keyboard: {
    makkelijk: melodyOnly(),
    // Moeilijk: melodie + met de linkerhand de grondtoon (A3, F3, C3, G3) op tel 1 van elke maat.
    moeilijk: [...melodyOnly(), ...bars((bar, c) => (isSection(bar, 'Slot') ? [] : [{ midi: rootOf(c, 48), beat: bar * 4, len: 1 }]))].sort(
      (a, b) => a.beat - b.beat || a.midi - b.midi,
    ),
  },
  gitaar: {
    // Makkelijk: grondtoon op tel 1 en 3 (losse snaren of fret 1–3).
    makkelijk: bars((bar, c) => [0, 2].map((b) => ({ midi: rootOf(c, 45), beat: bar * 4 + b, len: 2 }))),
    // Moeilijk: de melodie van refrein en drop (lead, een octaaf lager zodat ze binnen fret 12 blijft), daarbuiten de grondtoon.
    moeilijk: [
      ...melodyOnly((s) => s === 'Refrein' || s === 'Drop').map((nt) => ({ ...nt, midi: nt.midi - 12 })),
      ...bars((bar, c) => (isSection(bar, 'Refrein', 'Drop') ? [] : [{ midi: rootOf(c, 45), beat: bar * 4, len: 4 }])),
    ].sort((a, b) => a.beat - b.beat),
  },
  bas: {
    makkelijk: bars((bar, c) => [{ midi: rootOf(c, 33), beat: bar * 4, len: 4 }]),
    moeilijk: bars((bar, c) => [0, 1, 2, 3].map((b) => ({ midi: rootOf(c, 33), beat: bar * 4 + b, len: 1 }))),
  },
  drum: {
    makkelijk: bars((bar) => drums([['kick', 0], ['snare', 1], ['kick', 2], ['snare', 3]], bar)),
    // Moeilijk: basdrum – hi-hat – snare – hi-hat met extra basdrum, crash bij elk nieuw deel, fill vóór het refrein.
    moeilijk: bars((bar) => {
      if (SECTIONS.some((s) => sectionStartBar(s.name) === bar + 1 && (s.name === 'Refrein' || s.name === 'Drop'))) {
        return drums([['snare', 0], ['snare', 1], ['tom-hoog', 2], ['tom-laag', 3]], bar);
      }
      const crash = SECTIONS.some((s) => sectionStartBar(s.name) === bar) && bar > 0;
      return drums([[crash ? 'crash' : 'kick', 0], ['hihat', 1], ['snare', 1.5], ['kick', 2.5], ['snare', 3]] as [DrumPad, number][], bar);
    }),
  },
  zang: {
    makkelijk: melodyOnly((s) => s === 'Refrein' || s === 'Drop'),
    moeilijk: melodyOnly(),
  },
};

/** Lettergrepen bij een partij (enkel waar de partij de melodie is). */
function lyricsFor(notes: SongNote[]): string[] | undefined {
  const byBeat = new Map(MELODY.map((m) => [`${m.note.beat}:${m.note.midi}`, m.syl]));
  const out = notes.map((nt) => byBeat.get(`${nt.beat}:${nt.midi}`) ?? '');
  return out.some((x) => x) ? out : undefined;
}

/** Het nummer als Song voor één instrument en niveau (voor het spel met vallende noten). */
export function loadingSong(inst: InstrumentId, level: PartLevel): Song {
  const notes = PARTS[inst][level];
  return {
    id: LOADING_ID,
    title: 'LOADING',
    bpm: LOADING_BPM,
    beatsPerBar: 4,
    notes,
    chords: LOADING_CHORDS,
    source: 'Eigen nummer van DEBUT LOADING…',
    lyrics: lyricsFor(notes),
    band: true,
  };
}

/** Wat de app speelt voor instrumenten die niemand speelt (altijd de volle, moeilijke partij; zang = melodie op piano). */
export function backingParts(skip: InstrumentId[]): { inst: InstrumentId; notes: SongNote[] }[] {
  const all: InstrumentId[] = ['keyboard', 'gitaar', 'bas', 'drum'];
  const melodyPlayed = skip.includes('keyboard') || skip.includes('zang');
  return all
    .filter((i) => !skip.includes(i))
    .map((inst) => ({
      inst,
      // Keyboard-begeleiding = de melodie (zodat je het nummer herkent), behalve als iemand zingt of keyboard speelt.
      notes: inst === 'keyboard' ? (melodyPlayed ? [] : melodyOnly()) : inst === 'gitaar' ? PARTS.gitaar.makkelijk : PARTS[inst].moeilijk,
    }))
    .filter((p) => p.notes.length > 0);
}
