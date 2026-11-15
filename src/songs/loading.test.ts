import { describe, expect, it } from 'vitest';
import { LOADING_CHORDS, MELODY, PARTS, TOTAL_BARS, TOTAL_BEATS, backingParts, loadingSong } from './loading';
import { BASS_STRINGS, GUITAR_STRINGS, placeOnNeck } from './arrange';
import { KEYBOARD_MAX, KEYBOARD_MIN } from '../screens/vrijspelen';
import { DRUM_PADS } from '../audio/synth';
import { Game } from './game';

describe('eigen nummer LOADING', () => {
  it('54 maten, één akkoord per maat, ±2 minuten', () => {
    expect(TOTAL_BARS).toBe(54);
    expect(LOADING_CHORDS).toHaveLength(54);
    expect((TOTAL_BEATS * 60) / 112).toBeGreaterThan(100);
  });

  it('de melodie loopt op volgorde zonder overlap, en elke noot heeft een lettergreep', () => {
    for (let i = 1; i < MELODY.length; i++) {
      const a = MELODY[i - 1].note;
      const b = MELODY[i].note;
      expect(b.beat).toBeGreaterThanOrEqual(a.beat + a.len - 1e-9);
    }
    for (const m of MELODY) expect(m.syl.length).toBeGreaterThan(0);
    expect(MELODY[MELODY.length - 1].note.beat).toBeLessThan(TOTAL_BEATS);
  });

  it('keyboard past op de Casio, gitaar en bas liggen op de hals', () => {
    for (const lvl of ['makkelijk', 'moeilijk'] as const) {
      for (const n of PARTS.keyboard[lvl]) expect(n.midi >= KEYBOARD_MIN && n.midi <= KEYBOARD_MAX).toBe(true);
      for (const n of PARTS.gitaar[lvl]) expect(placeOnNeck(n.midi, GUITAR_STRINGS)).not.toBeNull();
      for (const n of PARTS.bas[lvl]) expect(placeOnNeck(n.midi, BASS_STRINGS, 5)).not.toBeNull();
    }
  });

  it('makkelijk heeft minder noten dan moeilijk', () => {
    for (const inst of ['keyboard', 'gitaar', 'bas', 'drum', 'zang'] as const) {
      expect(PARTS[inst].makkelijk.length).toBeLessThan(PARTS[inst].moeilijk.length);
    }
  });

  it('drum gebruikt enkel bestaande pads', () => {
    const pads = new Set(DRUM_PADS.map((p) => p.id));
    for (const lvl of ['makkelijk', 'moeilijk'] as const) for (const n of PARTS.drum[lvl]) expect(pads.has(n.pad!)).toBe(true);
  });

  it('zang heeft de tekst bij elke noot', () => {
    const s = loadingSong('zang', 'moeilijk');
    expect(s.lyrics).toHaveLength(s.notes.length);
    expect(s.lyrics!.every((x) => x.length > 0)).toBe(true);
    expect(s.lyrics!.slice(0, 7).join(' ')).toBe('Vier mei den. Eén ga ra ge.');
  });

  it('is speelbaar in het spel (zang makkelijk = refrein + drop)', () => {
    const s = loadingSong('zang', 'makkelijk');
    const g = new Game(s, { wait: true, tempo: 1 });
    for (let i = 0; i < 2000 && !g.finished; i++) {
      g.update(100);
      const n = g.nextOpen;
      if (n && g.waiting) g.input(n.midi);
    }
    expect(g.finished).toBe(true);
    expect(g.hits).toBe(s.notes.length);
  });

  it('begeleiding: de app speelt wat niemand speelt', () => {
    const insts = (skip: Parameters<typeof backingParts>[0]): string[] => backingParts(skip).map((p) => p.inst);
    expect(insts(['drum'])).toEqual(['keyboard', 'gitaar', 'bas']);
    expect(insts(['zang', 'bas'])).toEqual(['gitaar', 'drum']); // melodie wordt gezongen: app speelt ze niet
    expect(insts(['keyboard', 'gitaar', 'bas', 'drum'])).toEqual([]);
  });
});
