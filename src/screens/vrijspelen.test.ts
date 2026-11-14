import { describe, expect, it } from 'vitest';
import { BASS_OPEN, GUITAR_OPEN, KEYBOARD_MAX, KEYBOARD_MIN, clampStart, visibleWhites } from './vrijspelen';
import { letterName, noteName } from '../dsp/notes';

describe('vrij spelen: keyboard', () => {
  it('blijft binnen het bereik van de Casio SA-76 (F2–C6)', () => {
    expect(letterName(KEYBOARD_MIN)).toBe('F2');
    expect(letterName(KEYBOARD_MAX)).toBe('C6');
    // Te laag of te hoog gevraagd → netjes binnen het bereik
    expect(clampStart(0, 15)).toBe(KEYBOARD_MIN);
    const top = visibleWhites(clampStart(200, 15), 15);
    expect(top).toHaveLength(15);
    expect(top[top.length - 1]).toBe(KEYBOARD_MAX);
  });

  it('toont standaard C3 tot C5 bij 15 witte toetsen', () => {
    const w = visibleWhites(clampStart(48, 15), 15);
    expect(letterName(w[0])).toBe('C3');
    expect(letterName(w[14])).toBe('C5');
    expect(w.every((m) => !letterName(m).includes('#'))).toBe(true);
  });

  it('heel het keyboard past als het scherm breed genoeg is', () => {
    const all = visibleWhites(clampStart(0, 26), 26);
    expect(all[0]).toBe(KEYBOARD_MIN);
    expect(all[all.length - 1]).toBe(KEYBOARD_MAX);
  });
});

describe('vrij spelen: snaren', () => {
  it('gitaar in tab-volgorde: dunste snaar (E4) bovenaan', () => {
    expect(GUITAR_OPEN.map((m) => letterName(m))).toEqual(['E4', 'B3', 'G3', 'D3', 'A2', 'E2']);
  });

  it('bas: G2 D2 A1 E1', () => {
    expect(BASS_OPEN.map((m) => letterName(m))).toEqual(['G2', 'D2', 'A1', 'E1']);
  });

  it('noemt noten in letters of do-re-mi', () => {
    expect(noteName(60, 'letters')).toBe('C4');
    expect(noteName(60, 'doremi')).toBe('do4');
    expect(noteName(71, 'doremi', false)).toBe('si');
  });
});
