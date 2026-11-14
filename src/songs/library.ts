// Mijn liedjes (blok 10): eigen MIDI-bestanden, bewaard op de tablet (IndexedDB), voor alle profielen.
// Het originele bestand wordt mee bewaard, zodat je later nog een ander spoor als melodie kan kiezen.

import { songDelete, songPut, songsAll } from '../storage/db';
import { parseMidi, songFromMidi, type TrackInfo } from './midiImport';
import { SONGS, type Song } from './songs';

export interface ImportedSong {
  id: string;
  title: string;
  fileName: string;
  bytes: ArrayBuffer;
  trackIndex: number;
  tracks: TrackInfo[];
  song: Song;
  createdAt: number;
}

let imported: ImportedSong[] = [];

export function importedSongs(): ImportedSong[] {
  return imported;
}

/** Ingebouwd liedje of eigen liedje. */
export function findSong(id: string): Song | undefined {
  return SONGS.find((s) => s.id === id) ?? imported.find((s) => s.id === id)?.song;
}

function isImported(x: unknown): x is ImportedSong {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  return typeof r.id === 'string' && typeof r.title === 'string' && r.bytes instanceof ArrayBuffer && typeof r.trackIndex === 'number';
}

export async function loadLibrary(): Promise<void> {
  try {
    imported = (await songsAll()).filter(isImported).sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    imported = [];
  }
}

export type ImportResult = { file: string; ok: true; song: ImportedSong } | { file: string; ok: false; reason: string };

/** Bestanden uit de bestandskiezer omzetten en bewaren. Kapotte of lege bestanden worden overgeslagen met uitleg. */
export async function importFiles(files: File[]): Promise<ImportResult[]> {
  const out: ImportResult[] = [];
  for (const f of files) {
    try {
      if (!/\.(mid|midi|kar)$/i.test(f.name)) {
        out.push({ file: f.name, ok: false, reason: 'Dit is geen MIDI-bestand (.mid).' });
        continue;
      }
      const bytes = await f.arrayBuffer();
      const { midi, info } = parseMidi(bytes, f.name);
      if (info.best < 0) {
        out.push({ file: f.name, ok: false, reason: 'Er staat geen melodie in die we kunnen spelen.' });
        continue;
      }
      const id = `eigen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const rec: ImportedSong = {
        id,
        title: info.title,
        fileName: f.name,
        bytes,
        trackIndex: info.best,
        tracks: info.tracks.filter((t) => Number.isFinite(t.score)),
        song: songFromMidi(id, midi, info, info.best),
        createdAt: Date.now() + out.length,
      };
      await songPut(rec);
      imported = [...imported, rec];
      out.push({ file: f.name, ok: true, song: rec });
    } catch {
      out.push({ file: f.name, ok: false, reason: 'Dit bestand kon niet gelezen worden.' });
    }
  }
  return out;
}

/** Een ander spoor als melodie gebruiken. */
export async function chooseTrack(id: string, trackIndex: number): Promise<void> {
  const rec = imported.find((s) => s.id === id);
  if (!rec) return;
  const { midi, info } = parseMidi(rec.bytes, rec.fileName);
  const next: ImportedSong = { ...rec, trackIndex, song: songFromMidi(id, midi, info, trackIndex) };
  await songPut(next);
  imported = imported.map((s) => (s.id === id ? next : s));
}

/** Het spoor als losse noten (om het even te beluisteren bij het kiezen). */
export function previewTrack(id: string, trackIndex: number): Song | undefined {
  const rec = imported.find((s) => s.id === id);
  if (!rec) return undefined;
  const { midi, info } = parseMidi(rec.bytes, rec.fileName);
  return songFromMidi(id, midi, info, trackIndex);
}

export async function removeSong(id: string): Promise<void> {
  await songDelete(id);
  imported = imported.filter((s) => s.id !== id);
}
