import { describe, expect, it } from 'vitest';
import { Game, clampTempo } from './game';
import { SONGS, songById, songLength } from './songs';
import { KEYBOARD_MAX, KEYBOARD_MIN } from '../screens/vrijspelen';

const song = songById('ode')!;

describe('liedjes', () => {
  it('hebben noten op volgorde, binnen het bereik van de Casio, en een begeleiding per maat', () => {
    for (const s of SONGS) {
      for (let i = 1; i < s.notes.length; i++) expect(s.notes[i].beat).toBeGreaterThanOrEqual(s.notes[i - 1].beat + s.notes[i - 1].len - 1e-9);
      for (const n of s.notes) expect(n.midi >= KEYBOARD_MIN && n.midi <= KEYBOARD_MAX).toBe(true);
      if (s.chords) expect(s.chords.length).toBe(Math.ceil(songLength(s) / s.beatsPerBar));
    }
  });
});

describe('spel met vallende noten', () => {
  it('"Wacht op mij": de tijd stopt bij de noot tot je ze speelt', () => {
    const g = new Game(song, { wait: true, tempo: 1 });
    g.update(5000); // veel tijd: toch blijft het staan bij de eerste noot (tel 0)
    expect(g.beat).toBe(0);
    expect(g.waiting).toBe(true);
    expect(g.input(62).result).toBe('wrong');
    expect(g.mistakes).toBe(1);
    expect(g.input(76).result).toBe('hit'); // E5 telt als E
    expect(g.waiting).toBe(false);
    g.update(1000);
    expect(g.beat).toBe(1); // wacht op de tweede E
  });

  it('"Wacht op mij": een foute noot terwijl het lied loopt telt niet (bv. de begeleiding)', () => {
    const g = new Game(song, { wait: true, tempo: 1 });
    g.update(100);
    expect(g.waiting).toBe(false);
    expect(g.input(50).result).toBe('ignored');
    expect(g.mistakes).toBe(0);
  });

  it('zonder wachten: raak binnen ±300 ms, anders gemist (zonder straf)', () => {
    const g = new Game(song, { wait: false, tempo: 1 }); // 600 ms per tel
    g.update(2 * 600 + 100); // 100 ms na de eerste noot
    expect(g.input(64).result).toBe('hit');
    g.update(600 + 400); // 400 ms na de tweede noot: te laat
    expect(g.notes[1].state).toBe('miss');
    expect(g.input(64).result).toBe('ignored');
  });

  it('speelt het hele liedje uit en geeft sterren', () => {
    const g = new Game(song, { wait: true, tempo: 1 });
    for (let i = 0; i < 400 && !g.finished; i++) {
      g.update(100);
      const n = g.nextOpen;
      if (n && g.waiting) g.input(n.midi);
    }
    expect(g.finished).toBe(true);
    expect(g.hits).toBe(song.notes.length);
    expect(g.stars).toBe(3);
  });

  it('stukje herhalen: springt terug en zet de noten weer open', () => {
    const g = new Game(song, { wait: false, tempo: 1 });
    g.update(2 * 600 + 4 * 600 + 10); // in maat 2
    g.toggleLoop();
    expect(g.loop).toEqual({ from: 4, to: 12 });
    g.update(9 * 600);
    expect(g.beat).toBeLessThan(12);
    expect(g.notes.filter((n) => n.beat >= 4 && n.beat < 12).every((n) => n.state !== 'hit')).toBe(true);
    g.toggleLoop();
    expect(g.loop).toBeNull();
  });

  it('tempo blijft tussen 40 % en 100 %', () => {
    expect(clampTempo(0.1)).toBe(0.4);
    expect(clampTempo(1.5)).toBe(1);
    expect(clampTempo(0.74)).toBe(0.7);
  });
});
