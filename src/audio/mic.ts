// Microfoon openen en het geluid live laten analyseren. Niets wordt bewaard of verstuurd.

export interface Mic {
  ctx: AudioContext;
  /** Kort venster (±85 ms) voor toonhoogte en klappen. */
  pitch: AnalyserNode;
  /** Fijn spectrum voor akkoorden. */
  spectrum: AnalyserNode;
  stop(): void;
}

export async function startMic(): Promise<Mic> {
  // Ingebouwde "verbeteringen" van de browser uit: die vervormen muziek en dempen stille instrumenten.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);

  const pitch = ctx.createAnalyser();
  pitch.fftSize = 4096;
  pitch.smoothingTimeConstant = 0;
  const spectrum = ctx.createAnalyser();
  spectrum.fftSize = 8192;
  spectrum.smoothingTimeConstant = 0.5;

  // Via een stille versterker naar de uitgang, zodat de browser de analyse zeker blijft uitvoeren.
  const mute = ctx.createGain();
  mute.gain.value = 0;
  source.connect(pitch);
  source.connect(spectrum);
  pitch.connect(mute);
  spectrum.connect(mute);
  mute.connect(ctx.destination);

  return {
    ctx,
    pitch,
    spectrum,
    stop() {
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
    },
  };
}
