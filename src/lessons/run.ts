// Lesmotor: houdt bij wat er nu gespeeld moet worden, telt foutjes en geeft sterren.
// Pure logica: geen microfoon, geen scherm. Een les wordt een lijst taken:
//   find   → één taak per noot          sing  → één taak per toon
//   echo   → één taak per stukje (eerst voorspelen)
//   rhythm → één taak per ritme (eerst voorspelen)
//   song   → één taak met alle noten     chord → één taak per akkoord (overslaan mag altijd, kost niets)
//   timed  → één taak per oefening in de maat (de schermlogica meet de timing, zie timing.ts)
// Een "token" is een noot (MIDI-nummer, enkel de letter telt), een akkoord ("chord:Am") of een drumpad ("snare").
// Je kan nooit verliezen: een fout telt als foutje, en je probeert gewoon opnieuw.

import { pitchClass } from '../dsp/notes';
import type { Lesson, Step } from './content';

export type Token = number | string;

export interface Task {
  kind: Step['kind'];
  stepIndex: number;
  tokens: Token[];
  lyrics?: string[];
  /** Eerst voorspelen (echo, ritme). */
  demo: boolean;
  /** Overslaan mag zonder foutje (akkoorden). */
  skippable: boolean;
  /** Ritme: tempo van het voorspelen. */
  bpm?: number;
  /** Zang: hoe lang de toon vastgehouden moet worden. */
  holdMs?: number;
  /** Tab tonen (gitaar/bas). */
  tab?: boolean;
  /** In de maat: op welke tel elk token valt, en het tempo. */
  timed?: { beats: number[]; bpm: number };
}

export type InputResult = 'ignored' | 'ok' | 'wrong' | 'task-done' | 'lesson-done';

export const chordToken = (name: string): string => `chord:${name}`;

export function tasksOf(lesson: Lesson): Task[] {
  const out: Task[] = [];
  const base = { demo: false, skippable: false };
  lesson.steps.forEach((s, stepIndex) => {
    switch (s.kind) {
      case 'find':
        for (const n of s.notes) out.push({ ...base, kind: 'find', stepIndex, tokens: [n] });
        break;
      case 'echo':
        for (const p of s.phrases) out.push({ ...base, kind: 'echo', stepIndex, tokens: p, demo: true });
        break;
      case 'song':
        out.push({ ...base, kind: 'song', stepIndex, tokens: s.notes, lyrics: s.lyrics, tab: s.tab });
        break;
      case 'timed':
        out.push({
          ...base,
          kind: 'timed',
          stepIndex,
          tokens: s.events.map((e) => e.token),
          demo: true,
          timed: { beats: s.events.map((e) => e.beat), bpm: s.bpm },
        });
        break;
      case 'chord':
        for (const c of s.chords) out.push({ ...base, kind: 'chord', stepIndex, tokens: [chordToken(c)], skippable: true });
        break;
      case 'rhythm':
        for (const p of s.patterns) out.push({ ...base, kind: 'rhythm', stepIndex, tokens: p, demo: true, bpm: s.bpm });
        break;
      case 'sing':
        s.notes.forEach((n, i) =>
          out.push({
            ...base,
            kind: 'sing',
            stepIndex,
            tokens: [n],
            skippable: true,
            holdMs: s.holdMs ?? 700,
            lyrics: s.lyrics ? [s.lyrics[i]] : undefined,
          }),
        );
        break;
    }
  });
  return out;
}

/** Klopt het gespeelde met wat verwacht wordt? Noten: enkel de letter. Akkoorden en pads: exact. */
export function sameToken(played: Token, wanted: Token): boolean {
  if (typeof played === 'number' && typeof wanted === 'number') return pitchClass(played) === pitchClass(wanted);
  return played === wanted;
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
  /** Hoeveel tokens van de huidige taak al juist gespeeld zijn. */
  pos = 0;
  mistakes = 0;
  /** Foutjes na elkaar op hetzelfde token (na 2 geeft het scherm een hint). */
  wrongStreak = 0;
  /** Is het voorspelen van de huidige taak klaar? */
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

  /** Wat nu gespeeld moet worden (of null tijdens het voorspelen / op het einde). */
  get expected(): Token | null {
    const t = this.task;
    if (!t || (t.demo && !this.demoDone)) return null;
    return t.tokens[this.pos] ?? null;
  }

  get showHint(): boolean {
    return this.wrongStreak >= 2;
  }

  /** Voortgang 0..1 over alle taken (voor de balk bovenaan). */
  get progress(): number {
    const total = this.tasks.reduce((s, t) => s + t.tokens.length, 0);
    const before = this.tasks.slice(0, this.taskIndex).reduce((s, t) => s + t.tokens.length, 0);
    return total ? Math.min(1, (before + this.pos) / total) : 1;
  }

  finishDemo(): void {
    this.demoDone = true;
  }

  private advance(): InputResult {
    this.taskIndex++;
    this.pos = 0;
    this.wrongStreak = 0;
    this.demoDone = false;
    return this.done ? 'lesson-done' : 'task-done';
  }

  /** Iets gespeeld (noot, akkoord of drumpad). */
  input(played: Token): InputResult {
    const want = this.expected;
    if (want === null) return 'ignored';
    if (!sameToken(played, want)) {
      // Akkoorden en zingen: zoeken is geen fout (een losse noot bij een akkoord, een valse toon bij zingen).
      if (this.task?.kind === 'chord' || this.task?.kind === 'sing') return 'ignored';
      this.mistakes++;
      this.wrongStreak++;
      return 'wrong';
    }
    this.wrongStreak = 0;
    this.pos++;
    if (this.pos < (this.task?.tokens.length ?? 0)) return 'ok';
    return this.advance();
  }

  /** In de maat: de beurt is voorbij; gemiste tellen tellen als foutjes (enkel minder sterren). */
  completeTimed(misses: number): InputResult {
    if (this.task?.kind !== 'timed') return 'ignored';
    this.mistakes += misses;
    return this.advance();
  }

  /** Overslaan (enkel waar het mag, bv. akkoorden): kost niets. */
  skip(): InputResult {
    if (!this.task?.skippable) return 'ignored';
    return this.advance();
  }

  get stars(): number {
    return starsFor(this.mistakes);
  }
}
