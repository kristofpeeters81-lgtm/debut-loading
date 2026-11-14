// Eén les spelen (blok 8). Speel op het echte keyboard (de app luistert via de microfoon)
// of tik op de toetsen op het scherm. Weinig tekst, veel doen. Je kan nooit verliezen.

import { engine } from '../audio/engine';
import { startTracker, type Tracker } from '../audio/tracker';
import { hzToMidi, noteName, pitchClass } from '../dsp/notes';
import { hashFor } from '../app/router';
import { saveStars, settings } from '../app/state';
import { LESSONS, lessonById, type Lesson } from '../lessons/content';
import { LessonRun, type InputResult } from '../lessons/run';
import { NoteEvents } from '../lessons/noteEvents';
import { LETTER_COLORS } from './vrijspelen';
import { starRow } from './lessen';
import { el } from '../ui/dom';

let currentLessonId: string | null = null;

export function openLesson(id: string): void {
  currentLessonId = id;
  location.hash = hashFor('les');
}

const COLOR_OF_PC = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6].map((i) => LETTER_COLORS[i]);
const PRAISE = ['Super!', 'Ja!', 'Top!', 'Mooi!', 'Goed zo!'];
const KB_FROM = 60; // C4
const KB_TO = 76; // E5
const DEMO_STEP_MS = 650;
/** Zo lang na een eigen klank van de app luistert de app niet (anders hoort ze zichzelf). */
const DEAF_AFTER_MS = 450;

const isWhite = (m: number): boolean => [0, 2, 4, 5, 7, 9, 11].includes(pitchClass(m));

/** Klein keyboard (C4–E5) dat een toets kan laten oplichten. */
function lessonKeyboard(onTap: (midi: number) => void): {
  el: HTMLElement;
  target(midi: number | null, hint?: boolean): void;
  flash(midi: number, kind: 'ok' | 'wrong' | 'demo'): void;
} {
  const kb = el('div', 'keyboard lesson-kb');
  const whites: number[] = [];
  for (let m = KB_FROM; m <= KB_TO; m++) if (isWhite(m)) whites.push(m);
  const w = 100 / whites.length;
  const keys = new Map<number, HTMLElement>();
  whites.forEach((m, i) => {
    const key = el('div', 'key white');
    key.dataset.midi = String(m);
    key.style.left = `${i * w}%`;
    key.style.width = `${w}%`;
    const dot = el('span', 'key-dot');
    dot.style.background = COLOR_OF_PC[pitchClass(m)];
    key.append(dot, el('span', 'key-label', noteName(m, settings().notation, pitchClass(m) === 0)));
    kb.append(key);
    keys.set(m, key);
    if (!isWhite(m + 1) && m + 1 <= KB_TO && i < whites.length - 1) {
      const bk = el('div', 'key black');
      bk.dataset.midi = String(m + 1);
      bk.style.left = `${(i + 1) * w - w * 0.3}%`;
      bk.style.width = `${w * 0.6}%`;
      kb.append(bk);
      keys.set(m + 1, bk);
    }
  });
  kb.addEventListener('pointerdown', (e) => {
    const t = e.target instanceof Element ? e.target.closest<HTMLElement>('.key') : null;
    if (!t) return;
    e.preventDefault();
    onTap(Number(t.dataset.midi));
  });
  return {
    el: kb,
    target(midi, hint = false) {
      for (const k of keys.values()) k.classList.remove('target', 'hint');
      if (midi === null) return;
      // Zelfde letter in het getoonde stuk (de octaaf telt niet mee).
      const m = keys.has(midi) ? midi : [...keys.keys()].find((k) => pitchClass(k) === pitchClass(midi));
      if (m !== undefined) keys.get(m)?.classList.add(hint ? 'hint' : 'target');
    },
    flash(midi, kind) {
      const m = keys.has(midi) ? midi : [...keys.keys()].find((k) => pitchClass(k) === pitchClass(midi));
      const k = m === undefined ? undefined : keys.get(m);
      if (!k) return;
      k.classList.remove('flash-ok', 'flash-wrong', 'flash-demo');
      void k.offsetWidth;
      k.classList.add(`flash-${kind}`);
    },
  };
}

export function mountLes(app: HTMLElement): () => void {
  const lesson: Lesson | undefined = currentLessonId ? lessonById(currentLessonId) : undefined;
  if (!lesson) {
    location.replace(hashFor('lessen'));
    return () => undefined;
  }
  let run = new LessonRun(lesson);
  let tracker: Tracker | null = null;
  let alive = true;
  let deafUntil = 0;
  const events = new NoteEvents();
  const timers: number[] = [];
  const later = (fn: () => void, ms: number): void => {
    timers.push(window.setTimeout(() => alive && fn(), ms));
  };
  const name = (m: number): string => noteName(m, settings().notation, false);

  // ---------- Opbouw ----------
  const bar = el('div', 'lesson-progress');
  const fill = el('div', 'lesson-progress-fill');
  bar.append(fill);
  const stage = el('section', 'card lesson-stage');
  const prompt = el('div', 'lesson-prompt', '');
  const big = el('div', 'lesson-big', '');
  const seq = el('div', 'lesson-seq');
  const feedback = el('div', 'lesson-feedback', '');
  const again = el('button', 'pad wide lesson-again', 'Nog eens horen');
  again.hidden = true;
  stage.append(prompt, big, seq, feedback, again);
  const kb = lessonKeyboard((m) => {
    engine.noteOn('piano', m);
    deafUntil = performance.now() + DEAF_AFTER_MS;
    handle(m);
  });
  const micNote = el('p', 'small lesson-mic', '');
  const playArea = el('div', 'lesson-play');
  playArea.append(bar, stage, kb.el, micNote);
  playArea.hidden = true;

  // Intro
  const intro = el('section', 'card lesson-intro');
  const startBtn = el('button', 'big', 'Start');
  intro.append(
    el('div', 'lesson-intro-title', lesson.title),
    el('p', 'lesson-intro-goal', lesson.goal),
    el('p', 'small', 'Speel op je keyboard: de app luistert mee. Tikken op de toetsen hieronder mag ook.'),
    startBtn,
  );
  // Einde
  const end = el('section', 'card lesson-end');
  end.hidden = true;
  app.append(intro, playArea, end);

  // ---------- Weergave ----------
  const render = (): void => {
    fill.style.width = `${Math.round(run.progress * 100)}%`;
    const t = run.task;
    if (!t) return;
    const want = run.expected;
    again.hidden = t.kind !== 'echo' || !run.demoDone;
    seq.replaceChildren();
    if (t.kind === 'find') {
      prompt.textContent = 'Speel de';
      big.textContent = want === null ? '' : name(want);
      big.style.color = want === null ? '' : COLOR_OF_PC[pitchClass(want)];
      kb.target(want);
    } else if (t.kind === 'echo') {
      if (!run.demoDone) {
        prompt.textContent = 'Luister…';
        big.textContent = '';
      } else {
        prompt.textContent = 'Jij!';
        big.textContent = '';
      }
      t.notes.forEach((_, i) => seq.append(el('span', i < run.pos ? 'seq-dot done' : 'seq-dot')));
      kb.target(run.showHint ? want : null, true);
    } else {
      prompt.textContent = t.lyrics?.[run.pos] ?? 'Speel mee';
      big.textContent = want === null ? '' : name(want);
      big.style.color = want === null ? '' : COLOR_OF_PC[pitchClass(want)];
      t.notes.forEach((n, i) => {
        const chip = el('span', i < run.pos ? 'seq-note done' : i === run.pos ? 'seq-note now' : 'seq-note', name(n));
        if (i === run.pos) chip.style.borderColor = COLOR_OF_PC[pitchClass(n)];
        seq.append(chip);
      });
      kb.target(want);
    }
    stage.dataset.task = String(run.taskIndex);
    stage.dataset.expected = want === null ? '' : String(want);
  };

  const playDemo = (): void => {
    const t = run.task;
    if (!t) return;
    t.notes.forEach((n, i) => {
      later(() => {
        engine.noteOn('piano', n).stop();
        kb.flash(n, 'demo');
      }, 300 + i * DEMO_STEP_MS);
    });
    deafUntil = performance.now() + 300 + t.notes.length * DEMO_STEP_MS + DEAF_AFTER_MS;
    later(
      () => {
        run.finishDemo();
        events.reset();
        render();
      },
      300 + t.notes.length * DEMO_STEP_MS,
    );
  };

  const nextTask = (): void => {
    feedback.textContent = '';
    if (run.task?.demo) playDemo();
    render();
  };

  const finish = (): void => {
    tracker?.stop();
    tracker = null;
    const stars = run.stars;
    void saveStars(lesson.id, stars);
    playArea.hidden = true;
    end.hidden = false;
    end.replaceChildren();
    const idx = LESSONS.findIndex((l) => l.id === lesson.id);
    const next = LESSONS[idx + 1];
    const actions = el('div', 'pad-row');
    const retry = el('button', 'pad wide', 'Nog eens');
    retry.addEventListener('click', () => {
      run = new LessonRun(lesson);
      end.hidden = true;
      startBtn.click();
    });
    actions.append(retry);
    if (next) {
      const nb = el('button', 'pad wide lesson-next', 'Volgende les');
      nb.addEventListener('click', () => {
        currentLessonId = next.id;
        location.replace(hashFor('les'));
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      actions.append(nb);
    }
    // Een les wordt altijd vanuit de lessenlijst geopend: één stap terug (geen nieuwe stap in de geschiedenis,
    // anders brengt de terugknop je daarna weer in de les).
    const back = el('button', 'pad wide lesson-back', 'Naar de lessen');
    back.addEventListener('click', () => history.back());
    actions.append(back);
    end.dataset.stars = String(stars);
    end.append(
      el('div', 'lesson-end-title', stars === 3 ? 'Fantastisch!' : stars === 2 ? 'Heel goed!' : 'Goed gedaan!'),
      starRow(stars, 56),
      el('p', 'muted', stars < 3 ? 'Nog eens spelen voor meer sterren? Het mag altijd.' : 'Alle sterren! Je bent klaar voor de volgende les.'),
      actions,
    );
    // Beloning: na een liedje speelt de app het hele liedje nog eens.
    const song = run.tasks.find((t) => t.kind === 'song');
    if (song) song.notes.forEach((n, i) => later(() => engine.noteOn('piano', n).stop(), 400 + i * 380));
  };

  function handle(midi: number): void {
    const result: InputResult = run.input(midi);
    if (result === 'ignored') return;
    if (result === 'wrong') {
      kb.flash(midi, 'wrong');
      feedback.textContent = 'Bijna! Probeer nog eens.';
      feedback.className = 'lesson-feedback wrong';
      render();
      return;
    }
    kb.flash(midi, 'ok');
    feedback.textContent = PRAISE[Math.floor(Math.random() * PRAISE.length)];
    feedback.className = 'lesson-feedback ok';
    if (result === 'lesson-done') {
      render();
      later(finish, 600);
    } else if (result === 'task-done') {
      render();
      later(nextTask, 700);
    } else {
      render();
    }
  }

  startBtn.addEventListener('click', () => {
    intro.hidden = true;
    playArea.hidden = false;
    events.reset();
    nextTask();
    if (tracker) return;
    void startTracker({ minHz: 120, maxHz: 1100 }, (f) => {
      const midi = f.hz === null ? null : Math.round(hzToMidi(f.hz));
      const ev = events.push(midi, f.recentLevel, f.timeMs);
      if (ev !== null && f.timeMs >= deafUntil) handle(ev);
    })
      .then((t) => {
        if (!alive) t.stop();
        else tracker = t;
        micNote.textContent = 'De app luistert mee.';
      })
      .catch(() => {
        micNote.textContent = 'Geen microfoon: tik dan op de toetsen hierboven.';
      });
  });

  return () => {
    alive = false;
    for (const t of timers) window.clearTimeout(t);
    tracker?.stop();
    engine.stopAll();
  };
}
