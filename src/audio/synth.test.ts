import { describe, expect, it } from 'vitest';
import { detectPitch } from '../dsp/yin';
import { hzToMidi, midiToHz } from '../dsp/notes';
import { BASS, DRUM_PADS, GUITAR, beatsInWindow, renderClick, renderDrum, renderPiano, renderString } from './synth';

const SR = 48000;

/** Meet de toonhoogte (in cent naast de bedoelde noot) in een stukje kort na de aanslag. */
function centsError(buf: Float32Array, midi: number, minHz: number, maxHz: number): number {
  const frame = buf.slice(Math.round(0.15 * SR), Math.round(0.15 * SR) + 4096);
  const p = detectPitch(frame, SR, minHz, maxHz);
  if (!p) return Infinity;
  return (hzToMidi(p.hz) - midi) * 100;
}

const finite = (buf: Float32Array): boolean => buf.every((v) => Number.isFinite(v) && Math.abs(v) <= 1);

describe('klanken (synth)', () => {
  it('piano is zuiver gestemd over het bereik van de Casio SA-76 (F2–C6)', () => {
    for (const m of [41, 48, 60, 69, 72, 84]) {
      const buf = renderPiano(m, SR);
      expect(finite(buf)).toBe(true);
      expect(Math.abs(centsError(buf, m, 50, 2100))).toBeLessThan(8);
    }
  });

  it('gitaarsnaren zijn zuiver gestemd (losse snaren E2–E4)', () => {
    for (const m of [40, 45, 50, 55, 59, 64]) {
      const buf = renderString(m, SR, GUITAR);
      expect(finite(buf)).toBe(true);
      expect(Math.abs(centsError(buf, m, 70, 1000))).toBeLessThan(8);
    }
  });

  it('bassnaren zijn zuiver gestemd (E1–G2)', () => {
    for (const m of [28, 33, 38, 43]) {
      const buf = renderString(m, SR, BASS);
      expect(finite(buf)).toBe(true);
      expect(Math.abs(centsError(buf, m, 35, 400))).toBeLessThan(8);
    }
  });

  it('werkt ook bij 44,1 kHz', () => {
    const buf = renderString(52, 44100, GUITAR);
    const frame = buf.slice(6000, 6000 + 4096);
    const p = detectPitch(frame, 44100, 70, 1000);
    expect(p && Math.abs(hzToMidi(p.hz) - 52) * 100).toBeLessThan(8);
  });

  it('een snaar sterft uit', () => {
    const buf = renderString(45, SR, GUITAR);
    const energy = (a: number, b: number): number => buf.slice(a, b).reduce((s, v) => s + v * v, 0);
    expect(energy(SR * 2, SR * 2.5)).toBeLessThan(energy(SR * 0.1, SR * 0.6) / 10);
  });

  it('elke drumpad geeft een geldige, hoorbare klank', () => {
    for (const { id } of DRUM_PADS) {
      const buf = renderDrum(id, SR);
      expect(buf.length).toBeGreaterThan(SR * 0.1);
      expect(finite(buf)).toBe(true);
      expect(Math.max(...buf.slice(0, SR * 0.05).map(Math.abs))).toBeGreaterThan(0.2);
    }
  });

  it('metronoomtik: de eerste tel is hoger', () => {
    const hi = detectPitch(renderClick(true, SR).slice(0, 2048), SR, 200, 2100);
    const lo = detectPitch(renderClick(false, SR).slice(0, 2048), SR, 200, 2100);
    expect(hi && lo && hi.hz > lo.hz).toBe(true);
    expect(midiToHz(69)).toBeCloseTo(440);
  });
});

describe('metronoom (planning)', () => {
  it('vindt de tellen in een tijdvenster', () => {
    // 120 bpm = om de 0,5 s
    expect(beatsInWindow(10, 120, 10, 11.2)).toEqual([
      { index: 0, time: 10 },
      { index: 1, time: 10.5 },
      { index: 2, time: 11 },
    ]);
    expect(beatsInWindow(10, 120, 10.6, 11.05)).toEqual([{ index: 2, time: 11 }]);
    expect(beatsInWindow(10, 120, 10.1, 10.4)).toEqual([]);
  });

  it('mist en verdubbelt geen tellen over opeenvolgende vensters', () => {
    const seen: number[] = [];
    for (let t = 0; t < 30; t += 0.025) for (const b of beatsInWindow(0, 97, t, t + 0.025)) seen.push(b.index);
    expect(seen).toEqual(Array.from({ length: seen.length }, (_, i) => i));
    expect(seen.length).toBe(Math.ceil((30 * 97) / 60));
  });
});
