// Instellingen van de app (voor iedereen op deze tablet). Bewaard in IndexedDB, nooit online.
// Vanaf blok 5 (profielen) verhuizen persoonlijke keuzes (zoals het instrument) naar het profiel.

export type Notation = 'letters' | 'doremi';

export type InstrumentId = 'keyboard' | 'gitaar' | 'bas' | 'drum' | 'zang';

export const INSTRUMENT_CHOICES: { id: InstrumentId; label: string }[] = [
  { id: 'keyboard', label: 'Keyboard' },
  { id: 'gitaar', label: 'Gitaar' },
  { id: 'bas', label: 'Bas' },
  { id: 'drum', label: 'Drum' },
  { id: 'zang', label: 'Zang' },
];

export interface Settings {
  /** Notennamen: letters (C D E …) of do-re-mi (do re mi …, Belgisch met "si"). */
  notation: Notation;
  /** Gevoeligheid van de microfoon in Luisteroor, 0–100 (hoger = stillere geluiden tellen mee). */
  micSensitivity: number;
  /** Gekozen instrument (de avatar bespeelt dit instrument). */
  instrument: InstrumentId;
  /** Gemeten zangbereik (MIDI-nummers), of null als het nog niet gemeten is. */
  voiceRange: { low: number; high: number } | null;
}

export const DEFAULT_SETTINGS: Settings = { notation: 'letters', micSensitivity: 60, instrument: 'keyboard', voiceRange: null };

/** Maakt van wat er in de opslag stond altijd geldige instellingen (oude of kapotte waarden → standaard). */
export function sanitizeSettings(raw: unknown): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (typeof raw !== 'object' || raw === null) return out;
  const r = raw as Record<string, unknown>;
  if (r.notation === 'letters' || r.notation === 'doremi') out.notation = r.notation;
  if (typeof r.micSensitivity === 'number' && Number.isFinite(r.micSensitivity)) {
    out.micSensitivity = Math.max(0, Math.min(100, Math.round(r.micSensitivity)));
  }
  const inst = INSTRUMENT_CHOICES.find((c) => c.id === r.instrument);
  if (inst) out.instrument = inst.id;
  const vr = r.voiceRange as Record<string, unknown> | null | undefined;
  if (vr && typeof vr.low === 'number' && typeof vr.high === 'number' && vr.low >= 24 && vr.high <= 108 && vr.low <= vr.high) {
    out.voiceRange = { low: Math.round(vr.low), high: Math.round(vr.high) };
  }
  return out;
}
