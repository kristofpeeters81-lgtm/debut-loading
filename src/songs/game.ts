// Spel met vallende noten (blok 9): pure spellogica, zonder scherm of geluid (goed te testen).
// - "Wacht op mij": de tijd staat stil bij elke noot tot je ze speelt (een foute noot tijdens het wachten = foutje).
// - Zonder wachten: de noten lopen door; raak je ze binnen ±300 ms, dan telt het. Gemist = geen straf, enkel minder sterren.
// - Tempo 40–100 %. "Stukje herhalen": de huidige 2 maten blijven herhalen.
// Enkel de letter telt (de octaaf niet), zoals in de lessen.

import { pitchClass } from '../dsp/notes';
import { starsFor } from '../lessons/run';
import { songLength, type Song } from './songs';

export const HIT_WINDOW_MS = 300;
export const MIN_TEMPO = 0.4;
export const MAX_TEMPO = 1;

export interface GameNote {
  midi: number;
  beat: number;
  len: number;
  state: 'open' | 'hit' | 'miss';
}

export type GameInput = { result: 'hit'; note: GameNote } | { result: 'wrong' } | { result: 'ignored' };

export class Game {
  readonly notes: GameNote[];
  readonly length: number;
  /** Positie in het liedje, in tellen. Begint 2 tellen vóór de eerste noot (aftellen). */
  beat: number;
  wait: boolean;
  tempo: number;
  mistakes = 0;
  loop: { from: number; to: number } | null = null;
  /** Wachten we op een noot (enkel in "Wacht op mij")? */
  waiting = false;

  constructor(
    readonly song: Song,
    opts: { wait: boolean; tempo: number },
  ) {
    this.notes = song.notes.map((n) => ({ ...n, state: 'open' as const }));
    this.length = songLength(song);
    this.beat = -2;
    this.wait = opts.wait;
    this.tempo = clampTempo(opts.tempo);
  }

  get msPerBeat(): number {
    return 60000 / (this.song.bpm * this.tempo);
  }

  get finished(): boolean {
    return this.loop === null && this.beat >= this.length + 1;
  }

  /** De eerste noot die nog gespeeld moet worden. */
  get nextOpen(): GameNote | null {
    return this.notes.find((n) => n.state === 'open') ?? null;
  }

  get hits(): number {
    return this.notes.filter((n) => n.state === 'hit').length;
  }

  /** Tijd laten lopen. Geeft terug welke noten net gemist werden (enkel zonder wachten). */
  update(dtMs: number): GameNote[] {
    const missed: GameNote[] = [];
    let next = this.beat + dtMs / this.msPerBeat;
    if (this.wait) {
      const n = this.nextOpen;
      this.waiting = n !== null && next >= n.beat;
      if (n && next > n.beat) next = n.beat;
    } else {
      this.waiting = false;
      const limit = HIT_WINDOW_MS / this.msPerBeat;
      for (const n of this.notes) {
        if (n.state === 'open' && next - n.beat > limit) {
          n.state = 'miss';
          missed.push(n);
        }
      }
    }
    this.beat = next;
    if (this.loop && this.beat >= this.loop.to) this.restartLoop();
    return missed;
  }

  /** Een gespeelde noot verwerken. */
  input(midi: number): GameInput {
    if (this.wait) {
      const n = this.nextOpen;
      if (!n) return { result: 'ignored' };
      // Mag een beetje vroeg (een halve tel), anders wacht de noot nog.
      if (n.beat - this.beat > 0.5) return { result: 'ignored' };
      if (pitchClass(midi) === pitchClass(n.midi)) {
        n.state = 'hit';
        this.waiting = false;
        return { result: 'hit', note: n };
      }
      if (!this.waiting) return { result: 'ignored' };
      this.mistakes++;
      return { result: 'wrong' };
    }
    const limit = HIT_WINDOW_MS / this.msPerBeat;
    const n = this.notes.find((x) => x.state === 'open' && Math.abs(x.beat - this.beat) <= limit && pitchClass(x.midi) === pitchClass(midi));
    if (!n) return { result: 'ignored' };
    n.state = 'hit';
    return { result: 'hit', note: n };
  }

  setTempo(t: number): void {
    this.tempo = clampTempo(t);
  }

  /** Herhaal de 2 maten rond de huidige positie (of zet herhalen uit). */
  toggleLoop(): void {
    if (this.loop) {
      this.loop = null;
      return;
    }
    const bar = this.song.beatsPerBar;
    const from = Math.max(0, Math.floor(Math.max(0, this.beat) / bar) * bar);
    this.loop = { from, to: Math.min(this.length, from + 2 * bar) };
    if (this.loop.to - this.loop.from < bar) this.loop.from = Math.max(0, this.loop.to - 2 * bar);
  }

  private restartLoop(): void {
    if (!this.loop) return;
    for (const n of this.notes) if (n.beat >= this.loop.from && n.beat < this.loop.to) n.state = 'open';
    this.beat = this.loop.from - 1;
  }

  /** Sterren: met wachten volgens foutjes (zoals de lessen), zonder wachten volgens geraakte noten. */
  get stars(): number {
    if (this.wait) return starsFor(this.mistakes);
    const part = this.hits / this.notes.length;
    return part >= 0.9 ? 3 : part >= 0.7 ? 2 : 1;
  }
}

export function clampTempo(t: number): number {
  return Math.max(MIN_TEMPO, Math.min(MAX_TEMPO, Math.round(t * 10) / 10));
}
