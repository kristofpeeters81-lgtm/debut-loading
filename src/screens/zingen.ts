// Zingen in Vrij spelen (blok 7): live zien welke noot je zingt (met een lijn van de laatste seconden)
// en je zangbereik meten. Bewaard op de tablet (vanaf blok 5 per profiel). Niets wordt opgenomen.

import { startTracker, micErrorText, type Tracker } from '../audio/tracker';
import { RangeMeter, Smoother, voiceDescription } from '../audio/tuning';
import { hzToMidi, noteName } from '../dsp/notes';
import { settings, updateSettings } from '../app/state';
import { el } from '../ui/dom';

const LOW = 40; // E2
const HIGH = 88; // E6
const TRAIL_MS = 6000;

/** `show(midi)` laat de noot groot zien in het scherm van Vrij spelen. */
export function mountSinging(surface: HTMLElement, show: (midi: number) => void): () => void {
  let tracker: Tracker | null = null;
  let alive = true;
  let measuring = false;
  const smoother = new Smoother(5);
  const meter = new RangeMeter(500);
  const trail: { t: number; m: number }[] = [];
  let lastShown = -1;

  const startBtn = el('button', 'big', 'Start de microfoon en zing');
  const startNote = el('p', 'small', 'De app luistert via de microfoon. Er wordt niets opgenomen.');
  const canvas = el('canvas', 'sing-trail');
  canvas.setAttribute('aria-label', 'Lijn met de toonhoogte van de laatste seconden');

  const rangeCard = el('section', 'card range-card');
  const rangeTitle = el('h2', '', 'Jouw zangbereik');
  const rangeValue = el('div', 'range-value', '');
  const rangeText = el('p', 'small', '');
  const rangeBtn = el('button', 'pad wide', 'Meet mijn zangbereik');
  const rangeDone = el('button', 'pad wide', 'Klaar');
  rangeDone.hidden = true;
  const rangeRow = el('div', 'pad-row');
  rangeRow.append(rangeBtn, rangeDone);
  rangeCard.append(rangeTitle, rangeValue, rangeText, rangeRow);

  surface.append(startBtn, startNote, canvas, rangeCard);
  canvas.hidden = true;

  const fmt = (m: number): string => noteName(m, settings().notation);
  const renderRange = (): void => {
    const saved = settings().voiceRange;
    if (measuring) {
      rangeValue.textContent = meter.low !== null && meter.high !== null ? `${fmt(meter.low)} – ${fmt(meter.high)}` : '…';
      rangeText.textContent = 'Zing je laagste toon en houd hem even vast. Zing dan je hoogste toon. Druk daarna op Klaar.';
    } else if (saved) {
      rangeValue.textContent = `${fmt(saved.low)} – ${fmt(saved.high)}`;
      rangeText.textContent = voiceDescription(saved.low, saved.high);
    } else {
      rangeValue.textContent = 'Nog niet gemeten';
      rangeText.textContent = 'Zo weet de app welke liedjes goed bij jouw stem passen.';
    }
    rangeCard.dataset.low = String(measuring ? (meter.low ?? '') : (saved?.low ?? ''));
    rangeCard.dataset.high = String(measuring ? (meter.high ?? '') : (saved?.high ?? ''));
  };
  renderRange();

  rangeBtn.addEventListener('click', () => {
    measuring = true;
    meter.reset();
    rangeBtn.hidden = true;
    rangeDone.hidden = false;
    if (!tracker) startBtn.click();
    renderRange();
  });
  rangeDone.addEventListener('click', () => {
    measuring = false;
    rangeBtn.hidden = false;
    rangeDone.hidden = true;
    rangeBtn.textContent = 'Opnieuw meten';
    if (meter.low !== null && meter.high !== null) void updateSettings({ voiceRange: { low: meter.low, high: meter.high } });
    renderRange();
  });

  const draw = (now: number): void => {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
    if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
    const g = canvas.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const y = (m: number): number => h - ((m - LOW) / (HIGH - LOW)) * h;
    g.font = '600 12px Inter, system-ui, sans-serif';
    for (let m = LOW; m <= HIGH; m++) {
      if (m % 12 !== 0) continue;
      g.strokeStyle = 'rgba(201,184,236,0.18)';
      g.beginPath();
      g.moveTo(40, y(m));
      g.lineTo(w, y(m));
      g.stroke();
      g.fillStyle = 'rgba(201,184,236,0.8)';
      g.fillText(fmt(m), 4, y(m) + 4);
    }
    const saved = settings().voiceRange;
    if (saved) {
      g.fillStyle = 'rgba(255,79,216,0.10)';
      g.fillRect(40, y(saved.high + 0.5), w - 40, y(saved.low - 0.5) - y(saved.high + 0.5));
    }
    g.strokeStyle = '#3ff0ff';
    g.lineWidth = 4;
    g.lineCap = 'round';
    g.shadowColor = 'rgba(63,240,255,0.8)';
    g.shadowBlur = 10;
    g.beginPath();
    let prev: { t: number; m: number } | null = null;
    for (const p of trail) {
      const x = 40 + ((p.t - (now - TRAIL_MS)) / TRAIL_MS) * (w - 40);
      if (prev && p.t - prev.t < 150) g.lineTo(x, y(p.m));
      else g.moveTo(x, y(p.m));
      prev = p;
    }
    g.stroke();
    g.shadowBlur = 0;
  };

  startBtn.addEventListener('click', () => {
    startBtn.disabled = true;
    void startTracker({ minHz: 80, maxHz: 1100 }, (f) => {
      while (trail.length && trail[0].t < f.timeMs - TRAIL_MS) trail.shift();
      if (f.hz !== null) {
        const m = smoother.push(hzToMidi(f.hz));
        trail.push({ t: f.timeMs, m });
        const rounded = Math.round(m);
        if (rounded !== lastShown) {
          show(rounded);
          lastShown = rounded;
        }
        if (measuring && meter.push(rounded, f.timeMs)) renderRange();
      } else {
        smoother.reset();
        lastShown = -1;
        if (measuring) meter.push(null, f.timeMs);
      }
      draw(f.timeMs);
    })
      .then((t) => {
        if (!alive) {
          t.stop();
          return;
        }
        tracker = t;
        startBtn.hidden = true;
        startNote.hidden = true;
        canvas.hidden = false;
      })
      .catch((err: unknown) => {
        startBtn.disabled = false;
        startNote.textContent = micErrorText(err);
      });
  });

  return () => {
    alive = false;
    tracker?.stop();
  };
}
