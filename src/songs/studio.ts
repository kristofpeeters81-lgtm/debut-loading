// Naspeelstudio (blok 11): de melodie van een mp3 naspelen en bewaren als liedje voor het spel met vallende noten.
// Pure logica: de genoteerde noten op de tijdlijn van de mp3 (seconden). Geen AI: een mens hoort de melodie, de app noteert.

import type { Song, SongNote } from './songs';

export interface TakeNote {
  midi: number;
  /** Tijdstip in de mp3, in seconden. */
  t: number;
}

/** Twee aanslagen van dezelfde noot binnen deze tijd tellen als één (dubbel gehoord). */
const SAME_NOTE_S = 0.08;

export class Take {
  notes: TakeNote[] = [];

  constructor(notes: TakeNote[] = []) {
    this.notes = [...notes].sort((a, b) => a.t - b.t);
  }

  /** Noot toevoegen op tijdstip t (gesorteerd; dubbel gehoorde noot wordt genegeerd). */
  add(midi: number, t: number): boolean {
    const t2 = Math.max(0, Math.round(t * 1000) / 1000);
    if (this.notes.some((n) => n.midi === midi && Math.abs(n.t - t2) < SAME_NOTE_S)) return false;
    this.notes.push({ midi, t: t2 });
    this.notes.sort((a, b) => a.t - b.t);
    return true;
  }

  /** De laatst toegevoegde noot in de tijd vóór `t` weghalen (bv. "oeps, laatste noot weg"). */
  removeLastBefore(t: number): boolean {
    for (let i = this.notes.length - 1; i >= 0; i--) {
      if (this.notes[i].t <= t + 0.05) {
        this.notes.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  /** Alle noten in [from, to) wissen (een stukje opnieuw opnemen). */
  clearRange(from: number, to: number): number {
    const before = this.notes.length;
    this.notes = this.notes.filter((n) => n.t < from || n.t >= to);
    return before - this.notes.length;
  }

  /**
   * Liedje voor het spel: 60 tellen per minuut, zodat 1 tel = 1 seconde in de mp3 (het spel loopt dan gelijk met de muziek).
   * Elke noot duurt tot de volgende (max. 2 s, min. 0,25 s).
   */
  toSong(id: string, title: string, audioId: string): Song {
    const notes: SongNote[] = this.notes.map((n, i) => {
      const next = this.notes[i + 1]?.t ?? n.t + 1;
      return { midi: n.midi, beat: n.t, len: Math.max(0.25, Math.min(2, next - n.t - 0.02)) };
    });
    return { id, title, bpm: 60, beatsPerBar: 4, notes, source: 'Naspeelstudio', audio: audioId };
  }
}
