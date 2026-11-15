// Eind-tot-eind-test in echte Chrome (headless).
// 1. De app zelf: navigatie, terugknop, liggend/staand, instellingen bewaren, offline werken, updatemelding.
// 2. Luisteroor met een nep-microfoon die een WAV-bestand met zelf gemaakte tonen afspeelt (in een lus).

import fs from 'node:fs';
import path from 'node:path';
import { preview } from 'vite';
import puppeteer from 'puppeteer-core';
import tonejsMidi from '@tonejs/midi';

const { Midi } = tonejsMidi;

const OUT = path.resolve('e2e-output');
const CHROME =
  process.env.CHROME_PATH ??
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].find(
    (p) => fs.existsSync(p),
  );
const SR = 48000;
const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Snaarachtige toon: grondtoon + boventonen, met zachte aanzet. */
function pluck(freqs, sec) {
  const n = Math.round(sec * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const env = Math.min(1, i / 400) * Math.exp((-1.2 * i) / SR);
    let v = 0;
    for (const f of freqs) [1, 0.6, 0.4, 0.25].forEach((a, k) => (v += a * Math.sin((2 * Math.PI * f * (k + 1) * i) / SR)));
    out[i] = (0.25 * env * v) / freqs.length;
  }
  return out;
}

function clap() {
  const out = new Float32Array(Math.round(0.6 * SR));
  let seed = 7;
  for (let i = 0; i < 2400; i++) {
    seed = (seed * 16807) % 2147483647;
    out[i] = (seed / 2147483647 - 0.5) * 1.2 * Math.exp(-i / 500);
  }
  return out;
}

function writeWav(file, parts) {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const buf = Buffer.alloc(44 + total * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + total * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(total * 2, 40);
  let o = 44;
  for (const p of parts) for (const s of p) (buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), o), (o += 2));
  fs.writeFileSync(file, buf);
}

let failures = 0;
function check(cond, label) {
  console.log(`${cond ? '✓' : '✗'} ${label}`);
  if (!cond) failures++;
}

/** Eén browserrun met een eigen nep-microfoongeluid. */
async function run(url, name, parts, steps, opts = { hash: '#/luisteroor', ready: '.tabs', start: 'button.big' }) {
  const wav = path.join(OUT, `${name}.wav`);
  writeWav(wav, parts);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`],
  });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.setViewport({ width: 800, height: 1280 });
    await page.goto(`${url}${opts.hash}`, { waitUntil: 'networkidle0' });
    if (opts.start) {
      await page.waitForSelector(opts.start, { timeout: 5000 });
      await page.click(opts.start);
    }
    await page.waitForSelector(opts.ready, { timeout: 5000 });
    await steps(page);
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  } finally {
    await browser.close();
  }
  check(errors.length === 0, `${name}: geen fouten in de pagina${errors.length ? ` (${errors.join(' | ')})` : ''}`);
}

const tab = (page, label) =>
  page.evaluate((l) => [...document.querySelectorAll('.tab')].find((b) => b.textContent.includes(l)).click(), label);
const okCount = (page) => page.$$eval('.list .item .icon', (els) => els.filter((e) => e.textContent === '✅').length);
async function waitOk(page, n, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end && (await okCount(page)) < n) await sleep(250);
  return okCount(page);
}

// ---------- De app zelf ----------
const APP_PORT = 5399;
const startServer = () => preview({ preview: { port: APP_PORT, strictPort: true }, logLevel: 'error' });
const stopServer = (server) => new Promise((r) => server.httpServer.close(r));
const visible = (page, sel) => page.$eval(sel, (e) => !e.hidden && e.getBoundingClientRect().height > 0).catch(() => false);
const screenOf = (page) => page.evaluate(() => document.body.dataset.screen);
async function waitFor(fn, ms, label) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await sleep(200);
  }
  console.log(`  (gaf op na ${ms} ms: ${label})`);
  return false;
}
async function tapScreen(page, id) {
  await page.click(`a[data-screen="${id}"]`);
  return waitFor(async () => (await screenOf(page)) === id, 3000, `scherm ${id}`);
}
const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

async function appTest() {
  const swFile = path.resolve('dist/sw.js');
  const swOriginal = fs.readFileSync(swFile, 'utf8');
  let server = await startServer();
  const url = `http://localhost:${APP_PORT}/`;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    // Fouten door de bewust gestopte server (offline-test) tellen niet mee.
    page.on('console', (m) => {
      if (m.type() === 'error' && !/ERR_CONNECTION_REFUSED|Failed to load resource/.test(m.text())) errors.push(m.text());
    });

    // Staand
    await page.setViewport({ width: 800, height: 1280 });
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Profiel maken (blok 5): bij de eerste start meteen "Jouw profiel"
    check(await waitFor(async () => (await screenOf(page)) === 'profiel', 3000, 'profiel'), 'profiel: eerste start vraagt een profiel');
    check(!(await visible(page, '.back')), 'profiel: geen terugknop bij het eerste profiel');
    check((await page.$$('.avatar-pick')).length === 10, 'profiel: 10 figuren om uit te kiezen');
    check(await page.$eval('button.big', (b) => b.disabled), 'profiel: Klaar kan pas met een naam');
    await page.type('#profile-name', 'Sam');
    await page.click('.avatar-pick[data-character="kat"]');
    await page.screenshot({ path: path.join(OUT, 'profiel-nieuw.png'), fullPage: true });
    await page.click('button.big');
    check(await waitFor(async () => (await screenOf(page)) === 'start', 3000, 'start'), 'profiel: na Klaar naar het startscherm');
    check((await page.$eval('.who-name', (e) => e.textContent)) === 'Sam', 'profiel: naam rechtsboven op het startscherm');

    check((await page.$$('.tile')).length === 4, 'app: startscherm met 4 grote knoppen');
    check((await page.$eval('.logo', (e) => e.textContent)) === 'DEBUTLOADING…', 'app: logo DEBUT LOADING…');
    check((await page.$$('.led-bar .seg')).length === 20, 'app: laadbalk met 20 LED-blokjes');
    check(await visible(page, '.stage .avatar'), 'app: avatar op het podium');
    await page.click('.chip[data-instrument="gitaar"]');
    check(
      (await page.$eval('.stage .avatar', (e) => e.dataset.instrument)) === 'gitaar',
      'app: instrument kiezen verandert het instrument van de avatar',
    );
    await page.screenshot({ path: path.join(OUT, 'app-staand-gitaar.png') });
    await page.click('.chip[data-instrument="keyboard"]');
    check(!(await visible(page, '.back')), 'app: geen terugknop op het startscherm');
    check(await noSideScroll(page), 'app: staand geen zijwaarts scrollen');
    await page.screenshot({ path: path.join(OUT, 'app-staand.png') });

    // Lege schermen tonen in welk blok ze komen
    check(await tapScreen(page, 'downloadhoek'), 'app: downloadhoek opent');
    check(await visible(page, '.how-to'), 'app: downloadhoek toont het stappenplan');
    await page.click('.back');
    check(await waitFor(async () => (await screenOf(page)) === 'start', 3000, 'terug naar start'), 'app: terugknop gaat naar start');

    // Instellingen → Luisteroor → terug (knop in de app) → terug (zoals Android)
    check(await tapScreen(page, 'instellingen'), 'app: instellingen opent');
    check(await tapScreen(page, 'luisteroor'), 'app: Luisteroor opent vanuit instellingen');
    check(await visible(page, 'button.big'), 'app: Luisteroor toont de startknop voor de microfoon');
    await page.click('.back');
    check(await waitFor(async () => (await screenOf(page)) === 'instellingen', 3000, 'terug'), 'app: terugknop gaat naar instellingen');
    await page.goBack();
    check(await waitFor(async () => (await screenOf(page)) === 'start', 3000, 'android-terug'), 'app: terugknop van de browser/Android werkt');

    // Vrij spelen (blok 6): keyboard, gitaar, bas, drum
    check(await tapScreen(page, 'vrij-spelen'), 'vrij spelen: opent');
    const tab = async (id) => {
      await page.click(`.play-tabs .chip[data-instrument="${id}"]`);
      await sleep(250);
    };
    const shown = () => page.$eval('.note-display-big', (e) => e.textContent);
    await tab('keyboard');
    check((await page.$$('.keyboard .key.white')).length >= 8, 'vrij spelen: keyboard met witte toetsen');
    check((await page.$$('.keyboard .key.black')).length >= 5, 'vrij spelen: keyboard met zwarte toetsen');
    await page.click('.keyboard .key.white[data-midi="60"]');
    check((await shown()) === 'C', 'vrij spelen: toets C4 toont C');
    await page.click('.keyboard .key.black[data-midi="61"]');
    check((await shown()) === 'C#', 'vrij spelen: zwarte toets toont C#');
    await page.screenshot({ path: path.join(OUT, 'vrij-keyboard-staand.png') });
    await tab('gitaar');
    check((await page.$$('.neck.gitaar .fret')).length === 6 * 13, 'vrij spelen: gitaarhals 6 snaren × 13 vakjes');
    await page.click('.neck.gitaar .fret[data-string="4"][data-fret="3"]');
    check((await shown()) === 'C', 'vrij spelen: A-snaar fret 3 = C');
    await tab('bas');
    check((await page.$$('.neck.bas .fret')).length === 4 * 13, 'vrij spelen: bashals 4 snaren × 13 vakjes');
    await page.click('.neck.bas .fret[data-string="3"][data-fret="5"]');
    check((await shown()) === 'A', 'vrij spelen: E-snaar van de bas fret 5 = A');
    await tab('drum');
    check((await page.$$('.drum-pad')).length === 8, 'vrij spelen: 8 drumpads');
    await page.click('.drum-pad[data-pad="snare"]');
    check((await shown()) === 'Snare', 'vrij spelen: snare-pad speelt');
    await page.setViewport({ width: 1280, height: 800 });
    await tab('keyboard');
    await sleep(300);
    check(await noSideScroll(page), 'vrij spelen: liggend geen zijwaarts scrollen');
    await page.screenshot({ path: path.join(OUT, 'vrij-keyboard-liggend.png') });
    await tab('gitaar');
    await page.screenshot({ path: path.join(OUT, 'vrij-gitaar-liggend.png') });
    await tab('keyboard');
    await page.setViewport({ width: 800, height: 1280 });
    await page.click('.back');
    check(await waitFor(async () => (await screenOf(page)) === 'start', 3000, 'terug'), 'vrij spelen: terug naar start');

    // Klanktest (blok 4): noten, akkoorden, drum, metronoom
    check(await tapScreen(page, 'instellingen'), 'klanktest: instellingen opent');
    check(await tapScreen(page, 'klanktest'), 'klanktest: opent vanuit instellingen');
    const pads = await page.$$('button.pad');
    check(pads.length === 13 + 6 + 4 + 4 + 8 + 1, `klanktest: alle knoppen aanwezig (${pads.length})`);
    const tapAll = async (sel) => {
      for (const b of await page.$$(sel)) {
        await b.click();
        await sleep(30);
      }
    };
    const playsNow = () => page.$eval('.plays', (e) => Number(e.dataset.plays ?? 0));
    // De teller telt alle klanken sinds de start van de app: meet het verschil.
    await page.click('button.pad.drum');
    const before = (await playsNow()) - 1;
    await tapAll('button.pad:not(.metro)');
    const afterTaps = await playsNow();
    // Akkoorden tellen per snaar: 1 + 13 + 6 + 4 + (6 + 5 + 3 + 3) + 8 = 49
    check(afterTaps - before === 49, `klanktest: elke knop speelt een klank (${afterTaps - before} van 49)`);
    await page.click('button.metro');
    await sleep(1500);
    await page.click('button.pad.drum');
    const afterMetro = await playsNow();
    check(afterMetro >= afterTaps + 1 + 2, `klanktest: metronoom tikt (${afterMetro - afterTaps - 1} tikken in 1,5 s)`);
    check((await page.$eval('button.metro', (e) => e.textContent)).includes('Stop'), 'klanktest: metronoomknop toont "Stop"');
    await page.screenshot({ path: path.join(OUT, 'klanktest.png'), fullPage: true });
    await page.click('.back');
    check(await waitFor(async () => (await screenOf(page)) === 'instellingen', 3000, 'terug'), 'klanktest: terug naar instellingen');
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Lessen (blok 8): les 1 met tikken op het scherm (deze browser heeft geen microfoon)
    check(await tapScreen(page, 'lessen'), 'lessen: opent');
    check((await page.$$('.lesson-card')).length === 54, 'lessen: 54 keyboardlessen');
    check((await page.$$('.level-head')).length === 4, 'lessen: 4 niveaus');
    check((await page.$eval('.lesson-card.next', (e) => e.dataset.lesson)) === 'kb-1-c', 'lessen: les 1 is "Volgende"');
    await page.screenshot({ path: path.join(OUT, 'lessen.png'), fullPage: true });
    await page.click('.lesson-card[data-lesson="kb-1-c"]');
    await waitFor(async () => (await screenOf(page)) === 'les', 3000, 'les');
    await page.click('.lesson-intro button.big');
    await sleep(300);
    const tapKey = async (m) => {
      await page.click(`.lesson-kb .key[data-midi="${m}"]`);
      await sleep(250);
    };
    await tapKey(62); // fout: D in plaats van C
    check((await page.$eval('.lesson-feedback', (e) => e.textContent)).includes('Bijna'), 'les: foute noot → "Bijna! Probeer nog eens."');
    await page.screenshot({ path: path.join(OUT, 'les-bezig.png') });
    for (const m of [60, 72, 60, 62, 64]) await tapKey(m);
    check(await waitFor(() => visible(page, '.lesson-end'), 3000, 'einde les'), 'les: les 1 uitgespeeld');
    check((await page.$eval('.lesson-end', (e) => e.dataset.stars)) === '3', 'les: 1 foutje = nog altijd 3 sterren');
    await page.screenshot({ path: path.join(OUT, 'les-einde.png') });
    await page.click('.lesson-end .lesson-back');
    await waitFor(async () => (await screenOf(page)) === 'lessen', 3000, 'lessen');
    check((await page.$eval('.lesson-card.next', (e) => e.dataset.lesson)) === 'kb-2-cde', 'lessen: les 2 is nu "Volgende"');
    await page.click('.back');
    await waitFor(async () => (await screenOf(page)) === 'start', 3000, 'start');
    check((await page.$$('.led-bar .seg.on')).length === 1, 'lessen: na de eerste sterren brandt het eerste blokje van de laadbalk');
    check((await page.$eval('.led-meta', (e) => e.textContent)).includes('3 sterren verzameld'), 'lessen: "3 sterren verzameld"');

    // Extra lessen: één les per instrument automatisch uitspelen door te tikken wat verwacht wordt.
    const CHORD_KEYS = { C: [60, 64, 67], F: [65, 69, 72], G: [67, 71, 74], Am: [57, 60, 64], Em: [64, 67, 71], Dm: [62, 65, 69], D: [62, 66, 69], A: [57, 61, 64], E: [64, 68, 71], Bm: [59, 62, 66] };
    const autoPlay = async (lessonId, tab) => {
      await tapScreen(page, 'lessen');
      await page.click(`.lesson-tabs .chip[data-instrument="${tab}"]`);
      await page.click(`.lesson-card[data-lesson="${lessonId}"]`);
      await waitFor(async () => (await screenOf(page)) === 'les', 3000, 'les');
      await page.click('.lesson-intro button.big');
      const end = Date.now() + 60000;
      let shot = false;
      while (Date.now() < end) {
        if (await page.$eval('.lesson-end', (e) => !e.hidden).catch(() => false)) break;
        const want = await page.$eval('.lesson-stage', (s) => s.dataset.expected ?? '');
        if (want === '') {
          await sleep(150);
          continue;
        }
        if (!shot) {
          await page.screenshot({ path: path.join(OUT, `les-${lessonId}.png`) });
          shot = true;
        }
        const tap = (sel) => page.click(sel).catch(() => undefined);
        if (want.startsWith('chord:')) {
          for (const m of CHORD_KEYS[want.slice(6)]) await tap(`.lesson-kb .key[data-midi="${m}"]`);
        } else if (/^\d+$/.test(want)) {
          const m = Number(want);
          const sel = (await page.$(`.lesson-kb .key[data-midi="${m}"]`))
            ? `.lesson-kb .key[data-midi="${m}"]`
            : (await page.$(`.lesson-neck .fret[data-midi="${m}"]`))
              ? `.lesson-neck .fret[data-midi="${m}"]`
              : `.lesson-kb .key[data-midi="${(m % 12) + 60}"]`;
          await tap(sel);
        } else {
          await tap(`.drum-pad[data-pad="${want}"]`);
        }
        await sleep(160);
      }
      const done = await page.$eval('.lesson-end', (e) => !e.hidden).catch(() => false);
      const stars = await page.$eval('.lesson-end', (e) => e.dataset.stars).catch(() => '?');
      check(done && stars === '3', `les ${lessonId} (${tab}): uitgespeeld met 3 sterren (sterren: ${stars})`);
      await page.click('.lesson-end .lesson-back').catch(() => undefined);
      await waitFor(async () => (await screenOf(page)) === 'lessen', 3000, 'lessen');
      await page.click('.back');
      await waitFor(async () => (await screenOf(page)) === 'start', 3000, 'start');
    };
    await tapScreen(page, 'lessen');
    for (const [tab, n] of [['keyboard', 54], ['gitaar', 34], ['bas', 27], ['drum', 25], ['zang', 26]]) {
      await page.click(`.lesson-tabs .chip[data-instrument="${tab}"]`);
      check((await page.$$('.lesson-card')).length === n, `lessen: ${n} lessen voor ${tab}`);
    }
    await page.click('.back');
    await waitFor(async () => (await screenOf(page)) === 'start', 3000, 'start');
    await autoPlay('kb-14-akkoord-c', 'keyboard');
    await autoPlay('g-1-hoog', 'gitaar');
    await autoPlay('b-3-frets', 'bas');
    await autoPlay('d-3-beat', 'drum');
    // Tweede reeks: een les per instrument (zwarte toetsen, linkerhand, D-snaar, bas-kwint, discobeat)
    await autoPlay('kb-21-zwart', 'keyboard');
    await autoPlay('kb-22-links-kortjakje', 'keyboard');
    await autoPlay('g-9-d-snaar', 'gitaar');
    await autoPlay('b-8-kwint', 'bas');
    await autoPlay('d-10-disco', 'drum');
    // Niveau 3 en 4
    await autoPlay('kb-3-ladder-g', 'keyboard');
    await autoPlay('kb-3-akk-d', 'keyboard');
    await autoPlay('g-3-ladder-g', 'gitaar');
    await autoPlay('b-3-octaaf', 'bas');
    await autoPlay('d-4-solo', 'drum');
    // Mollen: de les "Zwarte toets: Bb" toont Bb (niet A#)
    await tapScreen(page, 'lessen');
    await page.click('.lesson-tabs .chip[data-instrument="keyboard"]');
    await page.click('.lesson-card[data-lesson="kb-11-bes"]');
    await waitFor(async () => (await screenOf(page)) === 'les', 3000, 'les');
    await page.click('.lesson-intro button.big');
    await sleep(300);
    check((await page.$eval('.lesson-big', (e) => e.textContent)) === 'Bb', 'les: toonsoort met mollen toont "Bb" in plaats van "A#"');
    await page.click('.back');
    await waitFor(async () => (await screenOf(page)) === 'lessen', 3000, 'lessen');
    await page.click('.back');
    await waitFor(async () => (await screenOf(page)) === 'start', 3000, 'start');

    // Spel met vallende noten (blok 9): Ode an die Freude uitspelen in "Wacht op mij"
    check(await tapScreen(page, 'liedjes'), 'liedjes: opent');
    check((await page.$$('.lesson-card[data-song]')).length === 6, 'liedjes: 6 liedjes');
    await page.click('.lesson-card[data-song="ode"]');
    await waitFor(async () => (await screenOf(page)) === 'spel', 3000, 'spel');
    await page.click('.lesson-intro button.big');
    check((await page.$eval('.game-tempo', (e) => e.textContent)) === '70%', 'spel: start op 70% tempo');
    await sleep(500); // het scherm verspringt nog net na Start (startkaart weg)
    for (let i = 0; i < 3; i++) {
      const before = await page.$eval('.game-tempo', (e) => e.textContent);
      await page.click('.game-tempo-row .icon-btn:last-child');
      await waitFor(async () => (await page.$eval('.game-tempo', (e) => e.textContent)) !== before, 1000, `tempo na klik ${i + 1}`);
    }
    const tempoNow = await page.$eval('.game-tempo', (e) => e.textContent);
    check(tempoNow === '100%', `spel: tempo tot 100% (${tempoNow})`);
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT, 'spel-staand.png') });
    {
      const end = Date.now() + 60000;
      let shotWide = false;
      while (Date.now() < end) {
        if (await page.$eval('.lesson-end', (e) => !e.hidden).catch(() => false)) break;
        const want = await page.$eval('.game', (g) => g.dataset.expected ?? '');
        if (want) {
          const m = Number(want);
          const sel = (await page.$(`.lesson-kb .key[data-midi="${m}"]`)) ? `.lesson-kb .key[data-midi="${m}"]` : `.lesson-kb .key[data-midi="${(m % 12) + 60}"]`;
          await page.click(sel).catch(() => undefined);
          if (!shotWide) {
            await page.setViewport({ width: 1280, height: 800 });
            await sleep(300);
            check(await noSideScroll(page), 'spel: liggend geen zijwaarts scrollen');
            await page.screenshot({ path: path.join(OUT, 'spel-liggend.png') });
            shotWide = true;
          }
        }
        await sleep(80);
      }
      await page.setViewport({ width: 800, height: 1280 });
    }
    check(await page.$eval('.lesson-end', (e) => !e.hidden).catch(() => false), 'spel: Ode an die Freude uitgespeeld');
    check((await page.$eval('.lesson-end', (e) => e.dataset.stars).catch(() => '?')) === '3', 'spel: 3 sterren zonder foutjes');
    await page.screenshot({ path: path.join(OUT, 'spel-einde.png') });
    await page.click('.lesson-end .lesson-back');
    await waitFor(async () => (await screenOf(page)) === 'liedjes', 3000, 'liedjes');
    check((await page.$$('.lesson-card[data-song="ode"] .star-row svg[fill]')).length === 3, 'liedjes: 3 sterren bij Ode an die Freude');
    await page.click('.back');
    await waitFor(async () => (await screenOf(page)) === 'start', 3000, 'start');

    // Vallende noten op gitaar, bas en drum: Mary had a little lamb uitspelen door te tikken wat verwacht wordt.
    for (const inst of ['gitaar', 'bas', 'drum']) {
      await tapScreen(page, 'liedjes');
      await page.click(`.lesson-tabs .chip[data-instrument="${inst}"]`);
      await page.click('.lesson-card[data-song="mary"]');
      await waitFor(async () => (await screenOf(page)) === 'spel', 3000, 'spel');
      await page.click('.lesson-intro button.big');
      await sleep(500);
      for (let i = 0; i < 3; i++) {
        const before = await page.$eval('.game-tempo', (e) => e.textContent);
        await page.click('.game-tempo-row .icon-btn:last-child');
        await waitFor(async () => (await page.$eval('.game-tempo', (e) => e.textContent)) !== before, 1000, 'tempo');
      }
      let shot = false;
      const end = Date.now() + 60000;
      while (Date.now() < end) {
        if (await page.$eval('.lesson-end', (e) => !e.hidden).catch(() => false)) break;
        const want = await page.$eval('.game', (g) => g.dataset.expected ?? '');
        if (want) {
          const sel = /^\d+$/.test(want) ? `.lesson-neck .fret[data-midi="${want}"]` : `.drum-pad[data-pad="${want}"]`;
          await page.click(sel).catch(() => undefined);
          if (!shot) {
            await page.screenshot({ path: path.join(OUT, `spel-${inst}.png`) });
            shot = true;
          }
        }
        await sleep(80);
      }
      const stars = await page.$eval('.lesson-end', (e) => (e.hidden ? '' : e.dataset.stars)).catch(() => '');
      check(stars === '3', `spel ${inst}: Mary had a little lamb uitgespeeld met 3 sterren (${stars || 'niet klaar'})`);
      await page.click('.lesson-end .lesson-back').catch(() => undefined);
      await waitFor(async () => (await screenOf(page)) === 'liedjes', 3000, 'liedjes');
      check(
        (await page.$$('.lesson-card[data-song="mary"] .star-row svg[fill]')).length === 3,
        `liedjes: sterren voor ${inst} apart bewaard`,
      );
      await page.click('.back');
      await waitFor(async () => (await screenOf(page)) === 'start', 3000, 'start');
    }

    // Downloadhoek (blok 10): eigen MIDI-bestand toevoegen (zelf gemaakt: Ode an die Freude + begeleiding) en een kapot bestand
    {
      const m = new Midi();
      m.header.setTempo(120);
      const acc = m.addTrack();
      acc.name = 'Begeleiding';
      for (let bar = 0; bar < 4; bar++) for (const n of [48, 52, 55]) acc.addNote({ midi: n, ticks: bar * 1920, durationTicks: 1900 });
      const mel = m.addTrack();
      mel.name = 'unbenannt1';
      [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64].forEach((n, i) => mel.addNote({ midi: n, ticks: i * 480, durationTicks: 460 }));
      fs.writeFileSync(path.join(OUT, 'Mijn_test_liedje.mid'), Buffer.from(m.toArray()));
      fs.writeFileSync(path.join(OUT, 'kapot.mid'), 'dit is geen midi');
    }
    check(await tapScreen(page, 'downloadhoek'), 'downloadhoek: opent');
    const [chooser] = await Promise.all([page.waitForFileChooser(), page.click('.add-song')]);
    await chooser.accept([path.join(OUT, 'Mijn_test_liedje.mid'), path.join(OUT, 'kapot.mid')]);
    check(await waitFor(async () => (await page.$$('.import-ok')).length === 1, 5000, 'import'), 'downloadhoek: liedje toegevoegd');
    check((await page.$$('.import-fail')).length === 1, 'downloadhoek: kapot bestand krijgt een uitleg (geen crash)');
    check((await page.$eval('.my-song .lesson-title', (e) => e.textContent)) === 'Mijn test liedje', 'downloadhoek: titel uit de bestandsnaam');
    check((await page.$eval('.my-song .lesson-goal', (e) => e.textContent)).includes('unbenannt1'), 'downloadhoek: melodiespoor automatisch gekozen');
    await page.click('.my-song .my-tracks');
    check((await page.$$('.track-line')).length === 2, 'downloadhoek: 2 sporen om uit te kiezen');
    await page.screenshot({ path: path.join(OUT, 'downloadhoek.png'), fullPage: true });
    await page.click('.track-line[data-track="0"] .track-pick');
    check(
      await waitFor(async () => (await page.$eval('.my-song .lesson-goal', (e) => e.textContent)).includes('Begeleiding'), 3000, 'ander spoor'),
      'downloadhoek: ander spoor kiezen werkt',
    );
    await page.click('.my-song .my-tracks');
    await page.click('.track-line[data-track="1"] .track-pick');
    await waitFor(async () => (await page.$eval('.my-song .lesson-goal', (e) => e.textContent)).includes('unbenannt1'), 3000, 'terug melodie');
    await page.reload({ waitUntil: 'networkidle0' });
    check((await page.$$('.my-song')).length === 1, 'downloadhoek: liedje blijft bewaard na herladen');
    await page.click('.my-song .my-play');
    await waitFor(async () => (await screenOf(page)) === 'spel', 3000, 'spel');
    check((await page.$eval('.game-title', (e) => e.textContent)) === 'Mijn test liedje', 'spel: eigen liedje opent in het spel');
    await page.click('.lesson-intro button.big');
    await sleep(500);
    {
      const end = Date.now() + 40000;
      while (Date.now() < end) {
        if (await page.$eval('.lesson-end', (e) => !e.hidden).catch(() => false)) break;
        const want = await page.$eval('.game', (g) => g.dataset.expected ?? '');
        if (want) {
          const mm = Number(want);
          const sel = (await page.$(`.lesson-kb .key[data-midi="${mm}"]`)) ? `.lesson-kb .key[data-midi="${mm}"]` : `.lesson-kb .key[data-midi="${(mm % 12) + 60}"]`;
          await page.click(sel).catch(() => undefined);
        }
        await sleep(80);
      }
    }
    check(await page.$eval('.lesson-end', (e) => !e.hidden).catch(() => false), 'spel: eigen liedje uitgespeeld');
    await page.click('.lesson-end .lesson-back');
    await sleep(300);
    await page.goto(url, { waitUntil: 'networkidle0' });
    check(await tapScreen(page, 'liedjes'), 'liedjes: opent opnieuw');
    check((await page.$$('.songs-mine-title + .lesson-path .lesson-card')).length === 1, 'liedjes: eigen liedje staat bij "Mijn liedjes"');
    await page.click('.back');
    await waitFor(async () => (await screenOf(page)) === 'start', 3000, 'start');
    await tapScreen(page, 'downloadhoek');
    await page.click('.my-song .my-delete');
    await page.click('.my-song .my-delete');
    check(await waitFor(async () => (await page.$$('.my-song')).length === 0, 3000, 'verwijderd'), 'downloadhoek: verwijderen (twee keer tikken)');
    await page.click('.back');
    await waitFor(async () => (await screenOf(page)) === 'start', 3000, 'start');

    // Tweede profiel (blok 5): eigen instrument per profiel, wisselen, kiezen bij de start, verwijderen
    const onScreen = (id) => waitFor(async () => (await screenOf(page)) === id, 3000, id);
    const clickProfile = (name) =>
      page.evaluate((n) => [...document.querySelectorAll('.profile-card')].find((c) => c.textContent.includes(n)).click(), name);
    await page.click('.who-chip');
    check(await onScreen('profielen'), 'profiel: figuur rechtsboven opent "Wie speelt er?"');
    await page.click('.profile-card.add');
    await onScreen('profiel');
    await page.type('#profile-name', 'Mila');
    await page.click('.avatar-pick[data-character="zib"]');
    await page.click('button.big');
    await onScreen('start');
    check((await page.$eval('.who-name', (e) => e.textContent)) === 'Mila', 'profiel: tweede profiel actief');
    await page.click('.chip[data-instrument="drum"]');
    await sleep(200);
    await page.click('.who-chip');
    await onScreen('profielen');
    check((await page.$$('.profile-card')).length === 3, 'profiel: 2 profielen + "Nieuw profiel"');
    await page.screenshot({ path: path.join(OUT, 'profielen.png'), fullPage: true });
    await clickProfile('Sam');
    await onScreen('start');
    check((await page.$eval('.stage .avatar', (e) => e.dataset.instrument)) === 'keyboard', 'profiel: Sam houdt zijn eigen instrument');
    check((await page.$eval('.stage .avatar', (e) => e.dataset.character)) === 'kat', 'profiel: podium toont Sams figuur (Kat)');
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    check(await onScreen('profielen'), 'profiel: met 2 profielen vraagt de app bij de start wie er speelt');
    await page.click('.profile-tools button');
    await clickProfile('Mila');
    await onScreen('profiel');
    await page.click('button.danger');
    await page.click('button.danger');
    check(await onScreen('profielen'), 'profiel: verwijderen (twee keer tikken)');
    check((await page.$$('.profile-card')).length === 2, 'profiel: Mila is weg');
    await clickProfile('Sam');
    await onScreen('start');

    // Instelling bewaren en na herladen terug
    await tapScreen(page, 'instellingen');
    await page.click('button.choice[data-notation="doremi"]');
    await sleep(300);
    await page.reload({ waitUntil: 'networkidle0' });
    check((await screenOf(page)) === 'instellingen', 'app: na herladen terug op hetzelfde scherm');
    check(
      await page.$eval('button.choice.on', (e) => e.dataset.notation === 'doremi').catch(() => false),
      'app: do-re-mi blijft bewaard na herladen',
    );
    await page.click('.back');
    check(await waitFor(async () => (await screenOf(page)) === 'start', 3000, 'terug na herladen'), 'app: terugknop na herladen gaat naar start');

    // Liggend
    await page.setViewport({ width: 1280, height: 800 });
    await sleep(200);
    check(await noSideScroll(page), 'app: liggend geen zijwaarts scrollen');
    await page.screenshot({ path: path.join(OUT, 'app-liggend.png') });

    // Offline: wachten tot de service worker de app beheert, server stoppen, herladen.
    check(
      await waitFor(() => page.evaluate(() => !!navigator.serviceWorker.controller), 10000, 'service worker'),
      'app: service worker actief',
    );
    check(!(await visible(page, '.update-banner')), 'app: geen updatemelding bij de eerste installatie');
    await stopServer(server);
    server = null;
    const failedReq = [];
    page.on('requestfailed', (r) => failedReq.push(`${r.url()} ${r.failure()?.errorText}`));
    await page.reload({ waitUntil: 'load' });
    const offlineOk = await waitFor(async () => (await page.$$('.tile')).length === 4, 5000, 'offline start');
    check(offlineOk, `app: werkt offline (server gestopt)${offlineOk ? '' : ` — mislukt: ${failedReq.join(' | ')}`}`);

    // Update: nieuwe versie van de service worker → melding → tik → nieuwe versie actief.
    fs.writeFileSync(swFile, `${swOriginal}\n// testversie ${Date.now()}\n`);
    server = await startServer();
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r && r.update()));
    check(await waitFor(() => visible(page, '.update-banner'), 10000, 'updatemelding'), 'app: updatemelding verschijnt bij een nieuwe versie');
    await page.screenshot({ path: path.join(OUT, 'app-update.png') });
    const reloaded = page.waitForNavigation({ timeout: 10000 }).then(
      () => true,
      () => false,
    );
    await page.click('.update-btn');
    check(await reloaded, 'app: tik op de melding herlaadt de app');
    await waitFor(async () => (await page.$$('.tile')).length === 4, 5000, 'na update');
    check(!(await visible(page, '.update-banner')), 'app: na de update is de melding weg');
    check(
      await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => !!r && !r.waiting)),
      'app: geen wachtende versie meer',
    );
  } finally {
    await browser.close();
    if (server) await stopServer(server);
    fs.writeFileSync(swFile, swOriginal);
  }
  check(errors.length === 0, `app: geen fouten in de pagina${errors.length ? ` (${errors.join(' | ')})` : ''}`);
}

async function main() {
  if (!CHROME) throw new Error('Chrome niet gevonden; zet CHROME_PATH');
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  await appTest();
  const server = await preview({ preview: { port: 5398, strictPort: false }, logLevel: 'error' });
  const url = server.resolvedUrls.local[0];
  try {
    // Gitaar: de zes losse snaren na elkaar.
    await run(url, 'gitaar', [40, 45, 50, 55, 59, 64].map((m) => pluck([midiToHz(m)], 1.5)), async (page) => {
      await tab(page, 'Gitaar');
      check((await waitOk(page, 6, 25000)) === 6, 'gitaar: alle 6 snaren herkend');
    });
    // Bas: de vier losse snaren.
    await run(url, 'bas', [28, 33, 38, 43].map((m) => pluck([midiToHz(m)], 1.5)), async (page) => {
      await tab(page, 'Bas');
      check((await waitOk(page, 4, 20000)) === 4, 'bas: alle 4 snaren herkend (ook E1)');
    });
    // Keyboard: C-akkoord en Am-akkoord.
    await run(url, 'akkoorden', [pluck([60, 64, 67].map(midiToHz), 1.5), pluck([57, 60, 64].map(midiToHz), 1.5)], async (page) => {
      await tab(page, 'Keyboard');
      await page.evaluate(() => [...document.querySelectorAll('.list .item')][6].click());
      check((await waitOk(page, 2, 15000)) === 2, 'keyboard: akkoorden C en Am herkend');
    });
    // Stemapparaat (blok 7): A-snaar 15 cent te hoog, hoge E-snaar zuiver.
    const detune = (m, c) => midiToHz(m) * Math.pow(2, c / 1200);
    await run(
      url,
      'stemmen',
      [pluck([detune(45, 15)], 2.5), pluck([detune(64, 0)], 2.5)],
      async (page) => {
        const seen = new Set();
        const end = Date.now() + 12000;
        while (Date.now() < end && !(seen.has('A:iets te hoog') && seen.has('E:juist'))) {
          seen.add(await page.$eval('.tuner', (c) => `${c.querySelector('.tuner-note').textContent}:${c.dataset.state ?? ''}`));
          await sleep(100);
        }
        check(seen.has('A:iets te hoog'), `stemapparaat: A-snaar "iets te hoog" (gezien: ${[...seen].join(', ')})`);
        check(seen.has('E:juist'), 'stemapparaat: hoge E-snaar "juist"');
      },
      { hash: '#/stemmen', ready: '.tuner-strings', start: 'button.big' },
    );
    // Zangbereik (blok 7): een stem die A3 en daarna E5 vasthoudt.
    const voice = (m, sec) => {
      const n = Math.round(sec * SR);
      const out = new Float32Array(n);
      const f = midiToHz(m);
      for (let i = 0; i < n; i++) {
        const env = Math.min(1, i / 2000, (n - i) / 2000);
        out[i] =
          0.3 * env * (Math.sin((2 * Math.PI * f * i) / SR) + 0.4 * Math.sin((4 * Math.PI * f * i) / SR) + 0.2 * Math.sin((6 * Math.PI * f * i) / SR));
      }
      return out;
    };
    await run(
      url,
      'zangbereik',
      [voice(57, 1.6), new Float32Array(SR * 0.3), voice(76, 1.6), new Float32Array(SR * 0.3)],
      async (page) => {
        await page.click('.play-tabs .chip[data-instrument="zang"]');
        await page.waitForSelector('.range-card button.pad', { timeout: 3000 });
        await page.click('.range-card button.pad');
        let ok = false;
        const end = Date.now() + 15000;
        while (Date.now() < end && !ok) {
          const r = await page.$eval('.range-card', (c) => [c.dataset.low, c.dataset.high]);
          ok = r[0] === '57' && r[1] === '76';
          if (!ok) await sleep(250);
        }
        check(ok, 'zangbereik: A3 en E5 gemeten');
        const btns = await page.$$('.range-card button.pad');
        await btns[1].click();
        await sleep(200);
        check((await page.$eval('.range-value', (e) => e.textContent)) === 'A3 – E5', 'zangbereik: toont "A3 – E5" na Klaar');
        check(await page.$eval('.sing-trail', (c) => !c.hidden), 'zangbereik: toonhoogtelijn zichtbaar');
      },
      { hash: '#/vrij-spelen', ready: '.play-tabs', start: null },
    );
    // Les "Vader Jacob" (blok 8) helemaal gespeeld via de microfoon (keyboardachtige tonen, met stiltes ertussen).
    const jacob = [60, 62, 64, 60, 60, 62, 64, 60, 64, 65, 67, 64, 65, 67];
    const song = [];
    for (const m of jacob) song.push(pluck([midiToHz(m)], 0.45), new Float32Array(Math.round(SR * 0.12)));
    song.push(new Float32Array(SR));
    await run(
      url,
      'les-jacob',
      song,
      async (page) => {
        await page.click('.lesson-card[data-lesson="kb-4-jacob"]');
        await page.waitForSelector('.lesson-intro button.big', { timeout: 3000 });
        await page.click('.lesson-intro button.big');
        let done = false;
        const end = Date.now() + 30000;
        while (Date.now() < end && !done) {
          done = await page.$eval('.lesson-end', (e) => !e.hidden).catch(() => false);
          if (!done) await sleep(300);
        }
        check(done, 'les via microfoon: "Vader Jacob" helemaal herkend');
        const stars = await page.$eval('.lesson-end', (e) => e.dataset.stars).catch(() => '?');
        console.log(`  (sterren via microfoon: ${stars})`);
      },
      { hash: '#/lessen', ready: '.lesson-path', start: null },
    );
    // Zangles "Zing de do" via de microfoon: een stem die telkens 1,2 s een C zingt.
    const doParts = [];
    for (let i = 0; i < 4; i++) doParts.push(voice(60, 1.2), new Float32Array(Math.round(SR * 0.5)));
    await run(
      url,
      'les-zang',
      doParts,
      async (page) => {
        await page.click('.lesson-tabs .chip[data-instrument="zang"]');
        await page.click('.lesson-card[data-lesson="z-1-do"]');
        await page.waitForSelector('.lesson-intro button.big', { timeout: 3000 });
        await page.click('.lesson-intro button.big');
        let done = false;
        const end = Date.now() + 40000;
        while (Date.now() < end && !done) {
          done = await page.$eval('.lesson-end', (e) => !e.hidden).catch(() => false);
          if (!done) await sleep(300);
        }
        check(done, 'zangles via microfoon: drie keer de do gezongen en vastgehouden');
      },
      { hash: '#/lessen', ready: '.lesson-path', start: null },
    );
    // Klappen.
    await run(url, 'klappen', Array.from({ length: 8 }, clap), async (page) => {
      await tab(page, 'Klappen');
      check((await waitOk(page, 1, 15000)) === 1, 'klappen: 8 klappen geteld');
    });
  } finally {
    await new Promise((r) => server.httpServer.close(r));
  }
  console.log(failures ? `\n${failures} controle(s) mislukt` : '\nAlles in orde');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
