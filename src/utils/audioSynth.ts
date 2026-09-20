// Web Audio Synthesizer for Commercial Audio Background Bed & Sound Effects

class CommercialAudioEngine {
  private ctx: AudioContext | null = null;
  private isBgmPlaying = false;
  private stopBed: (() => void) | null = null;
  private liveBedGain: GainNode | null = null;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play a clean commercial chime / logo sting (e.g. for "Legit Africa dot com")
  playBrandSting(type: 'intro' | 'outro' | 'notification' | 'cash') {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      if (type === 'intro') {
        // High-clarity double marimba/electric piano chime (C5 -> G5)
        [523.25, 783.99].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          gain.gain.setValueAtTime(0.2, now + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.65);
        });
      } else if (type === 'outro') {
        // Confident 3-note ascending resolution (F4 -> A4 -> C5)
        [349.23, 440.0, 523.25].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.14);
          gain.gain.setValueAtTime(0.25, now + i * 0.14);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.14 + 0.9);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.14);
          osc.stop(now + i * 0.14 + 1.0);
        });
      } else if (type === 'notification') {
        // Phone alert chime for "stopped picking your calls"
        [659.25, 880.0].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0.18, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.4);
        });
      } else if (type === 'cash') {
        // Register ding for "Save someone's money"
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1318.5, now); // E6
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.85);
      }
    } catch (e) {
      console.warn('Could not play sting:', e);
    }
  }

  /**
   * Schedules the chord bed into any audio context and destination, and returns a stop function.
   *
   * Taking the context as an argument is what lets the exported video carry the music: the
   * recording mixes into its own AudioContext, so a bed hard-wired to the speakers never reached
   * the file. Same notes either way.
   */
  private scheduleBed(
    ctx: AudioContext,
    target: AudioNode,
    theme: 'lofi' | 'ambient' | 'radio',
    volume: number
  ): { stop: () => void; gain: GainNode } {
    const bedGain = ctx.createGain();
    bedGain.gain.setValueAtTime(volume, ctx.currentTime);
    bedGain.connect(target);

    let alive = true;
    const chordsFor = {
      // Smooth neo-soul sevenths: Dm7 -> G7 -> Cmaj7 -> Am7
      lofi: [
        [146.83, 220.0, 261.63, 349.23],
        [196.0, 246.94, 293.66, 349.23],
        [130.81, 196.0, 246.94, 329.63],
        [220.0, 261.63, 329.63, 392.0],
      ],
      ambient: [
        [174.61, 220.0, 329.63],
        [130.81, 196.0, 293.66],
      ],
      radio: [
        [220, 261.63, 329.63],
        [174.61, 220, 261.63],
        [130.81, 164.81, 196.0],
        [196.0, 246.94, 293.66],
      ],
    }[theme];

    const voice = {
      lofi: { type: 'sine' as OscillatorType, cutoff: 900, peak: 0.06, attack: 0.15, tail: 2.5, every: 2600, brush: true },
      ambient: { type: 'triangle' as OscillatorType, cutoff: 600, peak: 0.04, attack: 0.8, tail: 3.8, every: 4000, brush: false },
      radio: { type: 'triangle' as OscillatorType, cutoff: 1200, peak: 0.08, attack: 0.3, tail: 2.3, every: 2400, brush: false },
    }[theme];

    let step = 0;
    const playStep = () => {
      if (!alive) return;
      const now = ctx.currentTime;
      const chord = chordsFor[step % chordsFor.length];

      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = voice.type;
        osc.frequency.setValueAtTime(freq, now + idx * 0.02);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(voice.cutoff, now);

        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.linearRampToValueAtTime(voice.peak, now + voice.attack);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + voice.tail);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(bedGain);

        osc.start(now);
        osc.stop(now + voice.tail + 0.1);
      });

      if (voice.brush) {
        const brush = ctx.createOscillator();
        const brushGain = ctx.createGain();
        brush.frequency.setValueAtTime(65, now);
        brushGain.gain.setValueAtTime(0.05, now);
        brushGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        brush.connect(brushGain);
        brushGain.connect(bedGain);
        brush.start(now);
        brush.stop(now + 0.16);
      }

      step++;
    };

    playStep();
    const interval = setInterval(playStep, voice.every);
    const stop = () => {
      alive = false;
      clearInterval(interval);
      try {
        bedGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        setTimeout(() => bedGain.disconnect(), 400);
      } catch {
        try { bedGain.disconnect(); } catch {}
      }
    };
    return { stop, gain: bedGain };
  }

  /** Plays the bed out loud, for the preview. */
  startBgmBed(volume = 0.14, theme: 'lofi' | 'ambient' | 'radio' = 'lofi') {
    if (this.isBgmPlaying) this.stopBgmBed();
    try {
      const ctx = this.getContext();
      this.isBgmPlaying = true;
      const bed = this.scheduleBed(ctx, ctx.destination, theme, volume);
      this.stopBed = bed.stop;
      this.liveBedGain = bed.gain;
    } catch (e) {
      console.warn('Could not start BGM bed:', e);
    }
  }

  /**
   * Plays the same bed into a recording's own audio, so the music is in the exported file.
   * Returns a stop function for when the recording ends.
   */
  renderBedInto(
    ctx: AudioContext,
    target: AudioNode,
    theme: 'lofi' | 'ambient' | 'radio',
    volume: number
  ): () => void {
    try {
      return this.scheduleBed(ctx, target, theme, volume).stop;
    } catch (e) {
      console.warn('Could not mix the music bed into the export:', e);
      return () => {};
    }
  }


  stopBgmBed() {
    this.isBgmPlaying = false;
    if (this.stopBed) {
      this.stopBed();
      this.stopBed = null;
      this.liveBedGain = null;
    }
    if (this.customAudioEl) {
      try {
        this.customAudioEl.pause();
        this.customAudioEl.currentTime = 0;
      } catch (_) {}
    }
  }

  private customAudioEl: HTMLAudioElement | null = null;

  startCustomAudio(url: string, volume = 0.15) {
    this.stopBgmBed();
    try {
      this.isBgmPlaying = true;
      if (!this.customAudioEl) {
        this.customAudioEl = new Audio();
        this.customAudioEl.loop = true;
      }
      this.customAudioEl.src = url;
      this.customAudioEl.volume = Math.max(0, Math.min(1, volume));
      this.customAudioEl.currentTime = 0;
      this.customAudioEl.play().catch((e) => console.warn('Custom BGM play error:', e));
    } catch (e) {
      console.warn('Could not start custom audio:', e);
    }
  }

  setBgmVolume(volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    if (this.customAudioEl) {
      this.customAudioEl.volume = clamped;
    }
    if (this.liveBedGain && this.ctx) {
      this.liveBedGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
    }
  }

  get isPlayingBgm(): boolean {
    return this.isBgmPlaying;
  }
}

export const soundEngine = new CommercialAudioEngine();
