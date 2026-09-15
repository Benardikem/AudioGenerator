import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Volume2,
  VolumeX,
  Upload,
  Subtitles,
  FileText,
  Sparkles,
  Music,
  Share2,
  Check,
  Video,
  Smartphone,
  Eye,
  Sliders,
  Scissors,
  MessageSquare,
  Package,
  Search,
  CheckCircle,
} from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';
import {
  generateSubtitleCues,
  exportToSRT,
  exportToVTT,
  downloadFile,
} from '../utils/subtitleGenerator';
import { SubtitleCue } from '../types';

interface SocialVideoOverlayProps {
  audioUrl: string;
  duration: number;
  script: string;
  voiceName: string;
  style: string;
}

type VideoThemeType = 'tailor' | 'chat' | 'delivery' | 'search' | 'custom';
type SubtitleStyleType = 'tiktok' | 'box' | 'minimal' | 'emerald';

export const SocialVideoOverlay: React.FC<SocialVideoOverlayProps> = ({
  audioUrl,
  duration,
  script,
  voiceName,
  style,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(1);

  // Background music state
  const [bgmTheme, setBgmTheme] = useState<'off' | 'lofi' | 'ambient'>('lofi');
  const [bgmVolume, setBgmVolume] = useState(0.12);

  // Video theme & custom video
  const [selectedTheme, setSelectedTheme] = useState<VideoThemeType>('tailor');
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [customVideoName, setCustomVideoName] = useState<string>('');

  // Subtitle settings
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyleType>('tiktok');
  const [subtitlePosition, setSubtitlePosition] = useState<'bottom' | 'center' | 'top'>('bottom');
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Compute timed subtitle cues
  const [cues, setCues] = useState<SubtitleCue[]>([]);

  useEffect(() => {
    const calculatedCues = generateSubtitleCues(script, totalDuration || duration || 25);
    setCues(calculatedCues);
  }, [script, totalDuration, duration]);

  // Current active subtitle text
  const currentCue = cues.find((c) => currentTime >= c.start && currentTime <= c.end);

  // Audio setup
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setTotalDuration(audio.duration);
      }
    };

    const handleTime = () => {
      setCurrentTime(audio.currentTime);
      if (videoRef.current && Math.abs(videoRef.current.currentTime - audio.currentTime) > 0.3) {
        videoRef.current.currentTime = audio.currentTime % (videoRef.current.duration || 10);
      }
    };

    const handleEnd = () => {
      setIsPlaying(false);
      soundEngine.stopBgmBed();
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('timeupdate', handleTime);
    audio.addEventListener('ended', handleEnd);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('timeupdate', handleTime);
      audio.removeEventListener('ended', handleEnd);
      soundEngine.stopBgmBed();
    };
  }, [audioUrl]);

  // Play / Pause Sync
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      soundEngine.stopBgmBed();
      if (videoRef.current) {
        videoRef.current.pause();
      }
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          if (bgmTheme !== 'off') {
            soundEngine.startBgmBed(bgmVolume, bgmTheme === 'ambient' ? 'ambient' : 'lofi');
          }
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        })
        .catch((err) => {
          console.error('Playback error:', err);
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        if (bgmTheme !== 'off') {
          soundEngine.startBgmBed(bgmVolume, bgmTheme === 'ambient' ? 'ambient' : 'lofi');
        }
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(() => {});
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

  const handleBgmChange = (newTheme: 'off' | 'lofi' | 'ambient') => {
    setBgmTheme(newTheme);
    if (newTheme === 'off') {
      soundEngine.stopBgmBed();
    } else if (isPlaying) {
      soundEngine.startBgmBed(bgmVolume, newTheme === 'ambient' ? 'ambient' : 'lofi');
    }
  };

  const handleBgmVolume = (val: number) => {
    setBgmVolume(val);
    soundEngine.setBgmVolume(val);
  };

  // Custom user video upload handler
  const handleCustomVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomVideoUrl(url);
      setCustomVideoName(file.name);
      setSelectedTheme('custom');
      if (videoRef.current) {
        videoRef.current.src = url;
        videoRef.current.load();
      }
    }
  };

  // Canvas-based dynamic background simulation for themes
  useEffect(() => {
    if (selectedTheme === 'custom' && customVideoUrl) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const time = currentTime;
      const tick = Date.now() * 0.001;

      ctx.clearRect(0, 0, w, h);

      if (selectedTheme === 'tailor') {
        // Theme: Tailor sewing workshop
        // Rich warm dark atelier gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#1c1917');
        bgGrad.addColorStop(0.5, '#292524');
        bgGrad.addColorStop(1, '#0c0a09');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Pattern fabric grid
        ctx.strokeStyle = 'rgba(214, 180, 140, 0.08)';
        ctx.lineWidth = 1;
        const spacing = 32;
        for (let x = 0; x < w; x += spacing) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += spacing) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Dynamic measuring tape graphic moving vertically
        const tapeY = ((tick * 40) % (h + 200)) - 100;
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(w * 0.1, tapeY, w * 0.8, 24);
        ctx.fillStyle = '#78350f';
        for (let m = w * 0.1; m < w * 0.9; m += 16) {
          ctx.fillRect(m, tapeY, 2, (m % 32 === 0) ? 14 : 7);
        }

        // Center card with sewing machine motif
        ctx.save();
        ctx.fillStyle = 'rgba(41, 37, 36, 0.7)';
        ctx.beginPath();
        ctx.roundRect(w * 0.12, h * 0.28, w * 0.76, h * 0.38, 20);
        ctx.fill();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Stitching line pulse
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(w * 0.2, h * 0.45);
        ctx.lineTo(w * 0.8, h * 0.45);
        ctx.stroke();
        ctx.setLineDash([]);

        // Text
        ctx.fillStyle = '#fafaf9';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AFRICAN TAILOR & VENDORS', w / 2, h * 0.36);
        ctx.fillStyle = '#a8a29e';
        ctx.font = '12px sans-serif';
        ctx.fillText('Order status & delivery timeline', w / 2, h * 0.40);

        // Stitch icon needle animation
        const needleX = w * 0.2 + ((tick * 100) % (w * 0.6));
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(needleX, h * 0.45, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else if (selectedTheme === 'chat') {
        // Theme: WhatsApp / Chat Screen Simulation
        ctx.fillStyle = '#0b141a';
        ctx.fillRect(0, 0, w, h);

        // Chat header
        ctx.fillStyle = '#1f2c34';
        ctx.fillRect(0, 0, w, 70);
        ctx.fillStyle = '#e9edef';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Vendor / Instagram Seller', 65, 42);
        ctx.fillStyle = '#8696a0';
        ctx.font = '11px sans-serif';
        ctx.fillText('Last seen 3 days ago', 65, 58);

        // Avatar
        ctx.fillStyle = '#00a884';
        ctx.beginPath();
        ctx.arc(36, 42, 18, 0, Math.PI * 2);
        ctx.fill();

        // Chat bubbles
        // Buyer msg 1
        ctx.fillStyle = '#005c4b';
        ctx.beginPath();
        ctx.roundRect(w * 0.3, 110, w * 0.65, 50, 12);
        ctx.fill();
        ctx.fillStyle = '#e9edef';
        ctx.font = '13px sans-serif';
        ctx.fillText('Hello! Please did you send the cloth?', w * 0.33, 135);
        ctx.fillStyle = '#8696a0';
        ctx.font = '10px sans-serif';
        ctx.fillText('10:14 AM  ✓✓', w * 0.82, 150);

        // Buyer msg 2 (Unanswered)
        ctx.fillStyle = '#005c4b';
        ctx.beginPath();
        ctx.roundRect(w * 0.25, 180, w * 0.7, 54, 12);
        ctx.fill();
        ctx.fillStyle = '#e9edef';
        ctx.font = '13px sans-serif';
        ctx.fillText('You are not picking calls...', w * 0.28, 205);
        ctx.fillText('Is everything okay?', w * 0.28, 222);

        // Urgent call banner
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.beginPath();
        ctx.roundRect(w * 0.1, 260, w * 0.8, 60, 14);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.stroke();
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ Missed Voice Call (No response)', w / 2, 295);
      } else if (selectedTheme === 'delivery') {
        // Theme: Delivery & Package Unboxing
        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, 0, w, h);

        // Ambient radial light
        const radial = ctx.createRadialGradient(w / 2, h * 0.45, 20, w / 2, h * 0.45, w * 0.6);
        radial.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
        radial.addColorStop(1, 'transparent');
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, w, h);

        // Package Box Graphic
        ctx.save();
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.roundRect(w * 0.2, h * 0.35, w * 0.6, h * 0.28, 16);
        ctx.fill();

        // Tape on box
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(w * 0.2, h * 0.47, w * 0.6, 20);

        // Stamp
        ctx.fillStyle = '#92400e';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PARCEL DISPATCH', w / 2, h * 0.42);
        ctx.fillText('CONFIRMED / PAID', w / 2, h * 0.58);
        ctx.restore();
      } else {
        // Theme: Legit Africa Verification Search
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(0, 0, w, h);

        // Search Bar Simulation
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(w * 0.08, 120, w * 0.84, 52, 26);
        ctx.fill();

        ctx.fillStyle = '#065f46';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🔍 Search business name...', w * 0.15, 152);

        // Verified Review Card
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(w * 0.08, 195, w * 0.84, 150, 16);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('Honest Community Reviews', w * 0.14, 230);
        ctx.fillStyle = '#059669';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('★ ★ ★ ★ ★  Verified Buyer Experience', w * 0.14, 255);

        ctx.fillStyle = '#475569';
        ctx.font = '12px sans-serif';
        ctx.fillText('"No business can pay to remove', w * 0.14, 285);
        ctx.fillText('an honest review."', w * 0.14, 305);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [selectedTheme, customVideoUrl, currentTime]);

  const handleDownloadSRT = () => {
    const srtContent = exportToSRT(cues);
    downloadFile(srtContent, 'legit-africa-captions.srt', 'text/plain');
  };

  const handleDownloadVTT = () => {
    const vttContent = exportToVTT(cues);
    downloadFile(vttContent, 'legit-africa-captions.vtt', 'text/vtt');
  };

  const handleCopyCaption = () => {
    const captionText = `Before you pay that tailor or seller on WhatsApp / Instagram, check LegitAfrica.com! 🧵📱

"Search the business. Say what happened. Good or bad. No business can pay to remove an honest review."

Save someone's money today. LegitAfrica.com is completely free.

#LegitAfrica #OnlineShoppingAfrica #ConsumerProtection #AfricanTailor #SaveMoney #VendorReview #NigeriaTech #KenyaShopping`;
    navigator.clipboard.writeText(captionText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2200);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2200);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      id="social-video-overlay-studio"
      className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-6"
    >
      <audio ref={audioRef} src={audioUrl} preload="auto" />

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <Smartphone className="w-3.5 h-3.5 mr-1 text-emerald-700" />
              Social Media Video Overlay
            </span>
            <span className="text-xs text-stone-500 font-mono">9:16 Reels / TikTok Audio</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            Voice: {voiceName} • Background Audio for Video Layer
          </h3>
          <p className="text-xs text-stone-500">
            Preview your spoken voiceover sitting beneath social video footage with kinetic animated captions.
          </p>
        </div>

        {/* Action Downloads */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="download-srt-btn"
            onClick={handleDownloadSRT}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            title="Download .SRT subtitles for CapCut, Premiere, InShot"
          >
            <Subtitles className="w-3.5 h-3.5 text-amber-600" />
            Download Subtitles (.SRT)
          </button>
          <a
            id="download-voiceover-wav-btn"
            href={audioUrl}
            download="legit-africa-voiceover.wav"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Download Voice WAV
          </a>
        </div>
      </div>

      {/* Main Grid: Left is 9:16 Video Player Frame, Right is Video Controls & Audio Mix */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* 9:16 Vertical Video Player Simulation */}
        <div className="md:col-span-5 flex flex-col items-center">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-emerald-700" />
            Social Video Simulator (9:16)
          </div>

          <div
            id="phone-video-frame"
            className="relative w-64 h-[450px] sm:w-72 sm:h-[500px] bg-black rounded-[36px] border-4 border-stone-800 shadow-2xl overflow-hidden flex items-center justify-center cursor-pointer group"
            onClick={togglePlayPause}
          >
            {/* Phone Notch */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4 bg-stone-900 rounded-full z-30 pointer-events-none" />

            {/* Video / Canvas Layer */}
            {selectedTheme === 'custom' && customVideoUrl ? (
              <video
                ref={videoRef}
                src={customVideoUrl}
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <canvas
                ref={canvasRef}
                width={360}
                height={640}
                className="w-full h-full object-cover"
              />
            )}

            {/* Dark overlay for contrast */}
            <div className="absolute inset-0 bg-black/25 pointer-events-none" />

            {/* Live Kinetic Animated Subtitles Overlay */}
            {subtitlesEnabled && currentCue && (
              <div
                className={`absolute px-4 w-full text-center z-20 pointer-events-none transition-all duration-150 ${
                  subtitlePosition === 'top'
                    ? 'top-14'
                    : subtitlePosition === 'center'
                    ? 'top-1/2 -translate-y-1/2'
                    : 'bottom-16'
                }`}
              >
                {subtitleStyle === 'tiktok' ? (
                  <span className="inline-block px-3 py-1.5 font-black text-amber-300 text-base sm:text-lg uppercase tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] bg-black/40 rounded-lg">
                    {currentCue.text}
                  </span>
                ) : subtitleStyle === 'box' ? (
                  <span className="inline-block px-3 py-1 bg-stone-900/85 text-white font-bold text-xs sm:text-sm rounded-md shadow-md">
                    {currentCue.text}
                  </span>
                ) : subtitleStyle === 'emerald' ? (
                  <span className="inline-block px-3 py-1 bg-emerald-900/90 text-amber-300 font-bold text-xs sm:text-sm rounded-lg border border-emerald-500 shadow-md">
                    {currentCue.text}
                  </span>
                ) : (
                  <span className="font-semibold text-white text-xs sm:text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    {currentCue.text}
                  </span>
                )}
              </div>
            )}

            {/* Social UI Overlay (Watermark & Profile Mockup) */}
            <div className="absolute top-10 left-4 z-20 pointer-events-none flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center border border-white/50">
                LA
              </div>
              <div className="text-white text-xs font-semibold drop-shadow-md">
                @legitafrica.official
              </div>
            </div>

            {/* Play/Pause Watermark when paused */}
            {!isPlaying && (
              <div className="absolute inset-0 bg-black/40 z-25 flex items-center justify-center pointer-events-none">
                <div className="w-14 h-14 rounded-full bg-white/90 text-emerald-900 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                  <Play className="w-7 h-7 ml-1" />
                </div>
              </div>
            )}

            {/* Bottom Floating Progress Line */}
            <div className="absolute bottom-1.5 left-6 right-6 h-1 bg-white/20 rounded-full z-20 overflow-hidden pointer-events-none">
              <div
                className="h-full bg-emerald-400 transition-all duration-100"
                style={{
                  width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Social Media Video Controls & Audio Mix */}
        <div className="md:col-span-7 space-y-5">
          {/* Video Scene Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-emerald-700" />
                Select Video Footage Theme (B-Roll)
              </label>
              <label
                htmlFor="custom-video-input"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer flex items-center gap-1"
              >
                <Upload className="w-3 h-3" />
                {customVideoName ? 'Replace Video' : 'Upload Your Video'}
              </label>
              <input
                id="custom-video-input"
                type="file"
                accept="video/*"
                onChange={handleCustomVideoUpload}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSelectedTheme('tailor')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedTheme === 'tailor'
                    ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold ring-1 ring-amber-500'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-slate-700'
                }`}
              >
                <Scissors className="w-4 h-4 mb-1 text-amber-600" />
                <div className="text-xs font-bold">African Tailor</div>
                <div className="text-[10px] text-stone-500">Fabric & sewing machine</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTheme('chat')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedTheme === 'chat'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold ring-1 ring-emerald-600'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-slate-700'
                }`}
              >
                <MessageSquare className="w-4 h-4 mb-1 text-emerald-600" />
                <div className="text-xs font-bold">WhatsApp Chat</div>
                <div className="text-[10px] text-stone-500">Unanswered call dilemma</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTheme('delivery')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedTheme === 'delivery'
                    ? 'bg-blue-50 border-blue-600 text-blue-950 font-bold ring-1 ring-blue-600'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-slate-700'
                }`}
              >
                <Package className="w-4 h-4 mb-1 text-blue-600" />
                <div className="text-xs font-bold">Parcel Dispatch</div>
                <div className="text-[10px] text-stone-500">Delivery verification</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTheme('search')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedTheme === 'search'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold ring-1 ring-emerald-600'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-slate-700'
                }`}
              >
                <Search className="w-4 h-4 mb-1 text-emerald-700" />
                <div className="text-xs font-bold">Legit Africa Search</div>
                <div className="text-[10px] text-stone-500">Honest review look-up</div>
              </button>
            </div>

            {customVideoName && selectedTheme === 'custom' && (
              <div className="mt-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg flex items-center justify-between">
                <span>Custom Video Loaded: <strong>{customVideoName}</strong></span>
                <button
                  onClick={() => setSelectedTheme('tailor')}
                  className="text-stone-500 hover:text-red-600 underline ml-2"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Subtitle & Caption Customizer */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <Subtitles className="w-3.5 h-3.5 text-amber-600" />
                Video Captions Overlay
              </label>
              <button
                onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                className={`text-xs px-2.5 py-0.5 rounded-md font-semibold ${
                  subtitlesEnabled
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                {subtitlesEnabled ? 'Captions ON' : 'Captions OFF'}
              </button>
            </div>

            {subtitlesEnabled && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">Style:</span>
                  <div className="flex gap-1 text-xs">
                    <button
                      onClick={() => setSubtitleStyle('tiktok')}
                      className={`px-2 py-1 rounded-md font-bold transition-colors ${
                        subtitleStyle === 'tiktok'
                          ? 'bg-amber-400 text-black shadow-xs'
                          : 'bg-white border text-stone-600'
                      }`}
                    >
                      TikTok Yellow
                    </button>
                    <button
                      onClick={() => setSubtitleStyle('box')}
                      className={`px-2 py-1 rounded-md font-bold transition-colors ${
                        subtitleStyle === 'box'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white border text-stone-600'
                      }`}
                    >
                      Dark Box
                    </button>
                    <button
                      onClick={() => setSubtitleStyle('emerald')}
                      className={`px-2 py-1 rounded-md font-bold transition-colors ${
                        subtitleStyle === 'emerald'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-white border text-stone-600'
                      }`}
                    >
                      Legit Brand
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <span className="text-stone-500">Position:</span>
                  {(['bottom', 'center', 'top'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setSubtitlePosition(pos)}
                      className={`px-2 py-0.5 rounded-md capitalize ${
                        subtitlePosition === pos
                          ? 'bg-stone-700 text-white font-semibold'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Audio Background Music Bed Settings */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-blue-600" />
                Background Music Layer
              </label>
              <span className="text-xs text-stone-400">Sit under the voiceover</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleBgmChange('off')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    bgmTheme === 'off'
                      ? 'bg-stone-800 text-white shadow-xs'
                      : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Pure Voice (Solo)
                </button>
                <button
                  type="button"
                  onClick={() => handleBgmChange('lofi')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    bgmTheme === 'lofi'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Lo-Fi Chill Beat
                </button>
                <button
                  type="button"
                  onClick={() => handleBgmChange('ambient')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    bgmTheme === 'ambient'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Cinematic Pad
                </button>
              </div>

              {bgmTheme !== 'off' && (
                <div className="flex items-center gap-2">
                  <Sliders className="w-3 h-3 text-stone-400" />
                  <span className="text-xs text-stone-500 font-mono">
                    {Math.round(bgmVolume * 100)}%
                  </span>
                  <input
                    type="range"
                    min="0.02"
                    max="0.30"
                    step="0.01"
                    value={bgmVolume}
                    onChange={(e) => handleBgmVolume(parseFloat(e.target.value))}
                    className="w-20 h-1.5 bg-stone-300 rounded-lg appearance-none cursor-pointer accent-emerald-700"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Primary Playback Bar */}
          <div className="bg-stone-100/70 p-3.5 rounded-xl border border-stone-200 space-y-2">
            <input
              type="range"
              min="0"
              max={totalDuration || 1}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-stone-300 rounded-lg appearance-none cursor-pointer accent-emerald-700"
            />
            <div className="flex items-center justify-between text-xs font-mono text-stone-600">
              <span>{formatTime(currentTime)}</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRestart}
                  className="p-1.5 hover:text-slate-900 bg-white border rounded-lg transition-colors"
                  title="Restart"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={togglePlayPause}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? 'Pause' : 'Play Video & Audio'}</span>
                </button>
                <button
                  onClick={toggleMute}
                  className="p-1.5 hover:text-slate-900 bg-white border rounded-lg transition-colors"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span>{formatTime(totalDuration)}</span>
            </div>
          </div>

          {/* Copy Video Tools */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
            <button
              onClick={handleCopyCaption}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            >
              {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              {copiedCaption ? 'Social Caption Copied!' : 'Copy Reels/TikTok Caption'}
            </button>

            <button
              onClick={handleCopyScript}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-slate-900 transition-colors"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileText className="w-3.5 h-3.5" />}
              {copiedScript ? 'Script Copied' : 'Copy Script Text'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
