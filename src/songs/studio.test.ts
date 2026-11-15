import { describe, expect, it } from 'vitest';
import { Take } from './studio';
import { Game } from './game';

describe('naspeelstudio', () => {
  it('noteert noten op de tijdlijn van de mp3, gesorteerd', () => {
    const t = new Take();
    t.add(64, 2.0);
    t.add(60, 1.0);
    t.add(62, 1.5);
    expect(t.notes.map((n) => n.midi)).toEqual([60, 62, 64]);
  });

  it('een dubbel gehoorde noot telt maar één keer', () => {
    const t = new Take();
    expect(t.add(60, 1.0)).toBe(true);
    expect(t.add(60, 1.05)).toBe(false);
    expect(t.add(60, 1.5)).toBe(true);
  });

  it('laatste noot weg en een stukje wissen', () => {
    const t = new Take([
      { midi: 60, t: 1 },
      { midi: 62, t: 2 },
      { midi: 64, t: 3 },
      { midi: 65, t: 4 },
    ]);
    expect(t.removeLastBefore(3.2)).toBe(true);
    expect(t.notes.map((n) => n.midi)).toEqual([60, 62, 65]);
    expect(t.clearRange(1.5, 4.5)).toBe(2);
    expect(t.notes).toHaveLength(1);
  });

  it('wordt een liedje waarin 1 tel = 1 seconde van de mp3', () => {
    const t = new Take([
      { midi: 60, t: 0.5 },
      { midi: 62, t: 1.0 },
      { midi: 64, t: 4.0 },
    ]);
    const song = t.toSong('studio-1', 'Mijn nummer', 'studio-1');
    expect(song.bpm).toBe(60);
    expect(song.audio).toBe('studio-1');
    expect(song.notes.map((n) => n.beat)).toEqual([0.5, 1.0, 4.0]);
    expect(song.notes[1].len).toBe(2); // tot de volgende noot, max. 2 s
    // Speelbaar in het spel
    const g = new Game(song, { wait: true, tempo: 1 });
    g.update(10000);
    expect(g.input(60).result).toBe('hit');
  });
});
