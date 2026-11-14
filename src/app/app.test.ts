import { describe, expect, it } from 'vitest';
import { HOME_BUTTONS, NavStack, SCREENS, hashFor, parseHash } from './router';
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings';

describe('router', () => {
  it('leest het scherm uit het adres', () => {
    expect(parseHash('')).toBe('start');
    expect(parseHash('#')).toBe('start');
    expect(parseHash('#/')).toBe('start');
    expect(parseHash('#/lessen')).toBe('lessen');
    expect(parseHash('#lessen')).toBe('lessen');
    expect(parseHash('#/luisteroor?x=1')).toBe('luisteroor');
    expect(parseHash('#/bestaat-niet')).toBe('start');
    expect(parseHash('#/constructor')).toBe('start');
  });

  it('maakt adressen die terug gelezen kunnen worden', () => {
    for (const id of Object.keys(SCREENS) as (keyof typeof SCREENS)[]) expect(parseHash(hashFor(id))).toBe(id);
  });

  it('elk scherm behalve start heeft een bestaand bovenliggend scherm', () => {
    for (const info of Object.values(SCREENS)) {
      if (info.id === 'start') expect(info.parent).toBeNull();
      else expect(info.parent && SCREENS[info.parent]).toBeTruthy();
    }
    expect(HOME_BUTTONS).toEqual(['vrij-spelen', 'lessen', 'liedjes', 'downloadhoek']);
  });
});

describe('terugknop (NavStack)', () => {
  it('gaat terug in de geschiedenis als er een vorig scherm is', () => {
    const nav = new NavStack('start');
    nav.visit('instellingen');
    nav.visit('luisteroor');
    expect(nav.backAction()).toEqual({ kind: 'history' });
    nav.visit('instellingen'); // terugknop van Android of van de app
    expect(nav.current).toBe('instellingen');
    nav.visit('start');
    expect(nav.backAction()).toEqual({ kind: 'none' });
  });

  it('gaat na herladen naar het bovenliggende scherm', () => {
    expect(new NavStack('luisteroor').backAction()).toEqual({ kind: 'replace', to: 'instellingen' });
    expect(new NavStack('lessen').backAction()).toEqual({ kind: 'replace', to: 'start' });
  });

  it('telt hetzelfde scherm geen twee keer', () => {
    const nav = new NavStack('start');
    nav.visit('start');
    expect(nav.backAction()).toEqual({ kind: 'none' });
  });
});

describe('instellingen', () => {
  it('geeft standaardwaarden bij lege of kapotte opslag', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('rommel')).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ notation: 'klingon', micSensitivity: 'veel' })).toEqual(DEFAULT_SETTINGS);
  });

  it('houdt geldige waarden en begrenst de gevoeligheid', () => {
    expect(sanitizeSettings({ notation: 'doremi', micSensitivity: 80, instrument: 'bas' })).toEqual({
      notation: 'doremi',
      micSensitivity: 80,
      instrument: 'bas',
    });
    expect(sanitizeSettings({ instrument: 'triangel' }).instrument).toBe('keyboard');
    expect(sanitizeSettings({ micSensitivity: 250 }).micSensitivity).toBe(100);
    expect(sanitizeSettings({ micSensitivity: -5 }).micSensitivity).toBe(0);
  });
});
