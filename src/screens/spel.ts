// Spel met vallende noten (blok 9), stijl A · Neon Stage. De noten vallen naar de juiste toets van het keyboard.
// Speel op het echte keyboard (de app luistert mee) of tik op de toetsen. Geen game over: tempo zelf kiezen,
// "Wacht op mij", stukje herhalen, sterren op het einde. Begeleiding: drum + bas, die stil vallen als het lied wacht.

import { engine } from '../audio/engine';
import { startTracker, type Tracker } from '../audio/tracker';
import { hzToMidi, noteName, pitchClass } from '../dsp/notes';
import { hashFor } from '../app/router';
import { saveStars, settings } from '../app/state';
import { CHORDS } from '../lessons/content';
import { NoteEvents } from '../lessons/noteEvents';
import { Game, MAX_TEMPO, MIN_TEMPO, type GameNote } from '../songs/game';
import { songById, songStarId, type Song } from '../songs/songs';
import { COLOR_OF_PC, keyboardSurface } from './lesSurfaces';
import { starRow } from './lessen';
import { el } from '../ui/dom';

let currentSongId: string | null = null;

export function openSong(id: string): void {
  currentSongId = id;
  location.hash = hashFor('spel');
}

const VISIBLE_BEATS = 4;
const DEAF_AFTER_MS = 450;
const PRAISE = ['Mooi!', 'Super!', 'Ja!', 'Top!'];
const isWhite = (m: number): boolean => [0, 2, 4, 5, 7, 9, 11].includes(pitchClass(m));

/** Bereik van het keyboard: van de C onder de laagste noot tot minstens E5. */
function rangeOf(song: Song): [number, number] {
  const low = Math.min(60, ...song.notes.map((n) => n.midi));
  const high = Math.max(76, ...song.notes.map((n) => n.midi));
  return [low - pitchClass(low), high];
}

/** Plaats van elke toets als deel van de breedte (zelfde verdeling als het keyboard eronder). */
function laneGeometry(from: number, to: number): Map<number, { x: number; w: number }> {
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
  const song = currentSongId ? songById(currentSongId) : undefined;
  if (!song) {
    location.replace(hashFor('liedjes'));
    return () => undefined;
  }
  const [from, to] = rangeOf(song);
  const lanes = laneGeometry(from, to);
  let game = new Game(song, { wait: true, tempo: 0.7 });
  let backing = true;
  let paused = true;
  let alive = true;
  let raf = 0;
  let last = 0;
  let tracker: Tracker | null = null;
  let deafUntil = 0;
  const events = new NoteEvents();
  const pops: { x: number; text: string; t: number; color: string }[] = [];
  const timers: number[] = [];
  const later = (fn: () => void, ms: number): void => {
    timers.push(window.setTimeout(() => alive && fn(), ms));
  };

  // ---------- Opbouw ----------
  const wrap = el('div', 'game');
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
  const kb = keyboardSurface(from, to, (m) => {
    engine.noteOn('piano', m);
    deafUntil = performance.now() + DEAF_AFTER_MS;
    play(m);
  });
  const micNote = el('p', 'small lesson-mic', '');
  main.append(head, canvas, kb.el, micNote);
  wrap.append(side, main);

  // Start- en eindkaart
  const startCard = el('section', 'card lesson-intro');
  const listen = el('button', 'pad wide', 'Luister eerst');
  const startBtn = el('button', 'big', 'Start');
  startCard.append(el('div', 'lesson-intro-title', song.title), el('p', 'lesson-intro-goal', song.source), listen, startBtn);
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

  // ---------- Begeleiding (drum + bas) en aftellen ----------
  const onBeat = (b: number): void => {
    if (b < 0) {
      engine.drum('hihat', 0.9);
      return;
    }
    if (!backing || b >= game.length) return;
    const inBar = b % song.beatsPerBar;
    if (inBar === 0) {
      engine.drum('kick', 0.7);
      const chord = song.chords?.[Math.floor(b / song.beatsPerBar)];
      if (chord) engine.noteOn('bas', 36 + CHORDS[chord].root, 0.6);
    } else if (inBar === 2) engine.drum('snare', 0.45);
    engine.drum('hihat', 0.25);
  };

  // ---------- Spelen ----------
  function play(midi: number): void {
    const r = game.input(midi);
    if (r.result === 'hit') {
      kb.flash(midi, 'ok');
      const g = lanes.get(r.note.midi) ?? { x: 0, w: 0 };
      pops.push({ x: g.x + g.w / 2, text: PRAISE[Math.floor(Math.random() * PRAISE.length)], t: performance.now(), color: '#ffe45c' });
    } else if (r.result === 'wrong') {
      kb.flash(midi, 'wrong');
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
    g.fillStyle = 'rgba(201,184,236,0.08)';
    for (const [m, l] of lanes) if (isWhite(m)) g.fillRect(l.x * w, 0, 1, h);
    // Noten
    g.font = `800 ${Math.max(12, Math.min(22, w / 40))}px Inter, system-ui, sans-serif`;
    g.textAlign = 'center';
    for (const n of game.notes) {
      const l = lanes.get(n.midi);
      if (!l) continue;
      const bottom = hitY - (n.beat - game.beat) * ppb;
      const top = bottom - Math.max(18, n.len * ppb - 6);
      if (top > h || bottom < 0) continue;
      if (n.state === 'hit') continue;
      const color = COLOR_OF_PC[pitchClass(n.midi)];
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
      g.fillText(noteName(n.midi, settings().notation, false), x + width / 2, bottom - 7);
      g.globalAlpha = 1;
    }
    // Raaklijn
    g.fillStyle = '#3ff0ff';
    g.shadowColor = 'rgba(63,240,255,0.9)';
    g.shadowBlur = 18;
    g.fillRect(0, hitY, w, 4);
    g.shadowBlur = 0;
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
      g.fillStyle = p.color;
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
      game.update(dt);
      // Begeleiding op elke nieuwe tel
      for (let b = Math.floor(before) + 1; b <= Math.floor(game.beat); b++) onBeat(b);
      if (game.beat < before) onBeat(Math.ceil(game.beat)); // herhaald stukje: opnieuw beginnen
    }
    const next = game.nextOpen;
    const showTarget = next && (game.waiting || next.beat - game.beat < 1) ? next : null;
    kb.target(showTarget ? showTarget.midi : null);
    wrap.dataset.expected = game.waiting && next ? String(next.midi) : '';
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
    tracker?.stop();
    tracker = null;
    const stars = game.stars;
    void saveStars(songStarId(song!.id), stars);
    wrap.hidden = true;
    end.hidden = false;
    end.replaceChildren();
    end.dataset.stars = String(stars);
    const actions = el('div', 'pad-row');
    const retry = el('button', 'pad wide', 'Nog eens');
    retry.addEventListener('click', () => {
      const tempo = game.tempo;
      const wait = game.wait;
      game = new Game(song!, { wait, tempo });
      end.hidden = true;
      start();
    });
    const back = el('button', 'pad wide lesson-back', 'Naar de liedjes');
    back.addEventListener('click', () => history.back());
    actions.append(retry, back);
    const missed = game.notes.filter((n: GameNote) => n.state !== 'hit').length;
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
    if (tracker) return;
    void startTracker({ minHz: 120, maxHz: 1100 }, (f) => {
      const ev = events.push(f.hz === null ? null : Math.round(hzToMidi(f.hz)), f.recentLevel, f.timeMs);
      if (ev !== null && f.timeMs >= deafUntil) play(ev);
    })
      .then((t) => {
        if (!alive) t.stop();
        else tracker = t;
        micNote.textContent = 'De app luistert mee.';
      })
      .catch(() => {
        micNote.textContent = 'Geen microfoon: tik dan op de toetsen.';
      });
  }

  listen.addEventListener('click', () => {
    const ms = 60000 / (song.bpm * game.tempo);
    for (const n of song.notes) later(() => engine.noteOn('piano', n.midi).stop(), n.beat * ms);
  });
  startBtn.addEventListener('click', start);
  renderControls();

  return () => {
    alive = false;
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
