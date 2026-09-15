// Web Audio Synthesizer for Commercial Audio Background Bed & Sound Effects

class CommercialAudioEngine {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private isBgmPlaying = false;
  private bgmInterval: any = null;

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

  // Start smooth background music bed tailored for video overlay (Lo-Fi or Ambient Pad)
  startBgmBed(volume = 0.14, theme: 'lofi' | 'ambient' | 'radio' = 'lofi') {
    if (this.isBgmPlaying) {
      this.stopBgmBed();
    }
    try {
      const ctx = this.getContext();
      this.isBgmPlaying = true;

      this.bgmGain = ctx.createGain();
      this.bgmGain.gain.setValueAtTime(volume, ctx.currentTime);
      this.bgmGain.connect(ctx.destination);

      if (theme === 'lofi') {
        // Smooth Neo-Soul / Lo-Fi 7th Chords (Dm7 -> G7 -> Cmaj7 -> Am7)
        const lofiChords = [
          [146.83, 220.0, 261.63, 349.23], // Dm7
          [196.0, 246.94, 293.66, 349.23],  // G7
          [130.81, 196.0, 246.94, 329.63], // Cmaj7
          [220.0, 261.63, 329.63, 392.0],  // Am7
        ];

        let step = 0;
        const playLofiStep = () => {
          if (!this.isBgmPlaying || !this.bgmGain) return;
          const now = ctx.currentTime;
          const currentChord = lofiChords[step % lofiChords.length];

          currentChord.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const noteGain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.02);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(900, now); // Warm lo-fi roll-off

            noteGain.gain.setValueAtTime(0.001, now);
            noteGain.gain.linearRampToValueAtTime(0.06, now + 0.15);
            noteGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

            osc.connect(filter);
            filter.connect(noteGain);
            noteGain.connect(this.bgmGain!);

            osc.start(now);
            osc.stop(now + 2.6);
          });

          // Soft lo-fi brush pulse
          const noiseOsc = ctx.createOscillator();
          const noiseGain = ctx.createGain();
          noiseOsc.frequency.setValueAtTime(65, now);
          noiseGain.gain.setValueAtTime(0.05, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          noiseOsc.connect(noiseGain);
          noiseGain.connect(this.bgmGain!);
          noiseOsc.start(now);
          noiseOsc.stop(now + 0.16);

          step++;
        };

        playLofiStep();
        this.bgmInterval = setInterval(playLofiStep, 2600);
      } else if (theme === 'ambient') {
        // Atmospheric pad with subtle slow swell
        const ambientPads = [
          [174.61, 220.0, 329.63], // Fmaj9
          [130.81, 196.0, 293.66], // Cadd9
        ];
        let step = 0;
        const playAmbientStep = () => {
          if (!this.isBgmPlaying || !this.bgmGain) return;
          const now = ctx.currentTime;
          const chord = ambientPads[step % ambientPads.length];

          chord.forEach((freq) => {
            const osc = ctx.createOscillator();
            const noteGain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, now);

            noteGain.gain.setValueAtTime(0.001, now);
            noteGain.gain.linearRampToValueAtTime(0.04, now + 0.8);
            noteGain.gain.exponentialRampToValueAtTime(0.001, now + 3.8);

            osc.connect(filter);
            filter.connect(noteGain);
            noteGain.connect(this.bgmGain!);

            osc.start(now);
            osc.stop(now + 4.0);
          });
          step++;
        };
        playAmbientStep();
        this.bgmInterval = setInterval(playAmbientStep, 4000);
      } else {
        // Harmonious chord progression (Am -> F -> C -> G) with warm filter
        const chords = [
          [220, 261.63, 329.63], // Am
          [174.61, 220, 261.63], // F
          [130.81, 164.81, 196.0], // C
          [196.0, 246.94, 293.66], // G
        ];

        let step = 0;
        const playStep = () => {
          if (!this.isBgmPlaying || !this.bgmGain) return;
          const now = ctx.currentTime;
          const currentChord = chords[step % chords.length];

          currentChord.forEach((freq) => {
            const osc = ctx.createOscillator();
            const noteGain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1200, now);

            noteGain.gain.setValueAtTime(0.001, now);
            noteGain.gain.linearRampToValueAtTime(0.08, now + 0.3);
            noteGain.gain.exponentialRampToValueAtTime(0.001, now + 2.3);

            osc.connect(filter);
            filter.connect(noteGain);
            noteGain.connect(this.bgmGain!);

            osc.start(now);
            osc.stop(now + 2.4);
          });

          step++;
        };

        playStep();
        this.bgmInterval = setInterval(playStep, 2400);
      }
    } catch (e) {
      console.warn('Could not start BGM bed:', e);
    }
  }

  stopBgmBed() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    if (this.bgmGain && this.ctx) {
      try {
        this.bgmGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
        setTimeout(() => {
          this.bgmGain = null;
        }, 450);
      } catch {
        this.bgmGain = null;
      }
    }
  }

  setBgmVolume(volume: number) {
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime);
    }
  }

  get isPlayingBgm(): boolean {
    return this.isBgmPlaying;
  }
}

export const soundEngine = new CommercialAudioEngine();
