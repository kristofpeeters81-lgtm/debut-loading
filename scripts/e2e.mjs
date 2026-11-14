// Eind-tot-eind-test in echte Chrome (headless).
// 1. De app zelf: navigatie, terugknop, liggend/staand, instellingen bewaren, offline werken, updatemelding.
// 2. Luisteroor met een nep-microfoon die een WAV-bestand met zelf gemaakte tonen afspeelt (in een lus).

import fs from 'node:fs';
import path from 'node:path';
import { preview } from 'vite';
import puppeteer from 'puppeteer-core';

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
async function run(url, name, parts, steps) {
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
    await page.goto(`${url}#/luisteroor`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('button.big', { timeout: 5000 });
    await page.click('button.big');
    await page.waitForSelector('.tabs', { timeout: 5000 });
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
    check((await page.$$('.home-btn')).length === 5, 'app: startscherm met 5 knoppen');
    check((await page.$eval('.title', (e) => e.textContent)) === 'DEBUT LOADING…', 'app: titel DEBUT LOADING…');
    check(!(await visible(page, '.back')), 'app: geen terugknop op het startscherm');
    check(await noSideScroll(page), 'app: staand geen zijwaarts scrollen');
    await page.screenshot({ path: path.join(OUT, 'app-staand.png') });

    // Lege schermen tonen in welk blok ze komen
    check(await tapScreen(page, 'downloadhoek'), 'app: downloadhoek opent');
    check((await page.$eval('.placeholder', (e) => e.textContent)).includes('blok 10'), 'app: downloadhoek zegt "komt in blok 10"');
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
    const offlineOk = await waitFor(async () => (await page.$$('.home-btn')).length === 5, 5000, 'offline start');
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
    await waitFor(async () => (await page.$$('.home-btn')).length === 5, 5000, 'na update');
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
