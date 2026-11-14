// Klanktest (blok 4, hulpje onder Instellingen): alle klanken van de klankmotor uitproberen.
// Sober; de echte instrumenten op het scherm komen in blok 6 (vrij spelen).

import { engine, type Voice } from '../audio/engine';
import { DRUM_PADS } from '../audio/synth';
import { letterName, solfegeName, octaveOf } from '../dsp/notes';
import type { Notation } from '../app/settings';
import { el } from '../ui/dom';

const PIANO_NOTES = Array.from({ length: 13 }, (_, i) => 60 + i); // C4 … C5
const GUITAR_STRINGS = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4
const BASS_STRINGS = [28, 33, 38, 43]; // E1 A1 D2 G2
const CHORDS: { label: string; voice: Voice; notes: number[] }[] = [
  { label: 'Em op gitaar', voice: 'gitaar', notes: [40, 47, 52, 55, 59, 64] },
  { label: 'C op gitaar', voice: 'gitaar', notes: [48, 52, 55, 60, 64] },
  { label: 'C op piano', voice: 'piano', notes: [60, 64, 67] },
  { label: 'Am op piano', voice: 'piano', notes: [57, 60, 64] },
];

export function mountKlanktest(app: HTMLElement, notation: Notation): () => void {
  const name = (m: number): string => (notation === 'doremi' ? `${solfegeName(m)}${octaveOf(m)}` : letterName(m));
  const counter = el('p', 'small plays', '');
  const bump = (): void => {
    counter.textContent = `Gespeelde klanken: ${engine.plays}`;
    counter.dataset.plays = String(engine.plays);
  };

  /** Knop die meteen klinkt bij aanraken (pointerdown) en loslaat bij optillen. */
  function noteButton(label: string, voice: Voice, midi: number): HTMLButtonElement {
    const b = el('button', 'pad', label);
    let handle: { stop(): void } | null = null;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      handle?.stop();
      handle = engine.noteOn(voice, midi);
      bump();
    });
    const up = (): void => {
      // Gitaar en bas laten we natrillen; piano stopt bij loslaten (zoals een echte toets).
      if (voice === 'piano') handle?.stop();
      handle = null;
    };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointerleave', up);
    b.addEventListener('pointercancel', up);
    return b;
  }

  function section(title: string, ...children: HTMLElement[]): HTMLElement {
    const s = el('section', 'card');
    s.append(el('h2', '', title), ...children);
    return s;
  }

  const row = (...children: HTMLElement[]): HTMLElement => {
    const r = el('div', 'pad-row');
    r.append(...children);
    return r;
  };

  const intro = el('p', 'sub', 'Tik op een knop om de klank te horen. Alles wordt op de tablet zelf berekend.');

  const piano = section('🎹 Piano', row(...PIANO_NOTES.map((m) => noteButton(name(m), 'piano', m))));
  const gitaar = section('🎸 Gitaar (losse snaren)', row(...GUITAR_STRINGS.map((m) => noteButton(name(m), 'gitaar', m))));
  const bas = section('🎸 Bas (losse snaren)', row(...BASS_STRINGS.map((m) => noteButton(name(m), 'bas', m))));

  const chordBtns = CHORDS.map((c) => {
    const b = el('button', 'pad wide', c.label);
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      engine.strum(c.voice, c.notes, c.voice === 'piano' ? 0 : 25);
      bump();
    });
    return b;
  });
  const akkoorden = section('🎶 Akkoorden', row(...chordBtns));

  const drumBtns = DRUM_PADS.map((p) => {
    const b = el('button', 'pad drum', p.label);
    b.dataset.pad = p.id;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      engine.drum(p.id);
      bump();
    });
    return b;
  });
  const drum = section('🥁 Drum', row(...drumBtns));

  // Metronoom
  const bpmLabel = el('span', 'bpm', '');
  const bpm = el('input');
  bpm.type = 'range';
  bpm.min = '40';
  bpm.max = '200';
  bpm.value = '90';
  const metroBtn = el('button', 'pad wide metro', '▶ Start');
  const renderMetro = (): void => {
    bpmLabel.textContent = `${bpm.value} tellen per minuut`;
    metroBtn.textContent = engine.metronomeRunning ? '■ Stop' : '▶ Start';
    metroBtn.classList.toggle('on', engine.metronomeRunning);
  };
  metroBtn.addEventListener('click', () => {
    if (engine.metronomeRunning) engine.stopMetronome();
    else engine.startMetronome(Number(bpm.value), 4);
    renderMetro();
  });
  bpm.addEventListener('input', () => {
    engine.setMetronomeBpm(Number(bpm.value));
    renderMetro();
  });
  renderMetro();
  const metroCard = section('⏱️ Metronoom (4 tellen, de eerste tel klinkt hoger)', row(metroBtn), bpmLabel, bpm);

  app.append(intro, piano, gitaar, bas, akkoorden, drum, metroCard, counter);

  return () => engine.stopAll();
}
