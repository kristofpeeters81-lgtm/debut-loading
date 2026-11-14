// Inzetten herkennen (klap, tik, drumslag): een plotse sprong in luidheid. Gewone rekenregels.

export class OnsetDetector {
  private avg = 0;
  private lastOnset = -Infinity;

  constructor(private readonly minLevel = 0.02, private readonly jump = 3, private readonly refractoryMs = 150) {}

  /** Geef de luidheid van het laatste korte stukje; true = nieuwe inzet. */
  process(level: number, timeMs: number): boolean {
    const onset = level > this.minLevel && level > this.avg * this.jump && timeMs - this.lastOnset > this.refractoryMs;
    this.avg = this.avg * 0.9 + level * 0.1;
    if (onset) this.lastOnset = timeMs;
    return onset;
  }
}
