// Instellingen van de app (voor iedereen op deze tablet). Bewaard in IndexedDB, nooit online.

export type Notation = 'letters' | 'doremi';

export interface Settings {
  /** Notennamen: letters (C D E …) of do-re-mi (do re mi …, Belgisch met "si"). */
  notation: Notation;
  /** Gevoeligheid van de microfoon in Luisteroor, 0–100 (hoger = stillere geluiden tellen mee). */
  micSensitivity: number;
}

export const DEFAULT_SETTINGS: Settings = { notation: 'letters', micSensitivity: 60 };

/** Maakt van wat er in de opslag stond altijd geldige instellingen (oude of kapotte waarden → standaard). */
export function sanitizeSettings(raw: unknown): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (typeof raw !== 'object' || raw === null) return out;
  const r = raw as Record<string, unknown>;
  if (r.notation === 'letters' || r.notation === 'doremi') out.notation = r.notation;
  if (typeof r.micSensitivity === 'number' && Number.isFinite(r.micSensitivity)) {
    out.micSensitivity = Math.max(0, Math.min(100, Math.round(r.micSensitivity)));
  }
  return out;
}
