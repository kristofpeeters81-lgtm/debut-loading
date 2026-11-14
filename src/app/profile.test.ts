import { describe, expect, it } from 'vitest';
import { MAX_NAME, cleanName, sanitizeProfile, sortProfiles } from './profile';

describe('profielen', () => {
  it('kuist namen op', () => {
    expect(cleanName('  Mila   Rose ')).toBe('Mila Rose');
    expect(cleanName('Supercalifragilistic')).toHaveLength(MAX_NAME);
    expect(cleanName('   ')).toBe('');
  });

  it('maakt een geldig profiel van wat uit de opslag komt', () => {
    expect(sanitizeProfile({ id: 'p1', name: 'Sam', character: 'kat', instrument: 'bas', createdAt: 5 })).toEqual({
      id: 'p1',
      name: 'Sam',
      character: 'kat',
      instrument: 'bas',
      voiceRange: null,
      createdAt: 5,
    });
  });

  it('vult onbekende waarden aan met veilige standaardwaarden', () => {
    const p = sanitizeProfile({ id: 'p2', name: 'Ann', character: 'draak', instrument: 'fluit', voiceRange: { low: 90, high: 50 } });
    expect(p?.character).toBe('nova');
    expect(p?.instrument).toBe('keyboard');
    expect(p?.voiceRange).toBeNull();
  });

  it('weigert iets zonder id of naam', () => {
    expect(sanitizeProfile(null)).toBeNull();
    expect(sanitizeProfile({ id: 'p3', name: '  ' })).toBeNull();
    expect(sanitizeProfile({ name: 'Zonder id' })).toBeNull();
  });

  it('houdt de volgorde waarin profielen gemaakt zijn', () => {
    const list = [
      { id: 'b', name: 'B', character: 'kai' as const, instrument: 'drum' as const, voiceRange: null, createdAt: 20 },
      { id: 'a', name: 'A', character: 'nova' as const, instrument: 'keyboard' as const, voiceRange: null, createdAt: 10 },
    ];
    expect(sortProfiles(list).map((p) => p.id)).toEqual(['a', 'b']);
  });
});
