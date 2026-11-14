# DEBUT LOADING… — instructies voor Claude

## Wat is dit?
Een app (offline PWA voor een Android-tablet van Samsung, alleen USB-C) waarmee een meisje van 10 en de rest van het gezin
spelenderwijs **keyboard, gitaar, basgitaar, zingen en drum (op het scherm)** leren.
**Hoofddoel: de natuurlijke interesse in muziek aanwakkeren door het beter te leren.** Plezier en snel een echt resultaat
gaan voor drillen.

## Hoe verder gaan in een nieuwe sessie
1. Lees **[docs/STATUS.md](docs/STATUS.md)**: daar staat per blok de status. Zoek het eerste blok dat niet ✅ is.
2. Lees de details van dat blok in **[docs/STAPPEN-DETAIL.md](docs/STAPPEN-DETAIL.md)**.
3. Begin pas te bouwen na een expliciete "go" van de gebruiker. Toon eerst wat je gaat doen.
4. Werk één blok per keer af. Laat de gebruiker op de tablet testen voor je verder gaat.
5. Werk na elk blok **beide docs** bij.
6. Visuele keuzes (stijl, figuren, avatars): toon eerst voorbeelden en wacht op akkoord voor je ze inbouwt.

## Harde eisen (nooit van afwijken)
- **Alles gratis**: geen betaalde diensten, accounts of in-app aankopen.
- **Geen AI** in de app (geen ML-modellen, geen AI-API's). Enkel klassieke signaalverwerking (DSP).
  De ingebouwde browserverwerking (echoCancellation, noiseSuppression, autoGainControl) staat uit.
- **Er gaan geen gegevens naar internet**: CSP `connect-src 'none'` in de build. Nooit verwijderen.
- **Opnames blijven op de tablet**: ze mogen wel gedownload worden naar de tablet, maar er komt geen deelknop.
- **Geen auteursrechtelijk beschermde liedjes** meeleveren. Wel eigen nummers in K-popstijl en vrije melodieën.
  Een MIDI-bestand laden kan via een **downloadhoek** (blok 10): het bestand wordt lokaal geladen,
  de app zelf zoekt niets online. De downloadhoek moet zo duidelijk zijn (stappenplan met prentjes) dat de dochter het zelf kan:
  uitleg in **heel simpele taal (verstaanbaar voor een 10-jarige)** + een **vaste link naar één betrouwbare downloadsite**
  (opent in Chrome), zodat ze geen rommel binnenhaalt. Welke site dat wordt: uitzoeken en voorleggen bij blok 10.
- **MIDI-bestanden van de gebruiker staan in `midi-lokaal/`** (genegeerd door git, ook `*.mid`/`*.midi` overal).
  Enkel om de MIDI-functie lokaal te bouwen en te testen. **Nooit committen, nooit in `public/` of `dist/`**:
  de repo en de website zijn openbaar en het zijn beschermde liedjes. Op de tablet laadt ze ze zelf via de downloadhoek.
- **Geen streaks** (reeks dagen op rij): beloon wat ze doet en straf niets.
- Nederlandse interface. Notennamen in **letters (A–G)** met een schakelaar voor **do-re-mi** (Belgisch: "si").
  De notenbalk komt eventueel geleidelijk, later.
- Profielen: avatar (gekozen uit getekende figuren) plus naam, geen wachtwoord, dezelfde inhoud voor iedereen.
- Alle instrumenten zijn vanaf het begin vrij te kiezen.
- Publicatie: openbare repo `kristofpeeters81-lgtm/debut-loading` + GitHub Pages (gratis vereist een openbare repo). Pushen naar `main` = live → enkel met akkoord.

## Instrumenten en invoer
- Keyboard: het meest gebruikte keyboard heeft **geen USB**, dus de app luistert via de microfoon. Web MIDI is optioneel voor het andere keyboard.
- Elektrische gitaar: geen versterker, wel een inplugversterker voor de hoofdtelefoon. Bas: akoestisch, met jack-uitgang.
  Eerst testen via de microfoon zonder adapter (blok 1). Een USB-C-adapter is plan B.
- Drum: drumpads op het scherm. Invoer is abstract opgezet, zodat later een e-drum via USB-MIDI
  of een akoestische drum via de microfoon (inzetdetectie) kan worden aangesloten.

## Architectuur (tot nu toe)
- TypeScript (strict, geen `any`) + Vite. Vaste poorten: dev 5318, preview 4318.
- `src/dsp/`: `yin.ts` (live toonhoogte, 35–2100 Hz), `notes.ts` (letters/do-re-mi), `chroma.ts` (akkoorden),
  `onset.ts` (klappen/slagen), `biquad.ts` (gekopieerd uit SingApp). Tests: `dsp.test.ts`.
- `src/audio/mic.ts`: microfoon + AnalyserNodes.
- `src/main.ts` + `src/checklist.ts`: de testpagina "Luisteroor" (blok 1).
- Onderdelen uit SingApp worden **gekopieerd**, niet gedeeld, zodat de twee apps elkaar niet kunnen stukmaken.

## Commando's
- `npm install`: afhankelijkheden installeren
- `npm run dev`: ontwikkelserver (http://localhost:5318). Op de tablet werkt de microfoon alleen via https (dus via GitHub Pages).
- `npm run build`: typecheck + productiebuild naar `dist/`
- `npm test`: unit-tests (Vitest)
- `npm run e2e`: build + echte Chrome met nep-microfoon (gitaar, bas, akkoorden, klappen). Screenshots in `e2e-output/`.

## Conventies
- Commits volgens Conventional Commits (`feat:`, `fix:`, `docs:`, …).
