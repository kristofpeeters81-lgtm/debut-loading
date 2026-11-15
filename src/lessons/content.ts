// Lesinhoud (blok 8 + uitbreiding). Spelenderwijs, weinig tekst. Liedjes enkel uit het publiek domein.
// Noten als MIDI-nummers (60 = C4, middelste do). Bij noten telt enkel de letter (de octaaf niet, beslissing blok 1).

import type { InstrumentId } from '../app/settings';
import type { DrumPad } from '../audio/synth';

export type ChordName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'Am' | 'Em' | 'Dm' | 'Bm';

export type Step =
  /** Eén toets/noot tegelijk; speel die letter. */
  | { kind: 'find'; notes: number[] }
  /** De app speelt een stukje voor, jij speelt het na. */
  | { kind: 'echo'; phrases: number[][] }
  /** Een liedje noot per noot; de app wacht op jou. Lettergrepen (optioneel) per noot. */
  | { kind: 'song'; notes: number[]; lyrics?: string[] }
  /** Akkoorden: mild gecontroleerd, met altijd een knop "Verder" (beslissing blok 1). */
  | { kind: 'chord'; chords: ChordName[] }
  /** Drum: de app speelt een ritme voor, jij tikt het na. */
  | { kind: 'rhythm'; patterns: DrumPad[][]; bpm: number }
  /** Zang: zing de toon en houd hem even vast (de octaaf maakt niet uit). */
  | { kind: 'sing'; notes: number[]; holdMs?: number; lyrics?: string[] };

export interface Lesson {
  id: string;
  title: string;
  /** Wat je leert, in een paar woorden. */
  goal: string;
  instrument: InstrumentId;
  steps: Step[];
  /** Niveau: 1 Start, 2 Basis, 3 Stevig, 4 Uitdaging (standaard 1). */
  level?: number;
  /** Zwarte toetsen als mol tonen (Bb, Eb) in plaats van kruis (A#, D#). */
  flats?: boolean;
}

export const LEVEL_NAMES: Record<number, string> = { 1: 'Start', 2: 'Basis', 3: 'Stevig', 4: 'Uitdaging' };

/** Akkoorden: grondtoon (0 = C), mineur, en de noten per instrument (voor voorspelen en tikken). */
export const CHORDS: Record<ChordName, { root: number; minor: boolean; keyboard: number[]; gitaar: number[] }> = {
  C: { root: 0, minor: false, keyboard: [60, 64, 67], gitaar: [48, 52, 55, 60, 64] },
  F: { root: 5, minor: false, keyboard: [65, 69, 72], gitaar: [53, 57, 60, 65] },
  G: { root: 7, minor: false, keyboard: [67, 71, 74], gitaar: [43, 47, 50, 55, 59, 67] },
  Am: { root: 9, minor: true, keyboard: [57, 60, 64], gitaar: [45, 52, 57, 60, 64] },
  Em: { root: 4, minor: true, keyboard: [64, 67, 71], gitaar: [40, 47, 52, 55, 59, 64] },
  Dm: { root: 2, minor: true, keyboard: [62, 65, 69], gitaar: [50, 57, 62, 65] },
  D: { root: 2, minor: false, keyboard: [62, 66, 69], gitaar: [50, 57, 62, 66] },
  A: { root: 9, minor: false, keyboard: [57, 61, 64], gitaar: [45, 52, 57, 61, 64] },
  E: { root: 4, minor: false, keyboard: [64, 68, 71], gitaar: [40, 47, 52, 56, 59, 64] },
  // Kleine Bm-greep op de drie dunste snaren (zonder barré).
  Bm: { root: 11, minor: true, keyboard: [59, 62, 66], gitaar: [59, 62, 66] },
};

// Noten
const C3 = 48;
const F3 = 53;
const G3 = 55;
const B3 = 59;
const C = 60;
const D = 62;
const E = 64;
const F = 65;
const Fs = 66;
const G = 67;
const A = 69;
const Bb = 70;
const B = 71;
const C5 = 72;
const D5 = 74;
// Gitaar (losse snaren)
const gE2 = 40;
const gA2 = 45;
const gD3 = 50;
// Bas
const E1 = 28;
const F1 = 29;
const G1 = 31;
const A1 = 33;
const C2 = 36;
const D2 = 38;
const E2 = 40;
const F2 = 41;
const G2 = 43;

const JACOB = [C, D, E, C, C, D, E, C, E, F, G, E, F, G];
const JACOB_TEXT = ['Va', 'der', 'Ja', 'cob', 'va', 'der', 'Ja', 'cob', 'slaapt', 'gij', 'nog', 'slaapt', 'gij', 'nog'];

// ---------- Tweede reeks (stevige basis, 2026-11-15) ----------
const A3 = 57;
const Cs = 61;
const Eb = 63;
const Gs = 68;
const As = 70;
const Cs5 = 73;
const Eb5 = 75;
const B1 = 35;
const A2 = 45;
const C3s = C3; // linkerhand
const G3s = G3;

/** Happy Birthday (publiek domein sinds 2016/2017), in C. */
const BIRTHDAY = [G3, G3, A3, G3, C, B3, G3, G3, A3, G3, D, C, G3, G3, G, E, C, B3, A3, F, F, E, C, D, C];
/** London Bridge is falling down (traditioneel), in C. */
const LONDON = [G, A, G, F, E, F, G, D, E, F, E, F, G, G, A, G, F, E, F, G, D, G, E, C];
/** Altijd is Kortjakje ziek (traditioneel). */
const KORTJAKJE = [C, C, G, G, A, A, G, F, F, E, E, D, D, C];
const KORTJAKJE_TEXT = ['Al', 'tijd', 'is', 'Kort', 'ja', 'kje', 'ziek', 'mid', 'den', 'in', 'de', 'week', 'maar', '’s zondags niet'];

const BASIS_2: Lesson[] = [
  // Keyboard 18–28
  {
    id: 'kb-18-octaven',
    title: 'Octaven',
    goal: 'Dezelfde letter, hoog en laag',
    instrument: 'keyboard',
    steps: [
      { kind: 'find', notes: [C3, C, C5, G3, G] },
      { kind: 'echo', phrases: [[C3, C, C5], [C5, C, C3], [G3, G, G3]] },
    ],
  },
  {
    id: 'kb-19-g-ladder',
    title: 'De G-toonladder',
    goal: 'Een toonladder met F#',
    instrument: 'keyboard',
    steps: [
      { kind: 'find', notes: [G, Fs, G] },
      { kind: 'song', notes: [G3, A3, B3, C, D, E, Fs, G, G, Fs, E, D, C, B3, A3, G3] },
    ],
  },
  {
    id: 'kb-20-cis-es',
    title: 'Zwarte toetsen: C# en D#',
    goal: 'Nog twee zwarte toetsen',
    instrument: 'keyboard',
    steps: [
      { kind: 'find', notes: [Cs, Eb, Cs, Eb] },
      { kind: 'echo', phrases: [[C, Cs, D], [D, Eb, E], [Eb, D, Cs, C]] },
    ],
  },
  {
    id: 'kb-21-zwart',
    title: 'Enkel zwarte toetsen',
    goal: 'Een melodie met vijf zwarte toetsen',
    instrument: 'keyboard',
    steps: [
      { kind: 'find', notes: [Fs, Gs, As, Cs5, Eb5] },
      { kind: 'echo', phrases: [[Fs, Gs, As], [As, Gs, Fs], [Cs5, As, Gs, Fs], [Fs, As, Cs5, Eb5]] },
    ],
  },
  {
    id: 'kb-22-links-kortjakje',
    title: 'Linkerhand bij Kortjakje',
    goal: 'Links C en G, rechts de melodie',
    instrument: 'keyboard',
    steps: [
      {
        kind: 'song',
        notes: [C3s, C, C, G, G, A, A, G, G3s, F, F, E, E, D, D, C3s, C],
      },
    ],
  },
  {
    id: 'kb-23-dm-em',
    title: 'Akkoorden Dm en Em',
    goal: 'Twee nieuwe mineurakkoorden',
    instrument: 'keyboard',
    steps: [{ kind: 'chord', chords: ['Dm', 'Em', 'Dm', 'Em', 'C', 'Dm', 'Em', 'F'] }],
  },
  {
    id: 'kb-24-twinkle-akkoorden',
    title: 'Akkoorden onder Kortjakje',
    goal: 'Begeleid een liedje',
    instrument: 'keyboard',
    steps: [{ kind: 'chord', chords: ['C', 'F', 'C', 'G', 'C', 'F', 'C', 'G', 'C'] }],
  },
  {
    id: 'kb-25-birthday',
    title: 'Happy Birthday',
    goal: 'Voor de volgende verjaardag',
    instrument: 'keyboard',
    steps: [{ kind: 'song', notes: BIRTHDAY }],
  },
  {
    id: 'kb-26-london',
    title: 'London Bridge',
    goal: 'Een Engels kinderliedje',
    instrument: 'keyboard',
    steps: [{ kind: 'song', notes: LONDON }],
  },
  {
    id: 'kb-27-sprongen',
    title: 'Sprongen',
    goal: 'Van C naar G zonder tussenstapjes',
    instrument: 'keyboard',
    steps: [{ kind: 'echo', phrases: [[C, G, C], [C, E, G, C5], [C5, G, E, C], [D, A, D], [E, B, E]] }],
  },
  {
    id: 'kb-28-finale',
    title: 'Grote finale: twee handen + akkoorden',
    goal: 'Alles samen',
    instrument: 'keyboard',
    steps: [
      { kind: 'song', notes: [C3s, E, E, F, G, G3s, G, F, E, D, C3s, C, C, D, E, G3s, E, D, D] },
      { kind: 'chord', chords: ['C', 'G', 'C'] },
    ],
  },

  // Gitaar 8–15
  {
    id: 'g-8-g-snaar',
    title: 'Noten op de G-snaar',
    goal: 'A en B',
    instrument: 'gitaar',
    steps: [
      { kind: 'find', notes: [G3, A3, B3, A3] },
      { kind: 'echo', phrases: [[G3, A3, B3], [B3, A3, G3], [G3, B3, C, B3]] },
    ],
  },
  {
    id: 'g-9-d-snaar',
    title: 'Noten op de D-snaar',
    goal: 'E en F',
    instrument: 'gitaar',
    steps: [
      { kind: 'find', notes: [50, 52, 53, 52] },
      { kind: 'echo', phrases: [[50, 52, 53], [53, 52, 50], [50, 53, G3, A3]] },
    ],
  },
  {
    id: 'g-10-kortjakje',
    title: 'Kortjakje op gitaar',
    goal: 'Een heel liedje op de hoge snaren',
    instrument: 'gitaar',
    steps: [{ kind: 'song', notes: KORTJAKJE, lyrics: KORTJAKJE_TEXT }],
  },
  {
    id: 'g-11-london',
    title: 'London Bridge op gitaar',
    goal: 'Tot fret 5',
    instrument: 'gitaar',
    steps: [{ kind: 'song', notes: LONDON }],
  },
  { id: 'g-12-c', title: 'Akkoord C', goal: 'Drie vingers', instrument: 'gitaar', steps: [{ kind: 'chord', chords: ['C', 'C', 'Am', 'C'] }] },
  { id: 'g-13-g', title: 'Akkoord G', goal: 'Een groot, vol akkoord', instrument: 'gitaar', steps: [{ kind: 'chord', chords: ['G', 'G', 'Em', 'G'] }] },
  {
    id: 'g-14-popschema',
    title: 'Het popschema op gitaar',
    goal: 'C, G, Am, Em',
    instrument: 'gitaar',
    steps: [{ kind: 'chord', chords: ['C', 'G', 'Am', 'Em', 'C', 'G', 'Am', 'Em'] }],
  },
  { id: 'g-15-dm', title: 'Akkoord Dm', goal: 'Mineur op vier snaren', instrument: 'gitaar', steps: [{ kind: 'chord', chords: ['Dm', 'Am', 'Dm', 'Am', 'Em', 'Am'] }] },

  // Bas 7–13
  {
    id: 'b-7-octaven',
    title: 'Octaven op de bas',
    goal: 'Twee keer dezelfde letter',
    instrument: 'bas',
    steps: [
      { kind: 'find', notes: [E1, E2, A1, A2] },
      { kind: 'echo', phrases: [[E1, E2, E1], [A1, A2, A1], [E1, E2, A1, A2]] },
    ],
  },
  {
    id: 'b-8-kwint',
    title: 'Grondtoon en kwint',
    goal: 'C en G: de bas zijn beste vrienden',
    instrument: 'bas',
    steps: [{ kind: 'echo', phrases: [[C2, G2, C2, G2], [A1, E2, A1, E2], [G1, D2, G1, D2]] }],
  },
  {
    id: 'b-9-popschema',
    title: 'Baslijn van het popschema',
    goal: 'C, G, A, F',
    instrument: 'bas',
    steps: [{ kind: 'song', notes: [C2, C2, G1, G1, A1, A1, F1, F1, C2, C2, G1, G1, A1, A1, F1, F1] }],
  },
  {
    id: 'b-10-ode',
    title: 'Ode an die Freude op bas',
    goal: 'Beethoven op de bas',
    instrument: 'bas',
    steps: [{ kind: 'song', notes: [E2, E2, F2, G2, G2, F2, E2, D2, C2, C2, D2, E2, E2, D2, D2] }],
  },
  {
    id: 'b-11-kortjakje',
    title: 'Kortjakje op bas',
    goal: 'Met de A op de G-snaar',
    instrument: 'bas',
    steps: [{ kind: 'song', notes: [C2, C2, G2, G2, A2, A2, G2, F2, F2, E2, E2, D2, D2, C2], lyrics: KORTJAKJE_TEXT }],
  },
  {
    id: 'b-12-g',
    title: 'Wandelen in G',
    goal: 'Met de B erbij',
    instrument: 'bas',
    steps: [
      { kind: 'find', notes: [B1, G1, B1] },
      { kind: 'echo', phrases: [[G1, A1, B1, C2, D2], [D2, C2, B1, A1, G1], [G1, B1, D2, B1]] },
    ],
  },
  {
    id: 'b-13-rock',
    title: 'Rockbas',
    goal: 'Veel dezelfde noot, stoer en strak',
    instrument: 'bas',
    steps: [{ kind: 'echo', phrases: [[E1, E1, E1, E1, G1, G1, A1, A1], [A1, A1, A1, A1, C2, C2, D2, D2]] }],
  },

  // Drum 7–13
  {
    id: 'd-7-open',
    title: 'Open hi-hat',
    goal: 'Tsss!',
    instrument: 'drum',
    steps: [{ kind: 'rhythm', bpm: 90, patterns: [['hihat', 'hihat', 'hihat', 'open-hihat'], ['kick', 'hihat', 'snare', 'open-hihat']] }],
  },
  {
    id: 'd-8-dubbel',
    title: 'Dubbele basdrum',
    goal: 'Boem-boem tsjak',
    instrument: 'drum',
    steps: [{ kind: 'rhythm', bpm: 90, patterns: [['kick', 'kick', 'snare'], ['kick', 'hihat', 'kick', 'snare'], ['kick', 'kick', 'hihat', 'snare']] }],
  },
  {
    id: 'd-9-rock',
    title: 'Rockbeat over twee maten',
    goal: 'Een beat die blijft lopen',
    instrument: 'drum',
    steps: [
      {
        kind: 'rhythm',
        bpm: 100,
        patterns: [['kick', 'hihat', 'snare', 'hihat', 'kick', 'kick', 'snare', 'hihat']],
      },
    ],
  },
  {
    id: 'd-10-disco',
    title: 'Discobeat',
    goal: 'Open hi-hat tussen de tellen',
    instrument: 'drum',
    steps: [{ kind: 'rhythm', bpm: 110, patterns: [['kick', 'open-hihat', 'snare', 'open-hihat'], ['kick', 'open-hihat', 'kick', 'open-hihat', 'snare']] }],
  },
  {
    id: 'd-11-roffel',
    title: 'Tom-roffel',
    goal: 'Rond de toms',
    instrument: 'drum',
    steps: [{ kind: 'rhythm', bpm: 110, patterns: [['tom-hoog', 'tom-hoog', 'tom-laag', 'tom-laag', 'snare', 'snare', 'crash']] }],
  },
  {
    id: 'd-12-klappop',
    title: 'Klap-pop',
    goal: 'Een popbeat met handklap',
    instrument: 'drum',
    steps: [{ kind: 'rhythm', bpm: 100, patterns: [['kick', 'clap', 'kick', 'kick', 'clap'], ['kick', 'hihat', 'clap', 'hihat', 'kick', 'kick', 'clap', 'hihat']] }],
  },
  {
    id: 'd-13-finale',
    title: 'Grote finale: beat + fill',
    goal: 'Alles wat je kan',
    instrument: 'drum',
    steps: [
      {
        kind: 'rhythm',
        bpm: 100,
        patterns: [
          ['crash', 'hihat', 'snare', 'hihat', 'kick', 'hihat', 'snare', 'hihat'],
          ['snare', 'snare', 'tom-hoog', 'tom-hoog', 'tom-laag', 'tom-laag', 'kick', 'crash'],
        ],
      },
    ],
  },

  // Zang 7–13
  { id: 'z-7-ladder-op', title: 'De toonladder omhoog', goal: 'Do tot hoge do', instrument: 'zang', steps: [{ kind: 'sing', notes: [C, D, E, F, G, A, B, C5], holdMs: 600 }] },
  { id: 'z-8-ladder-neer', title: 'En weer omlaag', goal: 'Hoge do tot do', instrument: 'zang', steps: [{ kind: 'sing', notes: [C5, B, A, G, F, E, D, C], holdMs: 600 }] },
  { id: 'z-9-octaaf', title: 'De grote sprong', goal: 'Do en de hoge do', instrument: 'zang', steps: [{ kind: 'sing', notes: [C, C5, C, C5, C] }] },
  { id: 'z-10-sol', title: 'Do, sol, do', goal: 'Een sterke sprong', instrument: 'zang', steps: [{ kind: 'sing', notes: [C, G, C, G, C5, G, C] }] },
  { id: 'z-11-kortjakje', title: 'Zing Kortjakje', goal: 'Met de woorden erbij', instrument: 'zang', steps: [{ kind: 'sing', notes: KORTJAKJE, holdMs: 350, lyrics: KORTJAKJE_TEXT }] },
  { id: 'z-12-birthday', title: 'Zing Happy Birthday', goal: 'Voor de volgende verjaardag', instrument: 'zang', steps: [{ kind: 'sing', notes: BIRTHDAY, holdMs: 300 }] },
  { id: 'z-13-london', title: 'Zing London Bridge', goal: 'Een liedje zonder pauze', instrument: 'zang', steps: [{ kind: 'sing', notes: LONDON, holdMs: 300 }] },
];

// ---------- Niveau 3 en 4 (stevige basis, 2026-11-15) ----------
// Lesmakers: zo worden toonladders, akkoorden en intervallen in elke toonsoort correct opgebouwd.

const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12];
const MINOR = [0, 2, 3, 5, 7, 8, 10, 12];
const BLACK = new Set([1, 3, 6, 8, 10]);
const LETTERS_FLAT: Record<number, string> = { 0: 'C', 1: 'Db', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F', 6: 'Gb', 7: 'G', 8: 'Ab', 9: 'A', 10: 'Bb', 11: 'B' };
const LETTERS_SHARP: Record<number, string> = { 0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'F', 6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'A#', 11: 'B' };
const tr = (notes: number[], semis: number): number[] => notes.map((n) => n + semis);
const upDown = (notes: number[]): number[] => [...notes, ...[...notes].reverse().slice(1)];

/** Toonladder: de zwarte toetsen (kruisen/mollen) eerst zoeken, dan omhoog en omlaag. */
function scaleLesson(
  inst: InstrumentId,
  id: string,
  root: number,
  type: 'majeur' | 'mineur',
  level: number,
): Lesson {
  const notes = (type === 'majeur' ? MAJOR : MINOR).map((i) => root + i);
  const blacks = notes.filter((n) => BLACK.has(n % 12));
  // Mollen voor toonsoorten met Bb (F, D-mineur), anders kruisen (E-groot heeft D#, geen Eb).
  const pcs = new Set(notes.map((n) => n % 12));
  const useFlats = pcs.has(10) && !pcs.has(11);
  const nameOf = (pc: number): string => (BLACK.has(pc) && !useFlats ? LETTERS_SHARP[pc] : LETTERS_FLAT[pc]);
  const name = nameOf(root % 12) + (type === 'mineur' ? '-mineur' : '');
  const accidentals = [...new Set(blacks.map((n) => nameOf(n % 12)))];
  const list = accidentals.length > 1 ? `${accidentals.slice(0, -1).join(', ')} en ${accidentals[accidentals.length - 1]}` : accidentals[0];
  const steps: Step[] = [];
  if (blacks.length) steps.push({ kind: 'find', notes: [...new Set(blacks)] });
  if (inst === 'zang') steps.push({ kind: 'sing', notes: upDown(notes), holdMs: 450 });
  else steps.push({ kind: 'song', notes: upDown(notes) });
  return {
    id,
    title: `Toonladder van ${name}`,
    goal: blacks.length ? `Met ${list}` : 'Enkel witte toetsen',
    instrument: inst,
    level,
    flats: useFlats,
    steps,
  };
}

/** Echo's met twee noten: zo leer je sprongen (intervallen) herkennen. */
function intervalLesson(inst: InstrumentId, id: string, title: string, goal: string, steps: number[], base: number[], level: number): Lesson {
  const phrases: number[][] = [];
  for (const b of base) for (const s of steps) phrases.push([b, b + s]);
  const flat: number[] = [];
  for (const p of phrases.slice(0, 8)) flat.push(...p);
  return inst === 'zang'
    ? { id, title, goal, instrument: inst, level, steps: [{ kind: 'sing', notes: flat, holdMs: 450 }] }
    : { id, title, goal, instrument: inst, level, steps: [{ kind: 'echo', phrases: phrases.slice(0, 6) }] };
}

const SAINTS = [C, E, F, G, C, E, F, G, C, E, F, G, E, C, E, D];
const ODE = [E, E, F, G, G, F, E, D, C, C, D, E, E, D, D];
const MARY = [E, D, C, D, E, E, E, D, D, D, E, G, G, E, D, C, D, E, E, E, E, D, D, E, D, C];
const JINGLE = [E, E, E, E, E, E, E, G, C, D, E, F, F, F, F, F, E, E, E, E, D, D, E, D, G];

const BASIS_3: Lesson[] = [
  // Keyboard: toonladders, akkoorden per toonsoort, gebroken akkoorden
  scaleLesson('keyboard', 'kb-3-ladder-g', 67, 'majeur', 3),
  scaleLesson('keyboard', 'kb-3-ladder-d', 62, 'majeur', 3),
  scaleLesson('keyboard', 'kb-3-ladder-a', 69, 'majeur', 3),
  scaleLesson('keyboard', 'kb-3-ladder-e', 64, 'majeur', 3),
  scaleLesson('keyboard', 'kb-3-ladder-f', 65, 'majeur', 3),
  scaleLesson('keyboard', 'kb-3-ladder-am', 57, 'mineur', 3),
  scaleLesson('keyboard', 'kb-3-ladder-em', 64, 'mineur', 3),
  scaleLesson('keyboard', 'kb-3-ladder-dm', 62, 'mineur', 3),
  { id: 'kb-3-akk-g', title: 'Akkoorden in G', goal: 'G, C en D', instrument: 'keyboard', level: 3, steps: [{ kind: 'chord', chords: ['G', 'C', 'D', 'G', 'C', 'D', 'G'] }] },
  { id: 'kb-3-akk-d', title: 'Akkoorden in D', goal: 'D, G en A', instrument: 'keyboard', level: 3, steps: [{ kind: 'chord', chords: ['D', 'G', 'A', 'D', 'G', 'A', 'D'] }] },
  { id: 'kb-3-akk-a', title: 'Akkoorden in A', goal: 'A, D en E', instrument: 'keyboard', level: 3, steps: [{ kind: 'chord', chords: ['A', 'D', 'E', 'A', 'D', 'E', 'A'] }] },
  { id: 'kb-3-akk-mineur', title: 'Mineur-akkoorden', goal: 'Am, Dm, Em en Bm', instrument: 'keyboard', level: 3, steps: [{ kind: 'chord', chords: ['Am', 'Dm', 'Em', 'Am', 'Em', 'Bm', 'Em'] }] },
  {
    id: 'kb-3-gebroken',
    title: 'Gebroken akkoorden',
    goal: 'De noten van een akkoord na elkaar',
    instrument: 'keyboard',
    level: 3,
    steps: [{ kind: 'echo', phrases: [[C, E, G, C5], [F, A, C5, 77], [G, B, D5, 79], [A3, C, E, A], [C5, G, E, C]] }],
  },
  { id: 'kb-3-saints', title: 'When the Saints', goal: 'Met de hele melodie', instrument: 'keyboard', level: 3, steps: [{ kind: 'song', notes: SAINTS }] },

  // Gitaar: noten op elke snaar, toonladders, nieuwe akkoorden en wissels
  {
    id: 'g-3-a-snaar',
    title: 'Noten op de A-snaar',
    goal: 'B en C',
    instrument: 'gitaar',
    level: 3,
    steps: [
      { kind: 'find', notes: [45, 47, 48, 47] },
      { kind: 'echo', phrases: [[45, 47, 48], [48, 47, 45], [45, 48, 50]] },
    ],
  },
  {
    id: 'g-3-e-snaar',
    title: 'Noten op de dikke E-snaar',
    goal: 'F en G',
    instrument: 'gitaar',
    level: 3,
    steps: [
      { kind: 'find', notes: [40, 41, 43, 41] },
      { kind: 'echo', phrases: [[40, 41, 43], [43, 41, 40], [40, 43, 45]] },
    ],
  },
  scaleLesson('gitaar', 'g-3-ladder-c', 48, 'majeur', 3),
  scaleLesson('gitaar', 'g-3-ladder-g', 43, 'majeur', 3),
  scaleLesson('gitaar', 'g-3-ladder-am', 45, 'mineur', 3),
  { id: 'g-3-d', title: 'Akkoord D', goal: 'Een driehoekje op de dunne snaren', instrument: 'gitaar', level: 3, steps: [{ kind: 'chord', chords: ['D', 'D', 'G', 'D'] }] },
  { id: 'g-3-a', title: 'Akkoord A', goal: 'Drie vingers op een rij', instrument: 'gitaar', level: 3, steps: [{ kind: 'chord', chords: ['A', 'A', 'D', 'A'] }] },
  { id: 'g-3-e', title: 'Akkoord E', goal: 'Het grote E-akkoord', instrument: 'gitaar', level: 3, steps: [{ kind: 'chord', chords: ['E', 'E', 'Am', 'E'] }] },
  { id: 'g-3-gcd', title: 'Kampvuurakkoorden', goal: 'G, C en D', instrument: 'gitaar', level: 3, steps: [{ kind: 'chord', chords: ['G', 'C', 'D', 'G', 'C', 'D', 'G'] }] },
  { id: 'g-3-ead', title: 'Wisselen: E, A en D', goal: 'Rock-akkoorden', instrument: 'gitaar', level: 3, steps: [{ kind: 'chord', chords: ['E', 'A', 'D', 'A', 'E'] }] },
  { id: 'g-3-ode-laag', title: 'Ode an die Freude laag', goal: 'Op de D- en G-snaar', instrument: 'gitaar', level: 3, steps: [{ kind: 'song', notes: tr(ODE, -12) }] },

  // Bas: noten op elke snaar, toonladders, grondtoon-kwint-octaaf
  { id: 'b-3-e-snaar', title: 'Noten op de E-snaar', goal: 'F, G en A', instrument: 'bas', level: 3, steps: [{ kind: 'find', notes: [28, 29, 31, 33] }, { kind: 'echo', phrases: [[28, 29, 31], [31, 29, 28], [28, 31, 33]] }] },
  { id: 'b-3-a-snaar', title: 'Noten op de A-snaar', goal: 'B, C en D', instrument: 'bas', level: 3, steps: [{ kind: 'find', notes: [33, 35, 36, 38] }, { kind: 'echo', phrases: [[33, 35, 36], [36, 35, 33], [33, 36, 38]] }] },
  { id: 'b-3-d-snaar', title: 'Noten op de D-snaar', goal: 'E, F en G', instrument: 'bas', level: 3, steps: [{ kind: 'find', notes: [38, 40, 41, 43] }, { kind: 'echo', phrases: [[38, 40, 41], [41, 40, 38], [38, 41, 43]] }] },
  { id: 'b-3-g-snaar', title: 'Noten op de G-snaar', goal: 'A, B en C', instrument: 'bas', level: 3, steps: [{ kind: 'find', notes: [43, 45, 47, 48] }, { kind: 'echo', phrases: [[43, 45, 47], [47, 45, 43], [43, 47, 48]] }] },
  scaleLesson('bas', 'b-3-ladder-c', 36, 'majeur', 3),
  scaleLesson('bas', 'b-3-ladder-g', 31, 'majeur', 3),
  scaleLesson('bas', 'b-3-ladder-am', 33, 'mineur', 3),
  {
    id: 'b-3-octaaf',
    title: 'Grondtoon, kwint, octaaf',
    goal: 'Het bekendste baspatroon',
    instrument: 'bas',
    level: 3,
    steps: [{ kind: 'echo', phrases: [[36, 43, 48], [31, 38, 43], [33, 40, 45], [29, 36, 41]] }],
  },

  // Drum: beats in oplopend tempo, nieuwe grooves
  { id: 'd-3-tempo-80', title: 'Beat op 80', goal: 'Rustig en strak', instrument: 'drum', level: 3, steps: [{ kind: 'rhythm', bpm: 80, patterns: [['kick', 'hihat', 'snare', 'hihat', 'kick', 'hihat', 'snare', 'hihat']] }] },
  { id: 'd-3-tempo-100', title: 'Beat op 100', goal: 'Iets sneller', instrument: 'drum', level: 3, steps: [{ kind: 'rhythm', bpm: 100, patterns: [['kick', 'hihat', 'snare', 'hihat', 'kick', 'hihat', 'snare', 'hihat']] }] },
  { id: 'd-3-tempo-120', title: 'Beat op 120', goal: 'Popsnelheid!', instrument: 'drum', level: 3, steps: [{ kind: 'rhythm', bpm: 120, patterns: [['kick', 'hihat', 'snare', 'hihat', 'kick', 'hihat', 'snare', 'hihat']] }] },
  { id: 'd-3-vloer', title: 'Vier op de vloer', goal: 'Basdrum op elke tel (dansmuziek)', instrument: 'drum', level: 3, steps: [{ kind: 'rhythm', bpm: 110, patterns: [['kick', 'kick', 'kick', 'kick'], ['kick', 'clap', 'kick', 'clap', 'kick', 'clap', 'kick', 'clap']] }] },
  { id: 'd-3-halftime', title: 'Halftime', goal: 'Snare enkel op tel 3', instrument: 'drum', level: 3, steps: [{ kind: 'rhythm', bpm: 90, patterns: [['kick', 'hihat', 'hihat', 'hihat', 'snare', 'hihat', 'hihat', 'hihat']] }] },
  { id: 'd-3-fill-toms', title: 'Fill over de toms', goal: 'Van snare naar crash', instrument: 'drum', level: 3, steps: [{ kind: 'rhythm', bpm: 100, patterns: [['snare', 'tom-hoog', 'tom-hoog', 'tom-laag', 'tom-laag', 'crash'], ['kick', 'hihat', 'snare', 'hihat', 'snare', 'tom-hoog', 'tom-laag', 'crash']] }] },

  // Zang: toonladders en eerste intervallen
  scaleLesson('zang', 'z-3-ladder-g', 55, 'majeur', 3),
  scaleLesson('zang', 'z-3-ladder-f', 53, 'majeur', 3),
  scaleLesson('zang', 'z-3-ladder-am', 57, 'mineur', 3),
  intervalLesson('zang', 'z-3-terts', 'De terts', 'Do–mi: een kleine sprong', [4], [60, 62, 65, 67], 3),
  intervalLesson('zang', 'z-3-kwint', 'De kwint', 'Do–sol: een grote sprong', [7], [60, 62, 65, 57], 3),
  { id: 'z-3-mineur', title: 'Droevig klinken', goal: 'La, do, mi: een mineur-akkoord zingen', instrument: 'zang', level: 3, steps: [{ kind: 'sing', notes: [A3, C, E, C, A3], holdMs: 500 }] },
  { id: 'z-3-saints', title: 'Zing When the Saints', goal: 'Een vrolijk marsliedje', instrument: 'zang', level: 3, steps: [{ kind: 'sing', notes: SAINTS, holdMs: 300 }] },
];

const BASIS_4: Lesson[] = [
  // Keyboard: intervallen, liedjes in andere toonsoorten, popschema's, blues
  intervalLesson('keyboard', 'kb-4-kleine-sprong', 'Hoor de kleine sprongen', 'Secunde en terts op gehoor', [2, 4], [60, 65, 67], 4),
  intervalLesson('keyboard', 'kb-4-grote-sprong', 'Hoor de grote sprongen', 'Kwart en kwint op gehoor', [5, 7], [60, 62, 64], 4),
  intervalLesson('keyboard', 'kb-4-octaaf', 'Hoor de heel grote sprongen', 'Sext en octaaf op gehoor', [9, 12], [60, 62, 65], 4),
  { id: 'kb-4-ode-g', title: 'Ode an die Freude in G', goal: 'Hetzelfde liedje, nu met F#', instrument: 'keyboard', level: 4, steps: [{ kind: 'song', notes: tr(ODE, 7) }] },
  { id: 'kb-4-jacob-d', title: 'Vader Jacob in D', goal: 'Met F# en C#', instrument: 'keyboard', level: 4, steps: [{ kind: 'song', notes: tr(JACOB, 2), lyrics: JACOB_TEXT }] },
  { id: 'kb-4-london-f', title: 'London Bridge in F', goal: 'Met Bb', instrument: 'keyboard', level: 4, flats: true, steps: [{ kind: 'song', notes: tr(LONDON, 5).map((n) => (n > 84 ? n - 12 : n)) }] },
  { id: 'kb-4-mary-g', title: 'Mary in G', goal: 'Transponeren: alles een stukje hoger', instrument: 'keyboard', level: 4, steps: [{ kind: 'song', notes: tr(MARY, 7) }] },
  { id: 'kb-4-pop-g', title: 'Popschema in G', goal: 'G, D, Em, C', instrument: 'keyboard', level: 4, steps: [{ kind: 'chord', chords: ['G', 'D', 'Em', 'C', 'G', 'D', 'Em', 'C'] }] },
  { id: 'kb-4-pop-mineur', title: 'Droevig popschema', goal: 'Am, F, C, G', instrument: 'keyboard', level: 4, steps: [{ kind: 'chord', chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'] }] },
  {
    id: 'kb-4-blues',
    title: 'De blues',
    flats: true,
    goal: 'Een bluestoonladder met zwarte toetsen',
    instrument: 'keyboard',
    level: 4,
    steps: [
      { kind: 'find', notes: [Eb, Fs, As] },
      { kind: 'echo', phrases: [[C, Eb, F, Fs, G], [G, Fs, F, Eb, C], [C, Eb, C, As, G], [C5, As, G, Fs, F, Eb, C]] },
    ],
  },
  { id: 'kb-4-jingle', title: 'Jingle Bells, het hele refrein', goal: 'Een lang stuk zonder fouten', instrument: 'keyboard', level: 4, steps: [{ kind: 'song', notes: [...JINGLE, ...JINGLE.slice(0, 11), F, F, F, F, F, E, E, E, G, G, F, D, C] }] },
  {
    id: 'kb-4-meester',
    title: 'Meesterproef keyboard',
    goal: 'Toonladder, akkoorden en een liedje',
    instrument: 'keyboard',
    level: 4,
    steps: [
      { kind: 'song', notes: upDown(MAJOR.map((i) => 67 + i)) },
      { kind: 'chord', chords: ['C', 'G', 'Am', 'F'] },
      { kind: 'song', notes: BIRTHDAY },
    ],
  },

  // Gitaar: liedjes, langere wissels, mineur
  { id: 'g-4-birthday', title: 'Happy Birthday op gitaar', goal: 'Voor de volgende verjaardag', instrument: 'gitaar', level: 4, steps: [{ kind: 'song', notes: BIRTHDAY }] },
  { id: 'g-4-jingle', title: 'Jingle Bells op gitaar', goal: 'Belletjes op de hoge snaren', instrument: 'gitaar', level: 4, steps: [{ kind: 'song', notes: JINGLE }] },
  { id: 'g-4-saints', title: 'When the Saints op gitaar', goal: 'Marsliedje op twee snaren', instrument: 'gitaar', level: 4, steps: [{ kind: 'song', notes: SAINTS }] },
  { id: 'g-4-pop-g', title: 'Popschema in G', goal: 'G, D, Em, C', instrument: 'gitaar', level: 4, steps: [{ kind: 'chord', chords: ['G', 'D', 'Em', 'C', 'G', 'D', 'Em', 'C'] }] },
  { id: 'g-4-mineur', title: 'Mineur-wissels', goal: 'Am, Dm en E', instrument: 'gitaar', level: 4, steps: [{ kind: 'chord', chords: ['Am', 'Dm', 'E', 'Am', 'Dm', 'E', 'Am'] }] },
  { id: 'g-4-bm', title: 'Akkoord Bm (klein)', goal: 'Op de drie dunste snaren', instrument: 'gitaar', level: 4, steps: [{ kind: 'chord', chords: ['Bm', 'G', 'D', 'A', 'Bm'] }] },
  intervalLesson('gitaar', 'g-4-gehoor', 'Speel na op gehoor', 'Sprongetjes op de hoge snaren', [2, 3, 5], [64, 59], 4),
  {
    id: 'g-4-meester',
    title: 'Meesterproef gitaar',
    goal: 'Noten en akkoorden door elkaar',
    instrument: 'gitaar',
    level: 4,
    steps: [
      { kind: 'song', notes: MARY },
      { kind: 'chord', chords: ['G', 'C', 'D', 'Em', 'Am', 'E'] },
    ],
  },

  // Bas: songs, walking, riffs
  { id: 'b-4-birthday', title: 'Happy Birthday op bas', goal: 'De melodie, laag', instrument: 'bas', level: 4, steps: [{ kind: 'song', notes: tr(BIRTHDAY, -24).map((n) => (n < 28 ? n + 12 : n)) }] },
  { id: 'b-4-saints', title: 'When the Saints op bas', goal: 'Een marsbas', instrument: 'bas', level: 4, steps: [{ kind: 'song', notes: tr(SAINTS, -24) }] },
  { id: 'b-4-pop-g', title: 'Baslijn popschema in G', goal: 'G, D, E, C', instrument: 'bas', level: 4, steps: [{ kind: 'song', notes: [31, 31, 38, 38, 40, 40, 36, 36, 31, 31, 38, 38, 40, 40, 36, 36] }] },
  { id: 'b-4-walking', title: 'Walking bass', goal: 'Stapjes naar de volgende grondtoon', instrument: 'bas', level: 4, steps: [{ kind: 'echo', phrases: [[36, 38, 40, 41], [43, 41, 40, 38], [33, 35, 36, 38], [29, 31, 33, 35]] }] },
  intervalLesson('bas', 'b-4-gehoor', 'Speel na op gehoor', 'Kwint en octaaf', [7, 12], [28, 33], 4),
  {
    id: 'b-4-meester',
    title: 'Meesterproef bas',
    goal: 'Toonladder, baslijn en liedje',
    instrument: 'bas',
    level: 4,
    steps: [
      { kind: 'song', notes: upDown(MAJOR.map((i) => 36 + i)) },
      { kind: 'song', notes: [36, 36, 31, 31, 33, 33, 29, 29] },
      { kind: 'song', notes: tr(ODE, -24) },
    ],
  },

  // Drum: langere grooves en een solo
  { id: 'd-4-shuffle', title: 'Shuffle', goal: 'Een huppelende beat', instrument: 'drum', level: 4, steps: [{ kind: 'rhythm', bpm: 100, patterns: [['kick', 'hihat', 'hihat', 'snare', 'hihat', 'hihat'], ['kick', 'hihat', 'kick', 'snare', 'hihat', 'hihat']] }] },
  { id: 'd-4-reggae', title: 'Reggae', goal: 'Basdrum en snare samen op tel 3', instrument: 'drum', level: 4, steps: [{ kind: 'rhythm', bpm: 80, patterns: [['hihat', 'hihat', 'kick', 'hihat'], ['hihat', 'open-hihat', 'kick', 'snare']] }] },
  { id: 'd-4-funk', title: 'Funk', goal: 'Veel basdrum, strakke hi-hat', instrument: 'drum', level: 4, steps: [{ kind: 'rhythm', bpm: 95, patterns: [['kick', 'hihat', 'kick', 'snare', 'hihat', 'kick', 'snare', 'hihat']] }] },
  { id: 'd-4-twee-maten', title: 'Beat en fill afwisselen', goal: 'Drie maten beat, één maat fill', instrument: 'drum', level: 4, steps: [{ kind: 'rhythm', bpm: 100, patterns: [['kick', 'hihat', 'snare', 'hihat', 'kick', 'hihat', 'snare', 'hihat', 'kick', 'hihat', 'snare', 'hihat', 'snare', 'tom-hoog', 'tom-laag', 'crash']] }] },
  { id: 'd-4-snel', title: 'Beat op 140', goal: 'Echt snel!', instrument: 'drum', level: 4, steps: [{ kind: 'rhythm', bpm: 140, patterns: [['kick', 'hihat', 'snare', 'hihat', 'kick', 'kick', 'snare', 'hihat']] }] },
  {
    id: 'd-4-solo',
    title: 'Drumsolo',
    goal: 'Alle pads, één lange solo',
    instrument: 'drum',
    level: 4,
    steps: [
      {
        kind: 'rhythm',
        bpm: 110,
        patterns: [['crash', 'kick', 'snare', 'kick', 'snare', 'tom-hoog', 'tom-hoog', 'tom-laag', 'tom-laag', 'clap', 'open-hihat', 'kick', 'kick', 'snare', 'crash']],
      },
    ],
  },

  // Zang: grotere sprongen, liedjes in andere toonsoorten
  intervalLesson('zang', 'z-4-kwart', 'De kwart', 'Do–fa', [5], [60, 62, 67], 4),
  intervalLesson('zang', 'z-4-sext', 'De sext', 'Do–la: een lange sprong', [9], [60, 62, 64], 4),
  intervalLesson('zang', 'z-4-octaaf', 'Octaven zingen', 'Laag en hoog dezelfde toon', [12], [57, 60, 62], 4),
  { id: 'z-4-mary', title: 'Zing Mary had a little lamb', goal: 'Een liedje met veel herhaling', instrument: 'zang', level: 4, steps: [{ kind: 'sing', notes: MARY, holdMs: 300 }] },
  { id: 'z-4-jingle', title: 'Zing Jingle Bells', goal: 'Snel achter elkaar', instrument: 'zang', level: 4, steps: [{ kind: 'sing', notes: JINGLE, holdMs: 250 }] },
  { id: 'z-4-jacob-g', title: 'Vader Jacob in G', goal: 'Hetzelfde liedje, hoger', instrument: 'zang', level: 4, steps: [{ kind: 'sing', notes: tr(JACOB, 7), holdMs: 300, lyrics: JACOB_TEXT }] },
];

export const LESSONS: Lesson[] = [
  // ---------- Keyboard ----------
  { id: 'kb-1-c', title: 'Waar is de C?', goal: 'Vind de C, D en E', instrument: 'keyboard', steps: [{ kind: 'find', notes: [C, C5, C, D, E] }] },
  {
    id: 'kb-2-cde',
    title: 'C D E',
    goal: 'Speel na wat je hoort',
    instrument: 'keyboard',
    steps: [
      { kind: 'find', notes: [C, D, E] },
      { kind: 'echo', phrases: [[C, D, E], [E, D, C], [C, E, D], [D, D, C]] },
    ],
  },
  {
    id: 'kb-3-fg',
    title: 'F en G erbij',
    goal: 'Vijf vingers, vijf noten',
    instrument: 'keyboard',
    steps: [
      { kind: 'find', notes: [F, G] },
      { kind: 'echo', phrases: [[C, D, E, F, G], [G, F, E, D, C], [C, E, G], [G, E, C]] },
    ],
  },
  { id: 'kb-4-jacob', title: 'Vader Jacob', goal: 'Je eerste liedje', instrument: 'keyboard', steps: [{ kind: 'song', notes: JACOB, lyrics: JACOB_TEXT }] },
  {
    id: 'kb-5-kortjakje',
    title: 'Altijd is Kortjakje ziek',
    goal: 'De A erbij',
    instrument: 'keyboard',
    steps: [
      { kind: 'find', notes: [A, G, A] },
      {
        kind: 'song',
        notes: [C, C, G, G, A, A, G, F, F, E, E, D, D, C],
        lyrics: ['Al', 'tijd', 'is', 'Kort', 'ja', 'kje', 'ziek', 'mid', 'den', 'in', 'de', 'week', 'maar', '’s zondags niet'],
      },
    ],
  },
  {
    id: 'kb-6-ode',
    title: 'Grote finale: Ode an die Freude',
    goal: 'Een beroemd stukje van Beethoven',
    instrument: 'keyboard',
    steps: [{ kind: 'song', notes: [E, E, F, G, G, F, E, D, C, C, D, E, E, D, D] }],
  },
  {
    id: 'kb-7-b',
    title: 'B en de hoge C',
    goal: 'De hele toonladder',
    instrument: 'keyboard',
    steps: [
      { kind: 'find', notes: [B, C5] },
      { kind: 'echo', phrases: [[G, A, B, C5], [C5, B, A, G], [C, E, G, C5]] },
      { kind: 'song', notes: [C, D, E, F, G, A, B, C5, C5, B, A, G, F, E, D, C] },
    ],
  },
  {
    id: 'kb-8-saints',
    title: 'When the Saints',
    goal: 'Een vrolijk marsliedje',
    instrument: 'keyboard',
    steps: [{ kind: 'song', notes: [C, E, F, G, C, E, F, G, C, E, F, G, E, C, E, D] }],
  },
  {
    id: 'kb-9-jingle',
    title: 'Jingle Bells',
    goal: 'Belletjes!',
    instrument: 'keyboard',
    steps: [
      {
        kind: 'song',
        notes: [E, E, E, E, E, E, E, G, C, D, E, F, F, F, F, F, E, E, E, E, D, D, E, D, G],
        lyrics: ['Jin', 'gle', 'bells', 'jin', 'gle', 'bells', 'jin', 'gle', 'all', 'the', 'way', 'Oh', 'what', 'fun', 'it', 'is', 'to', 'ride', 'in', 'a', 'one', 'horse', 'o', 'pen', 'sleigh'],
      },
    ],
  },
  {
    id: 'kb-10-fis',
    title: 'Zwarte toets: F#',
    goal: 'Je eerste kruis',
    instrument: 'keyboard',
    steps: [
      { kind: 'find', notes: [Fs, G, Fs] },
      { kind: 'echo', phrases: [[E, Fs, G], [G, Fs, E], [D, E, Fs, G, A]] },
      { kind: 'song', notes: [D, D, A, A, B, B, A, G, G, Fs, Fs, E, E, D] },
    ],
  },
  {
    id: 'kb-11-bes',
    title: 'Zwarte toets: Bb',
    flats: true,
    goal: 'Een mol',
    instrument: 'keyboard',
    steps: [
      { kind: 'find', notes: [Bb, A, Bb] },
      { kind: 'echo', phrases: [[A, Bb, C5], [C5, Bb, A], [F, G, A, Bb, C5]] },
      { kind: 'song', notes: [F, F, C5, C5, D5, D5, C5, Bb, Bb, A, A, G, G, F] },
    ],
  },
  {
    id: 'kb-12-links',
    title: 'Linkerhand',
    goal: 'Lage noten met je linkerhand',
    instrument: 'keyboard',
    steps: [
      { kind: 'find', notes: [C3, F3, G3, C3] },
      { kind: 'echo', phrases: [[C3, G3, C3], [C3, F3, G3, C3]] },
    ],
  },
  {
    id: 'kb-13-tweehanden',
    title: 'Twee handen',
    goal: 'Links een lage noot, rechts de melodie',
    instrument: 'keyboard',
    steps: [{ kind: 'song', notes: [C3, C, D, E, C, C3, C, D, E, C, C3, E, F, G, G3, E, F, G] }],
  },
  {
    id: 'kb-14-akkoord-c',
    title: 'Akkoord C',
    goal: 'Drie toetsen tegelijk',
    instrument: 'keyboard',
    steps: [
      { kind: 'find', notes: [C, E, G] },
      { kind: 'chord', chords: ['C', 'C'] },
    ],
  },
  {
    id: 'kb-15-fg',
    title: 'Akkoorden F en G',
    goal: 'Schuif je hand op',
    instrument: 'keyboard',
    steps: [{ kind: 'chord', chords: ['F', 'G', 'C', 'F', 'G', 'C'] }],
  },
  {
    id: 'kb-16-am',
    title: 'Am, het droevige akkoord',
    goal: 'Mineur klinkt anders',
    instrument: 'keyboard',
    steps: [{ kind: 'chord', chords: ['Am', 'C', 'Am', 'F', 'G', 'C'] }],
  },
  {
    id: 'kb-17-popschema',
    title: 'Het popschema',
    goal: 'C, G, Am, F: in heel veel liedjes',
    instrument: 'keyboard',
    steps: [{ kind: 'chord', chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F'] }],
  },

  // ---------- Gitaar ----------
  {
    id: 'g-1-hoog',
    title: 'De twee dunste snaren',
    goal: 'Hoge E en B',
    instrument: 'gitaar',
    steps: [
      { kind: 'find', notes: [E, B3, E, B3] },
      { kind: 'echo', phrases: [[E, B3, E], [B3, B3, E]] },
    ],
  },
  {
    id: 'g-2-snaren',
    title: 'Alle zes de snaren',
    goal: 'Van dik naar dun',
    instrument: 'gitaar',
    steps: [
      { kind: 'find', notes: [gE2, gA2, gD3, G3, B3, E] },
      { kind: 'echo', phrases: [[gE2, gA2, gD3], [G3, B3, E], [E, B3, G3, gD3, gA2, gE2]] },
    ],
  },
  {
    id: 'g-3-cd',
    title: 'Eerste frets: C en D',
    goal: 'Vinger op de B-snaar',
    instrument: 'gitaar',
    steps: [
      { kind: 'find', notes: [C, D, C, D] },
      { kind: 'song', notes: [E, D, C, E, D, C, C, C, C, C, D, D, D, D, E, D, C] },
    ],
  },
  {
    id: 'g-4-mary',
    title: 'Mary had a little lamb',
    goal: 'G op de hoge snaar',
    instrument: 'gitaar',
    steps: [
      { kind: 'find', notes: [G, F, G] },
      { kind: 'song', notes: [E, D, C, D, E, E, E, D, D, D, E, G, G, E, D, C, D, E, E, E, E, D, D, E, D, C] },
    ],
  },
  {
    id: 'g-5-ode',
    title: 'Ode an die Freude op gitaar',
    goal: 'Beethoven op twee snaren',
    instrument: 'gitaar',
    steps: [{ kind: 'song', notes: [E, E, F, G, G, F, E, D, C, C, D, E, E, D, D] }],
  },
  {
    id: 'g-6-em',
    title: 'Akkoord Em',
    goal: 'Twee vingers, alle snaren',
    instrument: 'gitaar',
    steps: [{ kind: 'chord', chords: ['Em', 'Em', 'Em'] }],
  },
  {
    id: 'g-7-am',
    title: 'Akkoorden Em en Am',
    goal: 'Wisselen tussen twee akkoorden',
    instrument: 'gitaar',
    steps: [{ kind: 'chord', chords: ['Am', 'Em', 'Am', 'Em'] }],
  },

  // ---------- Bas ----------
  {
    id: 'b-1-snaren',
    title: 'De vier snaren',
    goal: 'E, A, D en G',
    instrument: 'bas',
    steps: [
      { kind: 'find', notes: [E1, A1, D2, G2] },
      { kind: 'echo', phrases: [[E1, A1], [D2, G2], [G2, D2, A1, E1]] },
    ],
  },
  {
    id: 'b-2-grondtonen',
    title: 'Grondtonen',
    goal: 'Twee keer dezelfde noot',
    instrument: 'bas',
    steps: [{ kind: 'echo', phrases: [[E1, E1, A1, A1], [A1, A1, D2, D2], [E1, E1, E1, A1]] }],
  },
  {
    id: 'b-3-frets',
    title: 'Eerste frets: G en C',
    goal: 'Vinger op fret 3',
    instrument: 'bas',
    steps: [
      { kind: 'find', notes: [G1, C2, G1, C2] },
      { kind: 'echo', phrases: [[C2, G1, C2], [E1, G1, A1], [C2, A1, G1, E1]] },
    ],
  },
  {
    id: 'b-4-baslijn',
    title: 'Baslijn C, F, G',
    goal: 'De bas onder een liedje',
    instrument: 'bas',
    steps: [
      { kind: 'find', notes: [F1, C2, G1] },
      { kind: 'song', notes: [C2, C2, F1, F1, G1, G1, C2, C2, A1, A1, F1, F1, G1, G1, C2] },
    ],
  },
  {
    id: 'b-5-jacob',
    title: 'Vader Jacob op bas',
    goal: 'Een melodie op de bas',
    instrument: 'bas',
    steps: [
      { kind: 'find', notes: [C2, D2, E2] },
      { kind: 'song', notes: [C2, D2, E2, C2, C2, D2, E2, C2, E2, F2, G2, E2, F2, G2], lyrics: JACOB_TEXT },
    ],
  },
  {
    id: 'b-6-walk',
    title: 'Wandelende bas',
    goal: 'Stapjes omhoog en omlaag',
    instrument: 'bas',
    steps: [{ kind: 'echo', phrases: [[E1, F1, G1, A1], [A1, G1, F1, E1], [C2, D2, E2, F2, G2], [G2, F2, E2, D2, C2]] }],
  },

  // ---------- Drum ----------
  {
    id: 'd-1-kick-snare',
    title: 'Basdrum en snare',
    goal: 'Boem en tsjak',
    instrument: 'drum',
    steps: [{ kind: 'rhythm', bpm: 80, patterns: [['kick', 'snare'], ['kick', 'snare', 'kick', 'snare'], ['kick', 'kick', 'snare']] }],
  },
  {
    id: 'd-2-hihat',
    title: 'De hi-hat',
    goal: 'Tikken als een klok',
    instrument: 'drum',
    steps: [{ kind: 'rhythm', bpm: 90, patterns: [['hihat', 'hihat', 'hihat', 'hihat'], ['hihat', 'hihat', 'snare'], ['kick', 'hihat', 'hihat']] }],
  },
  {
    id: 'd-3-beat',
    title: 'Je eerste beat',
    goal: 'Basdrum, hi-hat, snare, hi-hat',
    instrument: 'drum',
    steps: [
      {
        kind: 'rhythm',
        bpm: 90,
        patterns: [
          ['kick', 'hihat', 'snare', 'hihat'],
          ['kick', 'hihat', 'snare', 'hihat', 'kick', 'hihat', 'snare', 'hihat'],
        ],
      },
    ],
  },
  {
    id: 'd-4-toms',
    title: 'De toms',
    goal: 'Van hoog naar laag',
    instrument: 'drum',
    steps: [{ kind: 'rhythm', bpm: 100, patterns: [['tom-hoog', 'tom-laag'], ['tom-hoog', 'tom-hoog', 'tom-laag', 'tom-laag'], ['snare', 'tom-hoog', 'tom-laag', 'crash']] }],
  },
  {
    id: 'd-5-fill',
    title: 'Een fill met crash',
    goal: 'Eindig met een knal',
    instrument: 'drum',
    steps: [
      {
        kind: 'rhythm',
        bpm: 100,
        patterns: [
          ['kick', 'hihat', 'snare', 'hihat', 'snare', 'tom-hoog', 'tom-laag', 'crash'],
          ['snare', 'snare', 'tom-hoog', 'tom-hoog', 'tom-laag', 'tom-laag', 'kick', 'crash'],
        ],
      },
    ],
  },
  {
    id: 'd-6-klap',
    title: 'Klap mee',
    goal: 'Een beat met handklap',
    instrument: 'drum',
    steps: [{ kind: 'rhythm', bpm: 95, patterns: [['kick', 'clap', 'kick', 'clap'], ['kick', 'kick', 'clap', 'open-hihat']] }],
  },

  // ---------- Zang ----------
  { id: 'z-1-do', title: 'Zing de do', goal: 'Een toon nazingen en vasthouden', instrument: 'zang', steps: [{ kind: 'sing', notes: [C, C, C] }] },
  { id: 'z-2-doremi', title: 'Do re mi', goal: 'Drie tonen omhoog', instrument: 'zang', steps: [{ kind: 'sing', notes: [C, D, E, E, D, C] }] },
  { id: 'z-3-sol', title: 'Tot de sol', goal: 'Vijf tonen omhoog en omlaag', instrument: 'zang', steps: [{ kind: 'sing', notes: [C, D, E, F, G, G, F, E, D, C] }] },
  { id: 'z-4-sprong', title: 'Sprongetjes', goal: 'Do, mi, sol', instrument: 'zang', steps: [{ kind: 'sing', notes: [C, E, G, E, C] }] },
  {
    id: 'z-5-jacob',
    title: 'Zing Vader Jacob',
    goal: 'Je eerste gezongen liedje',
    instrument: 'zang',
    steps: [{ kind: 'sing', notes: JACOB, holdMs: 350, lyrics: JACOB_TEXT }],
  },
  {
    id: 'z-6-ode',
    title: 'Zing de Ode an die Freude',
    goal: 'Beethoven zingen',
    instrument: 'zang',
    steps: [{ kind: 'sing', notes: [E, E, F, G, G, F, E, D, C, C, D, E, E, D, D], holdMs: 350 }],
  },
  ...BASIS_2.map((l) => ({ ...l, level: 2 })),
  ...BASIS_3,
  ...BASIS_4,
];

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function lessonsFor(instrument: InstrumentId): Lesson[] {
  return LESSONS.filter((l) => l.instrument === instrument);
}

export const MAX_STARS = 3;
