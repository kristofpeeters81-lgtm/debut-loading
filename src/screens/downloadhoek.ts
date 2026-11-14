// Downloadhoek (blok 10): zelf liedjes (MIDI-bestanden) toevoegen, in kindertaal.
// De app zoekt zelf niets online: het bestand komt van de tablet (Android-bestandskiezer).
// De vaste link naar één betrouwbare downloadsite komt erbij zodra die gekozen is (eerst voorleggen aan de ouder).

import { engine } from '../audio/engine';
import { noteName } from '../dsp/notes';
import { settings } from '../app/state';
import { chooseTrack, importFiles, importedSongs, previewTrack, removeSong, type ImportedSong } from '../songs/library';
import type { Song } from '../songs/songs';
import { el } from '../ui/dom';
import { icon } from '../ui/icons';
import { openSong } from './spel';

export function mountDownloadhoek(app: HTMLElement): () => void {
  const timers: number[] = [];
  const stopPreview = (): void => {
    for (const t of timers) window.clearTimeout(t);
    timers.length = 0;
    engine.stopAll();
  };
  /** De eerste ±10 seconden van een liedje voorspelen. */
  const preview = (song: Song | undefined): void => {
    stopPreview();
    if (!song) return;
    const ms = 60000 / song.bpm;
    for (const n of song.notes) {
      if (n.beat * ms > 10000) break;
      timers.push(window.setTimeout(() => engine.noteOn('piano', n.midi).stop(), n.beat * ms));
    }
  };

  // ---------- Stappenplan ----------
  const how = el('section', 'card how-to');
  how.append(el('h2', '', 'Zo zet je een liedje in de app'));
  const steps: [string, string][] = [
    ['1', 'Zoek je liedje als MIDI-bestand. Zo’n bestand eindigt op .mid. Zoek samen met mama of papa.'],
    ['2', 'Download het. Het komt in de map "Downloads" op de tablet.'],
    ['3', 'Tik hieronder op "Liedje toevoegen" en kies het bestand. Meer liedjes tegelijk mag ook.'],
  ];
  const list = el('ol', 'how-steps');
  for (const [n, text] of steps) {
    const li = el('li', 'how-step');
    li.append(el('span', 'how-num', n), el('span', '', text));
    list.append(li);
  }
  how.append(list);

  const input = el('input');
  input.type = 'file';
  input.accept = '.mid,.midi,.kar,audio/midi,audio/x-midi,audio/mid';
  input.multiple = true;
  input.hidden = true;
  const addBtn = el('button', 'big add-song');
  addBtn.append(icon('download', 'var(--bg)', 26), el('span', '', 'Liedje toevoegen'));
  addBtn.addEventListener('click', () => input.click());
  const messages = el('div', 'import-messages');
  how.append(addBtn, input, messages);

  // ---------- Mijn liedjes ----------
  const mine = el('section', 'card');
  const mineTitle = el('h2', '', 'Mijn liedjes');
  const mineList = el('div', 'my-songs');
  mine.append(mineTitle, mineList);

  const renderList = (): void => {
    mineList.replaceChildren();
    const songs = importedSongs();
    if (songs.length === 0) {
      mineList.append(el('p', 'muted', 'Nog geen eigen liedjes. Voeg er hierboven een toe!'));
      return;
    }
    for (const s of songs) mineList.append(songCard(s));
  };

  function songCard(s: ImportedSong): HTMLElement {
    const card = el('div', 'my-song');
    card.dataset.song = s.id;
    const t = s.tracks.find((x) => x.index === s.trackIndex);
    const info = el('div', 'my-song-info');
    info.append(
      el('span', 'lesson-title', s.title),
      el('span', 'lesson-goal', `Melodie: ${t ? `${t.name} (${t.instrument})` : 'spoor ' + (s.trackIndex + 1)} · ${s.song.notes.length} noten`),
    );
    const row = el('div', 'pad-row my-song-actions');
    const play = el('button', 'pad wide my-play', 'Speel');
    play.addEventListener('click', () => openSong(s.id, settings().instrument));
    const listen = el('button', 'pad wide', 'Luister');
    listen.addEventListener('click', () => preview(s.song));
    const other = el('button', 'pad wide my-tracks', 'Ander spoor');
    const del = el('button', 'pad wide danger my-delete', 'Verwijderen');
    let armed = false;
    del.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        del.textContent = 'Zeker? Tik nog eens';
        window.setTimeout(() => {
          armed = false;
          del.textContent = 'Verwijderen';
        }, 4000);
        return;
      }
      void removeSong(s.id).then(renderList);
    });
    row.append(play, listen, other, del);
    const chooser = el('div', 'track-chooser');
    chooser.hidden = true;
    other.addEventListener('click', () => {
      chooser.hidden = !chooser.hidden;
      if (!chooser.hidden) renderChooser();
    });
    const renderChooser = (): void => {
      chooser.replaceChildren(el('p', 'small', 'Welk spoor is de melodie? Luister en kies. Het spoor met een ster is de gok van de app.'));
      const best = [...s.tracks].sort((a, b) => b.score - a.score)[0]?.index;
      for (const tr of s.tracks) {
        const line = el('div', tr.index === s.trackIndex ? 'track-line on' : 'track-line');
        line.dataset.track = String(tr.index);
        const label = el('span', 'track-label', `${tr.index === best ? '★ ' : ''}${tr.name} · ${tr.instrument} · ${tr.notes} noten`);
        const l = el('button', 'pad', 'Luister');
        l.addEventListener('click', () => preview(previewTrack(s.id, tr.index)));
        const c = el('button', 'pad track-pick', tr.index === s.trackIndex ? 'Gekozen' : 'Kies');
        c.disabled = tr.index === s.trackIndex;
        c.addEventListener('click', () => {
          void chooseTrack(s.id, tr.index).then(renderList);
        });
        line.append(label, l, c);
        chooser.append(line);
      }
    };
    // Eerste noten als voorproefje.
    const first = el('div', 'my-song-notes', s.song.notes.slice(0, 12).map((n) => noteName(n.midi, settings().notation, false)).join(' '));
    card.append(info, first, row, chooser);
    return card;
  }

  input.addEventListener('change', () => {
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;
    messages.replaceChildren(el('p', 'small', 'Even inlezen…'));
    void importFiles(files).then((results) => {
      messages.replaceChildren();
      for (const r of results) {
        messages.append(
          el('p', r.ok ? 'import-ok' : 'import-fail', r.ok ? `Toegevoegd: ${r.song.title}` : `${r.file}: ${r.reason}`),
        );
      }
      renderList();
    });
  });

  renderList();
  app.append(how, mine, el('p', 'small', 'Je liedjes blijven op deze tablet en zijn voor iedereen van het gezin. De app zet niets op internet.'));
  return stopPreview;
}
