import { describe, expect, it } from 'vitest';
import { BASS_STRINGS, GUITAR_STRINGS, MAX_FRET, arrangeFor, drumPart, placeOnNeck, songStarKey } from './arrange';
import { SONGS, songById } from './songs';
import { Game } from './game';

describe('liedjes per instrument', () => {
  it('gitaar: elke noot ligt op de hals (fret 0–12)', () => {
    for (const s of SONGS) for (const n of arrangeFor(s, 'gitaar').notes) expect(placeOnNeck(n.midi, GUITAR_STRINGS)).not.toBeNull();
  });

  it('bas: elke noot ligt op de bashals en lager dan bij gitaar', () => {
    for (const s of SONGS) {
      const bas = arrangeFor(s, 'bas').notes;
      for (const n of bas) expect(placeOnNeck(n.midi, BASS_STRINGS)).not.toBeNull();
      expect(Math.max(...bas.map((n) => n.midi))).toBeLessThanOrEqual(43 + MAX_FRET);
    }
  });

  it('plek op de hals: laagste fret, bij gelijk de dunnere snaar', () => {
    expect(placeOnNeck(64, GUITAR_STRINGS)).toEqual({ string: 5, fret: 0 }); // hoge E los
    expect(placeOnNeck(60, GUITAR_STRINGS)).toEqual({ string: 4, fret: 1 }); // C op de B-snaar
    expect(placeOnNeck(28, BASS_STRINGS)).toEqual({ string: 0, fret: 0 });
    expect(placeOnNeck(20, BASS_STRINGS)).toBeNull();
  });

  it('zang: naar het gemeten zangbereik, de letters blijven dezelfde', () => {
    const s = songById('ode')!;
    const z = arrangeFor(s, 'zang', { low: 45, high: 60 });
    for (const n of z.notes) expect(n.midi >= 45 && n.midi <= 60).toBe(true);
    z.notes.forEach((n, i) => expect(n.midi % 12).toBe(s.notes[i].midi % 12));
  });

  it('drum: een beat op elke tel, met crash op het begin', () => {
    const d = drumPart(songById('jacob')!);
    expect(d[0].pad).toBe('crash');
    expect(d.slice(4, 8).map((n) => n.pad)).toEqual(['kick', 'hihat', 'snare', 'hihat']);
    expect(d.every((n) => n.pad)).toBe(true);
  });

  it('drum in het spel: exact de juiste pad', () => {
    const g = new Game(arrangeFor(songById('jacob')!, 'drum'), { wait: true, tempo: 1 });
    g.update(5000);
    expect(g.input('kick').result).toBe('wrong');
    expect(g.input('crash').result).toBe('hit');
    expect(g.input(60).result).toBe('ignored'); // nog niet aan de beurt (wachten op de volgende tel)
  });

  it('sterren apart per instrument (keyboard behoudt de oude id)', () => {
    expect(songStarKey('ode', 'keyboard')).toBe('song:ode');
    expect(songStarKey('ode', 'gitaar')).toBe('song:ode:gitaar');
  });
});
