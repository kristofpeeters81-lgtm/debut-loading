// Naspeelstudio (blok 11): een mp3 laden, trager afspelen, een stukje herhalen, de melodie meespelen
// (op het keyboard via de microfoon, of tikken op het scherm) en bewaren als liedje met het echte nummer als begeleiding.
// De mp3 blijft op de tablet (IndexedDB). Geen AI: jij hoort de melodie, de app noteert.

import { engine } from '../audio/engine';
import { startTracker, type Tracker } from '../audio/tracker';
import { hzToMidi, noteName } from '../dsp/notes';
import { settings } from '../app/state';
import { NoteEvents } from '../lessons/noteEvents';
import { Take } from '../songs/studio';
import { removeStudio, saveStudio, studioSong, studioSongs, type StudioRecord } from '../songs/library';
import { keyboardSurface } from './lesSurfaces';
import { openSong } from './spel';
import { el } from '../ui/dom';

const MIC_LAG_S = 0.1;
const DEAF_AFTER_MS = 450;
const SPEEDS = [0.5, 0.75, 1];

const fmt = (s: number): string => {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

export function mountStudio(app: HTMLElement): () => void {
  let rec: StudioRecord | null = null;
  let take = new Take();
  let audio: HTMLAudioElement | null = null;
  let url = '';
  let tracker: Tracker | null = null;
  let recording = false;
  let alive = true;
  let raf = 0;
  let deafUntil = 0;
  let loopA: number | null = null;
  let loopB: number | null = null;
  let speed = 0.75;
  const events = new NoteEvents();

  // ---------- Mijn naspeelnummers ----------
  const listCard = el('section', 'card');
  const listBox = el('div', 'my-songs');
  listCard.append(el('h2', '', 'Mijn naspeelnummers'), listBox);

  // ---------- 1. Kies je nummer ----------
  const pickCard = el('section', 'card how-to');
  const input = el('input');
  input.type = 'file';
  input.accept = 'audio/*,.mp3,.m4a,.wav,.ogg';
  input.hidden = true;
  const pickBtn = el('button', 'big studio-pick', 'Kies een mp3');
  pickBtn.addEventListener('click', () => input.click());
  const titleLabel = el('label', 'field-label', 'Naam van het nummer');
  titleLabel.htmlFor = 'studio-title';
  const titleInput = el('input', 'name-input');
  titleInput.id = 'studio-title';
  titleInput.maxLength = 48;
  const titleBox = el('div', 'studio-title-box');
  titleBox.append(titleLabel, titleInput);
  titleBox.hidden = true;
  pickCard.append(
    el('h2', '', '1. Kies je nummer'),
    el('p', 'small', 'Een mp3 van je favoriete nummer, van de tablet. Het blijft op deze tablet en gaat nergens heen.'),
    pickBtn,
    input,
    titleBox,
  );

  // ---------- 2. Luister en oefen ----------
  const playCard = el('section', 'card');
  const playBtn = el('button', 'pad wide studio-play', 'Afspelen');
  const time = el('span', 'studio-time', '0:00 / 0:00');
  const seek = el('input', 'studio-seek');
  seek.type = 'range';
  seek.min = '0';
  seek.max = '1000';
  seek.value = '0';
  seek.setAttribute('aria-label', 'Plaats in het nummer');
  const speeds = el('div', 'chips studio-speeds');
  for (const sp of SPEEDS) {
    const c = el('button', 'chip', `${Math.round(sp * 100)}%`);
    c.dataset.speed = String(sp);
    c.addEventListener('click', () => {
      speed = sp;
      if (audio) audio.playbackRate = sp;
      renderSpeeds();
    });
    speeds.append(c);
  }
  const renderSpeeds = (): void => {
    for (const c of speeds.querySelectorAll<HTMLButtonElement>('.chip')) c.classList.toggle('on', Number(c.dataset.speed) === speed);
  };
  const aBtn = el('button', 'pad wide', 'Begin stukje');
  const bBtn = el('button', 'pad wide', 'Einde stukje');
  const loopInfo = el('span', 'small studio-loop', 'Geen stukje gekozen: het hele nummer speelt.');
  const loopOff = el('button', 'pad wide', 'Hele nummer');
  const playRow = el('div', 'pad-row');
  playRow.append(playBtn, time);
  const loopRow = el('div', 'pad-row');
  loopRow.append(aBtn, bBtn, loopOff);
  playCard.append(el('h2', '', '2. Luister en oefen'), playRow, seek, el('span', 'game-label', 'Snelheid'), speeds, loopRow, loopInfo);

  // ---------- 3. Speel de melodie na ----------
  const recCard = el('section', 'card');
  const recBtn = el('button', 'big studio-rec', 'Opnemen');
  const live = el('div', 'studio-live', '');
  const notesView = el('div', 'my-song-notes studio-notes', '');
  const undo = el('button', 'pad wide', 'Laatste noot weg');
  const clear = el('button', 'pad wide danger', 'Stukje wissen');
  const editRow = el('div', 'pad-row');
  editRow.append(undo, clear);
  const kb = keyboardSurface(48, 84, (m) => {
    engine.noteOn('piano', m);
    deafUntil = performance.now() + DEAF_AFTER_MS;
    addNote(m, audio?.currentTime ?? 0);
  });
  recCard.append(
    el('h2', '', '3. Speel de melodie na'),
    el('p', 'small', 'Zet een hoofdtelefoon op, zodat de app enkel je keyboard hoort. Of tik de melodie mee op het scherm.'),
    recBtn,
    live,
    kb.el,
    notesView,
    editRow,
  );

  // ---------- 4. Bewaren ----------
  const saveCard = el('section', 'card');
  const saveBtn = el('button', 'big studio-save', 'Bewaar als liedje');
  const saveMsg = el('p', 'small', '');
  const playSong = el('button', 'pad wide studio-open', 'Speel het nu');
  playSong.hidden = true;
  saveCard.append(el('h2', '', '4. Bewaren'), saveBtn, saveMsg, playSong);

  const work = el('div', 'studio-work');
  work.append(playCard, recCard, saveCard);
  work.hidden = true;
  app.append(listCard, pickCard, work);

  // ---------- Logica ----------
  const renderNotes = (): void => {
    const n = take.notes.length;
    notesView.textContent = n
      ? `${n} noten: ${take.notes
          .slice(-14)
          .map((x) => noteName(x.midi, settings().notation, false))
          .join(' ')}`
      : 'Nog geen noten. Druk op Opnemen en speel mee.';
    notesView.dataset.count = String(n);
    saveBtn.disabled = n === 0;
  };

  function addNote(midi: number, t: number): void {
    if (!audio) return;
    if (take.add(midi, t)) {
      kb.flash(midi, 'ok');
      renderNotes();
    }
  }

  const renderLoop = (): void => {
    loopInfo.textContent =
      loopA !== null && loopB !== null ? `Stukje: ${fmt(loopA)} tot ${fmt(loopB)} (blijft herhalen)` : loopA !== null ? `Begin stukje: ${fmt(loopA)}` : 'Geen stukje gekozen: het hele nummer speelt.';
  };
  aBtn.addEventListener('click', () => {
    if (!audio) return;
    loopA = audio.currentTime;
    if (loopB !== null && loopB <= loopA) loopB = null;
    renderLoop();
  });
  bBtn.addEventListener('click', () => {
    if (!audio) return;
    if (loopA === null) loopA = 0;
    if (audio.currentTime > loopA + 0.5) loopB = audio.currentTime;
    renderLoop();
  });
  loopOff.addEventListener('click', () => {
    loopA = null;
    loopB = null;
    renderLoop();
  });
  undo.addEventListener('click', () => {
    if (take.removeLastBefore(audio?.currentTime ?? Infinity)) renderNotes();
  });
  let armed = false;
  clear.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      clear.textContent = loopA !== null && loopB !== null ? 'Zeker? Tik nog eens' : 'Alles wissen? Tik nog eens';
      window.setTimeout(() => {
        armed = false;
        clear.textContent = 'Stukje wissen';
      }, 4000);
      return;
    }
    armed = false;
    clear.textContent = 'Stukje wissen';
    if (loopA !== null && loopB !== null) take.clearRange(loopA, loopB);
    else take = new Take();
    renderNotes();
  });

  const tick = (): void => {
    if (!alive || !audio) return;
    if (loopA !== null && loopB !== null && audio.currentTime >= loopB) audio.currentTime = loopA;
    const d = audio.duration;
    time.textContent = `${fmt(audio.currentTime)} / ${fmt(d)}`;
    if (Number.isFinite(d) && d > 0 && document.activeElement !== seek) seek.value = String(Math.round((audio.currentTime / d) * 1000));
    playBtn.textContent = audio.paused ? 'Afspelen' : 'Pauze';
    raf = requestAnimationFrame(tick);
  };

  const play = (): void => {
    if (!audio) return;
    audio.playbackRate = speed;
    void audio.play().catch(() => undefined);
  };
  playBtn.addEventListener('click', () => {
    if (!audio) return;
    if (audio.paused) play();
    else audio.pause();
  });
  seek.addEventListener('input', () => {
    if (audio && Number.isFinite(audio.duration)) audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
  });

  const stopRecording = (): void => {
    recording = false;
    tracker?.stop();
    tracker = null;
    recBtn.textContent = 'Opnemen';
    recBtn.classList.remove('on');
    live.textContent = '';
  };
  recBtn.addEventListener('click', () => {
    if (!audio) return;
    if (recording) {
      stopRecording();
      audio.pause();
      return;
    }
    recording = true;
    recBtn.textContent = 'Stop opname';
    recBtn.classList.add('on');
    events.reset();
    play();
    void startTracker({ minHz: 120, maxHz: 1100 }, (f) => {
      const m = f.hz === null ? null : Math.round(hzToMidi(f.hz));
      live.textContent = m === null ? '' : `Ik hoor: ${noteName(m, settings().notation)}`;
      const ev = events.push(m, f.recentLevel, f.timeMs);
      if (ev !== null && f.timeMs >= deafUntil && audio && !audio.paused) addNote(ev, audio.currentTime - MIC_LAG_S * audio.playbackRate);
    })
      .then((t) => {
        if (!alive || !recording) t.stop();
        else tracker = t;
      })
      .catch(() => {
        live.textContent = 'Geen microfoon: tik de melodie mee op het scherm.';
      });
  });

  /** Een nummer openen om na te spelen (nieuw uit een bestand, of verder met een bewaard nummer). */
  const open = (blob: Blob, title: string, fileName: string, existing: StudioRecord | null): void => {
    stopRecording();
    audio?.pause();
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(blob);
    audio = new Audio(url);
    audio.preload = 'auto';
    (audio as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
    audio.playbackRate = speed;
    rec = existing ?? { id: `studio-${Date.now().toString(36)}`, title, fileName, audio: blob, notes: [], createdAt: Date.now() };
    take = new Take(rec.notes);
    titleInput.value = rec.title;
    titleBox.hidden = false;
    work.hidden = false;
    loopA = null;
    loopB = null;
    renderLoop();
    renderSpeeds();
    renderNotes();
    playSong.hidden = existing === null;
    saveMsg.textContent = existing ? 'Je speelt verder aan een bewaard nummer.' : '';
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  };

  input.addEventListener('change', () => {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    open(f, f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_]+/g, ' ').trim().slice(0, 48) || 'Mijn nummer', f.name, null);
  });

  saveBtn.addEventListener('click', () => {
    if (!rec || take.notes.length === 0) return;
    const next: StudioRecord = { ...rec, title: titleInput.value.trim() || rec.title, notes: take.notes };
    saveBtn.disabled = true;
    saveStudio(next)
      .then(() => {
        rec = next;
        saveMsg.textContent = `Bewaard! "${next.title}" staat nu bij Liedjes → Mijn liedjes.`;
        playSong.hidden = false;
        renderList();
      })
      .catch(() => {
        saveMsg.textContent = 'Kon niet bewaren op deze tablet. Probeer opnieuw.';
      })
      .finally(() => {
        saveBtn.disabled = take.notes.length === 0;
      });
  });
  playSong.addEventListener('click', () => {
    if (rec) openSong(rec.id, 'keyboard');
  });

  function renderList(): void {
    listBox.replaceChildren();
    const all = studioSongs();
    listCard.hidden = all.length === 0;
    for (const r of all) {
      const card = el('div', 'my-song');
      card.dataset.studio = r.id;
      const info = el('div', 'my-song-info');
      info.append(el('span', 'lesson-title', r.title), el('span', 'lesson-goal', `${r.notes.length} noten nagespeeld`));
      const row = el('div', 'pad-row my-song-actions');
      const go = el('button', 'pad wide', 'Speel');
      go.addEventListener('click', () => openSong(r.id, 'keyboard'));
      const more = el('button', 'pad wide studio-continue', 'Verder naspelen');
      more.addEventListener('click', () => {
        const fresh = studioSong(r.id);
        if (fresh) open(fresh.audio, fresh.title, fresh.fileName, fresh);
        work.scrollIntoView({ behavior: 'smooth' });
      });
      const del = el('button', 'pad wide danger', 'Verwijderen');
      let sure = false;
      del.addEventListener('click', () => {
        if (!sure) {
          sure = true;
          del.textContent = 'Zeker? Tik nog eens';
          window.setTimeout(() => {
            sure = false;
            del.textContent = 'Verwijderen';
          }, 4000);
          return;
        }
        void removeStudio(r.id).then(renderList);
      });
      row.append(go, more, del);
      card.append(info, row);
      listBox.append(card);
    }
  }
  renderList();

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    stopRecording();
    audio?.pause();
    if (url) URL.revokeObjectURL(url);
    engine.stopAll();
  };
}
