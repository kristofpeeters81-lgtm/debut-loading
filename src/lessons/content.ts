// Lesinhoud (blok 8 + uitbreiding). Spelenderwijs, weinig tekst. Liedjes enkel uit het publiek domein.
// Noten als MIDI-nummers (60 = C4, middelste do). Bij noten telt enkel de letter (de octaaf niet, beslissing blok 1).

import type { InstrumentId } from '../app/settings';
import type { DrumPad } from '../audio/synth';

export type ChordName = 'C' | 'F' | 'G' | 'Am' | 'Em' | 'Dm';

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
}

/** Akkoorden: grondtoon (0 = C), mineur, en de noten per instrument (voor voorspelen en tikken). */
export const CHORDS: Record<ChordName, { root: number; minor: boolean; keyboard: number[]; gitaar: number[] }> = {
  C: { root: 0, minor: false, keyboard: [60, 64, 67], gitaar: [48, 52, 55, 60, 64] },
  F: { root: 5, minor: false, keyboard: [65, 69, 72], gitaar: [53, 57, 60, 65] },
  G: { root: 7, minor: false, keyboard: [67, 71, 74], gitaar: [43, 47, 50, 55, 59, 67] },
  Am: { root: 9, minor: true, keyboard: [57, 60, 64], gitaar: [45, 52, 57, 60, 64] },
  Em: { root: 4, minor: true, keyboard: [64, 67, 71], gitaar: [40, 47, 52, 55, 59, 64] },
  Dm: { root: 2, minor: true, keyboard: [62, 65, 69], gitaar: [50, 57, 62, 65] },
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
    title: 'Zwarte toetsen: C# en Eb',
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
  ...BASIS_2,
];

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function lessonsFor(instrument: InstrumentId): Lesson[] {
  return LESSONS.filter((l) => l.instrument === instrument);
}

export const MAX_STARS = 3;
