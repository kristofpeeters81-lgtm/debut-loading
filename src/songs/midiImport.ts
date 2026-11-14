// Eigen MIDI-bestanden omzetten naar een liedje voor het spel met vallende noten (blok 10).
// Alles gebeurt op de tablet: het bestand wordt gelezen met @tonejs/midi (gratis, MIT), er gaat niets online.
// Stappen: sporen bekijken → het melodiespoor raden → eenstemmig maken → naar het bereik van de Casio verschuiven.

import { Midi } from '@tonejs/midi';
import { KEYBOARD_MAX, KEYBOARD_MIN } from '../screens/vrijspelen';
import type { Song, SongNote } from './songs';

export interface TrackInfo {
  index: number;
  name: string;
  instrument: string;
  notes: number;
  /** Hoe goed dit spoor als melodie lijkt (hoger = beter). */
  score: number;
}

export interface ParsedMidi {
  title: string;
  bpm: number;
  tracks: TrackInfo[];
  /** Spoor dat het meest op een melodie lijkt (of -1 als er geen bruikbaar spoor is). */
  best: number;
}

const MELODY_WORDS = /melod|vocal|voice|lead|zang|solo|sing|lyric|theme|main/i;
const NOT_MELODY_WORDS = /bass|bas\b|drum|perc|strings?|pad|chord|akkoord|accomp|rhythm|guitar ?2|harmony/i;

type MidiTrack = Midi['tracks'][number];

function isUsable(t: MidiTrack): boolean {
  return !t.instrument.percussion && t.channel !== 9 && t.notes.length >= 8;
}

/** Deel van de noten die tegelijk met een andere noot beginnen (akkoorden). */
function polyphony(t: MidiTrack): number {
  const starts = new Map<number, number>();
  for (const n of t.notes) starts.set(n.ticks, (starts.get(n.ticks) ?? 0) + 1);
  let inChords = 0;
  for (const c of starts.values()) if (c > 1) inChords += c;
  return t.notes.length ? inChords / t.notes.length : 1;
}

/** Score: veel noten, meestal één tegelijk, in zangbereik, en een naam die op melodie wijst. */
export function melodyScore(t: MidiTrack): number {
  if (!isUsable(t)) return -Infinity;
  const avg = t.notes.reduce((s, n) => s + n.midi, 0) / t.notes.length;
  let score = (Math.min(t.notes.length, 400) / 400) * 2 + (1 - polyphony(t)) * 3;
  if (avg >= 57 && avg <= 84) score += 2;
  if (avg < 48) score -= 3;
  if (MELODY_WORDS.test(t.name)) score += 3;
  if (NOT_MELODY_WORDS.test(t.name) || /bass/i.test(t.instrument.family)) score -= 3;
  // Instrumenten die in MIDI-bestanden meestal de melodie spelen (zangstem, lead, blaasinstrumenten).
  if (/voice|choir|lead|flute|sax|recorder|whistle|oboe|clarinet|trumpet|ocarina|shanai|pan flute/i.test(t.instrument.name)) score += 1.5;
  if (/ensemble|pad|muted/i.test(t.instrument.name)) score -= 1;
  return Math.round(score * 100) / 100;
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\.(mid|midi|kar)$/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48);
}

export function parseMidi(data: ArrayBuffer | Uint8Array, fileName: string): { midi: Midi; info: ParsedMidi } {
  const midi = new Midi(data);
  const tracks: TrackInfo[] = midi.tracks.map((t, index) => ({
    index,
    name: t.name.trim() || `Spoor ${index + 1}`,
    instrument: t.instrument.percussion ? 'drums' : t.instrument.name,
    notes: t.notes.length,
    score: melodyScore(t),
  }));
  const usable = tracks.filter((t) => Number.isFinite(t.score));
  const best = usable.length ? usable.reduce((a, b) => (b.score > a.score ? b : a)).index : -1;
  const bpm = Math.round(midi.header.tempos[0]?.bpm ?? 120);
  const title = cleanTitle(fileName) || cleanTitle(midi.header.name) || 'Mijn liedje';
  return { midi, info: { title, bpm: Math.max(40, Math.min(220, bpm)), tracks, best } };
}

/**
 * Eén spoor omzetten naar noten voor het spel:
 * - eenstemmig: bij noten die samen beginnen telt de hoogste (de melodie ligt meestal bovenaan);
 *   een noot stopt waar de volgende begint;
 * - korte versierinkjes (< 1/8 tel) vallen weg;
 * - het hele spoor schuift per octaaf naar het midden (rond C4–C5), uitschieters apart, binnen F2–C6.
 */
export function trackToNotes(midi: Midi, trackIndex: number): SongNote[] {
  const t = midi.tracks[trackIndex];
  if (!t) return [];
  const ppq = midi.header.ppq || 480;
  // Versierinkjes (< 1/8 tel) eerst weg, anders "wint" zo'n kort hoog nootje van de echte melodienoot.
  const sorted = t.notes.filter((n) => n.durationTicks >= ppq / 8).sort((a, b) => a.ticks - b.ticks || b.midi - a.midi);
  const sameStart = ppq / 16;
  const picked: { midi: number; ticks: number; dur: number }[] = [];
  for (const n of sorted) {
    const prev = picked[picked.length - 1];
    if (prev && n.ticks - prev.ticks < sameStart) continue; // samen begonnen: de hoogste is al gekozen
    picked.push({ midi: n.midi, ticks: n.ticks, dur: n.durationTicks });
  }
  for (let i = 0; i < picked.length - 1; i++) picked[i].dur = Math.min(picked[i].dur, picked[i + 1].ticks - picked[i].ticks);
  let notes = picked
    .map((p) => ({ midi: p.midi, beat: Math.round((p.ticks / ppq) * 48) / 48, len: Math.round((p.dur / ppq) * 48) / 48 }))
    .filter((n) => n.len >= 0.125);
  if (notes.length === 0) return [];

  // Laten beginnen in de eerste maat waar muziek staat.
  const firstBar = Math.floor(notes[0].beat / 4) * 4;
  notes = notes.map((n) => ({ ...n, beat: n.beat - firstBar }));

  // Octaafverschuiving voor het hele spoor: mediaan rond F#4 (midden van C4–C5).
  const sortedPitches = notes.map((n) => n.midi).sort((a, b) => a - b);
  const median = sortedPitches[Math.floor(sortedPitches.length / 2)];
  const shift = Math.round((66 - median) / 12) * 12;
  return notes.map((n) => {
    let m = n.midi + shift;
    while (m < KEYBOARD_MIN) m += 12;
    while (m > KEYBOARD_MAX) m -= 12;
    return { ...n, midi: m };
  });
}

export function songFromMidi(id: string, midi: Midi, info: ParsedMidi, trackIndex: number): Song {
  return {
    id,
    title: info.title,
    bpm: info.bpm,
    beatsPerBar: midi.header.timeSignatures[0]?.timeSignature[0] ?? 4,
    notes: trackToNotes(midi, trackIndex),
    source: 'Eigen MIDI-bestand',
  };
}
