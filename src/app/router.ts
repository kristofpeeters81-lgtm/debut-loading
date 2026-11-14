// Schermen van de app en navigatie via het #-deel van het adres.
// Zo werkt de terugknop van Android vanzelf, en kan een scherm na herladen terug opengaan.
// Dit bestand bevat enkel rekenregels (geen DOM), zodat het makkelijk te testen is.

import type { IconName } from '../ui/icons';

export type ScreenId =
  | 'start'
  | 'vrij-spelen'
  | 'lessen'
  | 'liedjes'
  | 'downloadhoek'
  | 'instellingen'
  | 'luisteroor'
  | 'klanktest'
  | 'stemmen'
  | 'profielen'
  | 'profiel';

export interface ScreenInfo {
  id: ScreenId;
  title: string;
  icon: IconName;
  /** Waar de terugknop in de app naartoe gaat als er geen vorig scherm is (bv. na herladen). */
  parent: ScreenId | null;
  /** In welk blok dit scherm echt gevuld wordt (lege schermen tonen dat). */
  comesIn?: string;
}

export const SCREENS: Record<ScreenId, ScreenInfo> = {
  start: { id: 'start', title: 'DEBUT LOADING…', icon: 'music', parent: null },
  'vrij-spelen': { id: 'vrij-spelen', title: 'Vrij spelen', icon: 'keys', parent: 'start' },
  lessen: { id: 'lessen', title: 'Lessen', icon: 'star', parent: 'start', comesIn: 'blok 8' },
  liedjes: { id: 'liedjes', title: 'Liedjes', icon: 'music', parent: 'start', comesIn: 'blok 9' },
  downloadhoek: { id: 'downloadhoek', title: 'Downloadhoek', icon: 'download', parent: 'start', comesIn: 'blok 10' },
  instellingen: { id: 'instellingen', title: 'Instellingen', icon: 'gear', parent: 'start' },
  luisteroor: { id: 'luisteroor', title: 'Luisteroor', icon: 'ear', parent: 'instellingen' },
  klanktest: { id: 'klanktest', title: 'Klanktest', icon: 'speaker', parent: 'instellingen' },
  stemmen: { id: 'stemmen', title: 'Stemapparaat', icon: 'tuner', parent: 'vrij-spelen' },
  profielen: { id: 'profielen', title: 'Wie speelt er?', icon: 'star', parent: 'start' },
  profiel: { id: 'profiel', title: 'Jouw profiel', icon: 'star', parent: 'profielen' },
};

/** Grote knoppen op het startscherm, in deze volgorde. Instellingen zit als tandwiel rechtsboven. */
export const HOME_BUTTONS: ScreenId[] = ['vrij-spelen', 'lessen', 'liedjes', 'downloadhoek'];

function isScreenId(s: string): s is ScreenId {
  return Object.prototype.hasOwnProperty.call(SCREENS, s);
}

/** "#/lessen" → "lessen". Leeg of onbekend → startscherm. */
export function parseHash(hash: string): ScreenId {
  const id = hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return isScreenId(id) ? id : 'start';
}

export function hashFor(id: ScreenId): string {
  return id === 'start' ? '#/' : `#/${id}`;
}

/**
 * Onthoudt welke schermen in deze sessie geopend werden, zodat de terugknop in de app
 * hetzelfde doet als de terugknop van Android (één stap terug in de geschiedenis),
 * en na herladen gewoon naar het bovenliggende scherm gaat.
 */
export class NavStack {
  private stack: ScreenId[];

  constructor(first: ScreenId) {
    this.stack = [first];
  }

  get current(): ScreenId {
    return this.stack[this.stack.length - 1];
  }

  /** Verwerkt een verandering van het adres (door een knop of door de terugknop van Android). */
  visit(id: ScreenId): void {
    if (id === this.current) return;
    if (this.stack.length > 1 && this.stack[this.stack.length - 2] === id) this.stack.pop();
    else this.stack.push(id);
  }

  /** Wat moet de terugknop in de app doen? */
  backAction(): { kind: 'history' } | { kind: 'replace'; to: ScreenId } | { kind: 'none' } {
    if (this.stack.length > 1) return { kind: 'history' };
    const parent = SCREENS[this.current].parent;
    return parent ? { kind: 'replace', to: parent } : { kind: 'none' };
  }
}
