// Profiel (blok 5): figuur + naam, geen wachtwoord, dezelfde inhoud voor iedereen.
// Persoonlijke keuzes (instrument, zangbereik) en later de voortgang horen bij het profiel.
// Pure functies, zodat ze makkelijk te testen zijn.

import { CHARACTERS, type CharacterId } from '../ui/avatar';
import { INSTRUMENT_CHOICES, type InstrumentId } from './settings';

export interface Profile {
  id: string;
  name: string;
  character: CharacterId;
  instrument: InstrumentId;
  voiceRange: { low: number; high: number } | null;
  createdAt: number;
}

export const MAX_NAME = 14;

/** Naam opkuisen: spaties aan de rand weg, dubbele spaties samen, maximaal 14 tekens. */
export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
}

export function newProfileId(): string {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Wat uit de opslag komt, altijd geldig maken (of null als het geen profiel is). */
export function sanitizeProfile(raw: unknown): Profile | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  const name = typeof r.name === 'string' ? cleanName(r.name) : '';
  if (!name) return null;
  const character = CHARACTERS.find((c) => c.id === r.character)?.id ?? CHARACTERS[0].id;
  const instrument = INSTRUMENT_CHOICES.find((c) => c.id === r.instrument)?.id ?? 'keyboard';
  const vr = r.voiceRange as Record<string, unknown> | null | undefined;
  const voiceRange =
    vr && typeof vr.low === 'number' && typeof vr.high === 'number' && vr.low >= 24 && vr.high <= 108 && vr.low <= vr.high
      ? { low: Math.round(vr.low), high: Math.round(vr.high) }
      : null;
  const createdAt = typeof r.createdAt === 'number' ? r.createdAt : 0;
  return { id: r.id, name, character, instrument, voiceRange, createdAt };
}

/** Profielen in vaste volgorde: wie eerst gemaakt werd, staat eerst. */
export function sortProfiles(list: Profile[]): Profile[] {
  return [...list].sort((a, b) => a.createdAt - b.createdAt || a.name.localeCompare(b.name));
}
