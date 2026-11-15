import { describe, expect, it } from 'vitest';
import { TimingJudge } from './timing';

// 60 bpm = 1000 ms per tel, start op 10 000 ms
const pattern = [
  { token: 60, beat: 0 },
  { token: 62, beat: 1 },
  { token: 60, beat: 2 },
];

describe('timing (in de maat)', () => {
  it('op tijd, te vroeg en te laat', () => {
    const j = new TimingJudge(pattern, 60, 10000);
    expect(j.input(60, 10050)).toMatchObject({ result: 'hit', verdict: 'op tijd' });
    expect(j.input(62, 10800)).toMatchObject({ result: 'hit', verdict: 'te vroeg' });
    expect(j.input(72, 12200)).toMatchObject({ result: 'hit', verdict: 'te laat' }); // C5 telt als C
    expect(j.misses).toBe(0);
    expect(j.onTime).toBe(1);
  });

  it('veel te vroeg of de verkeerde noot telt niet', () => {
    const j = new TimingJudge(pattern, 60, 10000);
    expect(j.input(60, 9500).result).toBe('ignored');
    expect(j.input(64, 10000).result).toBe('ignored');
  });

  it('wie niets speelt, mist de noot (zonder straf) en de oefening eindigt', () => {
    const j = new TimingJudge(pattern, 60, 10000);
    expect(j.update(10300)).toHaveLength(1);
    expect(j.done(12100)).toBe(false);
    j.update(12300);
    expect(j.done(12300)).toBe(true);
    expect(j.misses).toBe(3);
  });

  it('dezelfde noot twee keer na elkaar: elke aanslag telt voor zijn eigen tel', () => {
    const j = new TimingJudge(
      [
        { token: 'kick', beat: 0 },
        { token: 'kick', beat: 0.5 },
      ],
      60,
      0,
    );
    expect(j.input('kick', 10).result).toBe('hit');
    expect(j.input('kick', 520).result).toBe('hit');
    expect(j.misses).toBe(0);
  });
});
