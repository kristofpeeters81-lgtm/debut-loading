import { describe, expect, it } from 'vitest';
import { Midi } from '@tonejs/midi';
import { parseMidi, songFromMidi, trackToNotes } from './midiImport';
import { KEYBOARD_MAX, KEYBOARD_MIN } from '../screens/vrijspelen';

/** Maakt een klein MIDI-bestand: begeleiding (akkoorden), melodie (hoog, één noot tegelijk), bas en drums. */
function testMidi(): Uint8Array {
  const m = new Midi();
  m.header.setTempo(90);
  const acc = m.addTrack();
  acc.name = 'Piano begeleiding';
  for (let bar = 0; bar < 8; bar++) for (const n of [48, 52, 55]) acc.addNote({ midi: n, ticks: bar * 1920, durationTicks: 1920 });
  const mel = m.addTrack();
  mel.name = 'unbenannt1';
  const tune = [76, 76, 77, 79, 79, 77, 76, 74, 72, 72, 74, 76, 76, 74, 74, 74];
  tune.forEach((n, i) => mel.addNote({ midi: n, ticks: i * 480, durationTicks: 470 }));
  mel.addNote({ midi: 88, ticks: 960, durationTicks: 20 }); // versierinkje, te kort
  const bass = m.addTrack();
  bass.name = 'Bass';
  for (let i = 0; i < 16; i++) bass.addNote({ midi: 36, ticks: i * 480, durationTicks: 400 });
  const drums = m.addTrack();
  drums.channel = 9;
  for (let i = 0; i < 16; i++) drums.addNote({ midi: 36, ticks: i * 480, durationTicks: 100 });
  return m.toArray();
}

describe('MIDI importeren', () => {
  it('kiest het melodiespoor, ook met een nietszeggende naam', () => {
    const { info } = parseMidi(testMidi(), 'Mijn_liedje.mid');
    expect(info.title).toBe('Mijn liedje');
    expect(info.bpm).toBe(90);
    expect(info.tracks[info.best].name).toBe('unbenannt1');
  });

  it('maakt de melodie eenstemmig, zonder versierinkjes, binnen het bereik van de Casio', () => {
    const { midi, info } = parseMidi(testMidi(), 'x.mid');
    const notes = trackToNotes(midi, info.best);
    expect(notes).toHaveLength(16);
    expect(notes[0].beat).toBe(0);
    for (const n of notes) expect(n.midi >= KEYBOARD_MIN && n.midi <= KEYBOARD_MAX).toBe(true);
    for (let i = 1; i < notes.length; i++) expect(notes[i].beat).toBeGreaterThanOrEqual(notes[i - 1].beat + notes[i - 1].len - 1e-9);
  });

  it('akkoorden worden de hoogste noot', () => {
    const { midi } = parseMidi(testMidi(), 'x.mid');
    const notes = trackToNotes(midi, 0);
    expect(notes).toHaveLength(8);
  });

  it('een liedje uit MIDI heeft een tempo, maat en noten', () => {
    const { midi, info } = parseMidi(testMidi(), 'x.mid');
    const song = songFromMidi('eigen-1', midi, info, info.best);
    expect(song.bpm).toBe(90);
    expect(song.beatsPerBar).toBe(4);
    expect(song.notes.length).toBe(16);
  });
});
