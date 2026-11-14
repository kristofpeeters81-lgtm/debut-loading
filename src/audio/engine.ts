// Klankmotor (blok 4): speelt piano, gitaar, bas, drum en metronoom af via de luidspreker of hoofdtelefoon.
// Klanken worden één keer berekend (synth.ts) en daarna bewaard in het geheugen, zodat een aanslag meteen klinkt.

import { BASS, GUITAR, beatsInWindow, renderClick, renderDrum, renderPiano, renderString, type DrumPad } from './synth';

export type Voice = 'piano' | 'gitaar' | 'bas';

export interface NoteHandle {
  /** Toets/snaar loslaten: de klank sterft snel uit. */
  stop(): void;
}

const RELEASE: Record<Voice, number> = { piano: 0.25, gitaar: 0.6, bas: 0.6 };
const MAX_VOICES = 32;

interface Playing {
  src: AudioBufferSourceNode;
  gain: GainNode;
}

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private cache = new Map<string, AudioBuffer>();
  private playing: Playing[] = [];
  private metro: { timer: number; start: number; bpm: number; beatsPerBar: number; nextFrom: number } | null = null;
  /** Telt hoeveel klanken er gestart zijn (handig voor tests). */
  plays = 0;

  /** Start de geluidsmotor. Moet gebeuren na een tik van de gebruiker (regel van Android/Chrome). */
  private audio(): { ctx: AudioContext; master: GainNode } {
    if (!this.ctx || !this.master) {
      const ctx = new AudioContext({ latencyHint: 'interactive' });
      // Begrenzer: veel noten tegelijk mogen nooit kraken.
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.15;
      const master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(limiter);
      limiter.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return { ctx: this.ctx, master: this.master };
  }

  private buffer(key: string, render: (sr: number) => Float32Array): AudioBuffer {
    const { ctx } = this.audio();
    let buf = this.cache.get(key);
    if (!buf) {
      const data = render(ctx.sampleRate);
      buf = ctx.createBuffer(1, data.length, ctx.sampleRate);
      buf.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
      this.cache.set(key, buf);
    }
    return buf;
  }

  private voiceBuffer(voice: Voice, midi: number): AudioBuffer {
    return this.buffer(`${voice}:${midi}`, (sr) =>
      voice === 'piano' ? renderPiano(midi, sr) : renderString(midi, sr, voice === 'gitaar' ? GUITAR : BASS),
    );
  }

  private start(buf: AudioBuffer, volume: number, when = 0): Playing {
    const { ctx, master } = this.audio();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(master);
    src.start(when > 0 ? when : 0);
    const p: Playing = { src, gain };
    this.playing.push(p);
    src.onended = () => {
      this.playing = this.playing.filter((x) => x !== p);
      gain.disconnect();
    };
    // Te veel klanken tegelijk: de oudste zacht laten stoppen.
    if (this.playing.length > MAX_VOICES) this.release(this.playing[0], 0.05);
    this.plays++;
    return p;
  }

  private release(p: Playing, seconds: number): void {
    const { ctx } = this.audio();
    const t = ctx.currentTime;
    p.gain.gain.cancelScheduledValues(t);
    p.gain.gain.setValueAtTime(p.gain.gain.value, t);
    p.gain.gain.setTargetAtTime(0, t, seconds / 4);
    try {
      p.src.stop(t + seconds);
    } catch {
      // al gestopt
    }
  }

  /** Bereidt klanken alvast voor (bv. bij het openen van een scherm), zodat de eerste aanslag niet hapert. */
  prepare(voice: Voice, midis: number[]): void {
    for (const m of midis) this.voiceBuffer(voice, m);
  }

  noteOn(voice: Voice, midi: number, velocity = 0.8): NoteHandle {
    const p = this.start(this.voiceBuffer(voice, midi), 0.25 + 0.75 * velocity);
    let stopped = false;
    return {
      stop: () => {
        if (stopped) return;
        stopped = true;
        this.release(p, RELEASE[voice]);
      },
    };
  }

  /** Akkoord tokkelen: snaren kort na elkaar (zoals een aanslag met een plectrum). */
  strum(voice: Voice, midis: number[], spreadMs = 25, velocity = 0.7): void {
    const { ctx } = this.audio();
    midis.forEach((m, i) => this.start(this.voiceBuffer(voice, m), 0.25 + 0.75 * velocity, ctx.currentTime + (i * spreadMs) / 1000));
  }

  drum(pad: DrumPad, velocity = 0.9): void {
    this.start(
      this.buffer(`drum:${pad}`, (sr) => renderDrum(pad, sr)),
      0.25 + 0.75 * velocity,
    );
  }

  // ---------- Metronoom ----------

  get metronomeRunning(): boolean {
    return this.metro !== null;
  }

  startMetronome(bpm: number, beatsPerBar = 4): void {
    this.stopMetronome();
    const { ctx } = this.audio();
    const start = ctx.currentTime + 0.1;
    this.metro = { timer: 0, start, bpm, beatsPerBar, nextFrom: start };
    // Om de 25 ms een stukje van 0,12 s vooruit plannen: de tikken zelf zet de geluidskaart exact op tijd.
    const schedule = (): void => {
      const m = this.metro;
      if (!m || !this.ctx) return;
      const to = this.ctx.currentTime + 0.12;
      for (const b of beatsInWindow(m.start, m.bpm, m.nextFrom, to)) {
        const accent = b.index % m.beatsPerBar === 0;
        this.start(this.buffer(`click:${accent}`, (sr) => renderClick(accent, sr)), 0.9, b.time);
      }
      m.nextFrom = Math.max(m.nextFrom, to);
    };
    schedule();
    this.metro.timer = window.setInterval(schedule, 25);
  }

  /** Tempo aanpassen zonder te haperen: de volgende tel komt na één tel in het nieuwe tempo. */
  setMetronomeBpm(bpm: number): void {
    const m = this.metro;
    if (!m || !this.ctx) return;
    // Laatste geplande tel opzoeken en daar opnieuw beginnen tellen.
    const step = 60 / m.bpm;
    const lastIndex = Math.floor((m.nextFrom - m.start) / step - 1e-9);
    const lastTime = m.start + lastIndex * step;
    const nextIndex = lastIndex + 1;
    m.bpm = bpm;
    // Zo kiezen dat tel `nextIndex` in het nieuwe tempo valt op lastTime + nieuwe tel; telindex blijft doorlopen (accent klopt).
    m.start = lastTime + 60 / bpm - nextIndex * (60 / bpm);
  }

  stopMetronome(): void {
    if (this.metro) window.clearInterval(this.metro.timer);
    this.metro = null;
  }

  /** Alles stil (bv. bij het verlaten van een scherm). */
  stopAll(): void {
    this.stopMetronome();
    for (const p of [...this.playing]) this.release(p, 0.05);
  }
}

/** Eén klankmotor voor de hele app. */
export const engine = new SoundEngine();
