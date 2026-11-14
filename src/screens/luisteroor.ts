// Luisteroor (blok 1, sinds blok 2 een hulpje onder Instellingen): wat hoort de tablet als je
// keyboard, gitaar, bas, stem of klappen gebruikt? Handig om het bereik van een keyboard na te gaan
// of een nieuw instrument te testen. Alles gebeurt live op het toestel; er wordt niets opgenomen of verstuurd.

import { startMic, type Mic } from '../audio/mic';
import { detectPitch, rms } from '../dsp/yin';
import { centsOff, hzToMidi, letterName, octaveOf, pitchClass, pitchClassLetter, solfegeName } from '../dsp/notes';
import { chordName, chromaFromSpectrum, detectChord, sameChord, type Chord } from '../dsp/chroma';
import { OnsetDetector } from '../dsp/onset';
import type { Notation } from '../app/settings';
import { el } from '../ui/dom';
import { INSTRUMENTS, type Instrument, type ItemResult, type TestItem } from './checklist';

const STABLE_MS = 200;
const CHORD_STABLE_MS = 300;
const SILENCE_MS = 150;

export interface LuisteroorOptions {
  notation: Notation;
  sensitivity: number;
  onSensitivity(value: number): void;
}

/** Bouwt Luisteroor op in `app`. Geeft een opruimfunctie terug (stopt de microfoon). */
export function mountLuisteroor(app: HTMLElement, opts: LuisteroorOptions): () => void {
  let alive = true;
  let rafId = 0;

  // ---------- Toestand ----------
  let mic: Mic | null = null;
  let current: Instrument = INSTRUMENTS[0];
  let activeIndex = 0;
  const results = new Map<string, ItemResult>();
  let gate = 0.004;

  let candMidi = -1;
  let candSince = 0;
  let stableMidi = -1;
  let stableCents = 0;
  let lastPitchAt = 0;

  let chordCand: Chord | null = null;
  let chordSince = 0;
  let stableChord: Chord | null = null;

  const onsets = new OnsetDetector();
  let claps = 0;
  let rangeLow = Infinity;
  let rangeHigh = -Infinity;
  let holdMidi = -1;
  let holdSince = 0;
  let frameCount = 0;

  const keyOf = (inst: Instrument, item: TestItem): string => `${inst.id}:${item.id}`;
  const resultOf = (inst: Instrument, item: TestItem): ItemResult => results.get(keyOf(inst, item)) ?? { status: 'open', heard: '' };

  // ---------- Opbouw van de pagina ----------
  const header = el('p', 'sub', 'Wat hoort de tablet? Handig om een keyboard of een nieuw instrument te testen.');

  const startBtn = el('button', 'big', '🎙️ Start de microfoon');
  const startNote = el('p', 'hint', 'De tablet vraagt toestemming voor de microfoon. Er wordt niets opgenomen of verstuurd.');
  const startBox = el('section', 'card start');
  startBox.append(startBtn, startNote);

  const tabs = el('nav', 'tabs');
  const tip = el('p', 'tip');

  const live = el('section', 'card live');
  const noteBig = el('div', 'note-big', '–');
  const noteSub = el('div', 'note-sub', '');
  const centsBar = el('div', 'cents');
  const centsNeedle = el('div', 'needle');
  centsBar.append(el('span', 'mid'), centsNeedle);
  const hzText = el('div', 'small', '');
  const levelBar = el('div', 'level');
  const levelFill = el('div', 'fill');
  const levelGate = el('div', 'gate');
  levelBar.append(levelFill, levelGate);
  const gateLabel = el('label', 'small', 'Gevoeligheid ');
  const gateSlider = el('input');
  gateSlider.type = 'range';
  gateSlider.min = '0';
  gateSlider.max = '100';
  gateSlider.value = String(opts.sensitivity);
  gateLabel.append(gateSlider);
  const chromaBox = el('div', 'chroma');
  const chromaBars: HTMLElement[] = [];
  for (let pc = 0; pc < 12; pc++) {
    const col = el('div', 'col');
    const bar = el('div', 'bar');
    col.append(bar, el('span', '', pitchClassLetter(pc)));
    chromaBars.push(bar);
    chromaBox.append(col);
  }
  const chordText = el('div', 'chord', '');
  const clapText = el('div', 'claps', '');
  live.append(noteBig, noteSub, centsBar, hzText, levelBar, gateLabel, chromaBox, chordText, clapText);

  const listBox = el('section', 'card list');
  const grid = el('div', 'lo-grid');
  grid.append(live, listBox);
  const resultBox = el('section', 'card results');

  app.append(header, startBox);

  // Gevoeligheid: schuif naar rechts = stillere geluiden tellen ook mee.
  function updateGate(): void {
    const v = Number(gateSlider.value) / 100;
    gate = 0.05 * Math.pow(0.02, v); // 0.05 … 0.001
    levelGate.style.left = `${Math.min(100, levelToPct(gate))}%`;
  }
  function levelToPct(level: number): number {
    // Logaritmische meter van -60 dB tot 0 dB.
    const dbv = 20 * Math.log10(Math.max(level, 1e-6));
    return Math.max(0, Math.min(100, ((dbv + 60) / 60) * 100));
  }
  gateSlider.addEventListener('input', updateGate);
  gateSlider.addEventListener('change', () => opts.onSensitivity(Number(gateSlider.value)));
  updateGate();

  function renderTabs(): void {
    tabs.replaceChildren();
    for (const inst of INSTRUMENTS) {
      const b = el('button', inst === current ? 'tab on' : 'tab', `${inst.icon} ${inst.label}`);
      b.addEventListener('click', () => selectInstrument(inst));
      tabs.append(b);
    }
    tip.textContent = `💡 ${current.tip}`;
    clapText.hidden = current.id !== 'klappen';
  }

  function statusIcon(s: ItemResult['status']): string {
    return s === 'ok' ? '✅' : s === 'octave' ? '⚠️' : s === 'fail' ? '❌' : '⬜';
  }

  function renderList(): void {
    listBox.replaceChildren(el('h2', '', `${current.icon} ${current.label}: speel deze na elkaar`));
    current.items.forEach((item, i) => {
      const res = resultOf(current, item);
      const row = el('div', i === activeIndex ? 'item active' : 'item');
      row.append(el('span', 'icon', statusIcon(res.status)), el('span', 'label', item.label));
      if (res.heard) row.append(el('span', 'heard', `gehoord: ${res.heard}`));
      if (res.status === 'octave') row.append(el('span', 'heard warn', 'juiste letter, verkeerde octaaf'));
      if (i === activeIndex) {
        const actions = el('span', 'actions');
        if (item.kind === 'range') {
          const done = el('button', 'small-btn', 'Klaar');
          done.addEventListener('click', () => finish(item, 'ok'));
          actions.append(done);
        }
        if (res.status !== 'ok') {
          const fail = el('button', 'small-btn', 'Lukt niet');
          fail.addEventListener('click', () => finish(item, 'fail'));
          actions.append(fail);
        }
        row.append(actions);
      } else {
        row.addEventListener('click', () => activate(i));
      }
      listBox.append(row);
    });
    const reset = el('button', 'small-btn', '↺ Dit instrument opnieuw');
    reset.addEventListener('click', () => {
      current.items.forEach((item) => results.delete(keyOf(current, item)));
      activate(0);
    });
    listBox.append(reset);
    renderResults();
  }

  function renderResults(): void {
    resultBox.replaceChildren(el('h2', '', '📋 Resultaten (maak hiervan een schermafbeelding)'));
    for (const inst of INSTRUMENTS) {
      const tried = inst.items.filter((item) => resultOf(inst, item).status !== 'open' || resultOf(inst, item).heard);
      if (tried.length === 0) continue;
      resultBox.append(el('h3', '', `${inst.icon} ${inst.label}`));
      for (const item of inst.items) {
        const res = resultOf(inst, item);
        resultBox.append(el('div', 'res-row', `${statusIcon(res.status)} ${item.label}${res.heard ? ` — ${res.heard}` : ''}`));
      }
    }
    const sr = mic ? `${mic.ctx.sampleRate} Hz` : '–';
    resultBox.append(el('p', 'small', `Samplerate: ${sr} · gevoeligheid: ${gateSlider.value}`));
  }

  function selectInstrument(inst: Instrument): void {
    current = inst;
    renderTabs();
    activate(Math.max(0, inst.items.findIndex((item) => resultOf(inst, item).status !== 'ok')));
  }

  function activate(i: number): void {
    activeIndex = i;
    claps = 0;
    clapText.textContent = '';
    rangeLow = Infinity;
    rangeHigh = -Infinity;
    holdMidi = -1;
    const item = current.items[i];
    if (item) {
      const res = resultOf(current, item);
      if (res.status === 'fail') results.set(keyOf(current, item), { status: 'open', heard: res.heard });
    }
    renderList();
  }

  function finish(item: TestItem, status: 'ok' | 'fail'): void {
    const res = resultOf(current, item);
    results.set(keyOf(current, item), { status, heard: res.heard });
    const next = current.items.findIndex((it, idx) => idx > activeIndex && resultOf(current, it).status !== 'ok');
    activate(next >= 0 ? next : activeIndex);
  }

  function setHeard(item: TestItem, status: ItemResult['status'], heard: string): void {
    const prev = resultOf(current, item);
    if (prev.status === status && prev.heard === heard) return;
    results.set(keyOf(current, item), { status, heard });
    if (status === 'ok') {
      renderList();
      window.setTimeout(() => {
        if (current.items[activeIndex] === item) finish(item, 'ok');
      }, 700);
    } else {
      renderList();
    }
  }

  // ---------- Beoordelen van het actieve testje ----------
  function evaluate(now: number): void {
    const item = current.items[activeIndex];
    if (!item) return;
    const res = resultOf(current, item);
    if (res.status === 'ok' || res.status === 'fail') return;
    const heardNote = (): string => `${letterName(stableMidi)} (${stableCents > 0 ? '+' : ''}${stableCents} cent)`;

    switch (item.kind) {
      case 'note':
        if (stableMidi < 0) return;
        if (stableMidi === item.midi) setHeard(item, 'ok', heardNote());
        else if (pitchClass(stableMidi) === pitchClass(item.midi)) setHeard(item, 'octave', heardNote());
        else setHeard(item, 'open', heardNote());
        break;
      case 'chord':
        if (!stableChord) return;
        if (stableChord.root === item.root && stableChord.minor === item.minor) setHeard(item, 'ok', chordName(stableChord));
        else setHeard(item, 'open', chordName(stableChord));
        break;
      case 'claps':
        if (claps >= item.count) setHeard(item, 'ok', `${claps} van ${item.count}`);
        else if (claps > 0) setHeard(item, 'open', `${claps} van ${item.count}`);
        break;
      case 'range':
        if (stableMidi < 0) return;
        rangeLow = Math.min(rangeLow, stableMidi);
        rangeHigh = Math.max(rangeHigh, stableMidi);
        setHeard(item, 'open', `${letterName(rangeLow)} tot ${letterName(rangeHigh)}`);
        break;
      case 'hold':
        if (stableMidi < 0) {
          holdMidi = -1;
          return;
        }
        if (stableMidi !== holdMidi) {
          holdMidi = stableMidi;
          holdSince = now;
          return;
        }
        if (now - holdSince >= item.seconds * 1000) setHeard(item, 'ok', `${letterName(holdMidi)} ${item.seconds} s vastgehouden`);
        break;
    }
  }

  // ---------- Live lus ----------
  let timeBuf = new Float32Array(0);
  let specBuf = new Float32Array(0);

  function tick(now: number): void {
    if (!mic || !alive) return;
    const { pitch, spectrum, ctx } = mic;
    if (timeBuf.length !== pitch.fftSize) timeBuf = new Float32Array(pitch.fftSize);
    pitch.getFloatTimeDomainData(timeBuf);

    const level = rms(timeBuf);
    levelFill.style.width = `${levelToPct(level)}%`;
    levelFill.classList.toggle('loud', level >= gate);

    // Klappen: luidheid van het nieuwste stukje (±10 ms).
    if (onsets.process(rms(timeBuf, 512), now)) {
      claps++;
      clapText.textContent = `👏 ${claps}`;
      clapText.classList.remove('pop');
      void clapText.offsetWidth;
      clapText.classList.add('pop');
    }

    const p = level >= gate ? detectPitch(timeBuf, ctx.sampleRate, current.minHz, current.maxHz) : null;
    if (p) {
      const m = Math.round(hzToMidi(p.hz));
      if (m !== candMidi) {
        candMidi = m;
        candSince = now;
      }
      lastPitchAt = now;
      if (now - candSince >= STABLE_MS) {
        stableMidi = m;
        stableCents = centsOff(p.hz);
      }
      const cents = centsOff(p.hz);
      const letter = letterName(m, false);
      const solfege = solfegeName(m);
      noteBig.textContent = opts.notation === 'doremi' ? solfege : letter;
      noteSub.textContent = `${opts.notation === 'doremi' ? letter : solfege} · octaaf ${octaveOf(m)}`;
      hzText.textContent = `${p.hz.toFixed(1)} Hz · ${cents > 0 ? '+' : ''}${cents} cent · zuiverheid ${Math.round(p.clarity * 100)}%`;
      centsNeedle.style.left = `${50 + cents}%`;
      noteBig.classList.toggle('steady', stableMidi === m);
    } else if (now - lastPitchAt > SILENCE_MS) {
      candMidi = -1;
      stableMidi = -1;
      noteBig.classList.remove('steady');
      noteBig.textContent = '–';
      noteSub.textContent = level < gate ? 'te stil' : 'geen duidelijke toon';
      hzText.textContent = '';
    }

    // Akkoorden: om de 3 beelden is ruim genoeg.
    if (frameCount++ % 3 === 0) {
      if (specBuf.length !== spectrum.frequencyBinCount) specBuf = new Float32Array(spectrum.frequencyBinCount);
      spectrum.getFloatFrequencyData(specBuf);
      const chroma = level >= gate ? chromaFromSpectrum(specBuf, ctx.sampleRate / spectrum.fftSize) : new Array<number>(12).fill(0);
      chroma.forEach((c, pc) => {
        chromaBars[pc].style.height = `${Math.round(c * 100)}%`;
      });
      const chord = detectChord(chroma);
      if (!sameChord(chord, chordCand)) {
        chordCand = chord;
        chordSince = now;
      }
      stableChord = chordCand && now - chordSince >= CHORD_STABLE_MS ? chordCand : null;
      chordText.textContent = stableChord ? `Akkoord: ${chordName(stableChord)}` : '';
    }

    evaluate(now);
    rafId = requestAnimationFrame(tick);
  }

  // ---------- Starten ----------
  startBtn.addEventListener('click', async () => {
    if (!window.isSecureContext || !navigator.mediaDevices) {
      startNote.textContent = '⚠️ De microfoon werkt alleen via een https-adres (of localhost op de computer).';
      return;
    }
    startBtn.disabled = true;
    try {
      const opened = await startMic();
      if (!alive) {
        // Intussen al naar een ander scherm gegaan: microfoon meteen weer dicht.
        opened.stop();
        return;
      }
      mic = opened;
      startBox.remove();
      app.append(tabs, tip, grid, resultBox);
      selectInstrument(current);
      rafId = requestAnimationFrame(tick);
    } catch (err) {
      startBtn.disabled = false;
      const name = err instanceof DOMException ? err.name : '';
      startNote.textContent =
        name === 'NotAllowedError'
          ? '⚠️ Geen toestemming voor de microfoon. Sta ze toe via het slotje naast het adres en probeer opnieuw.'
          : `⚠️ De microfoon kon niet starten (${name || String(err)}).`;
    }
  });

  return () => {
    alive = false;
    cancelAnimationFrame(rafId);
    mic?.stop();
    mic = null;
  };
}
