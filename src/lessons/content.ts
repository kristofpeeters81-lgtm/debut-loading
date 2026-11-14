// Lesinhoud (blok 8): eerste reeks voor keyboard. Spelenderwijs, weinig tekst.
// Liedjes enkel uit het publiek domein (traditioneel / Beethoven). Noten als MIDI-nummers (60 = C4, middelste do).
// De octaaf telt in het begin niet mee: de juiste letter is goed (beslissing blok 1).

export type Step =
  /** Eén toets tegelijk oplichten; speel die letter. */
  | { kind: 'find'; notes: number[] }
  /** De app speelt een stukje voor, jij speelt het na. */
  | { kind: 'echo'; phrases: number[][] }
  /** Een liedje noot per noot; de app wacht op jou. Lettergrepen (optioneel) per noot. */
  | { kind: 'song'; notes: number[]; lyrics?: string[] };

export interface Lesson {
  id: string;
  title: string;
  /** Wat je leert, in een paar woorden. */
  goal: string;
  instrument: 'keyboard';
  steps: Step[];
}

const C = 60;
const D = 62;
const E = 64;
const F = 65;
const G = 67;
const A = 69;

export const LESSONS: Lesson[] = [
  {
    id: 'kb-1-c',
    title: 'Waar is de C?',
    goal: 'Vind de C, D en E',
    instrument: 'keyboard',
    steps: [{ kind: 'find', notes: [C, C + 12, C, D, E] }],
  },
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
  {
    id: 'kb-4-jacob',
    title: 'Vader Jacob',
    goal: 'Je eerste liedje',
    instrument: 'keyboard',
    steps: [
      {
        kind: 'song',
        notes: [C, D, E, C, C, D, E, C, E, F, G, E, F, G],
        lyrics: ['Va', 'der', 'Ja', 'cob', 'va', 'der', 'Ja', 'cob', 'slaapt', 'gij', 'nog', 'slaapt', 'gij', 'nog'],
      },
    ],
  },
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
];

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export const MAX_STARS = 3;
