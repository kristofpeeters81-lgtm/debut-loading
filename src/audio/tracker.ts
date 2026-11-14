// Toonvolger: microfoon + YIN in een lus, voor het stemapparaat, het zingen en de lessen.
// Gebruikt dezelfde meting als Luisteroor (blok 1). Optioneel ook akkoorden (chroma).
// Er wordt niets opgenomen of verstuurd.

import { startMic, type Mic } from './mic';
import { detectPitch, rms } from '../dsp/yin';
import { chromaFromSpectrum, detectChord, sameChord, type Chord } from '../dsp/chroma';

export interface PitchFrame {
  /** Gemeten toonhoogte in Hz, of null bij stilte/geen duidelijke toon. */
  hz: number | null;
  level: number;
  /** Luidheid van het nieuwste stukje (±10 ms), om een nieuwe aanslag te zien. */
  recentLevel: number;
  /** Akkoord dat al 300 ms stabiel klinkt (enkel met `chords: true`). */
  chord: Chord | null;
  timeMs: number;
}

export interface Tracker {
  stop(): void;
}

const CHORD_STABLE_MS = 300;

/**
 * Start de microfoon en roept `onFrame` aan bij elk beeld (±60 keer per seconde).
 * Gooit een fout als de microfoon niet mag of niet kan (de oproeper toont een melding).
 */
export async function startTracker(
  range: { minHz: number; maxHz: number; chords?: boolean },
  onFrame: (f: PitchFrame) => void,
  gate = 0.004,
): Promise<Tracker> {
  const mic: Mic = await startMic();
  let alive = true;
  let raf = 0;
  let frame = 0;
  let buf = new Float32Array(mic.pitch.fftSize);
  let spec = new Float32Array(mic.spectrum.frequencyBinCount);
  let chordCand: Chord | null = null;
  let chordSince = 0;
  let stableChord: Chord | null = null;
  const tick = (now: number): void => {
    if (!alive) return;
    if (buf.length !== mic.pitch.fftSize) buf = new Float32Array(mic.pitch.fftSize);
    mic.pitch.getFloatTimeDomainData(buf);
    const level = rms(buf);
    const p = level >= gate ? detectPitch(buf, mic.ctx.sampleRate, range.minHz, range.maxHz) : null;
    if (range.chords && frame++ % 3 === 0) {
      if (spec.length !== mic.spectrum.frequencyBinCount) spec = new Float32Array(mic.spectrum.frequencyBinCount);
      mic.spectrum.getFloatFrequencyData(spec);
      const chord = level >= gate ? detectChord(chromaFromSpectrum(spec, mic.ctx.sampleRate / mic.spectrum.fftSize)) : null;
      if (!sameChord(chord, chordCand)) {
        chordCand = chord;
        chordSince = now;
      }
      stableChord = chordCand && now - chordSince >= CHORD_STABLE_MS ? chordCand : null;
    }
    onFrame({ hz: p ? p.hz : null, level, recentLevel: rms(buf, 512), chord: stableChord, timeMs: now });
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return {
    stop() {
      alive = false;
      cancelAnimationFrame(raf);
      mic.stop();
    },
  };
}

/** Uitleg bij een microfoonfout, in kindertaal. */
export function micErrorText(err: unknown): string {
  if (!window.isSecureContext || !navigator.mediaDevices) return 'De microfoon werkt alleen via de app of een https-adres.';
  const name = err instanceof DOMException ? err.name : '';
  return name === 'NotAllowedError'
    ? 'De app mag de microfoon niet gebruiken. Tik op het slotje naast het adres en zet de microfoon aan.'
    : 'De microfoon kon niet starten. Probeer opnieuw.';
}
