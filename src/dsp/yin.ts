// Live toonhoogte meten met het YIN-algoritme (de Cheveigné & Kawahara, 2002) — klassieke signaalverwerking, geen AI.
// Afgeleid van SingApp (src/dsp/pitch.ts), maar voor één kort stukje microfoongeluid per keer
// en met een lagere ondergrens zodat ook de laagste bassnaar (E1 ≈ 41 Hz) meetelt.

import { Biquad } from './biquad';

export interface PitchResult {
  hz: number;
  /** 0..1 — hoe zuiver/periodiek het geluid is. */
  clarity: number;
}

// Rekenen op ±12 kHz is ruim genoeg voor grondtonen tot ±2 kHz en houdt het snel.
const TARGET_RATE = 12000;
const THRESHOLD = 0.15;
const FALLBACK_MAX = 0.35;

/** Gemiddelde luidheid (RMS) van een buffer, eventueel enkel het laatste stuk. */
export function rms(buf: Float32Array, last = buf.length): number {
  const from = Math.max(0, buf.length - last);
  let s = 0;
  for (let i = from; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / Math.max(1, buf.length - from));
}

function downsample(frame: Float32Array, sampleRate: number, factor: number): Float32Array {
  if (factor === 1) return frame;
  const cutoff = (sampleRate / factor) * 0.4;
  const lp1 = new Biquad('lowpass', cutoff, sampleRate);
  const lp2 = new Biquad('lowpass', cutoff, sampleRate);
  const out = new Float32Array(Math.floor(frame.length / factor));
  for (let i = 0, o = 0; i < frame.length && o < out.length; i++) {
    const y = lp2.process(lp1.process(frame[i]));
    if (i % factor === 0) out[o++] = y;
  }
  return out;
}

/** Meet de grondtoon van één stukje geluid. Geeft null bij ruis, stilte of buiten het bereik. */
export function detectPitch(frame: Float32Array, sampleRate: number, minHz: number, maxHz: number): PitchResult | null {
  const factor = Math.max(1, Math.floor(sampleRate / TARGET_RATE));
  const rate = sampleRate / factor;
  const x = downsample(frame, sampleRate, factor);
  const tauMin = Math.max(2, Math.floor(rate / maxHz));
  const tauMax = Math.min(Math.ceil(rate / minHz), Math.floor(x.length / 2));
  if (tauMax <= tauMin + 2) return null;
  const w = x.length - tauMax;

  // Cumulatief genormaliseerde verschilfunctie.
  const d = new Float32Array(tauMax + 1);
  d[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let j = 0; j < w; j++) {
      const diff = x[j] - x[j + tau];
      sum += diff * diff;
    }
    running += sum;
    d[tau] = running > 0 ? (sum * tau) / running : 1;
  }

  // Eerste dal onder de drempel; anders het diepste dal als het nog redelijk is.
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (d[t] < THRESHOLD) {
      while (t + 1 <= tauMax && d[t + 1] < d[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) {
    let best = tauMin;
    for (let t = tauMin + 1; t <= tauMax; t++) if (d[t] < d[best]) best = t;
    if (d[best] > FALLBACK_MAX) return null;
    tau = best;
  }

  // Paraboolinterpolatie voor een nauwkeuriger resultaat.
  let better = tau;
  if (tau > 1 && tau < tauMax) {
    const s0 = d[tau - 1];
    const s1 = d[tau];
    const s2 = d[tau + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (Math.abs(denom) > 1e-9) better = tau + (s2 - s0) / denom;
  }
  const hz = rate / better;
  if (hz < minHz * 0.97 || hz > maxHz * 1.03) return null;
  return { hz, clarity: Math.max(0, Math.min(1, 1 - d[tau])) };
}
