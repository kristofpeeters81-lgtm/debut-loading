// Van microfoon-metingen naar "noot gespeeld"-gebeurtenissen (blok 8).
// Een noot telt als ze even stabiel klinkt. Dezelfde noot opnieuw telt pas na een nieuwe aanslag
// (stilte ertussen of een plotse sprong in luidheid), zodat C C G G ook werkt.

import { OnsetDetector } from '../dsp/onset';

export class NoteEvents {
  private cand = -1;
  private since = 0;
  private last = -1;
  private armed = true;
  private silentSince = 0;
  private onsets = new OnsetDetector(0.01, 2.5, 120);

  constructor(
    private stableMs = 90,
    private silenceMs = 70,
  ) {}

  /** `midi` = afgeronde noot of null. Geeft het MIDI-nummer terug als er net een noot gespeeld werd. */
  push(midi: number | null, level: number, timeMs: number): number | null {
    if (this.onsets.process(level, timeMs)) this.armed = true;
    if (midi === null) {
      if (this.silentSince === 0) this.silentSince = timeMs;
      if (timeMs - this.silentSince >= this.silenceMs) this.armed = true;
      this.cand = -1;
      return null;
    }
    this.silentSince = 0;
    if (midi !== this.cand) {
      this.cand = midi;
      this.since = timeMs;
    }
    if (timeMs - this.since < this.stableMs) return null;
    if (midi === this.last && !this.armed) return null;
    this.last = midi;
    this.armed = false;
    return midi;
  }

  /** Alles vergeten (bv. na het voorspelen door de app). */
  reset(): void {
    this.cand = -1;
    this.last = -1;
    this.armed = true;
    this.silentSince = 0;
  }
}
