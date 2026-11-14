// Klassieke biquad-filters (RBJ Audio EQ Cookbook). Gewone rekenregels, geen AI.

export type BiquadType = 'lowpass' | 'highpass' | 'peaking' | 'lowshelf' | 'highshelf';

export class Biquad {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private z1 = 0;
  private z2 = 0;

  constructor(type: BiquadType, freq: number, sampleRate: number, q = Math.SQRT1_2, gainDb = 0) {
    const w0 = (2 * Math.PI * Math.min(freq, sampleRate * 0.49)) / sampleRate;
    const cos = Math.cos(w0);
    const sin = Math.sin(w0);
    const alpha = sin / (2 * q);
    const A = Math.pow(10, gainDb / 40);
    let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;

    switch (type) {
      case 'lowpass':
        b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2;
        a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
        break;
      case 'highpass':
        b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2;
        a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
        break;
      case 'peaking':
        b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A;
        a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A;
        break;
      case 'lowshelf': {
        const s = 2 * Math.sqrt(A) * alpha;
        b0 = A * (A + 1 - (A - 1) * cos + s);
        b1 = 2 * A * (A - 1 - (A + 1) * cos);
        b2 = A * (A + 1 - (A - 1) * cos - s);
        a0 = A + 1 + (A - 1) * cos + s;
        a1 = -2 * (A - 1 + (A + 1) * cos);
        a2 = A + 1 + (A - 1) * cos - s;
        break;
      }
      case 'highshelf': {
        const s = 2 * Math.sqrt(A) * alpha;
        b0 = A * (A + 1 + (A - 1) * cos + s);
        b1 = -2 * A * (A - 1 + (A + 1) * cos);
        b2 = A * (A + 1 + (A - 1) * cos - s);
        a0 = A + 1 - (A - 1) * cos + s;
        a1 = 2 * (A - 1 - (A + 1) * cos);
        a2 = A + 1 - (A - 1) * cos - s;
        break;
      }
    }
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }

  /** Verwerkt één sample (Transposed Direct Form II). */
  process(x: number): number {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }

  /** Verwerkt een hele buffer ter plaatse. */
  processBuffer(buf: Float32Array): void {
    for (let i = 0; i < buf.length; i++) buf[i] = this.process(buf[i]);
  }
}

export interface EqBand {
  type: BiquadType;
  freq: number;
  q?: number;
  gainDb?: number;
}

/** Past een reeks EQ-banden na elkaar toe op een buffer (ter plaatse). */
export function applyEq(buf: Float32Array, bands: EqBand[], sampleRate: number): void {
  for (const band of bands) {
    new Biquad(band.type, band.freq, sampleRate, band.q ?? Math.SQRT1_2, band.gainDb ?? 0).processBuffer(buf);
  }
}
