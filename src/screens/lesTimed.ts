// In de maat (niveau 5): een rij vakjes, één per noot, met een cursor die meeloopt met de metronoom.
// Eerst speelt de app het voor (met 4 tellen aftellen), daarna jij. Per noot: op tijd / te vroeg / te laat / gemist.

import { engine, type Voice } from '../audio/engine';
import type { DrumPad } from '../audio/synth';
import type { Task, Token } from '../lessons/run';
import { TimingJudge } from '../lessons/timing';
import type { Surface } from './lesSurfaces';
import { el } from '../ui/dom';

const COUNT_IN = 4;

export interface TimedPanel {
  el: HTMLElement;
  /** Iets gespeeld op tijdstip tMs (performance.now()-klok). */
  input(token: Token, tMs: number): void;
  stop(): void;
}

export function timedPanel(opts: {
  task: Task;
  label: (t: Token) => string;
  surface: Surface;
  voice: Voice;
  /** Zolang luistert de microfoon niet (de app speelt zelf). */
  setDeaf: (untilMs: number) => void;
  onDone: (misses: number) => void;
}): TimedPanel {
  const { task, surface } = opts;
  const beats = task.timed?.beats ?? [];
  const bpm = task.timed?.bpm ?? 80;
  const beatMs = 60000 / bpm;
  const pattern = task.tokens.map((token, i) => ({ token, beat: beats[i] ?? i }));
  const lastBeat = Math.max(...beats, 0);

  const box = el('div', 'timed');
  const row = el('div', 'timed-row');
  const cells = pattern.map((p) => {
    const c = el('div', 'timed-cell', opts.label(p.token));
    c.dataset.token = String(p.token);
    // Breedte volgens de lengte tot de volgende noot (lange noten = breder vakje).
    const next = pattern.find((q) => q.beat > p.beat)?.beat ?? p.beat + 1;
    c.style.flexGrow = String(Math.max(0.5, next - p.beat));
    row.append(c);
    return c;
  });
  const count = el('div', 'timed-count', '');
  const verdict = el('div', 'timed-verdict', '');
  const listen = el('button', 'pad wide', 'Luister');
  const go = el('button', 'pad wide timed-go', 'Ik speel!');
  const buttons = el('div', 'pad-row lesson-buttons');
  buttons.append(listen, go);
  box.append(row, count, verdict, buttons);

  let judge: TimingJudge | null = null;
  let raf = 0;
  let timers: number[] = [];
  let busy = false;
  const clear = (): void => {
    for (const t of timers) window.clearTimeout(t);
    timers = [];
    cancelAnimationFrame(raf);
    engine.stopMetronome();
  };

  /** Metronoom + 4 tellen aftellen. Geeft het tijdstip van tel 0 terug. */
  const countIn = (): number => {
    engine.startMetronome(bpm, 4);
    const t0 = performance.now() + 100 + COUNT_IN * beatMs;
    for (let i = 0; i < COUNT_IN; i++) {
      timers.push(window.setTimeout(() => (count.textContent = String(COUNT_IN - i)), 100 + i * beatMs));
    }
    timers.push(window.setTimeout(() => (count.textContent = ''), 100 + COUNT_IN * beatMs));
    return t0;
  };

  const cursor = (t0: number): void => {
    const now = performance.now();
    const beat = (now - t0) / beatMs;
    cells.forEach((c, i) => c.classList.toggle('now', beat >= pattern[i].beat - 0.15 && beat < (pattern[i + 1]?.beat ?? pattern[i].beat + 1) - 0.15));
    const next = pattern.find((p) => p.beat >= beat - 0.2);
    surface.target(next && next.beat - beat < 1 ? next.token : null);
  };

  const demo = (): void => {
    if (busy) return;
    busy = true;
    clear();
    verdict.textContent = 'Luister…';
    const t0 = countIn();
    for (const p of pattern) {
      timers.push(
        window.setTimeout(() => {
          if (typeof p.token === 'number') engine.noteOn(opts.voice, p.token).stop();
          else engine.drum(p.token as DrumPad);
          surface.flash(p.token, 'demo');
        }, t0 - performance.now() + p.beat * beatMs),
      );
    }
    const end = t0 + (lastBeat + 1) * beatMs;
    opts.setDeaf(end + 300);
    const loop = (): void => {
      cursor(t0);
      if (performance.now() < end) raf = requestAnimationFrame(loop);
      else {
        clear();
        for (const c of cells) c.classList.remove('now');
        surface.target(null);
        verdict.textContent = 'Nu jij! Tik op "Ik speel!"';
        busy = false;
      }
    };
    raf = requestAnimationFrame(loop);
  };

  const play = (): void => {
    if (busy) return;
    busy = true;
    clear();
    verdict.textContent = 'Klaar…';
    for (const c of cells) c.classList.remove('hit', 'miss', 'early', 'late');
    const t0 = countIn();
    judge = new TimingJudge(pattern, bpm, t0);
    const loop = (): void => {
      if (!judge) return;
      const now = performance.now();
      cursor(t0);
      for (const m of judge.update(now)) cells[judge.events.indexOf(m)]?.classList.add('miss');
      if (judge.done(now)) {
        const j = judge;
        judge = null;
        clear();
        surface.target(null);
        const total = j.events.length;
        const hits = total - j.misses;
        verdict.textContent = hits === total ? `Alles geraakt! ${j.onTime} van ${total} precies op tijd.` : `${hits} van ${total} geraakt.`;
        box.dataset.misses = String(j.misses);
        busy = false;
        timers.push(window.setTimeout(() => opts.onDone(j.misses), 1400));
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  };

  listen.addEventListener('click', demo);
  go.addEventListener('click', play);
  // Eerst voorspelen, zoals bij de echo-opdrachten.
  timers.push(window.setTimeout(demo, 400));

  return {
    el: box,
    input(token, tMs) {
      if (!judge) return;
      const r = judge.input(token, tMs);
      if (r.result !== 'hit') return;
      const i = judge.events.indexOf(r.event);
      cells[i]?.classList.add('hit', r.verdict === 'te vroeg' ? 'early' : r.verdict === 'te laat' ? 'late' : 'ontime');
      verdict.textContent = r.verdict === 'op tijd' ? 'Op tijd!' : r.verdict === 'te vroeg' ? 'Iets te vroeg' : 'Iets te laat';
      surface.flash(token, 'ok');
    },
    stop() {
      judge = null;
      clear();
    },
  };
}
