// Timing beoordelen (niveau 5 "In de maat"): wanneer speel je, niet enkel wat.
// Pure logica: tijden in ms. Op tijd = binnen ±120 ms, net = binnen ±250 ms. Te laat of nooit = gemist (geen straf, enkel minder sterren).

import { sameToken, type Token } from './run';

export const ON_TIME_MS = 120;
export const WINDOW_MS = 250;

export interface TimedEvent {
  token: Token;
  /** Wanneer de noot gespeeld moet worden (ms, zelfde klok als de invoer). */
  t: number;
  state: 'open' | 'hit' | 'miss';
  /** Afwijking in ms (negatief = te vroeg). */
  err?: number;
}

export type TimingResult =
  | { result: 'hit'; event: TimedEvent; verdict: 'op tijd' | 'te vroeg' | 'te laat' }
  | { result: 'ignored' };

export class TimingJudge {
  readonly events: TimedEvent[];

  constructor(pattern: { token: Token; beat: number }[], bpm: number, startMs: number) {
    const beatMs = 60000 / bpm;
    this.events = pattern.map((p) => ({ token: p.token, t: startMs + p.beat * beatMs, state: 'open' as const }));
  }

  /** Iets gespeeld op tijdstip `tMs`: telt voor de vroegste open noot die past en binnen het venster valt. */
  input(token: Token, tMs: number): TimingResult {
    const ev = this.events.find((e) => e.state === 'open' && Math.abs(tMs - e.t) <= WINDOW_MS && sameToken(token, e.token));
    if (!ev) return { result: 'ignored' };
    ev.state = 'hit';
    ev.err = Math.round(tMs - ev.t);
    const verdict = Math.abs(ev.err) <= ON_TIME_MS ? 'op tijd' : ev.err < 0 ? 'te vroeg' : 'te laat';
    return { result: 'hit', event: ev, verdict };
  }

  /** Noten waarvan het venster voorbij is, worden "gemist". Geeft de nieuw gemiste terug. */
  update(nowMs: number): TimedEvent[] {
    const missed: TimedEvent[] = [];
    for (const e of this.events) {
      if (e.state === 'open' && nowMs - e.t > WINDOW_MS) {
        e.state = 'miss';
        missed.push(e);
      }
    }
    return missed;
  }

  done(nowMs: number): boolean {
    const last = this.events[this.events.length - 1];
    return !last || nowMs - last.t > WINDOW_MS;
  }

  get misses(): number {
    return this.events.filter((e) => e.state !== 'hit').length;
  }

  /** Geraakte noten die ook echt op tijd waren (voor de uitleg na afloop). */
  get onTime(): number {
    return this.events.filter((e) => e.state === 'hit' && Math.abs(e.err ?? 999) <= ON_TIME_MS).length;
  }
}
