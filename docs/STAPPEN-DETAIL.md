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
  C6: eerst niet getest (verkeerd geteld), daarna wel ✅ herkend.
  **Casio SA-76, 44 toetsen, bereik F2–C6.**
  Akkoorden C en Am ✅, maar Am pas na 3 verschillende posities.
  Het grotere keyboard klinkt minder zuiver en werkt enkel met een stroomadapter → **het kleine Casio-keyboard is de referentie**.
- Elektrische gitaar **zonder versterker**: alle 6 snaren ✅ + Em ✅. Alle snaren te hoog gestemd (+14 tot +44 cent):
  de gitaar kwam ongestemd zo uit de koffer en werd toch herkend.
- Akoestische bas: alle 4 snaren ✅, ook E1 (+1 tot +8 cent). Geen octaaffouten.
- Zingen (volwassen stem): bereik G#2–A3, A#2 3 s vastgehouden ✅.
- Klappen: 8 van 8 ✅.

**Beslissingen:**
- **Microfoon volstaat voor alle instrumenten.** Geen USB-C-adapter nodig; plan B vervalt.
- **Akkoorden mild controleren:** een akkoord telt als goed zodra het één keer herkend wordt binnen een paar seconden,
  er is altijd een knop "verder", en een gemist akkoord kost niets. Losse noten mogen streng (die werken zeer betrouwbaar).
- **Keyboardinhoud moet passen op het kleine Casio-keyboard: Casio SA-76, 44 toetsen, F2–C6** (MIDI 41–84).
  Geladen MIDI-liedjes (blok 10) worden zo nodig per octaaf verschoven tot ze in dit bereik passen.
- **De gitaar staat vals** → het stemapparaat (blok 7) komt vóór de eerste lessen (blok 8); dat zit al juist in de volgorde.
  Lessen controleren de noot op letter, niet op cent, zodat een iets valse snaar geen fout geeft.
  **Toon nooit "cent" aan het kind:** het woord werd verward met een octaaf. Het stemapparaat zegt "iets te hoog / iets te laag / juist"
  met een naald, zonder getallen.
- Bas: zoekbereik 35–400 Hz blijft zoals het is.
- Zangbereik verschilt sterk per persoon (deze test was een volwassen stem) → bereik per profiel meten (blok 7).

## Blok 2 — Projectbasis

**Doel:** de testpagina wordt het skelet van de echte app. Nog geen stijl (dat is blok 3).

**Keuzes van de gebruiker (2026-11-14):**
- Luisteroor **blijft**, als hulpje in een instellingenmenu (bereik van een keyboard nachecken, nieuw instrument testen).
- Updates: **melding** "Nieuwe versie klaar, tik om bij te werken" (niets verandert vanzelf midden in een liedje).
- Scherm: **liggend én staand**; elk scherm moet in beide richtingen werken.

**Gebouwd (2026-11-14):** zoals het plan hieronder. Bestanden: `src/main.ts` (schil), `src/app/router.ts` (schermen + terugknop),
`src/app/settings.ts` + `state.ts` (instellingen: notennamen letters/do-re-mi, gevoeligheid Luisteroor), `src/app/update.ts`
(service worker + updatemelding), `src/storage/db.ts` (IndexedDB, tabel `kv`), `src/screens/basic.ts` (start, lege schermen,
instellingen), `src/screens/luisteroor.ts` (blok 1, nu een scherm dat de microfoon stopt bij het verlaten),
`public/manifest.webmanifest` + tijdelijke iconen (`scripts/make-icons.mjs`). De service worker wordt gemaakt in `vite.config.ts`.
- Luisteroor toont de grote noot nu volgens de instelling (letters of do-re-mi).
- Instellingen toont "Versie: <bouwmoment>", zodat je op de tablet kunt zien of een update binnen is.
- Valkuil opgelost: de cache moet `ignoreVary: true` gebruiken, anders vindt hij JS/CSS niet terug offline.
- Valkuil (Windows): `npm test` via Git Bash faalt ("reading 'config'") door de schijfletter; via PowerShell lukt het.

**Getest:** 23 unit-tests + e2e: 24 controles voor de app (navigatie, terugknop van de app en van Android/de browser,
herladen, do-re-mi bewaard, staand en liggend zonder zijwaarts scrollen, offline met gestopte server,
updatemelding → tik → nieuwe versie) + de 8 Luisteroor-controles met nep-microfoon. Alles in orde.

**Nog te testen op de tablet (door de gebruiker):**
1. https://kristofpeeters81-lgtm.github.io/debut-loading/ openen in Chrome → menu ⋮ → "Toevoegen aan startscherm" / "App installeren".
2. De app openen via het icoon: opent schermvullend (zonder adresbalk)?
3. Rondklikken, ook met de terugknop van Android; tablet draaien (staand en liggend).
4. Instellingen → do-re-mi kiezen → Luisteroor: toont de grote noot nu "do", "re", …?
5. Vliegtuigmodus aan → app sluiten en opnieuw openen: werkt hij nog?
6. Updatemelding: verschijnt bij de volgende update (blok 3). Dan testen.

**Plan:**
- Installeerbare PWA: `manifest.webmanifest` (naam DEBUT LOADING…, `orientation: any`, tijdelijke iconen; definitieve iconen in blok 3).
- Service worker (gebaseerd op die van SingApp, gegenereerd bij de build), maar **zonder automatische skipWaiting**:
  een nieuwe versie wacht, de app toont de melding, tik = bijwerken en herladen.
- Skelet met schermen en terugknop: start → Vrij spelen, Lessen, Liedjes, Downloadhoek, Instellingen (→ Luisteroor).
  Lege schermen tonen "komt in blok X".
- Eenvoudige router via `#` in de adresbalk, zodat de terugknop van Android werkt.
- Opslag op de tablet (IndexedDB, gekopieerd en aangepast uit SingApp) + vraag om blijvende opslag
  (`navigator.storage.persist()`), zodat Android de gegevens niet zomaar wist.
- Tests: unit-tests voor router en opslag; e2e: app opent, navigatie werkt, Luisteroor werkt nog, offline herladen werkt.

## Blok 4 — Klankmotor

**Gebouwd (2026-11-14), zonder geluidsbestanden:** alle klanken worden op de tablet berekend (`src/audio/synth.ts`, pure functies)
en door `src/audio/engine.ts` afgespeeld (één keer berekenen, daarna uit het geheugen → meteen hoorbaar).
- **Piano:** boventonen die elk op hun eigen tempo uitsterven + twee licht ontstemde snaren per toets. Stopt bij loslaten.
- **Gitaar en bas:** getokkelde snaar (Karplus-Strong) met fijnafstemming (allpass), zodat elke noot zuiver gestemd is.
  Bas donkerder en langer. Snaren laten natrillen. Akkoorden worden "getokkeld" (snaren 25 ms na elkaar).
- **Drum:** 8 pads (basdrum, snare, hi-hat, open hi-hat, tom hoog, tom laag, crash, klap).
- **Metronoom:** tik met hogere eerste tel; plant telkens 0,12 s vooruit (stabiel, ook als het scherm even hapert).
  Tempo 40–200 en aanpasbaar tijdens het tikken.
- Begrenzer op de uitgang (veel noten tegelijk kraken niet), max. 32 klanken tegelijk.
- **Testscherm "Klanktest"** onder Instellingen → Hulpjes (sober; de echte instrumenten op het scherm komen in blok 6).

**Getest:** unit-tests meten de toonhoogte van de berekende klanken na met YIN: piano F2–C6, gitaar E2–E4, bas E1–G2
binnen 8 cent zuiver (ook bij 44,1 kHz); drums en metronoom; metronoomplanning mist of verdubbelt geen tellen.
e2e: alle 36 knoppen spelen een klank, metronoom tikt, geen fouten.

**Nog te testen op de tablet (door de gebruiker):** Instellingen → Klanktest.
1. Klinken piano, gitaar, bas en drum goed genoeg (luidspreker én hoofdtelefoon)? Wat klinkt het minst echt?
2. Voelt het meteen aan bij het tikken (geen merkbare vertraging)?
3. Metronoom: blijft hij gelijkmatig tikken, ook bij het verschuiven van het tempo?
4. Speel C4 in de Klanktest en kijk in Luisteroor (op een tweede toestel) of de tablet zuiver is (optioneel).
## Blok 3 — Stijl en figuren (wensen, nog niet gebouwd)

**Voorbeelden getoond (2026-11-14):** https://claude.ai/artifact/6HvaYBbLFdp7droUeaQnw4 (privé ontwerpcanvas), per richting een startscherm en een spelscherm (keyboard, vallende noten), liggend 1280×800:
- **A · Neon Stage:** donker podium, neon cyaan/roze, lichtbundels, logo met LED-laadbalk. Avatar met keyboard.
- **B · Sticker Tour:** felblauw met stickers (dikke zwarte rand), laadbalk = tourroute (Slaapkamer → Wereldtour). Avatar met gitaar.
- **C · Holo Idol:** licht, K-pop-albumstijl, holografische glans, avatar als fotokaart. Avatar met microfoon.
Op alle spelschermen: noten in een vaste kleur per letter, letter op de toets, tempo, stukje herhalen, 'Wacht op mij', sterren, geen game over.
**Wacht op de keuze van de gebruiker** (mixen mag).

- Eerst 2 à 3 visuele richtingen tonen als voorbeeldschermen (startscherm, spelscherm, logo met laadbalk). Pas inbouwen na akkoord.
- Spelscherm in de richting van een ritmespel (noten komen naar een lijn toe), maar op het **echte instrument**:
  keyboard = noten vallen op de juiste toets; gitaar/bas = banen per snaar met fretnummer; drum = banen per pad;
  zingen = toonhoogtelijn. Geen "game over": gemiste noten kosten niets. Eigen stijl, geen kopie van een bestaand spel.
- **Avatars met hun instrument (wens 2026-11-14):** de avatar bespeelt het instrument dat gekozen is
  (keyboard, gitaar, bas, drum, microfoon). In de bandmodus (blok 12) staan de avatars samen op het podium.
  Tekenaanpak: instrument als aparte laag over dezelfde pose, zodat niet elke avatar × elk instrument apart getekend moet worden.

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

## Blok 11 — Naspeelstudio

*(Nieuw op 2026-11-14, idee goedgekeurd door de gebruiker. Nog niet gebouwd.)*

**Doel:** nummers waarvoor geen MIDI te vinden is (bv. KATSEYE) toch spelen, **met het echte nummer als begeleiding**.
Geen AI: een mens hoort de melodie, de app noteert ze (human-in-the-loop).

**Idee:**
1. Een mp3 laden in de app (Android-bestandskiezer, zoals in de downloadhoek). Blijft enkel op de tablet (IndexedDB), nooit online.
2. Afspelen, ook **trager zonder dat de toonhoogte verandert** (`playbackRate` + `preservesPitch`), en een stukje herhalen (lus).
3. De melodie meespelen op het keyboard, **met de mp3 in een hoofdtelefoon**, zodat de microfoon enkel het keyboard hoort.
   De app noteert welke noot wanneer klinkt (zelfde toonhoogtemeting als Luisteroor), op de tijdlijn van de mp3.
4. Nakijken en verbeteren (noot weg, verschuiven, opnieuw opnemen per stukje).
5. Resultaat = een liedje voor het spel met vallende noten (blok 9), met de mp3 als begeleiding, vanzelf in de maat.

**Aandachtspunten:** vertraging tussen spelen en horen (latency) meten en corrigeren; zelfde liedjesformaat als de MIDI-liedjes
(blok 10); grootte van mp3's in de opslag; auteursrecht: mp3's blijven privé op de tablet, net zoals MIDI-bestanden.
Alternatief buiten de app: melodie met de hand invoeren in **MuseScore Studio** (gratis desktopprogramma, geen account;
niet te verwarren met de betalende website) en als MIDI exporteren.
