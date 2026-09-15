import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Volume2,
  VolumeX,
  Sparkles,
  Music,
  Share2,
  Check,
  Radio,
  Sliders,
} from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';

interface AudioVisualizerProps {
  audioUrl: string;
  duration: number;
  script: string;
  voiceName: string;
  style: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioUrl,
  duration,
  script,
  voiceName,
  style,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [bgmActive, setBgmActive] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(0.18);
  const [copied, setCopied] = useState(false);

  // Initialize and track audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setTotalDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (bgmActive) {
        soundEngine.stopBgmBed();
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      if (soundEngine.isPlayingBgm) {
        soundEngine.stopBgmBed();
      }
    };
  }, [audioUrl, bgmActive]);

  // Handle Play / Pause
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (bgmActive) {
        soundEngine.stopBgmBed();
      }
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
        if (bgmActive) {
          soundEngine.startBgmBed(bgmVolume);
        }
      }).catch(err => {
        console.error('Audio play error:', err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        if (bgmActive) {
          soundEngine.startBgmBed(bgmVolume);
        }
      });
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const toggleBgm = () => {
    const next = !bgmActive;
    setBgmActive(next);
    if (next && isPlaying) {
      soundEngine.startBgmBed(bgmVolume);
    } else if (!next) {
      soundEngine.stopBgmBed();
    }
  };

  const handleBgmVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setBgmVolume(val);
    soundEngine.setBgmVolume(val);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render animated waveform canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const barCount = 48;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barWidth = width / barCount - 2;
      const progress = totalDuration > 0 ? currentTime / totalDuration : 0;
      const activeBarLimit = Math.floor(barCount * progress);

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + 2);
        
        // Dynamic height modulation based on index & audio state
        let normalizedHeight = 0.2 + 0.6 * Math.abs(Math.sin((i / 5) + (i % 3)));
        if (isPlaying) {
          const wave = Math.sin((Date.now() / 180) + i * 0.4) * 0.25;
          normalizedHeight = Math.max(0.15, Math.min(0.95, normalizedHeight + wave));
        }

        const barHeight = Math.max(4, normalizedHeight * (height - 10));
        const y = (height - barHeight) / 2;

        if (i <= activeBarLimit) {
          // Played section - deep emerald gradient
          const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
          grad.addColorStop(0, '#047857');
          grad.addColorStop(1, '#065f46');
          ctx.fillStyle = grad;
        } else {
          // Unplayed section
          ctx.fillStyle = '#d6d3d1';
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying, currentTime, totalDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      id="audio-studio-player-card"
      className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-6"
    >
      <audio ref={audioRef} src={audioUrl} preload="auto" />

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <Radio className="w-3 h-3 mr-1 animate-pulse" />
              Commercial Master
            </span>
            <span className="text-xs text-stone-500 font-mono">24kHz Studio Audio</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            Voice: {voiceName} • {style.charAt(0).toUpperCase() + style.slice(1)} Cut
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="copy-commercial-script-btn"
            onClick={handleCopyScript}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? 'Script Copied' : 'Copy Script'}
          </button>
          <a
            id="download-commercial-wav-btn"
            href={audioUrl}
            download="legit-africa-commercial.wav"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Download WAV
          </a>
        </div>
      </div>

      {/* Waveform Visualizer */}
      <div className="bg-stone-50/80 rounded-xl p-4 border border-stone-200">
        <canvas
          ref={canvasRef}
          width={640}
          height={64}
          className="w-full h-16 cursor-pointer"
          onClick={() => togglePlayPause()}
        />

        {/* Scrubber Range */}
        <div className="mt-2 space-y-1">
          <input
            id="audio-scrubber-slider"
            type="range"
            min="0"
            max={totalDuration || 1}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-700"
          />
          <div className="flex justify-between text-xs font-mono text-stone-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>
      </div>

      {/* Primary Player Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            id="restart-commercial-audio-btn"
            onClick={handleRestart}
            title="Restart from beginning"
            className="p-2.5 text-stone-600 hover:text-slate-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="play-pause-commercial-audio-btn"
            onClick={togglePlayPause}
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-md transition-all hover:scale-102 active:scale-98"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>

          <button
            id="mute-commercial-audio-btn"
            onClick={toggleMute}
            className="p-2.5 text-stone-600 hover:text-slate-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-stone-100 rounded-xl p-0.5 text-xs font-medium text-stone-600">
            {[0.9, 1.0, 1.15, 1.25].map((rate) => (
              <button
                key={rate}
                onClick={() => changeSpeed(rate)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  playbackRate === rate
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Commercial Background Bed Controls */}
        <div className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
          <button
            id="toggle-bgm-bed-btn"
            onClick={toggleBgm}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              bgmActive
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            {bgmActive ? 'BGM Bed On' : 'Add BGM Bed'}
          </button>

          {bgmActive && (
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-stone-400" />
              <input
                type="range"
                min="0.05"
                max="0.4"
                step="0.02"
                value={bgmVolume}
                onChange={handleBgmVolume}
                className="w-16 h-1 bg-stone-300 rounded-sm appearance-none cursor-pointer accent-amber-600"
                title="BGM Volume"
              />
            </div>
          )}
        </div>
      </div>

      {/* Commercial Radio Sound Effects Pad */}
      <div className="pt-4 border-t border-stone-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Commercial Sound FX Stings
          </span>
          <span className="text-xs text-stone-400">Click to preview broadcast cues</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => soundEngine.playBrandSting('intro')}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-left transition-colors flex items-center justify-between"
          >
            <span>Opening Marimba</span>
            <span className="text-stone-400 text-[10px]">C5-G5</span>
          </button>
          <button
            onClick={() => soundEngine.playBrandSting('notification')}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-left transition-colors flex items-center justify-between"
          >
            <span>Phone Alert Chime</span>
            <span className="text-stone-400 text-[10px]">Call drop</span>
          </button>
          <button
            onClick={() => soundEngine.playBrandSting('cash')}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-left transition-colors flex items-center justify-between"
          >
            <span>Money Saved Ping</span>
            <span className="text-stone-400 text-[10px]">E6</span>
          </button>
          <button
            onClick={() => soundEngine.playBrandSting('outro')}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-left transition-colors flex items-center justify-between"
          >
            <span>Legit Africa Sting</span>
            <span className="text-stone-400 text-[10px]">F4-C5</span>
          </button>
        </div>
      </div>
    </div>
  );
};
