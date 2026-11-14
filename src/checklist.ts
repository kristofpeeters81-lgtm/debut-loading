// Wat we op de tablet willen uittesten, per instrument.

export type TestItem =
  | { id: string; label: string; kind: 'note'; midi: number }
  | { id: string; label: string; kind: 'chord'; root: number; minor: boolean }
  | { id: string; label: string; kind: 'claps'; count: number }
  | { id: string; label: string; kind: 'range' }
  | { id: string; label: string; kind: 'hold'; seconds: number };

export interface Instrument {
  id: string;
  label: string;
  icon: string;
  tip: string;
  /** Zoekbereik voor de grondtoon: smaller = minder octaaffouten. */
  minHz: number;
  maxHz: number;
  items: TestItem[];
}

export type Status = 'open' | 'ok' | 'octave' | 'fail';

export interface ItemResult {
  status: Status;
  heard: string;
}

export const INSTRUMENTS: Instrument[] = [
  {
    id: 'keyboard',
    label: 'Keyboard',
    icon: '🎹',
    tip: 'Leg de tablet naast het keyboard. Speel elke noot rustig en laat ze even klinken.',
    minHz: 50,
    maxHz: 2100,
    items: [
      { id: 'c3', label: 'C3 (laag)', kind: 'note', midi: 48 },
      { id: 'c4', label: 'C4 (middelste do)', kind: 'note', midi: 60 },
      { id: 'e4', label: 'E4', kind: 'note', midi: 64 },
      { id: 'g4', label: 'G4', kind: 'note', midi: 67 },
      { id: 'c5', label: 'C5', kind: 'note', midi: 72 },
      { id: 'c6', label: 'C6 (hoog)', kind: 'note', midi: 84 },
      { id: 'chord-c', label: 'Akkoord C (C + E + G samen)', kind: 'chord', root: 0, minor: false },
      { id: 'chord-am', label: 'Akkoord Am (A + C + E samen)', kind: 'chord', root: 9, minor: true },
    ],
  },
  {
    id: 'gitaar',
    label: 'Gitaar',
    icon: '🎸',
    tip: 'Eerst ZONDER versterker, tablet vlak bij de gitaar. Tokkel telkens één losse snaar.',
    minHz: 70,
    maxHz: 1000,
    items: [
      { id: 'e2', label: 'Dikste snaar: E2', kind: 'note', midi: 40 },
      { id: 'a2', label: 'A2', kind: 'note', midi: 45 },
      { id: 'd3', label: 'D3', kind: 'note', midi: 50 },
      { id: 'g3', label: 'G3', kind: 'note', midi: 55 },
      { id: 'b3', label: 'B3', kind: 'note', midi: 59 },
      { id: 'e4', label: 'Dunste snaar: E4', kind: 'note', midi: 64 },
      { id: 'chord-em', label: 'Akkoord Em (alle snaren)', kind: 'chord', root: 4, minor: true },
    ],
  },
  {
    id: 'bas',
    label: 'Bas',
    icon: '🎸',
    tip: 'Akoestisch, zonder kabel. Tablet vlak bij het klankgat. Tokkel telkens één losse snaar.',
    minHz: 35,
    maxHz: 400,
    items: [
      { id: 'e1', label: 'Dikste snaar: E1', kind: 'note', midi: 28 },
      { id: 'a1', label: 'A1', kind: 'note', midi: 33 },
      { id: 'd2', label: 'D2', kind: 'note', midi: 38 },
      { id: 'g2', label: 'Dunste snaar: G2', kind: 'note', midi: 43 },
    ],
  },
  {
    id: 'stem',
    label: 'Zingen',
    icon: '🎤',
    tip: 'Zing op "oe" of "aa". Niet te dicht bij de tablet.',
    minHz: 80,
    maxHz: 1100,
    items: [
      { id: 'range', label: 'Zing van je laagste naar je hoogste toon (druk dan op Klaar)', kind: 'range' },
      { id: 'hold', label: 'Houd één toon 3 seconden vast', kind: 'hold', seconds: 3 },
    ],
  },
  {
    id: 'klappen',
    label: 'Klappen',
    icon: '👏',
    tip: 'Test voor ritmespelletjes en een echte drum later: klap of tik op tafel.',
    minHz: 50,
    maxHz: 2100,
    items: [{ id: 'claps', label: 'Klap 8 keer, rustig', kind: 'claps', count: 8 }],
  },
];
