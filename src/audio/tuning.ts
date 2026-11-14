// Rekenregels voor het stemapparaat en het zangbereik (blok 7). Pure functies, geen microfoon.

import { hzToMidi } from '../dsp/notes';

export type TuneState = 'veel te laag' | 'iets te laag' | 'juist' | 'iets te hoog' | 'veel te hoog';

/** Binnen ±5 cent = juist (dat hoort bijna niemand). Verder dan 25 cent = "veel". */
export const IN_TUNE_CENTS = 5;
const FAR_CENTS = 25;

/** Welke losse snaar is het dichtst bij deze toon, en hoeveel cent zit de toon ernaast? */
export function nearestString(hz: number, openStrings: number[]): { index: number; cents: number } {
  const m = hzToMidi(hz);
  let best = 0;
  for (let i = 1; i < openStrings.length; i++) {
    if (Math.abs(m - openStrings[i]) < Math.abs(m - openStrings[best])) best = i;
  }
  return { index: best, cents: Math.round((m - openStrings[best]) * 100) };
}

/** Cent naar woorden: het kind ziet nooit getallen (beslissing blok 1). */
export function tuneState(cents: number): TuneState {
  if (Math.abs(cents) <= IN_TUNE_CENTS) return 'juist';
  if (cents < -FAR_CENTS) return 'veel te laag';
  if (cents < 0) return 'iets te laag';
  if (cents > FAR_CENTS) return 'veel te hoog';
  return 'iets te hoog';
}

/** Mediaan van de laatste metingen: een uitschieter doet de naald niet springen. */
export class Smoother {
  private values: number[] = [];

  constructor(private size = 5) {}

  push(v: number): number {
    this.values.push(v);
    if (this.values.length > this.size) this.values.shift();
    const sorted = [...this.values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  reset(): void {
    this.values = [];
  }
}

/**
 * Zangbereik: een noot telt pas mee als ze `holdMs` lang vast gehouden wordt (zo telt een
 * kraakje of een uitschieter niet). Onthoudt de laagste en hoogste vastgehouden noot.
 */
export class RangeMeter {
  low: number | null = null;
  high: number | null = null;
  private cand = -1;
  private since = 0;

  constructor(private holdMs = 500) {}

  /** `midi` = afgeronde noot of null (stilte). Geeft true als het bereik veranderde. */
  push(midi: number | null, timeMs: number): boolean {
    if (midi === null) {
      this.cand = -1;
      return false;
    }
    if (midi !== this.cand) {
      this.cand = midi;
      this.since = timeMs;
      return false;
    }
    if (timeMs - this.since < this.holdMs) return false;
    let changed = false;
    if (this.low === null || midi < this.low) {
      this.low = midi;
      changed = true;
    }
    if (this.high === null || midi > this.high) {
      this.high = midi;
      changed = true;
    }
    return changed;
  }

  reset(): void {
    this.low = null;
    this.high = null;
    this.cand = -1;
  }
}

/** Grove stemsoort voor uitleg aan het kind (geen oordeel, enkel "waar zit jouw stem"). */
export function voiceDescription(low: number, high: number): string {
  const mid = (low + high) / 2;
  if (mid >= 67) return 'Een hoge stem: liedjes rond de hoge do (C5) passen je goed.';
  if (mid >= 60) return 'Een middenstem: liedjes rond de middelste do (C4) passen je goed.';
  if (mid >= 52) return 'Een lagere stem: liedjes iets onder de middelste do passen je goed.';
  return 'Een lage stem: liedjes rond de lage do (C3) passen je goed.';
}
