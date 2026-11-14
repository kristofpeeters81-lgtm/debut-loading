# Details per blok

## Blok 1 — Testpagina "Luisteroor"

**Doel:** meten wat de tablet hoort, voor we de echte app ontwerpen. Bepaalt of de microfoon volstaat of dat een USB-C-adapter nodig is.

**Gebouwd (2026-11-14):**
- Live toonhoogte (YIN, `src/dsp/yin.ts`), 35–2100 Hz, met een zoekbereik per instrument om octaaffouten te beperken.
  Rekent op ±12 kHz zodat het snel blijft. Een noot telt als "vast" na 200 ms.
- Grote letter + do-re-mi + octaaf, Hz, afwijking in cent, zuiverheid.
- Luidheidsmeter + schuifbalk voor de gevoeligheid (voor een stille, niet-versterkte gitaar).
- Akkoordproef (`src/dsp/chroma.ts`): energie per toonklasse uit het spectrum + vergelijking met grote/kleine drieklanken.
  Alle drie de tonen moeten hoorbaar zijn (≥ 25%), anders is het één noot met boventonen. Werkt pas vanaf ±100 Hz.
- Klappen/slagen (`src/dsp/onset.ts`): plotse sprong in luidheid, maximaal één per 150 ms.
- Checklist per instrument (`src/checklist.ts`), met automatisch ✅ bij een exacte noot,
  ⚠️ bij de juiste letter in de verkeerde octaaf, en een knop "Lukt niet".
- Resultatenblok om als schermafbeelding door te sturen.

**Getest:** 15 unit-tests + e2e in Chrome met een nep-microfoon (6 gitaarsnaren, 4 bassnaren incl. E1, akkoorden C en Am, 8 klappen): alles in orde.

**Nog te testen op de tablet (door de gebruiker):**
1. Keyboard (zonder USB): losse noten C3–C6 + akkoorden C en Am.
2. Elektrische gitaar **zonder versterker**: 6 losse snaren + Em. Gevoeligheid eventueel hoger zetten.
3. Akoestische bas: 4 losse snaren (vooral de laagste E1).
4. Zingen: bereik + 3 s een toon vasthouden.
5. Klappen: 8 keer.

**Resultaten tablettest (2026-11-14, samplerate 48000 Hz, gevoeligheid 60):**
- Keyboard (klein Casio-keyboard op batterijen, het meest gebruikte): C3, C4, E4, G4, C5 ✅ (−3 tot +1 cent).
  C6 ❌: die toets bestaat niet op dit keyboard (de app hoorde C3). Akkoorden C en Am ✅, maar Am pas na 3 verschillende posities.
  Het grotere keyboard klinkt minder zuiver en werkt enkel met een stroomadapter → **het kleine Casio-keyboard is de referentie**.
- Elektrische gitaar **zonder versterker**: alle 6 snaren ✅ + Em ✅. Alle snaren te hoog gestemd (+14 tot +44 cent).
- Akoestische bas: alle 4 snaren ✅, ook E1 (+1 tot +8 cent). Geen octaaffouten.
- Zingen (volwassen stem): bereik G#2–A3, A#2 3 s vastgehouden ✅.
- Klappen: 8 van 8 ✅.

**Beslissingen:**
- **Microfoon volstaat voor alle instrumenten.** Geen USB-C-adapter nodig; plan B vervalt.
- **Akkoorden mild controleren:** een akkoord telt als goed zodra het één keer herkend wordt binnen een paar seconden,
  er is altijd een knop "verder", en een gemist akkoord kost niets. Losse noten mogen streng (die werken zeer betrouwbaar).
- **Keyboardinhoud moet passen op het kleine Casio-keyboard** (geen C6). Exact bereik nog op te vragen (laagste en hoogste toets).
- **De gitaar staat vals** → het stemapparaat (blok 7) komt vóór de eerste lessen (blok 8); dat zit al juist in de volgorde.
  Lessen controleren de noot op letter, niet op cent, zodat een iets valse snaar geen fout geeft.
- Bas: zoekbereik 35–400 Hz blijft zoals het is.
- Zangbereik verschilt sterk per persoon (deze test was een volwassen stem) → bereik per profiel meten (blok 7).

## Blok 10 — MIDI laden via de downloadhoek

*(Naar voren gehaald op 2026-11-14, was blok 15 en optioneel. Bouwt verder op het spel met vallende noten van blok 9.)*

**Wensen van de gebruiker (vastgelegd 2026-11-14), nog niet gebouwd:**
- Het heet de **downloadhoek**, niet de ouderhoek: de dochter moet het zelf kunnen zodra ze het snapt.
- Uitleg in **heel simpele taal**, verstaanbaar voor een 10-jarige, met een stappenplan met prentjes
  (zoeken → downloaden → in de app kiezen).
- Een **vaste link naar één betrouwbare downloadsite**, zodat ze geen rommel (reclame, pop-ups, verkeerde bestanden) binnenhaalt.
  De link opent in Chrome. De app zelf blijft offline (`connect-src 'none'` blijft staan).
- Welke site: bij de start van dit blok uitzoeken (gratis, zonder account, weinig of geen reclame, K-pop beschikbaar)
  en eerst voorleggen aan de gebruiker.
- Een geladen liedje blijft in de app, voor alle profielen.

**Eerste verkenning van downloadsites (2026-11-14):**
- ❌ MIDI Show (midishow.com): VALT AF (getest door gebruiker): account + puntensysteem nodig, en een misleidende knop (Chinees: "kies opnameapparaat"). Gebruiker vertrouwt de site niet.
- BitMidi: gratis, geen account, eerst beluisteren; maar geen Blackpink gevonden.
- Mutopia Project: proper, publiek domein, enkel klassiek (goed voor oefenstukjes).
- MuseScore: beste kwaliteit maar account + meestal betalend → valt af.
- KATSEYE: geen gratis MIDI gevonden.
- Fan-bestanden zijn soms rommelig (bv. Pink Venom met 21 sporen) → app moet het melodiespoor kiezen en vereenvoudigen.
- **Stand nu:** geen gratis site zonder account gevonden met K-pop. Kandidaat voor de vaste link: BitMidi (proper, maar geen K-pop).
  Bij de start van blok 10 verder zoeken; vindt er niets, dan is de downloadhoek voor andere liedjes en blijven
  de eigen nummers in K-popstijl de kern.
- **Werkwijze voor de gebruiker:** pc → tablet (USB-C "Bestanden overdragen", Quick Share of cloud, bv. naar `Download/MIDI`)
  → in de app: downloadhoek → "Liedje toevoegen" → Android-bestandskiezer, **meerdere bestanden tegelijk** → bewaard in de app
  (IndexedDB), daarna mogen de bestanden op de tablet weg. `midi-lokaal/` op de pc dient enkel om de functie te bouwen/testen.

**Analyse van de MIDI-bestanden van de gebruiker (2026-11-14, `midi-lokaal/`, 43 bestanden):**
- Alle 43 leesbaar, lengtes realistisch (±0:35 tot 7:40, één medley van 12 min). Geen K-pop.
- 35 met drums, meestal 5–26 melodische sporen: volledige bandversies → ideaal als begeleiding (zij speelt één partij, de app de rest).
- 5 eenvoudige bestanden met één spoor → ideaal als eerste liedjes op keyboard.
- ±9 karaokebestanden (naam eindigt op "K") met **songtekst + timing** → bonus voor het zangspel (woorden meelezen).
- Uitdagingen: het melodiespoor automatisch kiezen (spoornamen zijn vaak nietszeggend, bv. "unbenannt1") → heuristiek
  (hoogste, meest eenstemmige spoor in zangbereik) + laten kiezen door te beluisteren; liedjes zijn 3–5 min → stukjes (refrein) en tempo trager.
- **Gebruik een bewezen bibliotheek: `@tonejs/midi`** (gratis, MIT, werkt offline in de browser). Een zelfgeschreven parser
  gaf bij 6 bestanden onzinnige lengtes (tot 88 min); @tonejs/midi las ze allemaal correct.
- Tests met deze bestanden enkel lokaal en overslaan als `midi-lokaal/` ontbreekt (CI en de openbare repo hebben ze niet).
