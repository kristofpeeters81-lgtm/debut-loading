import { describe, expect, it } from 'vitest';
import { RangeMeter, Smoother, nearestString, tuneState, voiceDescription } from './tuning';
import { midiToHz } from '../dsp/notes';

const GUITAR = [40, 45, 50, 55, 59, 64];
const cents = (m: number, c: number): number => midiToHz(m) * Math.pow(2, c / 1200);

describe('stemapparaat', () => {
  it('vindt de dichtstbijzijnde snaar en de afwijking', () => {
    expect(nearestString(cents(45, 30), GUITAR)).toEqual({ index: 1, cents: 30 });
    expect(nearestString(cents(64, -12), GUITAR)).toEqual({ index: 5, cents: -12 });
    // Een halve toon te laag gestemde A-snaar wordt nog als A-snaar gezien
    expect(nearestString(cents(45, -90), GUITAR).index).toBe(1);
  });

  it('zegt het in woorden, zonder getallen', () => {
    expect(tuneState(0)).toBe('juist');
    expect(tuneState(4)).toBe('juist');
    expect(tuneState(-12)).toBe('iets te laag');
    expect(tuneState(20)).toBe('iets te hoog');
    expect(tuneState(-44)).toBe('veel te laag');
    expect(tuneState(60)).toBe('veel te hoog');
  });

  it('een uitschieter doet de naald niet springen', () => {
    const s = new Smoother(5);
    [2, 3, 2, 90, 3].forEach((v) => s.push(v));
    expect(s.push(2)).toBeLessThan(5);
  });
});

describe('zangbereik', () => {
  it('telt enkel vastgehouden noten', () => {
    const r = new RangeMeter(500);
    // Kort tikje op 80 (te kort), daarna 57 lang en 76 lang
    r.push(80, 0);
    r.push(80, 200);
    r.push(57, 300);
    r.push(57, 900);
    r.push(null, 1000);
    r.push(76, 1100);
    r.push(76, 1700);
    expect(r.low).toBe(57);
    expect(r.high).toBe(76);
  });

  it('geeft een vriendelijke uitleg', () => {
    expect(voiceDescription(57, 79)).toContain('hoge stem');
    expect(voiceDescription(44, 57)).toContain('lage stem');
  });
});
