import { describe, expect, it } from 'vitest';
import { LESSONS, lessonById } from './content';
import { LessonRun, starsFor, tasksOf } from './run';
import { NoteEvents } from './noteEvents';
import { KEYBOARD_MAX, KEYBOARD_MIN } from '../screens/vrijspelen';

describe('lesinhoud', () => {
  it('heeft 6 keyboardlessen met unieke ids', () => {
    expect(LESSONS).toHaveLength(6);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(6);
  });

  it('alle noten passen op de Casio SA-76', () => {
    for (const l of LESSONS) for (const t of tasksOf(l)) for (const n of t.notes) expect(n >= KEYBOARD_MIN && n <= KEYBOARD_MAX).toBe(true);
  });

  it('songteksten hebben evenveel lettergrepen als noten', () => {
    for (const l of LESSONS) for (const s of l.steps) if (s.kind === 'song' && s.lyrics) expect(s.lyrics.length).toBe(s.notes.length);
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

  it('sterren: nooit nul', () => {
    expect(starsFor(0)).toBe(3);
    expect(starsFor(4)).toBe(2);
    expect(starsFor(40)).toBe(1);
  });

  it('voortgang loopt van 0 naar 1', () => {
    const run = new LessonRun(lessonById('kb-4-jacob')!);
    expect(run.progress).toBe(0);
    for (const n of run.tasks[0].notes) run.input(n);
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
});
