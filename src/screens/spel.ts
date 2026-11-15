// Spel met vallende noten (blok 9, uitgebreid voor alle instrumenten), stijl A · Neon Stage.
// Keyboard: banen per toets. Gitaar/bas: banen per snaar, het fretnummer staat op de noot. Drum: banen per pad.
// Zang: banen per toon met een stip waar je stem zit. Speel op het echte instrument (microfoon) of tik op het scherm.
// Geen game over: tempo zelf kiezen, "Wacht op mij", stukje herhalen, sterren op het einde.

import { engine, type Voice } from '../audio/engine';
import { DRUM_PADS, type DrumPad } from '../audio/synth';
import { startTracker, type Tracker } from '../audio/tracker';
import { hzToMidi, noteName, pitchClass } from '../dsp/notes';
import { hashFor } from '../app/router';
import { saveStars, settings } from '../app/state';
import type { InstrumentId } from '../app/settings';
import { CHORDS } from '../lessons/content';
import { NoteEvents } from '../lessons/noteEvents';
import { Game, MAX_TEMPO, MIN_TEMPO, type GameNote } from '../songs/game';
import { BASS_STRINGS, GUITAR_STRINGS, arrangeFor, placeOnNeck, songStarKey } from '../songs/arrange';
import type { Song } from '../songs/songs';
import { findSong, studioSong } from '../songs/library';
import { COLOR_OF_PC, drumSurface, keyboardSurface, neckSurface, singSurface, type Surface } from './lesSurfaces';
import { starRow } from './lessen';
import { el } from '../ui/dom';

let current: { id: string; inst: InstrumentId } | null = null;

export function openSong(id: string, inst: InstrumentId = 'keyboard'): void {
  current = { id, inst };
  location.hash = hashFor('spel');
}

const VISIBLE_BEATS = 4;
const DEAF_AFTER_MS = 450;
const PRAISE = ['Mooi!', 'Super!', 'Ja!', 'Top!'];
const PAD_LANES: DrumPad[] = ['crash', 'hihat', 'snare', 'kick'];
const PAD_COLORS: Record<string, string> = { crash: '#ff9f4f', hihat: '#ffe45c', snare: '#3ff0ff', kick: '#ff4fd8' };
const MIC: Partial<Record<InstrumentId, { minHz: number; maxHz: number }>> = {
  keyboard: { minHz: 120, maxHz: 1100 },
  gitaar: { minHz: 70, maxHz: 1000 },
  bas: { minHz: 35, maxHz: 400 },
  zang: { minHz: 80, maxHz: 1100 },
};
const isWhite = (m: number): boolean => [0, 2, 4, 5, 7, 9, 11].includes(pitchClass(m));

/** Bereik voor keyboard/zang: van de C onder de laagste noot tot minstens 16 halve tonen hoger. */
function pitchRange(song: Song): [number, number] {
  const ms = song.notes.map((n) => n.midi);
  const low = Math.min(...ms);
  const from = low - pitchClass(low);
  return [from, Math.max(from + 16, ...ms)];
}

/** Banen voor toetsen (zelfde verdeling als het keyboard eronder). */
function keyLanes(from: number, to: number): Map<number, { x: number; w: number }> {
  const whites: number[] = [];
  for (let m = from; m <= to; m++) if (isWhite(m)) whites.push(m);
  const W = 1 / whites.length;
  const out = new Map<number, { x: number; w: number }>();
  whites.forEach((m, i) => {
    out.set(m, { x: i * W, w: W });
    if (!isWhite(m + 1) && m + 1 <= to && i < whites.length - 1) out.set(m + 1, { x: (i + 1) * W - W * 0.3, w: W * 0.6 });
  });
  return out;
}

export function mountSpel(app: HTMLElement): () => void {
  const base = current ? findSong(current.id) : undefined;
  if (!base || !current) {
    location.replace(hashFor('liedjes'));
    return () => undefined;
  }
  const inst = current.inst;
  const song: Song = arrangeFor(base, inst, settings().voiceRange);
  // Naspeelstudio: het echte nummer (mp3) speelt mee en is de klok van het spel (1 tel = 1 seconde).
  const studioRec = base.audio ? studioSong(base.audio) : undefined;
  let track: HTMLAudioElement | null = null;
  let trackUrl = '';
  if (studioRec) {
    trackUrl = URL.createObjectURL(studioRec.audio);
    track = new Audio(trackUrl);
    track.preload = 'auto';
    (track as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
  }
  const voice: Voice = inst === 'gitaar' ? 'gitaar' : inst === 'bas' ? 'bas' : 'piano';
  const strings = inst === 'bas' ? BASS_STRINGS : GUITAR_STRINGS;
  const isNeck = inst === 'gitaar' || inst === 'bas';
  const neckFrets = isNeck
    ? Math.max(5, ...song.notes.map((n) => placeOnNeck(n.midi, strings)?.fret ?? 0))
    : 5;
  const [from, to] = pitchRange(song);
  const keys = keyLanes(from, to);

  /** Baan, label en kleur van een noot voor dit instrument. */
  const laneOf = (n: { midi: number; pad?: string }): { x: number; w: number } | undefined => {
    if (inst === 'drum') {
      const i = PAD_LANES.indexOf(n.pad as DrumPad);
      return i < 0 ? undefined : { x: i / PAD_LANES.length, w: 1 / PAD_LANES.length };
    }
    if (isNeck) {
      const p = placeOnNeck(n.midi, strings);
      return p ? { x: p.string / strings.length, w: 1 / strings.length } : undefined;
    }
    return keys.get(n.midi);
  };
  const labelOf = (n: GameNote): string => {
    if (inst === 'drum') return DRUM_PADS.find((p) => p.id === n.pad)?.label ?? '';
    const letter = noteName(n.midi, settings().notation, false);
    if (isNeck) return `${placeOnNeck(n.midi, strings)?.fret ?? '?'} · ${letter}`;
    return letter;
  };
  const colorOf = (n: GameNote): string => (n.pad ? PAD_COLORS[n.pad] ?? '#ffffff' : COLOR_OF_PC[pitchClass(n.midi)]);

  let game = new Game(song, { wait: true, tempo: 0.7 });
  let backing = true;
  let paused = true;
  let alive = true;
  let raf = 0;
  let last = 0;
  let tracker: Tracker | null = null;
  let deafUntil = 0;
  let sungMidi: number | null = null;
  const events = inst === 'zang' ? new NoteEvents(250, 120) : new NoteEvents();
  const pops: { x: number; text: string; t: number }[] = [];
  const timers: number[] = [];
  const later = (fn: () => void, ms: number): void => {
    timers.push(window.setTimeout(() => alive && fn(), ms));
  };

  // ---------- Opbouw ----------
  const wrap = el('div', 'game');
  wrap.dataset.instrument = inst;
  const side = el('aside', 'game-side');
  const tempoVal = el('span', 'game-tempo', '');
  const slower = el('button', 'icon-btn', '−');
  slower.setAttribute('aria-label', 'Trager');
  const faster = el('button', 'icon-btn', '+');
  faster.setAttribute('aria-label', 'Sneller');
  const tempoRow = el('div', 'game-tempo-row');
  tempoRow.append(slower, tempoVal, faster);
  const waitBtn = el('button', 'pad wide game-toggle', 'Wacht op mij');
  const loopBtn = el('button', 'pad wide game-toggle', 'Stukje herhalen');
  const backBtn = el('button', 'pad wide game-toggle', 'Begeleiding');
  const pauseBtn = el('button', 'pad wide', 'Pauze');
  const tempoBox = el('div', 'game-tempo-box');
  tempoBox.append(el('span', 'game-label', 'Tempo'), tempoRow);
  side.append(tempoBox, waitBtn, loopBtn, backBtn, pauseBtn, el('p', 'small', 'Mis je een noot? Geen probleem: het lied speelt gewoon door.'));

  const main = el('div', 'game-main');
  const head = el('div', 'game-head');
  const title = el('div', 'game-title', song.title);
  const progress = el('div', 'lesson-progress game-progress');
  const progFill = el('div', 'lesson-progress-fill');
  progress.append(progFill);
  head.append(title, progress);
  const canvas = el('canvas', 'game-canvas');
  canvas.setAttribute('aria-label', 'Vallende noten');
  const tapNote = (m: number): void => {
    engine.noteOn(voice, m);
    deafUntil = performance.now() + DEAF_AFTER_MS;
    play(m);
  };
  let sing: ReturnType<typeof singSurface> | null = null;
  const surface: Surface =
    inst === 'drum'
      ? drumSurface((p) => {
          engine.drum(p);
          play(p);
        }, PAD_LANES)
      : isNeck
        ? neckSurface(inst as 'gitaar' | 'bas', tapNote, neckFrets)
        : inst === 'zang'
          ? (sing = singSurface(() => {
              const n = game.nextOpen;
              if (n) {
                engine.noteOn('piano', n.midi).stop();
                deafUntil = performance.now() + 900 + DEAF_AFTER_MS;
              }
            }))
          : keyboardSurface(from, to, tapNote);
  const surfaceWrap = el('div', isNeck ? 'neck-wrap game-surface' : 'game-surface');
  surfaceWrap.append(surface.el);
  const micNote = el('p', 'small lesson-mic', '');
  main.append(head, canvas, surfaceWrap, micNote);
  wrap.append(side, main);

  const LABEL: Record<InstrumentId, string> = { keyboard: 'Keyboard', gitaar: 'Gitaar', bas: 'Bas', drum: 'Drum', zang: 'Zang' };
  const startCard = el('section', 'card lesson-intro');
  const listen = el('button', 'pad wide', 'Luister eerst');
  const startBtn = el('button', 'big', 'Start');
  const how: Record<InstrumentId, string> = {
    keyboard: 'Speel op je keyboard of tik op de toetsen.',
    gitaar: 'Het getal op de noot is de fret. Speel op je gitaar of tik op de hals.',
    bas: 'Het getal op de noot is de fret. Speel op je bas of tik op de hals.',
    drum: 'Tik op de pad als de noot de lijn raakt.',
    zang: 'Zing de toon als de noot de lijn raakt. Hoog of laag zingen mag allebei.',
  };
  startCard.append(
    el('div', 'lesson-intro-title', song.title),
    el('p', 'lesson-intro-goal', `${LABEL[inst]} · ${song.source}`),
    el('p', 'small', how[inst]),
    listen,
    startBtn,
  );
  const end = el('section', 'card lesson-end');
  end.hidden = true;
  wrap.hidden = true;
  app.append(startCard, wrap, end);

  const renderControls = (): void => {
    tempoVal.textContent = `${Math.round(game.tempo * 100)}%`;
    slower.disabled = game.tempo <= MIN_TEMPO;
    faster.disabled = game.tempo >= MAX_TEMPO;
    waitBtn.classList.toggle('on', game.wait);
    loopBtn.classList.toggle('on', game.loop !== null);
    backBtn.classList.toggle('on', backing);
    pauseBtn.textContent = paused ? 'Verder spelen' : 'Pauze';
  };
  slower.addEventListener('click', () => {
    game.setTempo(game.tempo - 0.1);
    renderControls();
  });
  faster.addEventListener('click', () => {
    game.setTempo(game.tempo + 0.1);
    renderControls();
  });
  waitBtn.addEventListener('click', () => {
    game.wait = !game.wait;
    renderControls();
  });
  loopBtn.addEventListener('click', () => {
    game.toggleLoop();
    renderControls();
  });
  backBtn.addEventListener('click', () => {
    backing = !backing;
    renderControls();
  });
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    renderControls();
  });

  // ---------- Begeleiding: drum + bas (niet het instrument dat je zelf speelt) ----------
  const onBeat = (b: number): void => {
    if (b < 0) {
      engine.drum('hihat', 0.9);
      return;
    }
    if (track) return; // het echte nummer is de begeleiding
    if (!backing || b >= game.length) return;
    const inBar = b % song.beatsPerBar;
    if (inBar === 0 && inst !== 'bas') {
      const chord = song.chords?.[Math.floor(b / song.beatsPerBar)];
      if (chord) engine.noteOn('bas', 36 + CHORDS[chord].root, 0.6);
    }
    if (inst === 'drum') return;
    if (inBar === 0) engine.drum('kick', 0.7);
    else if (inBar === 2) engine.drum('snare', 0.45);
    engine.drum('hihat', 0.25);
  };

  // ---------- Spelen ----------
  function play(played: number | string): void {
    const r = game.input(played);
    if (r.result === 'hit') {
      surface.flash(r.note.pad ?? r.note.midi, 'ok');
      const l = laneOf(r.note) ?? { x: 0, w: 0 };
      pops.push({ x: l.x + l.w / 2, text: PRAISE[Math.floor(Math.random() * PRAISE.length)], t: performance.now() });
    } else if (r.result === 'wrong') {
      surface.flash(played, 'wrong');
    }
  }

  const draw = (now: number): void => {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
    if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
    const g = canvas.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const hitY = h - 10;
    const ppb = (h - 20) / VISIBLE_BEATS;
    // Banen
    g.fillStyle = 'rgba(201,184,236,0.10)';
    g.font = '600 13px Inter, system-ui, sans-serif';
    g.textAlign = 'center';
    if (inst === 'drum' || isNeck) {
      const n = inst === 'drum' ? PAD_LANES.length : strings.length;
      for (let i = 0; i < n; i++) {
        g.fillStyle = 'rgba(201,184,236,0.10)';
        g.fillRect((i / n) * w, 0, 1, h);
        g.fillStyle = 'rgba(201,184,236,0.7)';
        const label = inst === 'drum' ? (DRUM_PADS.find((p) => p.id === PAD_LANES[i])?.label ?? '') : noteName(strings[i], settings().notation, false);
        g.fillText(label, ((i + 0.5) / n) * w, 16);
      }
    } else {
      for (const [m, l] of keys) if (isWhite(m)) g.fillRect(l.x * w, 0, 1, h);
    }
    // Noten
    g.font = `800 ${Math.max(12, Math.min(20, w / 44))}px Inter, system-ui, sans-serif`;
    for (const n of game.notes) {
      if (n.state === 'hit') continue;
      const l = laneOf(n);
      if (!l) continue;
      const bottom = hitY - (n.beat - game.beat) * ppb;
      const top = bottom - Math.max(20, n.len * ppb - 6);
      if (top > h || bottom < 0) continue;
      const color = colorOf(n);
      const x = l.x * w + 4;
      const width = l.w * w - 8;
      g.globalAlpha = n.state === 'miss' ? 0.25 : 1;
      g.fillStyle = color;
      g.shadowColor = color;
      g.shadowBlur = n.state === 'miss' ? 0 : 14;
      roundRect(g, x, top, width, bottom - top, 10);
      g.fill();
      g.shadowBlur = 0;
      g.fillStyle = '#0b0518';
      g.fillText(labelOf(n), x + width / 2, bottom - 7);
      g.globalAlpha = 1;
    }
    // Raaklijn
    g.fillStyle = '#3ff0ff';
    g.shadowColor = 'rgba(63,240,255,0.9)';
    g.shadowBlur = 18;
    g.fillRect(0, hitY, w, 4);
    g.shadowBlur = 0;
    // Zang: stip waar je stem zit (de dichtstbijzijnde octaaf van de volgende noot)
    if (inst === 'zang' && sungMidi !== null) {
      const want = game.nextOpen?.midi ?? sungMidi;
      let m = sungMidi;
      while (m - want > 6) m -= 12;
      while (want - m > 6) m += 12;
      const below = Math.floor(m);
      const l1 = keys.get(below) ?? keys.get(Math.round(m));
      if (l1) {
        g.fillStyle = '#ffffff';
        g.shadowColor = '#ffffff';
        g.shadowBlur = 16;
        g.beginPath();
        g.arc((l1.x + l1.w / 2) * w, hitY - 14, 9, 0, Math.PI * 2);
        g.fill();
        g.shadowBlur = 0;
      }
    }
    // Aftellen
    if (game.beat < 0) {
      g.fillStyle = '#ffffff';
      g.font = `900 ${Math.round(h / 4)}px Unbounded, Inter, sans-serif`;
      g.fillText(String(Math.ceil(-game.beat)), w / 2, h / 2);
    }
    // "Mooi!"
    g.font = `600 ${Math.max(16, Math.min(28, w / 30))}px Unbounded, Inter, sans-serif`;
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      const age = (now - p.t) / 600;
      if (age > 1) {
        pops.splice(i, 1);
        continue;
      }
      g.globalAlpha = 1 - age;
      g.fillStyle = '#ffe45c';
      g.fillText(p.text, p.x * w, hitY - 30 - age * 40);
    }
    g.globalAlpha = 1;
  };

  const tick = (now: number): void => {
    if (!alive) return;
    const dt = last ? Math.min(100, now - last) : 0;
    last = now;
    if (!paused) {
      const before = game.beat;
      if (track && game.beat >= 0 && !game.waiting && !track.ended) {
        track.playbackRate = game.tempo;
        if (track.paused) {
          if (Math.abs(track.currentTime - game.beat) > 0.15) track.currentTime = Math.max(0, game.beat);
          void track.play().catch(() => undefined);
          game.update(dt);
        } else {
          // De mp3 bepaalt de tijd: het spel loopt mee tot waar de muziek is.
          game.update((Math.max(0, track.currentTime - game.beat) * 1000) / game.tempo);
          if (game.beat < track.currentTime - 0.5) track.currentTime = Math.max(0, game.beat); // stukje herhalen
        }
      } else {
        if (track && !track.paused) track.pause();
        game.update(dt);
      }
      for (let b = Math.floor(before) + 1; b <= Math.floor(game.beat); b++) onBeat(b);
      if (game.beat < before) onBeat(Math.ceil(game.beat));
    } else if (track && !track.paused) {
      track.pause();
    }
    const next = game.nextOpen;
    const showTarget = next && (game.waiting || next.beat - game.beat < 1) ? next : null;
    surface.target(showTarget ? (showTarget.pad ?? showTarget.midi) : null);
    wrap.dataset.expected = game.waiting && next ? String(next.pad ?? next.midi) : '';
    progFill.style.width = `${Math.round(Math.max(0, Math.min(1, game.beat / game.length)) * 100)}%`;
    draw(now);
    if (game.finished) {
      finish();
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  function finish(): void {
    paused = true;
    track?.pause();
    tracker?.stop();
    tracker = null;
    const stars = game.stars;
    void saveStars(songStarKey(base!.id, inst), stars);
    wrap.hidden = true;
    end.hidden = false;
    end.replaceChildren();
    end.dataset.stars = String(stars);
    const actions = el('div', 'pad-row');
    const retry = el('button', 'pad wide', 'Nog eens');
    retry.addEventListener('click', () => {
      game = new Game(song, { wait: game.wait, tempo: game.tempo });
      end.hidden = true;
      start();
    });
    const back = el('button', 'pad wide lesson-back', 'Naar de liedjes');
    back.addEventListener('click', () => history.back());
    actions.append(retry, back);
    const missed = game.notes.filter((n) => n.state !== 'hit').length;
    end.append(
      el('div', 'lesson-end-title', stars === 3 ? 'Wat een optreden!' : stars === 2 ? 'Heel goed gespeeld!' : 'Goed gedaan!'),
      starRow(stars, 56),
      el(
        'p',
        'muted',
        game.wait
          ? `${game.hits} noten gespeeld. Klaar voor meer? Zet "Wacht op mij" uit of speel sneller.`
          : `${game.hits} van de ${game.notes.length} noten geraakt${missed ? '. Nog eens voor meer sterren?' : '!'}`,
      ),
      actions,
    );
  }

  function start(): void {
    startCard.hidden = true;
    wrap.hidden = false;
    paused = false;
    last = 0;
    events.reset();
    renderControls();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
    const range = MIC[inst];
    if (tracker || !range) {
      if (!range) micNote.textContent = 'Tik op de pads.';
      return;
    }
    void startTracker(range, (f) => {
      const m = f.hz === null ? null : hzToMidi(f.hz);
      if (inst === 'zang') {
        sungMidi = m;
        sing?.live(m, game.nextOpen?.midi ?? null, 0);
      }
      const ev = events.push(m === null ? null : Math.round(m), f.recentLevel, f.timeMs);
      if (ev !== null && f.timeMs >= deafUntil) play(ev);
    })
      .then((t) => {
        if (!alive) t.stop();
        else tracker = t;
        micNote.textContent = 'De app luistert mee.';
      })
      .catch(() => {
        micNote.textContent = inst === 'zang' ? 'Zingen werkt enkel met de microfoon.' : 'Geen microfoon: tik dan op het scherm.';
      });
  }

  listen.addEventListener('click', () => {
    if (track) {
      // Eerste 10 seconden van het echte nummer.
      track.currentTime = 0;
      track.playbackRate = game.tempo;
      void track.play().catch(() => undefined);
      later(() => track?.pause(), 10000);
      return;
    }
    const ms = 60000 / (song.bpm * game.tempo);
    for (const n of song.notes) {
      later(() => {
        if (n.pad) engine.drum(n.pad);
        else engine.noteOn(voice, n.midi).stop();
      }, n.beat * ms);
    }
  });
  startBtn.addEventListener('click', start);
  renderControls();

  return () => {
    alive = false;
    track?.pause();
    if (trackUrl) URL.revokeObjectURL(trackUrl);
    cancelAnimationFrame(raf);
    for (const t of timers) window.clearTimeout(t);
    tracker?.stop();
    engine.stopAll();
  };
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

