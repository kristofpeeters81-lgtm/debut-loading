import { describe, expect, it } from 'vitest';
import { detectPitch } from './yin';
import { centsOff, hzToMidi, letterName, midiToHz, solfegeName } from './notes';
import { chromaFromSpectrum, detectChord } from './chroma';
import { OnsetDetector } from './onset';

const SR = 48000;

/** Toon met boventonen (zoals een snaar): grondtoon + afnemende harmonischen. */
function tone(hz: number, harmonics = [1, 0.6, 0.4, 0.25], len = 4096, sr = SR): Float32Array {
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    let v = 0;
    harmonics.forEach((a, k) => {
      v += a * Math.sin((2 * Math.PI * hz * (k + 1) * i) / sr);
    });
    out[i] = 0.2 * v;
  }
  return out;
}

function detectedMidi(buf: Float32Array, minHz: number, maxHz: number, sr = SR): number {
  const p = detectPitch(buf, sr, minHz, maxHz);
  return p ? Math.round(hzToMidi(p.hz)) : -1;
}

describe('notes', () => {
  it('benoemt noten met letters en do-re-mi', () => {
    expect(letterName(60)).toBe('C4');
    expect(letterName(28)).toBe('E1');
    expect(letterName(70, false)).toBe('A#');
    expect(solfegeName(71)).toBe('si');
    expect(solfegeName(67)).toBe('sol');
  });

  it('rekent heen en terug tussen Hz en MIDI', () => {
    expect(hzToMidi(440)).toBeCloseTo(69);
    expect(midiToHz(60)).toBeCloseTo(261.63, 1);
    expect(centsOff(midiToHz(64) * Math.pow(2, 20 / 1200))).toBe(20);
  });
});

describe('toonhoogte (YIN)', () => {
  it.each([
    ['bas E1', 28, 35, 400],
    ['bas G2', 43, 35, 400],
    ['gitaar E2', 40, 70, 1000],
    ['gitaar E4', 64, 70, 1000],
    ['keyboard C3', 48, 50, 2100],
    ['keyboard C6', 84, 50, 2100],
    ['stem A4', 69, 80, 1100],
  ])('herkent %s', (_name, midi, minHz, maxHz) => {
    expect(detectedMidi(tone(midiToHz(midi)), minHz, maxHz)).toBe(midi);
  });

  it('werkt ook op 44,1 kHz', () => {
    expect(detectedMidi(tone(midiToHz(45), undefined, 4096, 44100), 70, 1000, 44100)).toBe(45);
  });

  it('herkent een bastoon met zwakke grondtoon (sterke 2e boventoon)', () => {
    expect(detectedMidi(tone(midiToHz(33), [0.4, 1, 0.5, 0.3]), 35, 400)).toBe(33);
  });

  it('geeft niets bij stilte of ruis', () => {
    expect(detectPitch(new Float32Array(4096), SR, 50, 2100)).toBeNull();
    let seed = 1;
    const noise = new Float32Array(4096).map(() => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647 - 0.5;
    });
    expect(detectPitch(noise, SR, 50, 2100)).toBeNull();
  });
});

describe('akkoorden', () => {
  const binHz = SR / 8192;
  function spectrum(freqs: number[]): Float32Array {
    const db = new Float32Array(4096).fill(-100);
    for (const f of freqs) db[Math.round(f / binHz)] = -20;
    return db;
  }

  it('herkent C groot en A klein', () => {
    expect(detectChord(chromaFromSpectrum(spectrum([261.63, 329.63, 392.0]), binHz))).toEqual({ root: 0, minor: false });
    expect(detectChord(chromaFromSpectrum(spectrum([220.0, 261.63, 329.63]), binHz))).toEqual({ root: 9, minor: true });
  });

  it('ziet één noot met zwakke boventonen niet als akkoord', () => {
    const db = spectrum([261.63, 523.25, 784.0]);
    db[Math.round(1308.1 / binHz)] = -45; // zwakke 5e harmonische (E)
    expect(detectChord(chromaFromSpectrum(db, binHz))).toBeNull();
  });
});

describe('klappen', () => {
  it('telt een plotse sprong één keer', () => {
    const d = new OnsetDetector();
    const hits = [0.001, 0.001, 0.3, 0.25, 0.1, 0.001, 0.001].map((lvl, i) => d.process(lvl, i * 16));
    expect(hits.filter(Boolean)).toHaveLength(1);
  });
});
