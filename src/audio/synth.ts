// Klanken berekenen (blok 4). Geen geluidsbestanden, geen samples van anderen: alles wordt met gewone
// rekenregels opgebouwd en als buffer teruggegeven. De klankmotor (engine.ts) speelt die buffers af.
// Pure functies → te testen zonder geluidskaart (de toonhoogte wordt nagemeten met YIN uit Luisteroor).

import { Biquad } from '../dsp/biquad';
import { midiToHz } from '../dsp/notes';

/** Voorspelbare ruis (zelfde "toeval" bij elke keer), zodat een klank altijd hetzelfde klinkt en testbaar is. */
export function noise(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    // xorshift32
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
}

function normalize(buf: Float32Array, peak = 0.8): Float32Array {
  let max = 0;
  for (let i = 0; i < buf.length; i++) max = Math.max(max, Math.abs(buf[i]));
  if (max > 0) {
    const g = peak / max;
    for (let i = 0; i < buf.length; i++) buf[i] *= g;
  }
  return buf;
}

/** Zachte uitloop op het einde, zodat er geen klik hoorbaar is. */
function fadeOut(buf: Float32Array, sampleRate: number, ms = 40): Float32Array {
  const n = Math.min(buf.length, Math.round((ms / 1000) * sampleRate));
  for (let i = 0; i < n; i++) buf[buf.length - 1 - i] *= i / n;
  return buf;
}

// ---------- Piano ----------

/**
 * Piano: optelsom van boventonen die elk op hun eigen tempo uitsterven (hoge boventonen sneller),
 * met een kleine "inharmoniciteit" zoals bij echte pianosnaren, en twee licht ontstemde snaren per toets.
 */
export function renderPiano(midi: number, sampleRate: number): Float32Array {
  const f = midiToHz(midi);
  // Lage noten klinken langer na dan hoge.
  const baseTau = Math.max(0.35, Math.min(3, 1.6 * Math.sqrt(261.6 / f)));
  const seconds = Math.min(4, baseTau * 2.2);
  const n = Math.round(seconds * sampleRate);
  const out = new Float32Array(n);
  // Klein genoeg zodat de toon zuiver gemeten wordt (een leerapp moet een juiste referentie geven).
  const B = 0.0001;
  const attack = Math.round(0.004 * sampleRate);
  const detune = [Math.pow(2, -0.6 / 1200), Math.pow(2, 0.6 / 1200)];
  for (let k = 1; k <= 12; k++) {
    const fk = k * f * Math.sqrt(1 + B * k * k);
    if (fk > Math.min(9000, sampleRate * 0.45)) break;
    const amp = 1 / Math.pow(k, 1.25);
    const tau = baseTau / (1 + 0.55 * (k - 1));
    for (const d of detune) {
      const w = (2 * Math.PI * fk * d) / sampleRate;
      const decay = Math.exp(-1 / (tau * sampleRate));
      let env = amp;
      for (let i = 0; i < n; i++) {
        const a = i < attack ? i / attack : 1;
        out[i] += a * env * Math.sin(w * i);
        env *= decay;
      }
    }
  }
  return fadeOut(normalize(out, 0.7), sampleRate);
}

// ---------- Snaren (Karplus-Strong) ----------

export interface StringOptions {
  /** Hoe lang de snaar naklinkt (tijd tot -60 dB) in seconden. */
  ringSeconds: number;
  /** 0 = dof (bas), 1 = helder. */
  brightness: number;
  /** Waar de snaar aangeslagen wordt (0..0.5), bepaalt de klankkleur. */
  pluckPosition: number;
  seconds: number;
  seed?: number;
}

export const GUITAR: StringOptions = { ringSeconds: 3.2, brightness: 0.75, pluckPosition: 0.18, seconds: 3 };
export const BASS: StringOptions = { ringSeconds: 4, brightness: 0.35, pluckPosition: 0.25, seconds: 3 };

/**
 * Getokkelde snaar volgens Karplus-Strong: een kort ruisstootje loopt rond in een vertragingslijn
 * zo lang als één trilling, en wordt bij elke ronde een beetje gedempt. Een allpass-filter stemt de
 * lengte fijn af tot op een fractie van een sample, zodat de toon zuiver gestemd is (belangrijk voor een leerapp).
 */
export function renderString(midi: number, sampleRate: number, opt: StringOptions): Float32Array {
  const f = midiToHz(midi);
  const n = Math.round(opt.seconds * sampleRate);
  const out = new Float32Array(n);
  const P = sampleRate / f; // gewenste lengte van één trilling in samples
  const N = Math.max(2, Math.floor(P - 0.5 - 0.1)); // vertragingslijn; 0,5 komt van het middelingsfilter
  const d = P - 0.5 - N; // rest (0,1..1,1) → allpass
  const C = (1 - d) / (1 + d);
  // Demping per ronde zodat de snaar na ringSeconds 60 dB stiller is.
  const g = Math.pow(0.001, 1 / (opt.ringSeconds * f));

  // Aanslag: ruisstootje, dof of helder gemaakt, met een "kam" voor de plaats van het tokkelen.
  const rnd = noise(opt.seed ?? Math.round(midi * 7919));
  const exc = new Float32Array(N);
  let lp = 0;
  const alpha = 0.15 + 0.85 * opt.brightness;
  for (let i = 0; i < N; i++) {
    lp += alpha * (rnd() - lp);
    exc[i] = lp;
  }
  const pick = Math.max(1, Math.round(opt.pluckPosition * N));
  for (let i = N - 1; i >= pick; i--) exc[i] -= exc[i - pick];

  let apX1 = 0;
  let apY1 = 0;
  for (let i = 0; i < n; i++) {
    const a = i - N >= 0 ? out[i - N] : 0;
    const b = i - N - 1 >= 0 ? out[i - N - 1] : 0;
    const loss = g * 0.5 * (a + b);
    const ap = C * loss + apX1 - C * apY1;
    apX1 = loss;
    apY1 = ap;
    out[i] = (i < N ? exc[i] : 0) + ap;
  }
  // Bas iets ronder maken.
  if (opt.brightness < 0.5) new Biquad('lowpass', 1800, sampleRate).processBuffer(out);
  return fadeOut(normalize(out, 0.75), sampleRate, 80);
}

// ---------- Drum ----------

export type DrumPad = 'kick' | 'snare' | 'hihat' | 'open-hihat' | 'tom-hoog' | 'tom-laag' | 'crash' | 'clap';

export const DRUM_PADS: { id: DrumPad; label: string }[] = [
  { id: 'kick', label: 'Basdrum' },
  { id: 'snare', label: 'Snare' },
  { id: 'hihat', label: 'Hi-hat' },
  { id: 'open-hihat', label: 'Open hi-hat' },
  { id: 'tom-hoog', label: 'Tom hoog' },
  { id: 'tom-laag', label: 'Tom laag' },
  { id: 'crash', label: 'Crash' },
  { id: 'clap', label: 'Klap' },
];

/** Toon die snel in toonhoogte zakt (basdrum, toms). */
function sweep(out: Float32Array, sr: number, from: number, to: number, sweepTau: number, ampTau: number, gain: number): void {
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    const f = to + (from - to) * Math.exp(-t / sweepTau);
    phase += (2 * Math.PI * f) / sr;
    out[i] += gain * Math.sin(phase) * Math.exp(-t / ampTau);
  }
}

function noiseBurst(out: Float32Array, sr: number, seed: number, ampTau: number, gain: number, start = 0): void {
  const rnd = noise(seed);
  const s0 = Math.round(start * sr);
  for (let i = s0; i < out.length; i++) out[i] += gain * rnd() * Math.exp(-(i - s0) / sr / ampTau);
}

export function renderDrum(pad: DrumPad, sr: number): Float32Array {
  const len = (s: number): Float32Array => new Float32Array(Math.round(s * sr));
  let out: Float32Array;
  switch (pad) {
    case 'kick':
      out = len(0.6);
      sweep(out, sr, 160, 48, 0.035, 0.3, 1);
      noiseBurst(out, sr, 11, 0.004, 0.25);
      break;
    case 'snare': {
      out = len(0.45);
      const body = len(0.45);
      sweep(body, sr, 240, 185, 0.02, 0.08, 0.6);
      const rattle = len(0.45);
      noiseBurst(rattle, sr, 23, 0.13, 0.8);
      new Biquad('highpass', 1200, sr).processBuffer(rattle);
      for (let i = 0; i < out.length; i++) out[i] = body[i] + rattle[i];
      break;
    }
    case 'hihat':
    case 'open-hihat': {
      out = len(pad === 'hihat' ? 0.15 : 0.7);
      noiseBurst(out, sr, 37, pad === 'hihat' ? 0.025 : 0.22, 1);
      new Biquad('highpass', 7000, sr).processBuffer(out);
      new Biquad('peaking', 10000, sr, 1, 6).processBuffer(out);
      break;
    }
    case 'tom-hoog':
      out = len(0.6);
      sweep(out, sr, 260, 190, 0.05, 0.22, 1);
      noiseBurst(out, sr, 41, 0.01, 0.15);
      break;
    case 'tom-laag':
      out = len(0.8);
      sweep(out, sr, 150, 100, 0.06, 0.3, 1);
      noiseBurst(out, sr, 43, 0.01, 0.15);
      break;
    case 'crash':
      out = len(2.2);
      noiseBurst(out, sr, 53, 0.8, 1);
      new Biquad('highpass', 4000, sr).processBuffer(out);
      break;
    case 'clap':
      out = len(0.5);
      for (const [k, start] of [0, 0.011, 0.022].entries()) noiseBurst(out, sr, 61 + k, 0.008, 0.9, start);
      noiseBurst(out, sr, 67, 0.12, 0.5, 0.03);
      new Biquad('peaking', 1500, sr, 0.8, 8).processBuffer(out);
      new Biquad('highpass', 700, sr).processBuffer(out);
      break;
  }
  return fadeOut(normalize(out, 0.85), sr, 20);
}

// ---------- Metronoom ----------

/** Kort tiktakje: hoger voor de eerste tel van de maat. */
export function renderClick(accent: boolean, sr: number): Float32Array {
  const out = new Float32Array(Math.round(0.05 * sr));
  const f = accent ? 1600 : 1000;
  for (let i = 0; i < out.length; i++) out[i] = Math.sin((2 * Math.PI * f * i) / sr) * Math.exp(-i / sr / 0.008);
  return normalize(out, accent ? 0.9 : 0.6);
}

/**
 * Welke tellen vallen in het tijdvenster [from, to)? Tel 0 valt op `start`.
 * De metronoom plant zo telkens een klein stukje vooruit, wat veel stabieler is dan een timer per tel.
 */
export function beatsInWindow(start: number, bpm: number, from: number, to: number): { index: number; time: number }[] {
  const step = 60 / bpm;
  const first = Math.max(0, Math.ceil((from - start) / step - 1e-9));
  const out: { index: number; time: number }[] = [];
  for (let i = first; start + i * step < to; i++) out.push({ index: i, time: start + i * step });
  return out;
}
