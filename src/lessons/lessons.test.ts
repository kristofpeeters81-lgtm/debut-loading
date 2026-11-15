import { describe, expect, it } from 'vitest';
import { CHORDS, LESSONS, lessonById, lessonsFor } from './content';
import { LessonRun, chordToken, sameToken, starsFor, tasksOf } from './run';
import { NoteEvents } from './noteEvents';
import { BASS_OPEN, GUITAR_OPEN, KEYBOARD_MAX, KEYBOARD_MIN } from '../screens/vrijspelen';
import { DRUM_PADS } from '../audio/synth';
import { pitchClass } from '../dsp/notes';
import { detectChord } from '../dsp/chroma';

const numbers = (lessonId: string): number[] => {
  const out: number[] = [];
  for (const t of tasksOf(lessonById(lessonId)!)) for (const tok of t.tokens) if (typeof tok === 'number') out.push(tok);
  return out;
};

describe('lesinhoud', () => {
  it('heeft lessen voor alle vijf de instrumenten, met unieke ids', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    expect(lessonsFor('keyboard').length).toBeGreaterThanOrEqual(15);
    for (const inst of ['gitaar', 'bas', 'drum', 'zang'] as const) expect(lessonsFor(inst).length).toBeGreaterThanOrEqual(6);
  });

  it('keyboardnoten passen op de Casio SA-76', () => {
    for (const l of lessonsFor('keyboard')) for (const n of numbers(l.id)) expect(n >= KEYBOARD_MIN && n <= KEYBOARD_MAX).toBe(true);
  });

  it('gitaar- en basnoten liggen binnen fret 0–5 (zichtbaar op de hals in de les)', () => {
    const reachable = (open: number[], n: number): boolean => open.some((b) => n - b >= 0 && n - b <= 5);
    for (const l of lessonsFor('gitaar')) for (const n of numbers(l.id)) expect(reachable(GUITAR_OPEN, n)).toBe(true);
    for (const l of lessonsFor('bas')) for (const n of numbers(l.id)) expect(reachable(BASS_OPEN, n)).toBe(true);
  });

  it('gitaarakkoorden liggen als greep op de dunste snaren binnen fret 0–5', () => {
    const lowToHigh = [...GUITAR_OPEN].reverse();
    for (const c of Object.values(CHORDS)) {
      c.gitaar.forEach((n, i) => {
        const f = n - lowToHigh[lowToHigh.length - c.gitaar.length + i];
        expect(f >= 0 && f <= 5).toBe(true);
      });
    }
  });

  it('akkoordnoten horen bij het akkoord (en de herkenning noemt ze juist)', () => {
    for (const [name, c] of Object.entries(CHORDS)) {
      const chroma = new Array<number>(12).fill(0);
      for (const n of c.keyboard) chroma[pitchClass(n)] = 1;
      const found = detectChord(chroma);
      expect(found && found.root === c.root && found.minor === c.minor).toBe(true);
      expect(name.endsWith('m')).toBe(c.minor);
    }
  });

  it('drumritmes gebruiken enkel bestaande pads', () => {
    const pads = new Set(DRUM_PADS.map((p) => p.id));
    for (const l of lessonsFor('drum')) for (const t of tasksOf(l)) for (const tok of t.tokens) expect(pads.has(tok as never)).toBe(true);
  });

  it('toonladders noemen kruisen en mollen correct', () => {
    const goal = (id: string): string => lessonById(id)!.goal;
    expect(goal('kb-3-ladder-e')).toBe('Met F#, G#, C# en D#');
    expect(goal('kb-3-ladder-a')).toBe('Met C#, F# en G#'); // in de volgorde waarin je ze speelt
    expect(goal('kb-3-ladder-f')).toBe('Met Bb');
    expect(goal('kb-3-ladder-dm')).toBe('Met Bb');
    expect(goal('kb-3-ladder-am')).toBe('Enkel witte toetsen');
    expect(lessonById('kb-3-ladder-e')!.title).toBe('Toonladder van E');
  });

  it('elke les heeft een niveau van 1 tot 4', () => {
    for (const l of LESSONS) expect([1, 2, 3, 4]).toContain(l.level ?? 1);
  });

  it('songteksten hebben evenveel lettergrepen als noten', () => {
    for (const l of LESSONS)
      for (const s of l.steps) if ((s.kind === 'song' || s.kind === 'sing') && s.lyrics) expect(s.lyrics.length).toBe(s.notes.length);
  });
});

describe('lesmotor', () => {
  it('speelt een les helemaal uit, met de octaaf vrij', () => {
    const run = new LessonRun(lessonById('kb-1-c')!);
    expect(run.expected).toBe(60);
    expect(run.input(48)).toBe('task-done'); // C3 telt ook als C
    expect(run.input(72)).toBe('task-done');
    expect(run.input(60)).toBe('task-done');
    expect(run.input(62)).toBe('task-done');
    expect(run.input(64)).toBe('lesson-done');
    expect(run.done).toBe(true);
    expect(run.stars).toBe(3);
  });

  it('telt foutjes, geeft een hint na 2 foutjes, en je kan altijd verder', () => {
    const run = new LessonRun(lessonById('kb-1-c')!);
    expect(run.input(62)).toBe('wrong');
    expect(run.showHint).toBe(false);
    expect(run.input(64)).toBe('wrong');
    expect(run.showHint).toBe(true);
    expect(run.input(60)).toBe('task-done');
    expect(run.showHint).toBe(false);
    expect(run.mistakes).toBe(2);
  });

  it('echo: eerst luisteren, dan naspelen', () => {
    const run = new LessonRun(lessonById('kb-2-cde')!);
    run.input(60);
    run.input(62);
    run.input(64); // find klaar
    expect(run.task?.kind).toBe('echo');
    expect(run.expected).toBeNull();
    expect(run.input(60)).toBe('ignored'); // tijdens het voorspelen telt niets
    run.finishDemo();
    expect(run.input(60)).toBe('ok');
    expect(run.input(62)).toBe('ok');
    expect(run.input(64)).toBe('task-done');
    expect(run.expected).toBeNull(); // volgende echo: weer eerst luisteren
  });

  it('akkoorden: losse noten zijn geen fout, overslaan kost niets', () => {
    const run = new LessonRun(lessonById('kb-15-fg')!);
    expect(run.expected).toBe(chordToken('F'));
    expect(run.input(65)).toBe('ignored');
    expect(run.input(chordToken('G'))).toBe('ignored');
    expect(run.input(chordToken('F'))).toBe('task-done');
    expect(run.skip()).toBe('task-done');
    expect(run.mistakes).toBe(0);
  });

  it('drum: ritme eerst voorspelen, dan exact de juiste pads', () => {
    const run = new LessonRun(lessonById('d-1-kick-snare')!);
    expect(run.expected).toBeNull();
    run.finishDemo();
    expect(run.input('snare')).toBe('wrong');
    expect(run.input('kick')).toBe('ok');
    expect(run.input('snare')).toBe('task-done');
  });

  it('zingen: een valse toon is geen foutje, de octaaf maakt niet uit', () => {
    const run = new LessonRun(lessonById('z-1-do')!);
    expect(run.input(62)).toBe('ignored');
    expect(run.input(48)).toBe('task-done');
    expect(run.mistakes).toBe(0);
  });

  it('tokens vergelijken', () => {
    expect(sameToken(48, 72)).toBe(true);
    expect(sameToken('chord:Am', 'chord:Am')).toBe(true);
    expect(sameToken('kick', 'snare')).toBe(false);
  });

  it('sterren: nooit nul', () => {
    expect(starsFor(0)).toBe(3);
    expect(starsFor(4)).toBe(2);
    expect(starsFor(40)).toBe(1);
  });

  it('voortgang loopt van 0 naar 1', () => {
    const run = new LessonRun(lessonById('kb-4-jacob')!);
    expect(run.progress).toBe(0);
    for (const n of run.tasks[0].tokens) run.input(n);
    expect(run.progress).toBe(1);
  });
});

describe('noten herkennen uit de microfoon', () => {
  /** Speelt metingen af zoals de microfoon ze geeft: om de 16 ms. Geeft de herkende noten terug. */
  function feed(ev: NoteEvents, parts: [number | null, number, number][]): number[] {
    const out: number[] = [];
    let t = 0;
    for (const [midi, level, ms] of parts) {
      for (const end = t + ms; t < end; t += 16) {
        const r = ev.push(midi, level, t);
        if (r !== null) out.push(r);
      }
    }
    return out;
  }

  it('een lang aangehouden noot telt één keer', () => {
    expect(feed(new NoteEvents(), [[60, 0.1, 1500]])).toEqual([60]);
  });

  it('een te kort tikje telt niet', () => {
    expect(feed(new NoteEvents(), [[60, 0.1, 50], [null, 0.001, 300]])).toEqual([]);
  });

  it('dezelfde noot opnieuw na een korte stilte telt opnieuw (C C G G)', () => {
    const notes = feed(new NoteEvents(), [
      [60, 0.1, 400],
      [null, 0.001, 100],
      [60, 0.1, 400],
      [null, 0.001, 100],
      [67, 0.1, 400],
      [null, 0.001, 100],
      [67, 0.1, 400],
    ]);
    expect(notes).toEqual([60, 60, 67, 67]);
  });

  it('dezelfde noot opnieuw aangeslagen zonder stilte (luidheid springt) telt ook', () => {
    const notes = feed(new NoteEvents(), [
      [60, 0.1, 600],
      [60, 0.02, 200],
      [60, 0.12, 400],
    ]);
    expect(notes).toEqual([60, 60]);
  });

  it('een andere noot telt meteen (legato)', () => {
    expect(feed(new NoteEvents(), [[60, 0.1, 300], [62, 0.1, 300]])).toEqual([60, 62]);
  });

  it('zingen: de toon telt pas na het vasthouden', () => {
    expect(feed(new NoteEvents(700, 120), [[60, 0.1, 500], [null, 0.001, 200]])).toEqual([]);
    expect(feed(new NoteEvents(700, 120), [[60, 0.1, 900]])).toEqual([60]);
  });
});
