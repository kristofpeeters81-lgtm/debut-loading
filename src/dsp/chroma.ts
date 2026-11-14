// Akkoorden herkennen (proef): welke toonklassen klinken tegelijk, en past dat bij een groot/klein drieklank?
// Werkt op het frequentiespectrum van de microfoon. Gewone rekenregels, geen AI.

import { hzToMidi, pitchClass, pitchClassLetter } from './notes';

export interface Chord {
  root: number;
  minor: boolean;
}

/**
 * Energie per toonklasse (0 = C … 11 = B), genormaliseerd zodat de sterkste 1 is.
 * `db` = spectrum in decibel (zoals AnalyserNode.getFloatFrequencyData), `binHz` = breedte van één bin.
 * Enkel pieken tellen mee; onder ±100 Hz liggen de noten te dicht bij elkaar voor dit spectrum.
 */
export function chromaFromSpectrum(db: Float32Array, binHz: number, minHz = 100, maxHz = 2000): number[] {
  const chroma = new Array<number>(12).fill(0);
  const lo = Math.max(1, Math.floor(minHz / binHz));
  const hi = Math.min(db.length - 2, Math.ceil(maxHz / binHz));
  let maxDb = -Infinity;
  for (let i = lo; i <= hi; i++) maxDb = Math.max(maxDb, db[i]);
  const floorDb = Math.max(maxDb - 40, -90);
  for (let i = lo; i <= hi; i++) {
    const v = db[i];
    if (v < floorDb || v <= db[i - 1] || v < db[i + 1]) continue;
    chroma[pitchClass(hzToMidi(i * binHz))] += Math.pow(10, v / 20);
  }
  const top = Math.max(...chroma);
  return top > 0 ? chroma.map((c) => c / top) : chroma;
}

/** Zoekt de best passende grote of kleine drieklank. Null als er geen duidelijk akkoord klinkt. */
export function detectChord(chroma: number[]): Chord | null {
  const total = chroma.reduce((s, v) => s + v, 0);
  if (total <= 0) return null;
  let best: Chord | null = null;
  let bestScore = 0;
  for (let root = 0; root < 12; root++) {
    for (const minor of [false, true]) {
      const tones = [root, (root + (minor ? 3 : 4)) % 12, (root + 7) % 12];
      // Alle drie de tonen moeten echt hoorbaar zijn, anders is het eerder één noot met boventonen.
      if (tones.some((t) => chroma[t] < 0.25)) continue;
      const score = tones.reduce((s, t) => s + chroma[t], 0) / total;
      if (score > bestScore) {
        bestScore = score;
        best = { root, minor };
      }
    }
  }
  return bestScore >= 0.6 ? best : null;
}

export function chordName(c: Chord): string {
  return pitchClassLetter(c.root) + (c.minor ? 'm' : '');
}

export function sameChord(a: Chord | null, b: Chord | null): boolean {
  return a !== null && b !== null && a.root === b.root && a.minor === b.minor;
}
