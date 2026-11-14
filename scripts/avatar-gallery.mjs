// Maakt een overzichtsafbeelding van alle avatars (met verschillende instrumenten) in e2e-output/avatars.png.
// Handig om nieuwe figuren te tonen voor ze ingebouwd worden. Gebruik: node scripts/avatar-gallery.mjs
// (Node 22.6+ leest het TypeScript-bestand rechtstreeks.)

import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { CHARACTERS, avatarMarkup } from '../src/ui/avatar.ts';

const CHROME =
  process.env.CHROME_PATH ??
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].find(
    (p) => fs.existsSync(p),
  );
const INSTRUMENTS = ['keyboard', 'gitaar', 'bas', 'drum', 'zang'];
const LABEL = { keyboard: 'Keyboard', gitaar: 'Gitaar', bas: 'Bas', drum: 'Drum', zang: 'Zang' };

const cell = (svg, name, sub) =>
  `<figure>${svg}<figcaption><b>${name}</b><span>${sub}</span></figcaption></figure>`;

const figures = CHARACTERS.map((c, i) => {
  const inst = INSTRUMENTS[i % INSTRUMENTS.length];
  return cell(avatarMarkup(c.id, inst, { stage: true, uid: `f${i}` }), c.name, LABEL[inst]);
}).join('');
const combos = INSTRUMENTS.map((inst, i) => cell(avatarMarkup('rio', inst, { stage: true, uid: `r${i}` }), 'Rio', LABEL[inst])).join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#0b0518;color:#f4ecff;font-family:Inter,system-ui,sans-serif;padding:40px 48px;width:1504px}
h1{font:900 40px system-ui;margin:0 0 6px;color:#fff;text-shadow:0 0 14px rgba(63,240,255,.8)}
h2{font:700 22px system-ui;margin:36px 0 12px;color:#ff4fd8;letter-spacing:.06em;text-transform:uppercase}
p{margin:0;color:#c9b8ec;font-size:18px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:18px}
figure{margin:0;background:#160a2e;border:2px solid #3b2470;border-radius:18px;padding:12px 12px 14px;display:flex;flex-direction:column;align-items:center}
figure svg{width:100%;height:auto}
figcaption{display:flex;flex-direction:column;align-items:center;gap:2px}
figcaption b{font-size:22px}figcaption span{color:#c9b8ec;font-size:16px}
</style></head><body>
<h1>DEBUT LOADING… · avatars</h1>
<p>10 figuren in de stijl Neon Stage. Elke figuur kan elk instrument bespelen (het instrument is een aparte laag).</p>
<h2>De figuren</h2><div class="grid">${figures}</div>
<h2>Eén figuur, vijf instrumenten</h2><div class="grid">${combos}</div>
</body></html>`;

const out = path.resolve('e2e-output');
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  const file = path.join(out, 'avatars.png');
  await page.screenshot({ path: file, fullPage: true });
  console.log(`✓ ${file}`);
} finally {
  await browser.close();
}
