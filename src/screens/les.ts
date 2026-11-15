// Eén les spelen. Speel op het echte instrument (de app luistert via de microfoon) of tik op het scherm.
// Drum: tikken op de pads. Zang: enkel via de microfoon. Weinig tekst, veel doen. Je kan nooit verliezen.

import { engine, type Voice } from '../audio/engine';
import type { DrumPad } from '../audio/synth';
import { startTracker, type Tracker } from '../audio/tracker';
import { hzToMidi, noteName, pitchClass } from '../dsp/notes';
import { chordName } from '../dsp/chroma';
import { hashFor } from '../app/router';
import { saveStars, settings } from '../app/state';
import { CHORDS, LESSONS, lessonById, type ChordName, type Lesson } from '../lessons/content';
import { LessonRun, chordToken, type InputResult, type Token } from '../lessons/run';
import { NoteEvents } from '../lessons/noteEvents';
import { starRow } from './lessen';
import { COLOR_OF_PC, drumSurface, keyboardSurface, neckSurface, singSurface, type Surface } from './lesSurfaces';
import { DRUM_PADS } from '../audio/synth';
import { el } from '../ui/dom';
import { timedPanel, type TimedPanel } from './lesTimed';
import { BASS_STRINGS, GUITAR_STRINGS, placeOnNeck } from '../songs/arrange';

let currentLessonId: string | null = null;

export function openLesson(id: string): void {
  currentLessonId = id;
  location.hash = hashFor('les');
}

const PRAISE = ['Super!', 'Ja!', 'Top!', 'Mooi!', 'Goed zo!'];
const DEMO_STEP_MS = 650;
/** Zo lang na een eigen klank van de app luistert de app niet (anders hoort ze zichzelf). */
const DEAF_AFTER_MS = 450;
/** Tikken op het scherm: akkoordtonen die binnen deze tijd samen getikt worden, tellen als akkoord. */
const CHORD_TAP_MS = 1800;
/** Vertraging van de microfoonherkenning (stabiel na ±90 ms + venster), voor de timinglessen. */
const MIC_LAG_MS = 100;

const MIC_RANGE: Record<string, { minHz: number; maxHz: number }> = {
  keyboard: { minHz: 120, maxHz: 1100 },
  gitaar: { minHz: 70, maxHz: 1000 },
  bas: { minHz: 35, maxHz: 400 },
  zang: { minHz: 80, maxHz: 1100 },
};

/** Keyboardbereik voor een les: van de C onder de laagste noot tot minstens E erboven (C4–E5 als standaard). */
function keyboardRange(lesson: Lesson): [number, number] {
  const notes: number[] = [];
  for (const s of lesson.steps) {
    if (s.kind === 'find' || s.kind === 'song') notes.push(...s.notes);
    if (s.kind === 'timed') for (const e of s.events) if (typeof e.token === 'number') notes.push(e.token);
    if (s.kind === 'echo') for (const p of s.phrases) notes.push(...p);
    if (s.kind === 'chord') for (const c of s.chords) notes.push(...CHORDS[c].keyboard);
  }
  const low = Math.min(60, ...notes);
  const high = Math.max(76, ...notes);
  return [low - pitchClass(low), high];
}

export function mountLes(app: HTMLElement): () => void {
  const lesson: Lesson | undefined = currentLessonId ? lessonById(currentLessonId) : undefined;
  if (!lesson) {
    location.replace(hashFor('lessen'));
    return () => undefined;
  }
  const inst = lesson.instrument;
  const voice: Voice = inst === 'gitaar' ? 'gitaar' : inst === 'bas' ? 'bas' : 'piano';
  const usesChords = lesson.steps.some((s) => s.kind === 'chord');
  let run = new LessonRun(lesson);
  let tracker: Tracker | null = null;
  let alive = true;
  let deafUntil = 0;
  let events = new NoteEvents();
  let lastChord: string | null = null;
  let chordTaps: { midi: number; t: number }[] = [];
  let holdStart = 0;
  let holdPc = -1;
  let timed: TimedPanel | null = null;
  const tabStrings = inst === 'bas' ? BASS_STRINGS : GUITAR_STRINGS; // laag → hoog
  /** "fret 3 op de B-snaar" kort: "3 (B)". */
  const fretLabel = (m: number): string => {
    const p = placeOnNeck(m, tabStrings, 5) ?? placeOnNeck(m, tabStrings);
    return p ? `${p.fret}` : name(m);
  };
  /** Tab zoals op internet: één lijn per snaar (dunste bovenaan), fretnummers op de juiste lijn. */
  const tabView = (tokens: Token[], pos: number): HTMLElement => {
    const box = el('div', 'tab-view');
    const lines = [...tabStrings].reverse();
    for (const open of lines) {
      const line = el('div', 'tab-line');
      line.append(el('span', 'tab-string', noteName(open, settings().notation, false)));
      tokens.forEach((tok, i) => {
        const p = typeof tok === 'number' ? (placeOnNeck(tok, tabStrings, 5) ?? placeOnNeck(tok, tabStrings)) : null;
        const onThis = p !== null && tabStrings[p.string] === open;
        const cell = el('span', i === pos ? 'tab-cell now' : i < pos ? 'tab-cell done' : 'tab-cell', onThis ? String(p.fret) : '');
        line.append(cell);
      });
      box.append(line);
    }
    return box;
  };
  const timers: number[] = [];
  const later = (fn: () => void, ms: number): void => {
    timers.push(window.setTimeout(() => alive && fn(), ms));
  };
  const flats = lesson.flats === true;
  const name = (m: number): string => noteName(m, settings().notation, false, flats);
  const padLabel = (p: string): string => DRUM_PADS.find((d) => d.id === p)?.label ?? p;

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
  const skip = el('button', 'pad wide lesson-skip', 'Verder');
  const btnRow = el('div', 'pad-row lesson-buttons');
  btnRow.append(again, skip);
  stage.append(prompt, big, seq, feedback, btnRow);

  const tapNote = (m: number): void => {
    engine.noteOn(voice, m);
    deafUntil = performance.now() + DEAF_AFTER_MS;
    if (run.task?.kind === 'timed') {
      timed?.input(m, performance.now());
      return;
    }
    if (run.task?.kind === 'chord') {
      const now = performance.now();
      chordTaps = chordTaps.filter((x) => now - x.t < CHORD_TAP_MS).concat({ midi: m, t: now });
      const want = run.expected;
      const c = typeof want === 'string' ? (want.slice(6) as ChordName) : null;
      if (c && CHORDS[c].keyboard.every((n) => chordTaps.some((x) => pitchClass(x.midi) === pitchClass(n)))) {
        chordTaps = [];
        handle(want as string);
      }
      return;
    }
    handle(m);
  };

  let sing: ReturnType<typeof singSurface> | null = null;
  const surface: Surface =
    inst === 'keyboard'
      ? keyboardSurface(...keyboardRange(lesson), tapNote)
      : inst === 'gitaar' || inst === 'bas'
        ? neckSurface(inst, tapNote)
        : inst === 'drum'
          ? drumSurface((p: DrumPad) => {
              engine.drum(p);
              if (run.task?.kind === 'timed') timed?.input(p, performance.now());
              else handle(p);
            })
          : (sing = singSurface(() => playReference()));
  const micNote = el('p', 'small lesson-mic', '');
  const playArea = el('div', 'lesson-play');
  playArea.append(bar, stage, surface.el, micNote);
  playArea.hidden = true;

  // Intro
  const intro = el('section', 'card lesson-intro');
  const startBtn = el('button', 'big', 'Start');
  const howTo: Record<string, string> = {
    keyboard: 'Speel op je keyboard: de app luistert mee. Tikken op de toetsen hieronder mag ook.',
    gitaar: 'Speel op je gitaar: de app luistert mee. Tikken op de hals hieronder mag ook. Eerst stemmen? Dat kan bij Vrij spelen.',
    bas: 'Speel op je bas: de app luistert mee. Tikken op de hals hieronder mag ook.',
    drum: 'Luister naar het ritme en tik het daarna na op de pads.',
    zang: 'Luister naar de toon en zing hem na. De app luistert mee via de microfoon.',
  };
  intro.append(el('div', 'lesson-intro-title', lesson.title), el('p', 'lesson-intro-goal', lesson.goal), el('p', 'small', howTo[inst]), startBtn);
  const end = el('section', 'card lesson-end');
  end.hidden = true;
  app.append(intro, playArea, end);

  // ---------- Weergave ----------
  // Keyboard: lage noten (linkerhand, onder C4) met hun octaaf erbij, zodat "C3" en "C" verschillen.
  const label = (t: Token): string =>
    typeof t === 'number'
      ? inst === 'keyboard' && t < 60
        ? noteName(t, settings().notation, true, flats)
        : name(t)
      : t.startsWith('chord:')
        ? t.slice(6)
        : padLabel(t);

  const render = (): void => {
    fill.style.width = `${Math.round(run.progress * 100)}%`;
    const t = run.task;
    if (!t) return;
    const want = run.expected;
    again.hidden = t.kind === 'timed' || !((t.demo && run.demoDone) || t.kind === 'chord');
    again.textContent = t.kind === 'chord' ? 'Hoor het akkoord' : 'Nog eens horen';
    skip.hidden = !t.skippable;
    seq.replaceChildren();
    big.style.color = '';
    const colorOf = (tok: Token | null): string => (typeof tok === 'number' ? COLOR_OF_PC[pitchClass(tok)] : '');
    switch (t.kind) {
      case 'find':
        prompt.textContent = 'Speel de';
        big.textContent = want === null ? '' : label(want);
        big.style.color = colorOf(want);
        surface.target(want);
        break;
      case 'echo':
      case 'rhythm':
        prompt.textContent = run.demoDone ? 'Jij!' : 'Luister…';
        big.textContent = '';
        t.tokens.forEach((_, i) => seq.append(el('span', i < run.pos ? 'seq-dot done' : 'seq-dot')));
        surface.target(run.showHint ? want : null, true);
        break;
      case 'song':
        prompt.textContent = t.lyrics?.[run.pos] ?? (t.tab ? 'Lees de tab' : 'Speel mee');
        big.textContent = want === null ? '' : t.tab && typeof want === 'number' ? fretLabel(want) : label(want);
        big.style.color = colorOf(want);
        if (t.tab) {
          seq.append(tabView(t.tokens, run.pos));
          surface.target(want);
          break;
        }
        t.tokens.forEach((n, i) => {
          const chip = el('span', i < run.pos ? 'seq-note done' : i === run.pos ? 'seq-note now' : 'seq-note', label(n));
          if (i === run.pos) chip.style.borderColor = colorOf(n);
          seq.append(chip);
        });
        surface.target(want);
        break;
      case 'chord':
        prompt.textContent = 'Speel het akkoord';
        big.textContent = want === null ? '' : label(want);
        surface.target(want);
        break;
      case 'timed':
        prompt.textContent = 'In de maat';
        big.textContent = '';
        if (timed) seq.append(timed.el);
        break;
      case 'sing':
        prompt.textContent = t.lyrics?.[0] ?? 'Zing de';
        big.textContent = want === null ? '' : label(want);
        big.style.color = colorOf(want);
        surface.target(want);
        break;
    }
    stage.dataset.task = String(run.taskIndex);
    stage.dataset.kind = t.kind;
    stage.dataset.expected = want === null ? '' : String(want);
  };

  function playReference(): void {
    const want = run.expected;
    if (typeof want !== 'number') return;
    engine.noteOn('piano', want).stop();
    later(() => engine.noteOn('piano', want).stop(), 10);
    deafUntil = performance.now() + 900 + DEAF_AFTER_MS;
    holdStart = 0;
  }

  const playDemo = (): void => {
    const t = run.task;
    if (!t) return;
    const step = t.kind === 'rhythm' && t.bpm ? 60000 / t.bpm : DEMO_STEP_MS;
    t.tokens.forEach((tok, i) => {
      later(() => {
        if (typeof tok === 'number') engine.noteOn(voice, tok).stop();
        else engine.drum(tok as DrumPad);
        surface.flash(tok, 'demo');
      }, 300 + i * step);
    });
    deafUntil = performance.now() + 300 + t.tokens.length * step + DEAF_AFTER_MS;
    later(
      () => {
        run.finishDemo();
        events.reset();
        render();
      },
      300 + t.tokens.length * step,
    );
  };

  const nextTask = (): void => {
    feedback.textContent = '';
    timed?.stop();
    timed = null;
    if (run.task?.kind === 'timed') {
      timed = timedPanel({
        task: run.task,
        label,
        surface,
        voice,
        setDeaf: (until) => (deafUntil = until),
        onDone: (misses) => {
          timed?.stop();
          timed = null;
          const r = run.completeTimed(misses);
          if (r === 'lesson-done') later(finish, 300);
          else later(nextTask, 300);
        },
      });
    }
    chordTaps = [];
    lastChord = null;
    holdStart = 0;
    const t = run.task;
    if (t?.kind === 'sing') {
      events = new NoteEvents(t.holdMs ?? 700, 120);
      later(playReference, 250);
    }
    // In de maat heeft een eigen voorspelen (met metronoom en aftellen), zie lesTimed.ts.
    if (t?.demo && t.kind !== 'timed') playDemo();
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
    const sameInst = LESSONS.filter((l) => l.instrument === inst);
    const next = sameInst[sameInst.findIndex((l) => l.id === lesson.id) + 1];
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
    // Een les wordt altijd vanuit de lessenlijst geopend: één stap terug (geen nieuwe stap in de geschiedenis).
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
    if (song)
      song.tokens.forEach((n, i) => {
        if (typeof n === 'number') later(() => engine.noteOn(voice, n).stop(), 400 + i * 380);
      });
  };

  function handle(played: Token): void {
    const result: InputResult = run.input(played);
    afterInput(played, result);
  }

  function afterInput(played: Token, result: InputResult): void {
    if (result === 'ignored') return;
    if (result === 'wrong') {
      surface.flash(played, 'wrong');
      feedback.textContent = 'Bijna! Probeer nog eens.';
      feedback.className = 'lesson-feedback wrong';
      render();
      return;
    }
    surface.flash(played, 'ok');
    feedback.textContent = PRAISE[Math.floor(Math.random() * PRAISE.length)];
    feedback.className = 'lesson-feedback ok';
    render();
    if (result === 'lesson-done') later(finish, 600);
    else if (result === 'task-done') later(nextTask, 700);
  }

  skip.addEventListener('click', () => {
    const r = run.skip();
    if (r === 'ignored') return;
    feedback.textContent = '';
    render();
    if (r === 'lesson-done') later(finish, 300);
    else later(nextTask, 200);
  });
  again.addEventListener('click', () => {
    const t = run.task;
    const want = run.expected;
    if (t?.kind === 'chord' && typeof want === 'string') {
      const c = CHORDS[want.slice(6) as ChordName];
      engine.strum(voice, voice === 'piano' ? c.keyboard : c.gitaar, voice === 'piano' ? 0 : 30);
      deafUntil = performance.now() + 1500 + DEAF_AFTER_MS;
      return;
    }
    if (!t?.demo) return;
    t.tokens.forEach((tok, i) => {
      const step = t.kind === 'rhythm' && t.bpm ? 60000 / t.bpm : DEMO_STEP_MS;
      later(() => {
        if (typeof tok === 'number') engine.noteOn(voice, tok).stop();
        else engine.drum(tok as DrumPad);
        surface.flash(tok, 'demo');
      }, i * step);
      deafUntil = performance.now() + t.tokens.length * step + DEAF_AFTER_MS;
    });
  });

  const onFrame = (hz: number | null, recentLevel: number, chord: ReturnType<typeof chordName> | null, timeMs: number): void => {
    const deaf = timeMs < deafUntil;
    const m = hz === null ? null : hzToMidi(hz);
    const t = run.task;
    if (inst === 'zang' && sing) {
      const want = typeof run.expected === 'number' ? run.expected : null;
      if (m !== null && want !== null && !deaf && Math.abs(((m - want + 6 + 1200) % 12) - 6) < 0.5) {
        if (pitchClass(Math.round(m)) !== holdPc || holdStart === 0) {
          holdPc = pitchClass(Math.round(m));
          holdStart = timeMs;
        }
      } else {
        holdStart = 0;
      }
      const part = holdStart ? (timeMs - holdStart) / (t?.holdMs ?? 700) : 0;
      sing.live(m, want, part);
    }
    if (deaf) return;
    if (t?.kind === 'chord') {
      if (chord && chord !== lastChord) {
        lastChord = chord;
        handle(chordToken(chord));
      }
      if (!chord) lastChord = null;
      return;
    }
    const ev = events.push(m === null ? null : Math.round(m), recentLevel, timeMs);
    // In de maat: de microfoon herkent een noot pas na ±100 ms; dat trekken we eraf.
    if (ev !== null && t?.kind === 'timed') {
      timed?.input(ev, timeMs - MIC_LAG_MS);
      return;
    }
    if (ev !== null) handle(ev);
  };

  startBtn.addEventListener('click', () => {
    intro.hidden = true;
    playArea.hidden = false;
    events.reset();
    nextTask();
    if (tracker || inst === 'drum') {
      if (inst === 'drum') micNote.textContent = 'Tik op de pads.';
      return;
    }
    void startTracker({ ...MIC_RANGE[inst], chords: usesChords }, (f) =>
      onFrame(f.hz, f.recentLevel, f.chord ? chordName(f.chord) : null, f.timeMs),
    )
      .then((tr) => {
        if (!alive) tr.stop();
        else tracker = tr;
        micNote.textContent = 'De app luistert mee.';
      })
      .catch(() => {
        micNote.textContent =
          inst === 'zang' ? 'Zingen werkt enkel met de microfoon. Sta de microfoon toe en probeer opnieuw.' : 'Geen microfoon: tik dan op het scherm.';
      });
  });

  return () => {
    timed?.stop();
    alive = false;
    for (const t of timers) window.clearTimeout(t);
    tracker?.stop();
    engine.stopAll();
  };
}
