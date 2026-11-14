// Lesmotor (blok 8): houdt bij welke noot er nu gespeeld moet worden, telt foutjes en geeft sterren.
// Pure logica: geen microfoon, geen scherm. Een les wordt een lijst taken:
//   find  → één taak per noot
//   echo  → één taak per stukje (eerst voorspelen)
//   song  → één taak met alle noten
// Je kan nooit verliezen: een foute noot telt als foutje, en je probeert gewoon opnieuw.

import { pitchClass } from '../dsp/notes';
import type { Lesson, Step } from './content';

export interface Task {
  kind: Step['kind'];
  stepIndex: number;
  notes: number[];
  lyrics?: string[];
  /** Eerst voorspelen (echo). */
  demo: boolean;
}

export type InputResult = 'ignored' | 'ok' | 'wrong' | 'task-done' | 'lesson-done';

export function tasksOf(lesson: Lesson): Task[] {
  const out: Task[] = [];
  lesson.steps.forEach((s, stepIndex) => {
    if (s.kind === 'find') for (const n of s.notes) out.push({ kind: 'find', stepIndex, notes: [n], demo: false });
    else if (s.kind === 'echo') for (const p of s.phrases) out.push({ kind: 'echo', stepIndex, notes: p, demo: true });
    else out.push({ kind: 'song', stepIndex, notes: s.notes, lyrics: s.lyrics, demo: false });
  });
  return out;
}

/** Sterren uit het aantal foutjes: 0–2 → 3, 3–6 → 2, meer → 1. Nooit 0. */
export function starsFor(mistakes: number): number {
  if (mistakes <= 2) return 3;
  if (mistakes <= 6) return 2;
  return 1;
}

export class LessonRun {
  readonly tasks: Task[];
  taskIndex = 0;
  /** Hoeveel noten van de huidige taak al juist gespeeld zijn. */
  pos = 0;
  mistakes = 0;
  /** Foutjes na elkaar op dezelfde noot (na 2 geeft het scherm een hint). */
  wrongStreak = 0;
  /** Is het voorspelen van de huidige echo-taak klaar? */
  demoDone = false;

  constructor(lesson: Lesson) {
    this.tasks = tasksOf(lesson);
  }

  get task(): Task | null {
    return this.tasks[this.taskIndex] ?? null;
  }

  get done(): boolean {
    return this.taskIndex >= this.tasks.length;
  }

  /** De noot die nu gespeeld moet worden (of null tijdens het voorspelen / op het einde). */
  get expected(): number | null {
    const t = this.task;
    if (!t || (t.demo && !this.demoDone)) return null;
    return t.notes[this.pos] ?? null;
  }

  get showHint(): boolean {
    return this.wrongStreak >= 2;
  }

  /** Voortgang 0..1 over alle taken (voor de balk bovenaan). */
  get progress(): number {
    const total = this.tasks.reduce((s, t) => s + t.notes.length, 0);
    const before = this.tasks.slice(0, this.taskIndex).reduce((s, t) => s + t.notes.length, 0);
    return total ? Math.min(1, (before + this.pos) / total) : 1;
  }

  finishDemo(): void {
    this.demoDone = true;
  }

  /** Een gespeelde noot verwerken. Enkel de letter telt (de octaaf niet). */
  input(midi: number): InputResult {
    const want = this.expected;
    if (want === null) return 'ignored';
    if (pitchClass(midi) !== pitchClass(want)) {
      this.mistakes++;
      this.wrongStreak++;
      return 'wrong';
    }
    this.wrongStreak = 0;
    this.pos++;
    if (this.pos < (this.task?.notes.length ?? 0)) return 'ok';
    this.taskIndex++;
    this.pos = 0;
    this.demoDone = false;
    return this.done ? 'lesson-done' : 'task-done';
  }

  get stars(): number {
    return starsFor(this.mistakes);
  }
}
