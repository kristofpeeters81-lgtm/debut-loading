// Huidige instellingen in het geheugen + bewaren in de opslag op de tablet.

import { kvGet, kvSet } from '../storage/db';
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from './settings';

let current: Settings = { ...DEFAULT_SETTINGS };

export function settings(): Settings {
  return current;
}

export async function loadSettings(): Promise<void> {
  try {
    current = sanitizeSettings(await kvGet('settings'));
  } catch {
    // Opslag niet beschikbaar (bv. privévenster): standaardinstellingen gebruiken.
    current = { ...DEFAULT_SETTINGS };
  }
}

export async function updateSettings(patch: Partial<Settings>): Promise<boolean> {
  current = sanitizeSettings({ ...current, ...patch });
  try {
    await kvSet('settings', current);
    return true;
  } catch {
    return false;
  }
}
