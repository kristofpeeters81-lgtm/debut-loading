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
## Blok 9 — Spel met vallende noten

**Gebouwd (2026-11-14)**, zoals het goedgekeurde spelscherm van stijl A (Neon Stage), eerst voor **keyboard**:
- **Liedjes** (`src/songs/songs.ts`), publiek domein, nu mét ritme (noot + start + lengte in tellen) en een akkoord per maat:
  Altijd is Kortjakje ziek, Vader Jacob, Ode an die Freude, Mary had a little lamb, When the Saints, Jingle Bells.
  Hetzelfde formaat krijgen later de MIDI-liedjes (blok 10), de naspeelstudio (blok 11) en eigen nummers (blok 12).
- **Spel** (`src/screens/spel.ts`, logica in `src/songs/game.ts`): noten vallen (canvas) naar de juiste toets van het keyboard
  eronder, in de vaste kleur van de letter, met de letter/do-re-mi erop. Aftellen (2 tikken). "Mooi!" bij een raak.
  - **Wacht op mij** (standaard aan): de tijd stopt bij elke noot tot je ze speelt. Foute noot tijdens het wachten = foutje.
    Een foute noot terwijl het lied loopt telt niet (zo telt de begeleiding nooit als fout via de microfoon).
  - Zonder wachten: raak binnen ±300 ms. Gemist = geen straf, enkel minder sterren.
  - **Tempo** 40–100 % (start op 70 %), **Stukje herhalen** (de 2 maten waar je bent), **Begeleiding** aan/uit
    (drum + bas op de grondtoon; valt stil als het lied wacht), **Pauze**, **Luister eerst**.
  - Sterren: met wachten volgens foutjes (zoals de lessen), zonder wachten volgens geraakte noten. Bewaard per profiel
    (`song:<id>`), en ze tellen mee in de laadbalk op het startscherm.
- Spelen op het echte keyboard (microfoon) of tikken op de toetsen.

**Getest:** unit (liedjes op volgorde en binnen de Casio, wachten, ±300 ms, uitspelen, herhalen, tempo) + e2e
(Ode an die Freude volledig uitgespeeld op 100 % met tikken → 3 sterren, liggend zonder zijwaarts scrollen).

**Uitbreiding (2026-11-14, op vraag: vallende noten voor alle instrumenten):**
- Liedjeslijst met **tabbladen per instrument** (start op het instrument van het profiel); sterren per liedje **én** per instrument
  (`song:<id>` voor keyboard, `song:<id>:<instrument>` voor de rest).
- `src/songs/arrange.ts` zet een liedje klaar per instrument:
  - **Gitaar:** per octaaf in E2–E5 (rond E4); elke noot krijgt een **snaar + fret** (laagste fret, bij gelijk de dunnere snaar).
    Banen = snaren (dik links → dun rechts), op de noot staat "fret · letter". Hals eronder met zoveel frets als nodig (max. 12).
  - **Bas:** zelfde, twee octaven lager (E1–G3).
  - **Drum:** de app maakt een beat bij het liedje (crash op het begin, dan basdrum – hi-hat – snare – hi-hat, zoals drumles 3).
    Banen = crash, hi-hat, snare, basdrum, met in het spel enkel die 4 pads op één rij eronder. Tikken (exact de juiste pad).
  - **Zang:** naar het **gemeten zangbereik van het profiel** (anders rond A3–E5); witte stip op de raaklijn = waar je stem zit.
- Begeleiding past zich aan: geen drum als je zelf drumt, geen bas als je zelf bas speelt.
- Microfoonbereik per instrument; drum enkel tikken.
- Ook eigen MIDI-liedjes spelen op elk instrument.

**Getest:** unit (gitaar/bas binnen de hals, plek op de hals, zang naar bereik met dezelfde letters, drumbeat, sterren-id)
+ e2e (Mary had a little lamb uitgespeeld op gitaar, bas en drum met 3 sterren, sterren apart per instrument).
**Nog te testen op de tablet:** vloeiend? Is 70 % een goed starttempo? Hoort de app je keyboard ook als de begeleiding speelt?
Later uit te breiden: gitaar/bas met snaarbanen, eigen nummers in K-popstijl (blok 12).
## Blok 8 — Eerste lessen (keyboard)

**Keuze gebruiker (2026-11-14):** eerst keyboard, spelenderwijs, zo weinig mogelijk uitleg. Plan goedgekeurd.

**Gebouwd (2026-11-14):**
- Inhoud in `src/lessons/content.ts` (6 lessen, liedjes uit het publiek domein):
  1 Waar is de C? · 2 C D E (echo) · 3 F en G erbij (echo) · 4 Vader Jacob · 5 Altijd is Kortjakje ziek (+ A) · 6 Ode an die Freude.
- Drie soorten opdrachten: **toets oplichten** (speel die letter), **echo** (de app speelt voor, jij speelt na; "Nog eens horen"),
  **liedje** (noot per noot, de app wacht op jou; lettergrepen erbij).
- Speel op de **echte Casio** (de app luistert via de microfoon) of **tik op het keyboard op het scherm**.
  Enkel de letter telt, niet de octaaf. Terwijl de app zelf speelt (en kort erna) luistert ze niet, zodat ze zichzelf niet hoort.
- Dezelfde noot twee keer na elkaar (C C G G) telt dankzij een nieuwe aanslag of een korte stilte (`src/lessons/noteEvents.ts`).
- **Nooit verliezen:** foute noot = "Bijna! Probeer nog eens." Na 2 foutjes licht de juiste toets geel op (hint).
  Sterren: 0–2 foutjes = 3, 3–6 = 2, meer = 1. Beste resultaat per les wordt bewaard **per profiel**.
- Lessenlijst als pad met sterren; de eerste les zonder sterren is "Volgende". Alles blijft vrij te kiezen.
- **De laadbalk op het startscherm** = verzamelde sterren / alle te verdienen sterren.
- Na een liedje speelt de app het hele liedje als beloning.
- Lesmotor (pure logica): `src/lessons/run.ts`. Schermen: `src/screens/lessen.ts`, `src/screens/les.ts`.

**Getest:** unit (lesinhoud past op de Casio, lesmotor, sterren, notenherkenning met 60 metingen/s, C C G G)
+ e2e (les 1 met tikken en een foutje → 3 sterren, laadbalk vult, "Vader Jacob" volledig via de nep-microfoon).

**Nog te testen op de tablet (met de Casio):** hoort de app elke noot? Ook twee keer dezelfde noot? Te gevoelig/te traag?
Is het leuk en duidelijk zonder uitleg?
**Getest door de gebruiker (2026-11-14):** enkele keyboardlessen op de tablet → in orde.

**Uitbreiding (2026-11-14, op vraag: "zoveel mogelijk", alle instrumenten):** 42 lessen in totaal.
- **Keyboard 7–17:** B en hoge C (toonladder), When the Saints, Jingle Bells, zwarte toetsen (F# met Twinkle in D, Bb met Twinkle in F),
  linkerhand (C3, F3, G3), twee handen, akkoorden C, F, G, Am en het popschema C–G–Am–F.
- **Gitaar 1–7:** twee dunste snaren, alle zes, eerste frets (C, D: Hot Cross Buns), Mary had a little lamb, Ode op gitaar, Em, Em↔Am.
- **Bas 1–6:** vier snaren, grondtonen, fret 3 (G, C), baslijn C–F–G, Vader Jacob op bas, wandelende bas.
- **Drum 1–6:** basdrum/snare, hi-hat, eerste beat, toms, fill met crash, handklap (ritme eerst voorgespeeld, daarna natikken).
- **Zang 1–6:** zing de do (vasthouden), do-re-mi, tot de sol, sprongetjes do-mi-sol, Vader Jacob, Ode an die Freude.
- Nieuwe opdrachten: **akkoord** (herkenning zoals in Luisteroor, mild: losse noten zijn geen fout, "Hoor het akkoord",
  altijd **"Verder"** zonder kost), **ritme** (pads natikken, exact de juiste pad), **zing de toon** ("Hoor de toon",
  live "iets hoger / iets lager / juist", balk die volloopt terwijl je de toon vasthoudt; octaaf vrij; valse toon = geen foutje; "Verder" mag).
- Speelvlak per instrument (`src/screens/lesSurfaces.ts`): keyboard (bereik volgens de les, ook C3 voor de linkerhand),
  gitaar-/bashals frets 0–5 met de plek van de noot of de akkoordgreep oplichtend, drumpads, zangvlak.
  Microfoonbereik per instrument; drum enkel tikken.
- Lessenlijst met tabbladen per instrument (start op het instrument van het profiel). Laadbalk = sterren over alle 42 lessen.

**Getest:** unit (inhoud: Casio-bereik, frets 0–5, akkoordgrepen, akkoordherkenning, drumpads, lettergrepen; lesmotor voor akkoord,
ritme, zang) + e2e (aantal lessen per instrument, automatisch uitgespeeld met tikken: akkoord C, gitaar 1, bas 3, drum 3;
zangles via nep-microfoon).
**Tweede reeks: stevige basis (2026-11-15, op vraag van de gebruiker):** 82 lessen in totaal (keyboard 28, gitaar 15, bas 13, drum 13, zang 13).
- **Keyboard 18–28:** octaven, G-toonladder (F#), C# en Eb, enkel zwarte toetsen, linkerhand bij Kortjakje (C3/G3 + melodie),
  Dm en Em, akkoorden onder Kortjakje, Happy Birthday, London Bridge, sprongen (C–G, C–E–G–C), finale twee handen + akkoorden.
  In de notenstrook krijgen lage noten (onder C4) hun octaaf erbij ("C3"), zodat de linkerhand zichtbaar is.
- **Gitaar 8–15:** noten op de G-snaar (A, B) en D-snaar (E, F), Kortjakje en London Bridge op gitaar, akkoorden C en G,
  popschema C–G–Am–Em, Dm.
- **Bas 7–13:** octaven, grondtoon + kwint, baslijn popschema (C–G–A–F), Ode en Kortjakje op bas, wandelen in G (B erbij), rockbas.
- **Drum 7–13:** open hi-hat, dubbele basdrum, rockbeat over 2 maten, discobeat, tom-roffel, klap-pop, finale beat + fill.
- **Zang 7–13:** toonladder omhoog en omlaag, octaafsprong, do–sol–do, Kortjakje (met tekst), Happy Birthday, London Bridge.
- Liedjes publiek domein (Happy Birthday: publiek domein sinds 2016 VS / 2017 EU).
- Alles automatisch gecontroleerd (Casio-bereik, fret 0–5, akkoordgrepen, lettergrepen); e2e speelt o.a. zwarte toetsen,
  linkerhand, D-snaar, bas-kwint en discobeat volledig uit.
**Niveau 3 en 4 (2026-11-15, op vraag: "veel meer lessen, naar een stevige basis"):** 166 lessen in totaal
(keyboard 54, gitaar 34, bas 27, drum 25, zang 26), per instrument ingedeeld in **niveaus** met een titel en sterrenteller in de lijst:
1 Start (eerste reeks) · 2 Basis (tweede reeks) · 3 Stevig · 4 Uitdaging.
- **Lesmakers** in `src/lessons/content.ts`: `scaleLesson` (toonladder in elke toonsoort: eerst de zwarte toetsen zoeken, dan omhoog
  en omlaag; kruisen of mollen volgens de toonsoort) en `intervalLesson` (sprongen op gehoor).
- **Niveau 3 · Stevig:** keyboard: toonladders G, D, A, E, F, A-, E- en D-mineur, akkoorden in G, D en A, mineur-akkoorden (met Bm),
  gebroken akkoorden, Saints. Gitaar: noten op de A- en dikke E-snaar, toonladders C, G en A-mineur, akkoorden D, A, E,
  kampvuurakkoorden G–C–D, wissel E–A–D, Ode laag. Bas: noten op elke snaar, toonladders, grondtoon–kwint–octaaf.
  Drum: dezelfde beat op 80, 100 en 120, vier op de vloer, halftime, fill over de toms. Zang: toonladders G, F, A-mineur, terts, kwint,
  mineur-akkoord zingen, Saints.
- **Niveau 4 · Uitdaging:** keyboard: intervallen op gehoor (3 lessen), liedjes in andere toonsoorten (Ode in G, Jacob in D,
  London Bridge in F, Mary in G), popschema in G, droevig popschema, blues, heel Jingle Bells, meesterproef.
  Gitaar: Birthday, Jingle Bells, Saints, popschema in G, mineur-wissels, kleine Bm, op gehoor, meesterproef.
  Bas: Birthday, Saints, baslijn popschema in G, walking bass, op gehoor, meesterproef. Drum: shuffle, reggae, funk,
  beat + fill afwisselen, beat op 140, drumsolo. Zang: kwart, sext, octaven, Mary, Jingle Bells, Jacob in G.
- Nieuwe akkoorden: D, A, E en een kleine Bm-greep op de drie dunste snaren (zonder barré).
- **Mollen:** lessen in een toonsoort met Bb (F, D-mineur, London Bridge in F, blues, "Zwarte toets: Bb") tonen Bb/Eb
  (do-re-mi: sib/mib) in plaats van A#/D#. Les 20 heet nu "C# en D#" (titel = wat op het scherm staat).
- Alles automatisch gecontroleerd; e2e speelt o.a. toonladder G, akkoorden in D, gitaarladder G, grondtoon–kwint–octaaf en de drumsolo uit.
**Niveau 5 "In de maat" (2026-11-15):** 201 lessen in totaal (keyboard 62, gitaar 43, bas 35, drum 33, zang 28).
Waarom: na 166 lessen was het aantal voldoende, maar ontbraken ritme/timing, herhaling en lezen (zie gesprek 2026-11-15).
- **Timing** (`src/lessons/timing.ts`, scherm `src/screens/lesTimed.ts`): nieuwe opdracht `timed`. Rij vakjes (één per noot, breedte =
  lengte), cursor loopt mee, metronoom + 4 tellen aftellen. Eerst voorspelen ("Luister"), dan "Ik speel!". Per noot: **op tijd**
  (±120 ms), **te vroeg / te laat** (±250 ms) of **gemist**. Gemist = foutje (enkel minder sterren). Microfoon: 100 ms vertraging
  gecorrigeerd. Lessen: kwartnoten, halve noten, kwart+half, achtsten, rusten, Vader Jacob/Mary/Hot Cross Buns in de maat,
  grondtoon/kwint/rock-achtsten/popschema op bas, beat/halve tellen/achtsten hi-hat/vier op de vloer/beat+fill/beat op 110 op drum.
- **Tabs lezen** (gitaar, bas): opdracht `song` met `tab: true`. Tab zoals op internet (dunste snaar bovenaan, fretnummers op de lijn),
  huidige noot oplichtend. Gitaar: één snaar, twee snaren, Ode, Kortjakje. Bas: bastab, popschema.
- **Oefenmixen** (2 per instrument: niveau 1+2 en 3+4), automatisch samengesteld uit eerdere lessen (noten zoeken, echo's, akkoorden,
  ritmes, zingen), zodat geleerde dingen terugkomen.
- Ids van niveau 5: `kb-m-…`, `g-m-…`, `b-m-…`, `d-m-…` (de eerste test vond een botsing met de oude `d-5-fill`).
- Zang-toonladders: geen "speel de F#"-stap meer (zwarte tonen zitten in de gezongen toonladder).
## Blok 5 — Profielen

**Gebouwd (2026-11-14):** de 10 avatars zijn goedgekeurd door de gebruiker.
- Eerste start: meteen **"Jouw profiel"**: naam (max. 14 tekens) + figuur kiezen uit 10, zonder terugknop (eerst een profiel).
- Meerdere profielen: bij elke start van de app **"Wie speelt er?"**. Met één profiel gaat de app meteen naar het startscherm.
- Op het startscherm linksboven: figuur + naam van wie speelt. Tik = van speler wisselen. Het podium toont de eigen figuur.
- Per profiel bewaard: figuur, naam, **instrument**, **zangbereik** (later ook voortgang en sterren). Voor de hele tablet: notennamen,
  gevoeligheid van de microfoon. Het eerste profiel neemt het instrument/zangbereik over dat al gekozen was.
- "Profielen aanpassen": naam/figuur wijzigen of verwijderen (twee keer tikken, met de naam erbij: geen per-ongeluk-verwijderen).
- Opslag: IndexedDB versie 2, tabel `profiles` (`src/storage/db.ts`); model en controles in `src/app/profile.ts`;
  `settings()` in `src/app/state.ts` geeft instrument en zangbereik van het actieve profiel, zodat de schermen niets merken.

**Getest:** unit (namen opkuisen, kapotte opslag, volgorde) + e2e (eerste profiel, tweede profiel met eigen instrument,
wisselen, "Wie speelt er?" bij herstart, verwijderen).

**Nog te testen op de tablet:** profiel maken voor elk gezinslid; wisselen; app sluiten en openen ("Wie speelt er?").
## Blok 6 — Vrij spelen

**Gebouwd (2026-11-14)** in `src/screens/vrijspelen.ts`, met de klankmotor van blok 4:
- Keuze Keyboard / Gitaar / Bas / Drum / Zang bovenaan (zelfde instelling als op het startscherm). Grote noot rechtsboven,
  in letters of do-re-mi, in de vaste kleur van die letter (dezelfde kleuren als later in het spel met vallende noten).
- **Keyboard:** bereik van de Casio SA-76 (F2–C6), zoveel witte toetsen als passen (liggend ±21, staand ±13),
  pijltjes om een octaaf te verschuiven. Letter + kleurstipje op elke witte toets, octaafnummer op elke C.
- **Gitaar- en bashals:** losse snaar + 12 frets, **dunste snaar bovenaan zoals in tabs op internet**, notennaam in elk vakje,
  stipjes onder fret 3, 5, 7, 9, 12. Dikkere snaren getekend als dikkere lijnen.
- **Drum:** 8 pads (4 × 2 liggend, 2 × 4 staand).
- Meerdere vingers tegelijk; over toetsen glijden speelt elke toets. Piano stopt bij loslaten, snaren trillen na.
- **Zang:** verwijst naar blok 7.

**Getest:** unit (bereik F2–C6, standaard C3–C5, snaarvolgorde, notennamen) + e2e (toetsen, fret 3 op de A-snaar = C,
bas E-snaar fret 5 = A, snare-pad, liggend zonder zijwaarts scrollen).

**Nog te testen op de tablet:** speelt het meteen (geen vertraging)? Akkoorden met 3 vingers? Glijden over de toetsen?
Zijn de vakjes van de gitaarhals groot genoeg voor vingers?
## Blok 7 — Stemapparaat en zangbereik

**Gebouwd (2026-11-14):**
- **Stemapparaat** (`src/screens/stemmen.ts`, scherm "Stemapparaat"): Gitaar of Bas. Herkent zelf welke snaar je speelt,
  toont de letter, een naald en **woorden** ("veel te laag", "iets te laag", "juist", "iets te hoog", "veel te hoog") + advies
  ("een klein beetje strakker"). Geen getallen (beslissing blok 1). Juist = binnen 5 cent. Tik op een snaarknop = referentietoon.
  Te openen via Vrij spelen → Gitaar/Bas ("Gitaar stemmen") en via Instellingen → Hulpjes.
- **Zingen** in Vrij spelen (`src/screens/zingen.ts`): live de noot die je zingt + een lijn met de toonhoogte van de laatste 6 s
  (met C3–C6 als hulplijnen, en je bereik als roze band). **Zangbereik meten:** zing laag en hoog, een noot telt pas als je ze
  0,5 s vasthoudt; daarna een vriendelijke uitleg ("een middenstem: liedjes rond de middelste do passen je goed").
  Bewaard op de tablet; **vanaf blok 5 per profiel**.
- Rekenregels apart en getest (`src/audio/tuning.ts`), microfoonlus herbruikbaar (`src/audio/tracker.ts`).

**Getest:** unit (snaar herkennen, woorden, uitschieters, bereik enkel met vastgehouden noten) + e2e met nep-microfoon:
A-snaar 15 cent te hoog → "iets te hoog", zuivere E → "juist"; stem A3 en E5 → bereik "A3 – E5".

**Nog te testen op de tablet:** de gitaar écht stemmen met de app (ze stond +14 tot +44 cent te hoog); werkt de bas;
zangbereik van je dochter meten (en dat van jou: wordt het anders?).
## Blok 3 — Stijl en figuren

**Keuze gebruiker (2026-11-14): A · Neon Stage**, en 8 of meer figuren.

**Gebouwd (2026-11-14):**
- Stijl in `src/styles.css` (kleurtokens bovenaan): donker podium, neon cyaan/roze/geel/groen, lettertypes Unbounded (logo, titels)
  en Inter (tekst), **meegeleverd in de app** via `@fontsource` (OFL-licentie, werkt offline; geen Google Fonts).
- Startscherm zoals voorbeeld A: logo DEBUT / LOADING…, LED-laadbalk (20 blokjes, 0% tot de profielen er zijn), 4 grote knoppen,
  podium met lichtbundels en avatar, keuze van instrument (Keyboard/Gitaar/Bas/Drum/Zang) die de avatar meteen aanpast
  (bewaard als instelling; vanaf blok 5 per profiel). Instellingen = tandwiel rechtsboven. Staand: logo, podium, knoppen onder elkaar.
- Lijn-iconen (`src/ui/icons.ts`) in plaats van emoji. Nieuw app-icoon: neon-D met laadbalk.
- Avatars (`src/ui/avatar.ts`): **10 figuren** (Nova, Kai, Luna, Rio, Zoë, Max, Jade, Kat, Bliep de robot, Zib de alien), elk met
  elk van de 5 instrumenten (instrument + armen = aparte laag). Overzicht: `node scripts/avatar-gallery.mjs` → `e2e-output/avatars.png`.
  **Getoond ter goedkeuring** op het canvas; in de app wordt voorlopig enkel Nova gebruikt. De keuze per profiel komt in blok 5.

**Nog te testen op de tablet:** startscherm liggend en staand, instrument wisselen, leesbaarheid, lettertypes ook in vliegtuigmodus.

### Wensen en voorbeelden (vóór de keuze)

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

**Gebouwd (2026-11-14, op vraag van de gebruiker: eerst het importeren, de downloadsite later):**
- **Downloadhoek** (`src/screens/downloadhoek.ts`): stappenplan in kindertaal (1 zoek een .mid-bestand samen met mama of papa,
  2 download het naar "Downloads", 3 "Liedje toevoegen"), knop **Liedje toevoegen** = Android-bestandskiezer, meerdere tegelijk.
  Kapotte of lege bestanden krijgen een uitleg, geen crash. **De vaste link naar één downloadsite ontbreekt nog** (eerst kiezen en voorleggen).
- **Importeren** (`src/songs/midiImport.ts`, met `@tonejs/midi` 2.0.28, MIT, offline): sporen bekijken → **melodiespoor raden**
  (veel noten, meestal één tegelijk, in zangbereik, naam/instrument zoals voice/lead/fluit/sax; bas, drums, begeleiding tellen niet)
  → **eenstemmig** (bij samen beginnende noten de hoogste; korte versierinkjes eerst weg) → **naar het bereik van de Casio** (octaaf).
  Titel = bestandsnaam. Tempo = eerste tempo uit het bestand. Begeleiding: enkel drums (nog geen akkoorden uit MIDI).
- **Mijn liedjes** (`src/songs/library.ts`, IndexedDB versie 3, tabel `songs`): voor alle profielen; het originele bestand wordt
  mee bewaard, zodat je later **"Ander spoor"** kan kiezen (elk spoor beluisteren, ★ = gok van de app). Verwijderen = twee keer tikken.
  Eigen liedjes staan ook onder **Liedjes → Mijn liedjes** en spelen in het spel met vallende noten (sterren per profiel).
- Lokaal getest met de 43 bestanden van de gebruiker: alle 43 worden een speelbaar liedje; de gekozen sporen zijn meestal
  zangstem/lead/blaasinstrument, bij enkele rocknummers een gitaarriff (dan "Ander spoor").
  Die test staat in `tests/midi-lokaal.test.ts` (buiten `src/`, wordt overgeslagen als `midi-lokaal/` ontbreekt, zoals in CI).
- e2e met een zelfgemaakt MIDI-bestand (Ode an die Freude + begeleidingsspoor, publiek domein) en een kapot bestand.

**Nog te doen in dit blok:** de vaste downloadsite uitzoeken en voorleggen; eventueel later: akkoorden/begeleiding uit de MIDI,
een stuk (bv. refrein) kiezen bij lange liedjes, gitaar/bas in het spel.

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
- **Tweede verkenning (2026-11-15):** geen enkele site is gratis + zonder account + zonder reclame + met K-pop.
  - ❌ Nonstop2k: veel K-pop (ook KATSEYE), maar credits/premium → valt af.
  - ❌ FreeMIDI.org: enkele Blackpink-nummers, reclame en trackers; **downloadknop werkt niet** (getest door de gebruiker;
    de downloadpagina geeft een serverfout HTTP 500) → valt af als vaste link voor een kind.
  - BitMidi: netjes, geen account, eerst beluisteren, maar bijna geen K-pop → advies voor de vaste link (gewone liedjes).
  - K-pop: via de **naspeelstudio** (mp3, blok 11) of door de ouder op de pc gedownload.
  - **Gekozen door de gebruiker (2026-11-15): BitMidi.** Downloadhoek: stappenplan in kindertaal + zoekvakje "Zoek op BitMidi"
    (opent de zoekresultaten in Chrome; de app zelf haalt niets van internet). Getest in e2e (juiste link, nieuw tabblad).
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
**Gebouwd (2026-11-15):** scherm "Naspeelstudio" (`src/screens/studio.ts`), te openen via Liedjes ("Naspeelstudio: speel een mp3 na").
1. **Kies een mp3** (ook m4a/wav/ogg) van de tablet; naam = bestandsnaam (aanpasbaar). Bewaard in IndexedDB versie 4, tabel `studio`.
2. **Luister en oefen:** afspelen/pauze, schuifbalk, snelheid 50/75/100 % zonder dat de toonhoogte verandert (`preservesPitch`),
   **stukje herhalen** (Begin stukje / Einde stukje / Hele nummer).
3. **Speel de melodie na:** "Opnemen" speelt het nummer en luistert naar het keyboard (met hoofdtelefoon, 100 ms microfoonvertraging
   gecorrigeerd), of **tik mee** op het keyboard op het scherm (C3–C6). Noten komen op de tijdlijn van de mp3 (`src/songs/studio.ts`):
   dubbel gehoorde noot telt één keer, "Laatste noot weg", "Stukje wissen" (of alles, twee keer tikken).
4. **Bewaar als liedje** → staat bij Liedjes → Mijn liedjes en bij "Mijn naspeelnummers" (Speel / Verder naspelen / Verwijderen).
- **In het spel speelt het echte nummer mee** en is het de klok (1 tel = 1 seconde): pauzeert terwijl "Wacht op mij" wacht, volgt
  het tempo (afspeelsnelheid) en het herhaalde stukje. Geen drum/bas-begeleiding (het nummer is de begeleiding).
  Werkt voor elk instrument (gitaar/bas/zang/drum via dezelfde omzetting als andere liedjes).
- **Getest:** unit (noteren, dubbel, wissen, liedje met 1 tel = 1 s, speelbaar) + e2e met een zelfgemaakt geluidsbestand
  (laden, 4 noten meetikken, laatste weg, bewaren, uitspelen met het nummer erbij, verwijderen).
- **Nog te testen op de tablet:** een echte mp3 (bv. KATSEYE) naspelen met hoofdtelefoon; klopt de timing in het spel?

Alternatief buiten de app: melodie met de hand invoeren in **MuseScore Studio** (gratis desktopprogramma, geen account;
niet te verwarren met de betalende website) en als MIDI exporteren.
