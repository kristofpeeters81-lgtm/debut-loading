// Maakt de PNG-iconen voor het startscherm uit public/favicon.svg (met Chrome, geen extra pakket nodig).
// Neon-icoon (stijl A, blok 3): een "D" met een laadbalk. Gebruik: node scripts/make-icons.mjs

import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME =
  process.env.CHROME_PATH ??
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].find(
    (p) => fs.existsSync(p),
  );
const svg = fs.readFileSync('public/favicon.svg', 'utf8');
const data = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

// [bestand, grootte, schaal van het icoon]: "maskable" krijgt marge, want Android knipt het in een cirkel of druppel.
const ICONS = [
  ['public/icons/icon-192.png', 192, 1],
  ['public/icons/icon-512.png', 512, 1],
  ['public/icons/icon-maskable-512.png', 512, 0.7],
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  for (const [file, size, scale] of ICONS) {
    await page.setViewport({ width: size, height: size });
    const inner = Math.round(size * scale);
    await page.setContent(
      `<html><body style="margin:0;background:#0b0518;display:grid;place-items:center;width:${size}px;height:${size}px">` +
        `<img src="${data}" width="${inner}" height="${inner}"></body></html>`,
    );
    await page.screenshot({ path: file, omitBackground: false });
    console.log(`✓ ${file}`);
  }
} finally {
  await browser.close();
}
