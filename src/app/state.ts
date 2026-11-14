// Toestand van de app in het geheugen + bewaren op de tablet.
// - Instellingen voor de hele tablet (notennamen, gevoeligheid) staan in `kv`.
// - Persoonlijke keuzes (instrument, zangbereik) staan in het actieve profiel (blok 5).
// `settings()` geeft beide samen terug, zodat schermen niet hoeven te weten waar iets bewaard wordt.

import { kvGet, kvSet, profileDelete, profilePut, profilesAll } from '../storage/db';
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from './settings';
import { newProfileId, sanitizeProfile, sortProfiles, type Profile } from './profile';
import type { CharacterId } from '../ui/avatar';

let global: Settings = { ...DEFAULT_SETTINGS };
let profiles: Profile[] = [];
let activeId: string | null = null;
/** Werd in deze sessie al gekozen wie er speelt? (Bij meerdere profielen vraagt de app het bij elke start.) */
let chosenThisSession = false;

export function settings(): Settings {
  const p = activeProfile();
  return p ? { ...global, instrument: p.instrument, voiceRange: p.voiceRange } : global;
}

export function allProfiles(): Profile[] {
  return profiles;
}

export function activeProfile(): Profile | null {
  return profiles.find((p) => p.id === activeId) ?? null;
}

/** Moet de app eerst vragen wie er speelt? */
export function needsProfileChoice(): 'nieuw' | 'kiezen' | null {
  if (profiles.length === 0) return 'nieuw';
  if (!activeProfile() || (profiles.length > 1 && !chosenThisSession)) return 'kiezen';
  return null;
}

export async function loadSettings(): Promise<void> {
  try {
    global = sanitizeSettings(await kvGet('settings'));
    const raw = await profilesAll();
    profiles = sortProfiles(raw.map(sanitizeProfile).filter((p): p is Profile => p !== null));
    const a = await kvGet('activeProfile');
    activeId = typeof a === 'string' ? a : null;
    if (profiles.length === 1) {
      activeId = profiles[0].id;
      chosenThisSession = true;
    }
  } catch {
    // Opslag niet beschikbaar (bv. privévenster): standaardinstellingen, geen profielen.
    global = { ...DEFAULT_SETTINGS };
  }
}

export async function updateSettings(patch: Partial<Settings>): Promise<boolean> {
  const p = activeProfile();
  const { instrument, voiceRange, ...rest } = patch;
  try {
    if (p && (instrument !== undefined || voiceRange !== undefined)) {
      const next: Profile = { ...p, instrument: instrument ?? p.instrument, voiceRange: voiceRange === undefined ? p.voiceRange : voiceRange };
      profiles = profiles.map((x) => (x.id === p.id ? next : x));
      await profilePut(next);
    }
    // Zonder profiel (nog niemand aangemaakt) gaan ook instrument en zangbereik naar de globale instellingen.
    global = sanitizeSettings({ ...global, ...(p ? rest : patch) });
    await kvSet('settings', global);
    return true;
  } catch {
    return false;
  }
}

export async function setActiveProfile(id: string): Promise<void> {
  activeId = id;
  chosenThisSession = true;
  try {
    await kvSet('activeProfile', id);
  } catch {
    // niet bewaard: enkel deze sessie
  }
}

/** Nieuw profiel of een bestaand aanpassen. Het eerste profiel neemt het instrument/zangbereik van daarvoor over. */
export async function saveProfile(input: { id?: string; name: string; character: CharacterId }): Promise<Profile> {
  const existing = profiles.find((p) => p.id === input.id);
  const base = existing ?? {
    id: newProfileId(),
    instrument: profiles.length === 0 ? global.instrument : DEFAULT_SETTINGS.instrument,
    voiceRange: profiles.length === 0 ? global.voiceRange : null,
    createdAt: Date.now(),
  };
  const p = sanitizeProfile({ ...base, name: input.name, character: input.character });
  if (!p) throw new Error('Ongeldig profiel');
  await profilePut(p);
  profiles = sortProfiles([...profiles.filter((x) => x.id !== p.id), p]);
  return p;
}

export async function removeProfile(id: string): Promise<void> {
  await profileDelete(id);
  profiles = profiles.filter((p) => p.id !== id);
  if (activeId === id) {
    activeId = profiles.length === 1 ? profiles[0].id : null;
    chosenThisSession = profiles.length === 1;
  }
}
