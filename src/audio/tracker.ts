// Toonvolger: microfoon + YIN in een lus, voor het stemapparaat en het zingen (blok 7).
// Gebruikt dezelfde meting als Luisteroor (blok 1). Er wordt niets opgenomen of verstuurd.

import { startMic, type Mic } from './mic';
import { detectPitch, rms } from '../dsp/yin';

export interface PitchFrame {
  /** Gemeten toonhoogte in Hz, of null bij stilte/geen duidelijke toon. */
  hz: number | null;
  level: number;
  timeMs: number;
}

export interface Tracker {
  stop(): void;
}

/**
 * Start de microfoon en roept `onFrame` aan bij elk beeld (±60 keer per seconde).
 * Gooit een fout als de microfoon niet mag of niet kan (de oproeper toont een melding).
 */
export async function startTracker(
  range: { minHz: number; maxHz: number },
  onFrame: (f: PitchFrame) => void,
  gate = 0.004,
): Promise<Tracker> {
  const mic: Mic = await startMic();
  let alive = true;
  let raf = 0;
  let buf = new Float32Array(mic.pitch.fftSize);
  const tick = (now: number): void => {
    if (!alive) return;
    if (buf.length !== mic.pitch.fftSize) buf = new Float32Array(mic.pitch.fftSize);
    mic.pitch.getFloatTimeDomainData(buf);
    const level = rms(buf);
    const p = level >= gate ? detectPitch(buf, mic.ctx.sampleRate, range.minHz, range.maxHz) : null;
    onFrame({ hz: p ? p.hz : null, level, timeMs: now });
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
