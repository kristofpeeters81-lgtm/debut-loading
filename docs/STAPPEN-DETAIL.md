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

**Beslissingen die van het resultaat afhangen:**
- Gitaar niet goed hoorbaar → plan B: inplugversterker → USB-C-adapter → tablet.
- Akkoorden onbetrouwbaar → in de lessen akkoorden niet streng controleren (enkel noten één voor één).
- Octaaffouten bij bas → zoekbereik of boventoonaanpak bijstellen.

## Blok 15 — MIDI laden via de downloadhoek (optioneel, later)

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
- MIDI Show (midishow.com): veel Blackpink (fan-uploads, deels CC0). Downloadvoorwaarden onbekend: de site weigert automatische opvraging → gebruiker test zelf in Chrome (account nodig? pop-ups?).
- BitMidi: gratis, geen account, eerst beluisteren; maar geen Blackpink gevonden.
- Mutopia Project: proper, publiek domein, enkel klassiek (goed voor oefenstukjes).
- MuseScore: beste kwaliteit maar account + meestal betalend → valt af.
- KATSEYE: geen gratis MIDI gevonden.
- Fan-bestanden zijn soms rommelig (bv. Pink Venom met 21 sporen) → app moet het melodiespoor kiezen en vereenvoudigen.
