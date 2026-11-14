// Enkel lokaal: test de import met de MIDI-bestanden van de gebruiker (midi-lokaal/, niet in de openbare repo).
// Staat buiten src/ omdat het Node-bestandsfuncties gebruikt; de app zelf kent geen Node.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseMidi, songFromMidi } from '../src/songs/midiImport';
import { KEYBOARD_MAX, KEYBOARD_MIN } from '../src/screens/vrijspelen';

const DIR = path.resolve('midi-lokaal');
const local = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /\.(mid|midi|kar)$/i.test(f)) : [];

describe.skipIf(local.length === 0)('MIDI-bestanden van de gebruiker (lokaal)', () => {
  it('elk bestand wordt een speelbaar liedje', () => {
    let ok = 0;
    for (const f of local) {
      const { midi, info } = parseMidi(fs.readFileSync(path.join(DIR, f)), f);
      if (info.best < 0) continue;
      const song = songFromMidi('t', midi, info, info.best);
      expect(song.notes.length).toBeGreaterThanOrEqual(8);
      for (const n of song.notes) expect(n.midi >= KEYBOARD_MIN && n.midi <= KEYBOARD_MAX).toBe(true);
      ok++;
    }
    console.log(`  ${ok} van ${local.length} lokale MIDI-bestanden omgezet`);
    expect(ok).toBe(local.length);
  });
});
