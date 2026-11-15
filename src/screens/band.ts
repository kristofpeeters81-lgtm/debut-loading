// Bandmodus (blok 12): het gezin speelt samen "LOADING". Iedereen kiest zijn instrument en niveau;
// de app speelt mee wat niemand speelt. Geen punten (de microfoon kan meerdere instrumenten niet uit elkaar houden).
// Per speler een strook met de volgende noten; bovenaan het deel van het nummer en de tekst om mee te zingen.

import { engine } from '../audio/engine';
import { DRUM_PADS } from '../audio/synth';
import { noteName } from '../dsp/notes';
import { settings } from '../app/state';
import { INSTRUMENT_CHOICES, type InstrumentId } from '../app/settings';
import { BASS_STRINGS, GUITAR_STRINGS, placeOnNeck } from '../songs/arrange';
import { LOADING_BPM, MELODY, PARTS, SECTIONS, TOTAL_BEATS, backingParts, type PartLevel } from '../songs/loading';
import type { SongNote } from '../songs/songs';
import { el } from '../ui/dom';

const COUNT_IN = 4;
const AHEAD = 4;

export function mountBand(app: HTMLElement): () => void {
  const chosen = new Map<InstrumentId, PartLevel>([[settings().instrument, 'makkelijk']]);
  let tempo = 0.85;
  let raf = 0;
  let alive = true;
  let playing = false;

  // ---------- Opstelling ----------
  const setup = el('section', 'card band-setup');
  const who = el('div', 'band-who');
  const tempoRow = el('div', 'chips band-tempo');
  const startBtn = el('button', 'big band-start', 'Start de band');
  setup.append(
    el('h2', '', 'Wie speelt mee?'),
    el('p', 'small', 'Tik op de instrumenten die jullie spelen. De app speelt de rest. Er zijn geen punten: gewoon samen spelen!'),
    who,
    el('span', 'game-label', 'Tempo'),
    tempoRow,
    startBtn,
  );
  const renderSetup = (): void => {
    who.replaceChildren();
    for (const c of INSTRUMENT_CHOICES) {
      const on = chosen.has(c.id);
      const row = el('div', on ? 'band-player on' : 'band-player');
      row.dataset.instrument = c.id;
      const toggle = el('button', 'chip band-toggle', on ? `✓ ${c.label}` : c.label);
      toggle.setAttribute('aria-pressed', String(on));
      toggle.addEventListener('click', () => {
        if (on) chosen.delete(c.id);
        else chosen.set(c.id, 'makkelijk');
        renderSetup();
      });
      row.append(toggle);
      if (on) {
        for (const l of ['makkelijk', 'moeilijk'] as PartLevel[]) {
          const b = el('button', chosen.get(c.id) === l ? 'chip small-chip on' : 'chip small-chip', l === 'makkelijk' ? 'Makkelijk' : 'Moeilijk');
          b.dataset.level = l;
          b.addEventListener('click', () => {
            chosen.set(c.id, l);
            renderSetup();
          });
          row.append(b);
        }
      }
      who.append(row);
    }
    startBtn.disabled = chosen.size === 0;
    tempoRow.replaceChildren();
    for (const t of [0.7, 0.85, 1]) {
      const b = el('button', t === tempo ? 'chip on' : 'chip', `${Math.round(t * 100)}%`);
      b.addEventListener('click', () => {
        tempo = t;
        renderSetup();
      });
      tempoRow.append(b);
    }
  };
  renderSetup();

  // ---------- Optreden ----------
  const stage = el('section', 'band-stage');
  stage.hidden = true;
  const sectionName = el('div', 'band-section', '');
  const count = el('div', 'timed-count', '');
  const lyrics = el('div', 'game-lyrics band-lyrics');
  const lanes = el('div', 'band-lanes');
  const progress = el('div', 'lesson-progress');
  const progFill = el('div', 'lesson-progress-fill');
  progress.append(progFill);
  const stopBtn = el('button', 'pad wide', 'Stop');
  stage.append(progress, sectionName, count, lyrics, lanes, stopBtn);
  const end = el('section', 'card lesson-end');
  end.hidden = true;
  app.append(setup, stage, end);

  const labelFor = (inst: InstrumentId, n: SongNote): string => {
    if (n.pad) return DRUM_PADS.find((p) => p.id === n.pad)?.label ?? n.pad;
    const letter = noteName(n.midi, settings().notation, false);
    if (inst === 'gitaar' || inst === 'bas') {
      const p = placeOnNeck(n.midi, inst === 'bas' ? BASS_STRINGS : GUITAR_STRINGS);
      return p ? `${p.fret}·${letter}` : letter;
    }
    if (inst === 'zang') return MELODY.find((m) => m.note.beat === n.beat)?.syl ?? letter;
    return letter;
  };

  const stop = (): void => {
    playing = false;
    cancelAnimationFrame(raf);
    engine.stopAll();
  };

  const finish = (): void => {
    stop();
    stage.hidden = true;
    end.hidden = false;
    end.replaceChildren();
    const again = el('button', 'pad wide', 'Nog eens');
    again.addEventListener('click', () => start());
    const back = el('button', 'pad wide', 'Andere opstelling');
    back.addEventListener('click', () => {
      end.hidden = true;
      setup.hidden = false;
    });
    const row = el('div', 'pad-row');
    row.append(again, back);
    end.append(el('div', 'lesson-end-title', 'Wat een optreden!'), el('p', 'muted', 'Garage band? Nah. Main stage.'), row);
  };

  function start(): void {
    setup.hidden = true;
    end.hidden = true;
    stage.hidden = false;
    playing = true;
    const players = [...chosen.entries()];
    const parts = players.map(([inst, lvl]) => ({ inst, notes: PARTS[inst][lvl] }));
    const backing = backingParts(players.map(([i]) => i)).map((p) => ({ ...p, idx: 0 }));
    lanes.replaceChildren();
    const laneEls = parts.map((p) => {
      const lane = el('div', 'band-lane');
      lane.dataset.instrument = p.inst;
      const name = el('div', 'band-lane-name', INSTRUMENT_CHOICES.find((c) => c.id === p.inst)?.label ?? p.inst);
      const notes = el('div', 'band-lane-notes');
      lane.append(name, notes);
      lanes.append(lane);
      return notes;
    });
    const beatMs = 60000 / (LOADING_BPM * tempo);
    engine.startMetronome(LOADING_BPM * tempo, 4);
    const t0 = performance.now() + 100 + COUNT_IN * beatMs;
    let metroOn = true;
    let lastBeat = -COUNT_IN;
    const loop = (): void => {
      if (!alive || !playing) return;
      const beat = (performance.now() - t0) / beatMs;
      count.textContent = beat < 0 ? String(Math.ceil(-beat)) : '';
      if (beat >= 0 && metroOn) {
        engine.stopMetronome();
        metroOn = false;
      }
      // Begeleiding: wat niemand speelt
      for (const t of backing) {
        while (t.idx < t.notes.length && t.notes[t.idx].beat <= beat) {
          const n = t.notes[t.idx++];
          if (n.beat < lastBeat - 0.01) continue;
          if (n.pad) engine.drum(n.pad, 0.7);
          else engine.noteOn(t.inst === 'gitaar' ? 'gitaar' : t.inst === 'bas' ? 'bas' : 'piano', n.midi, t.inst === 'keyboard' ? 0.4 : 0.55).stop();
        }
      }
      lastBeat = beat;
      // Deel van het nummer + tekst
      const sec = [...SECTIONS].reverse().find((s) => beat >= s.start);
      sectionName.textContent = beat < 0 ? 'Klaar…' : (sec?.name ?? '');
      lyrics.replaceChildren();
      const near = MELODY.filter((m) => m.note.beat >= beat - 2 && m.note.beat < beat + 6);
      for (const m of near) lyrics.append(el('span', m.note.beat <= beat && beat < m.note.beat + m.note.len ? 'lyric now' : m.note.beat < beat ? 'lyric done' : 'lyric', m.syl));
      // Per speler: de volgende noten
      parts.forEach((p, i) => {
        const box = laneEls[i];
        box.replaceChildren();
        const upcoming = p.notes.filter((n) => n.beat + n.len > beat && n.beat < beat + AHEAD).slice(0, 6);
        for (const n of upcoming) {
          const now = n.beat <= beat + 0.05;
          const chip = el('span', now ? 'band-note now' : 'band-note', labelFor(p.inst, n));
          box.append(chip);
        }
        if (!upcoming.length) box.append(el('span', 'band-note rest', '…'));
      });
      progFill.style.width = `${Math.round(Math.max(0, Math.min(1, beat / TOTAL_BEATS)) * 100)}%`;
      stage.dataset.beat = String(Math.floor(beat));
      if (beat > TOTAL_BEATS + 1) {
        finish();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', () => {
    stop();
    stage.hidden = true;
    setup.hidden = false;
  });

  return () => {
    alive = false;
    stop();
  };
}
