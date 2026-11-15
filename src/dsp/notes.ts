// Noten benoemen: frequentie ↔ MIDI-nummer ↔ letter (A–G) of do-re-mi. Gewone rekenregels.

const LETTERS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
// Belgische benaming (zoals in de muziekacademie): "si" in plaats van "ti".
const SOLFEGE = ['do', 'do#', 're', 're#', 'mi', 'fa', 'fa#', 'sol', 'sol#', 'la', 'la#', 'si'];

export function hzToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Toonklasse 0..11 (0 = C), ongeacht de octaaf. */
export function pitchClass(midi: number): number {
  return ((Math.round(midi) % 12) + 12) % 12;
}

/** Octaafnummer zoals op de piano: C4 = de middelste do. */
export function octaveOf(midi: number): number {
  return Math.floor(Math.round(midi) / 12) - 1;
}

export function letterName(midi: number, withOctave = true): string {
  return LETTERS[pitchClass(midi)] + (withOctave ? String(octaveOf(midi)) : '');
}

export function solfegeName(midi: number): string {
  return SOLFEGE[pitchClass(midi)];
}

// Met mollen (voor toonsoorten zoals F of D-mineur): Bb in plaats van A#.
const LETTERS_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const SOLFEGE_FLAT = ['do', 'reb', 're', 'mib', 'mi', 'fa', 'solb', 'sol', 'lab', 'la', 'sib', 'si'];

/** Naam volgens de instelling: "C4" of "do4" (zonder octaaf: "C" of "do"). `flats` = zwarte toetsen als mol. */
export function noteName(midi: number, notation: 'letters' | 'doremi', withOctave = true, flats = false): string {
  const pc = pitchClass(midi);
  const base = flats
    ? (notation === 'doremi' ? SOLFEGE_FLAT : LETTERS_FLAT)[pc]
    : notation === 'doremi'
      ? solfegeName(midi)
      : letterName(midi, false);
  return withOctave ? `${base}${octaveOf(midi)}` : base;
}

export function pitchClassLetter(pc: number): string {
  return LETTERS[((pc % 12) + 12) % 12];
}

/** Hoeveel cent de toon naast de dichtstbijzijnde noot zit (-50..+50). */
export function centsOff(hz: number): number {
  const m = hzToMidi(hz);
  return Math.round((m - Math.round(m)) * 100);
}
