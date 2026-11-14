import { describe, expect, it } from 'vitest';
import { CHARACTERS, avatarMarkup, characterById } from './avatar';
import { INSTRUMENT_CHOICES } from '../app/settings';

describe('avatars', () => {
  it('heeft 10 figuren met unieke namen', () => {
    expect(CHARACTERS).toHaveLength(10);
    expect(new Set(CHARACTERS.map((c) => c.id)).size).toBe(10);
  });

  it('elke figuur kan elk instrument bespelen', () => {
    for (const c of CHARACTERS) {
      for (const { id } of INSTRUMENT_CHOICES) {
        const svg = avatarMarkup(c.id, id, { uid: 't' });
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg).toContain(`data-character="${c.id}"`);
        expect(svg).toContain(`data-instrument="${id}"`);
        expect(svg).toContain(`aria-label="${c.name} met `);
        expect(svg).not.toContain('undefined');
      }
    }
  });

  it('gebruikt een unieke filternaam per tekening', () => {
    expect(avatarMarkup('nova', 'drum', { uid: 'x1' })).toContain('url(#glow-x1)');
    expect(avatarMarkup('nova', 'drum', { uid: 'x2' })).toContain('url(#glow-x2)');
  });

  it('valt terug op de eerste figuur bij een onbekende naam', () => {
    expect(characterById('bestaat-niet').id).toBe('nova');
  });
});
