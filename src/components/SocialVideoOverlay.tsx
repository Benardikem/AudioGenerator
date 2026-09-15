import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Volume2,
  VolumeX,
  Subtitles,
  Check,
  Video,
  Sparkles,
  Music,
  Share2,
  Film,
  Camera,
  Layers,
  ChevronRight,
  ShieldCheck,
  Star,
  ExternalLink,
} from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';
import {
  generateSubtitleCues,
  exportToSRT,
  exportToVTT,
  downloadFile,
} from '../utils/subtitleGenerator';
import { SubtitleCue, AdvertScene } from '../types';
import { BRAND_COLORS, VIDEO_CONFIG, ADVERT_SCENES } from '../data/advertScenes';

interface SocialVideoOverlayProps {
  audioUrl?: string;
  duration?: number;
  script: string;
  voiceName: string;
  style: string;
  scenes?: AdvertScene[];
  externalSceneIndex?: number;
  onSceneChange?: (idx: number) => void;
  onGenerateAudioClick?: () => void;
}

export const SocialVideoOverlay: React.FC<SocialVideoOverlayProps> = ({
  audioUrl,
  duration,
  script,
  voiceName,
  style,
  scenes,
  externalSceneIndex,
  onSceneChange,
  onGenerateAudioClick,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 32);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(1);

  // Background audio bed
  const [bgmTheme, setBgmTheme] = useState<'off' | 'lofi' | 'ambient'>('ambient');
  const [bgmVolume, setBgmVolume] = useState(0.1);

  // Subtitle burned-in settings
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [subtitleStyle, setSubtitleStyle] = useState<'gold_capsule' | 'star_contrast' | 'sand_card'>('gold_capsule');

  // Video recording / export state
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Compute timed subtitle cues
  const [cues, setCues] = useState<SubtitleCue[]>([]);

  // Active scene list (custom or default)
  const sceneList = scenes && scenes.length === 8 ? scenes : ADVERT_SCENES;

  // Preload scene imagery
  const preloadedImages = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    const imagesToPreload = [
      '/scenes/scene1.jpg',
      '/scenes/scene2.jpg',
      '/scenes/scene3.jpg',
      '/scenes/scene4.jpg',
      '/brand/logo-clean.png',
      '/brand/legitafrica-icon-transparent.png',
    ];

    imagesToPreload.forEach((src) => {
      if (!preloadedImages.current.has(src)) {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          preloadedImages.current.set(src, img);
        };
      }
    });
  }, []);

  useEffect(() => {
    const calculatedCues = generateSubtitleCues(script, totalDuration || duration || 32);
    setCues(calculatedCues);
  }, [script, totalDuration, duration]);

  // Current active scene index (0 through 7)
  const currentSceneIndex = Math.min(
    7,
    Math.max(0, Math.floor((currentTime / (totalDuration || 32)) * 8))
  );
  const activeScene = sceneList[currentSceneIndex] || sceneList[0];

  // Stable references to prevent render loops & canvas tearing
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const totalDurationRef = useRef(totalDuration || 32);
  totalDurationRef.current = totalDuration || 32;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const lastNotifiedSceneRef = useRef<number>(-1);
  const lastExternalSceneRef = useRef<number>(-1);

  // Notify parent of active scene change only when index genuinely changes
  useEffect(() => {
    if (lastNotifiedSceneRef.current !== currentSceneIndex) {
      lastNotifiedSceneRef.current = currentSceneIndex;
      onSceneChange?.(currentSceneIndex);
    }
  }, [currentSceneIndex, onSceneChange]);

  // Current active subtitle text
  const currentCue = cues.find((c) => currentTime >= c.start && currentTime <= c.end);

  // Audio setup
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setTotalDuration(audio.duration);
        totalDurationRef.current = audio.duration;
      }
    };

    const handleTime = () => {
      const t = audio.currentTime;
      currentTimeRef.current = t;
      setCurrentTime(t);
    };

    const handleEnd = () => {
      setIsPlaying(false);
      soundEngine.stopBgmBed();
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
    if (audio && audioUrl) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        soundEngine.stopBgmBed();
      } else {
        audio.play().then(() => {
          setIsPlaying(true);
          if (bgmTheme !== 'off') {
            soundEngine.startBgmBed(bgmTheme, bgmVolume);
          }
        }).catch((e) => console.error('Audio play error:', e));
      }
    } else {
      // Visual preview mode without audio
      setIsPlaying((prev) => !prev);
    }
  };

  const handleSeek = (newTime: number) => {
    const audio = audioRef.current;
    const clamped = Math.max(0, Math.min(newTime, totalDuration || 32));
    if (audio && audioUrl) {
      audio.currentTime = clamped;
    }
    currentTimeRef.current = clamped;
    setCurrentTime(clamped);
    if (!isPlaying) {
      drawSceneToCanvas(clamped);
    }
  };

  const handleJumpToScene = (sceneIndex: number) => {
    const sceneDuration = (totalDuration || 32) / 8;
    handleSeek(sceneIndex * sceneDuration + 0.05);
  };

  // 1080 x 1350 (4:5) Portrait Canvas Drawing Function (zero flicker)
  const drawSceneToCanvas = useCallback((timeToDraw: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = VIDEO_CONFIG.width; // 1080
    const H = VIDEO_CONFIG.height; // 1350
    const time = typeof timeToDraw === 'number' ? timeToDraw : currentTimeRef.current;
    const dur = totalDurationRef.current || 32;
    const progress = dur > 0 ? Math.min(1, Math.max(0, time / dur)) : 0;
    const sceneIndex = Math.min(7, Math.max(0, Math.floor((time / dur) * 8)));
    const currentSceneIndex = sceneIndex;
    const sceneProgress = (progress * 8) % 1; // 0 to 1 inside each scene
    const activeScene = sceneList[sceneIndex] || sceneList[0];

      ctx.clearRect(0, 0, W, H);

      // Helper function to draw image centered and cover
      const drawCoverImage = (img: HTMLImageElement, zoomScale = 1.0, panY = 0) => {
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const targetRatio = W / H;
        let sW, sH, sx, sy;

        if (imgRatio > targetRatio) {
          sH = img.naturalHeight;
          sW = img.naturalHeight * targetRatio;
          sx = (img.naturalWidth - sW) / 2;
          sy = 0;
        } else {
          sW = img.naturalWidth;
          sH = img.naturalWidth / targetRatio;
          sx = 0;
          sy = (img.naturalHeight - sH) / 2;
        }

        const scale = 1.0 + (zoomScale - 1.0) * sceneProgress;
        const dW = W * scale;
        const dH = H * scale;
        const dx = (W - dW) / 2;
        const dy = (H - dH) / 2 + panY;

        ctx.drawImage(img, sx, sy, sW, sH, dx, dy, dW, dH);
      };

      // ----------------------------------------------------
      // SCENE 1: Close-up hand holding phone showing debit alert for ₦45,000
      // ----------------------------------------------------
      if (currentSceneIndex === 0) {
        const img = preloadedImages.current.get('/scenes/scene1.jpg');
        if (img && img.complete) {
          drawCoverImage(img, 1.05);
        } else {
          ctx.fillStyle = BRAND_COLORS.sand;
          ctx.fillRect(0, 0, W, H);
        }

        // Slight dark vignette at edges
        const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
        vig.addColorStop(0, 'rgba(24, 22, 20, 0.15)');
        vig.addColorStop(1, 'rgba(24, 22, 20, 0.7)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);

        // Crisp Floating Debit Alert Card (Authentic Nigerian Mobile Banking Notification)
        const cardW = 780;
        const cardH = 360;
        const cardX = (W - cardW) / 2;
        const cardY = 320;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 20;

        ctx.fillStyle = BRAND_COLORS.cream;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 32);
        ctx.fill();

        ctx.strokeStyle = BRAND_COLORS.borders;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        // Bank header badge
        ctx.fillStyle = BRAND_COLORS.sand;
        ctx.beginPath();
        ctx.roundRect(cardX + 40, cardY + 40, 320, 52, 16);
        ctx.fill();

        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('BANK DEBIT ALERT', cardX + 60, cardY + 74);

        // Transaction Amount (Strict rule: ₦45,000)
        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = '900 68px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('₦45,000.00', cardX + 40, cardY + 180);

        // Transaction details
        ctx.fillStyle = BRAND_COLORS.warmGrey;
        ctx.font = '500 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('Txn: Instant Bank Transfer to Vendor', cardX + 40, cardY + 235);
        ctx.fillText('Status: Successful / Paid Out', cardX + 40, cardY + 280);

        // Subtle gold status tick
        ctx.fillStyle = BRAND_COLORS.gold;
        ctx.beginPath();
        ctx.arc(cardX + cardW - 70, cardY + 70, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = BRAND_COLORS.cream;
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓', cardX + cardW - 70, cardY + 78);
      }

      // ----------------------------------------------------
      // SCENE 2: Smiling young woman trying on well-fitted ankara outfit in tailor's shop
      // ----------------------------------------------------
      else if (currentSceneIndex === 1) {
        const img = preloadedImages.current.get('/scenes/scene2.jpg');
        if (img && img.complete) {
          drawCoverImage(img, 1.06, -10);
        } else {
          ctx.fillStyle = BRAND_COLORS.sand;
          ctx.fillRect(0, 0, W, H);
        }

        // Soft lower third overlay
        const grad = ctx.createLinearGradient(0, H * 0.65, 0, H);
        grad.addColorStop(0, 'rgba(24, 22, 20, 0)');
        grad.addColorStop(1, 'rgba(24, 22, 20, 0.75)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, H * 0.65, W, H * 0.35);

        // Context Badge: Invented Tailor Shop
        ctx.fillStyle = 'rgba(251, 248, 241, 0.92)';
        ctx.beginPath();
        ctx.roundRect(80, 140, 520, 80, 24);
        ctx.fill();
        ctx.strokeStyle = BRAND_COLORS.borders;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Adeola Fashion Atelier', 115, 190);
      }

      // ----------------------------------------------------
      // SCENE 3: Frustrated man staring at phone, calls to seller going unanswered
      // ----------------------------------------------------
      else if (currentSceneIndex === 2) {
        const img = preloadedImages.current.get('/scenes/scene3.jpg');
        if (img && img.complete) {
          drawCoverImage(img, 1.04);
        } else {
          ctx.fillStyle = BRAND_COLORS.sand;
          ctx.fillRect(0, 0, W, H);
        }

        // Vignette
        const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.7);
        vig.addColorStop(0, 'rgba(24, 22, 20, 0.2)');
        vig.addColorStop(1, 'rgba(24, 22, 20, 0.7)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);

        // Unanswered Call Card (Warm grey & Near-black, adhering strictly to no bright red/green)
        const callCardW = 760;
        const callCardH = 260;
        const callCardX = (W - callCardW) / 2;
        const callCardY = 280;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 30;
        ctx.fillStyle = BRAND_COLORS.cream;
        ctx.beginPath();
        ctx.roundRect(callCardX, callCardY, callCardW, callCardH, 28);
        ctx.fill();
        ctx.strokeStyle = BRAND_COLORS.borders;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Seller (Cloth Vendor)', callCardX + 50, callCardY + 90);

        ctx.fillStyle = BRAND_COLORS.warmGrey;
        ctx.font = '500 28px sans-serif';
        ctx.fillText('Outgoing call... No response (3 missed)', callCardX + 50, callCardY + 150);
        ctx.fillText('Paid ₦45,000 · Calls not connecting', callCardX + 50, callCardY + 200);

        // Icon indicator
        ctx.fillStyle = BRAND_COLORS.sand;
        ctx.beginPath();
        ctx.arc(callCardX + callCardW - 75, callCardY + 120, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✕', callCardX + callCardW - 75, callCardY + 130);
      }

      // ----------------------------------------------------
      // SCENE 4: Another person on WhatsApp typing "Is it still available?", about to pay
      // ----------------------------------------------------
      else if (currentSceneIndex === 3) {
        const img = preloadedImages.current.get('/scenes/scene4.jpg');
        if (img && img.complete) {
          drawCoverImage(img, 1.05);
        } else {
          ctx.fillStyle = BRAND_COLORS.sand;
          ctx.fillRect(0, 0, W, H);
        }

        // Dark gradient overlay
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, 'rgba(24, 22, 20, 0.4)');
        grad.addColorStop(0.5, 'rgba(24, 22, 20, 0.2)');
        grad.addColorStop(1, 'rgba(24, 22, 20, 0.7)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Chat Bubble Simulation (Cream & White with near-black text)
        const bubbleW = 680;
        const bubbleX = (W - bubbleW) / 2;

        // Message 1: Buyer asking
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 25;
        ctx.fillStyle = BRAND_COLORS.white;
        ctx.beginPath();
        ctx.roundRect(bubbleX, 320, bubbleW, 140, 24);
        ctx.fill();
        ctx.strokeStyle = BRAND_COLORS.borders;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('"Is it still available?"', bubbleX + 40, 385);
        ctx.fillStyle = BRAND_COLORS.warmGrey;
        ctx.font = '24px sans-serif';
        ctx.fillText('Waiting for account details to pay...', bubbleX + 40, 425);

        // Warning thought bubble: "About to pay the same seller"
        ctx.save();
        ctx.fillStyle = BRAND_COLORS.sand;
        ctx.beginPath();
        ctx.roundRect(bubbleX, 490, bubbleW, 110, 20);
        ctx.fill();
        ctx.strokeStyle = BRAND_COLORS.gold;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText('⚡ Another buyer is about to send money!', bubbleX + 40, 555);
      }

      // ----------------------------------------------------
      // SCENE 5: LegitAfrica logo appears on clean cream background
      // ----------------------------------------------------
      else if (currentSceneIndex === 4) {
        // Strict Brand Main Background: Cream #FBF8F1
        ctx.fillStyle = BRAND_COLORS.cream;
        ctx.fillRect(0, 0, W, H);

        // Subtle sand circular aura
        const aura = ctx.createRadialGradient(W / 2, H * 0.45, 80, W / 2, H * 0.45, W * 0.5);
        aura.addColorStop(0, BRAND_COLORS.sand);
        aura.addColorStop(1, BRAND_COLORS.cream);
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(W / 2, H * 0.45, W * 0.48, 0, Math.PI * 2);
        ctx.fill();

        // Draw Official Wordmark Logo
        const wordmark = preloadedImages.current.get('/brand/logo-clean.png');
        if (wordmark && wordmark.complete) {
          const wmW = 820;
          const wmH = (wmW / wordmark.naturalWidth) * wordmark.naturalHeight;
          ctx.drawImage(wordmark, (W - wmW) / 2, H * 0.38 - wmH / 2, wmW, wmH);
        } else {
          // Clean typography fallback
          ctx.fillStyle = BRAND_COLORS.nearBlack;
          ctx.font = '900 72px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('LEGIT AFRICA', W / 2, H * 0.42);
        }

        // Subtitle line
        ctx.fillStyle = BRAND_COLORS.warmGrey;
        ctx.font = '600 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Tell them wetin you know.', W / 2, H * 0.58);

        // Free platform badge
        ctx.fillStyle = BRAND_COLORS.sand;
        ctx.beginPath();
        ctx.roundRect((W - 360) / 2, H * 0.64, 360, 60, 30);
        ctx.fill();
        ctx.strokeStyle = BRAND_COLORS.gold;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText('100% Free For Everyone', W / 2, H * 0.68);
      }

      // ----------------------------------------------------
      // SCENE 6: Phone screen — searching a business name, tapping gold stars, typing a short review
      // ----------------------------------------------------
      else if (currentSceneIndex === 5) {
        // Light sand second background
        ctx.fillStyle = BRAND_COLORS.sand;
        ctx.fillRect(0, 0, W, H);

        // Phone Screen Simulation Card (Cream #FBF8F1)
        const phoneW = 860;
        const phoneH = 920;
        const phoneX = (W - phoneW) / 2;
        const phoneY = 160;

        ctx.save();
        ctx.shadowColor = 'rgba(24, 22, 20, 0.2)';
        ctx.shadowBlur = 40;
        ctx.fillStyle = BRAND_COLORS.cream;
        ctx.beginPath();
        ctx.roundRect(phoneX, phoneY, phoneW, phoneH, 36);
        ctx.fill();
        ctx.strokeStyle = BRAND_COLORS.borders;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        // Phone Top Search Bar (White with gold border)
        const searchY = phoneY + 60;
        ctx.fillStyle = BRAND_COLORS.white;
        ctx.beginPath();
        ctx.roundRect(phoneX + 50, searchY, phoneW - 100, 90, 24);
        ctx.fill();
        ctx.strokeStyle = BRAND_COLORS.gold;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = '600 32px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🔍  Search business name...', phoneX + 90, searchY + 56);

        // Invented business name search result: "Adeola Stitches"
        const resultY = searchY + 130;
        ctx.fillStyle = BRAND_COLORS.white;
        ctx.beginPath();
        ctx.roundRect(phoneX + 50, resultY, phoneW - 100, 480, 24);
        ctx.fill();
        ctx.strokeStyle = BRAND_COLORS.borders;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Business Name (Invented only)
        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('Adeola Stitches & Tailoring', phoneX + 90, resultY + 65);

        // 5 Gold Stars (Star gold #F5B301)
        ctx.fillStyle = BRAND_COLORS.starGold;
        ctx.font = '48px sans-serif';
        ctx.fillText('★ ★ ★ ★ ★', phoneX + 90, resultY + 135);

        // Tap rating instruction
        ctx.fillStyle = BRAND_COLORS.warmGrey;
        ctx.font = '500 24px sans-serif';
        ctx.fillText('Tap gold stars to rate your real experience', phoneX + 90, resultY + 180);

        // Typing honest review box
        const textY = resultY + 220;
        ctx.fillStyle = BRAND_COLORS.cream;
        ctx.beginPath();
        ctx.roundRect(phoneX + 90, textY, phoneW - 180, 200, 16);
        ctx.fill();
        ctx.strokeStyle = BRAND_COLORS.borders;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = '28px sans-serif';
        ctx.fillText('"Cloth was ready on time. Fit well!"', phoneX + 120, textY + 60);
        ctx.fillStyle = BRAND_COLORS.warmGrey;
        ctx.font = 'italic 24px sans-serif';
        ctx.fillText('Yarn wetin happen. Good or bad.', phoneX + 120, textY + 110);
      }

      // ----------------------------------------------------
      // SCENE 7: Review sitting on the business page with a gold tick beside it
      // ----------------------------------------------------
      else if (currentSceneIndex === 6) {
        // Main Cream Background
        ctx.fillStyle = BRAND_COLORS.cream;
        ctx.fillRect(0, 0, W, H);

        const cardW = 860;
        const cardH = 680;
        const cardX = (W - cardW) / 2;
        const cardY = 220;

        ctx.save();
        ctx.shadowColor = 'rgba(24, 22, 20, 0.18)';
        ctx.shadowBlur = 35;
        ctx.fillStyle = BRAND_COLORS.white;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 32);
        ctx.fill();
        ctx.strokeStyle = BRAND_COLORS.borders;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        // Gold Tick Badge Header
        ctx.fillStyle = BRAND_COLORS.sand;
        ctx.beginPath();
        ctx.roundRect(cardX + 50, cardY + 50, cardW - 100, 100, 20);
        ctx.fill();

        // Gold Tick Icon
        ctx.fillStyle = BRAND_COLORS.gold;
        ctx.beginPath();
        ctx.arc(cardX + 110, cardY + 100, 30, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = BRAND_COLORS.white;
        ctx.font = 'bold 34px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓', cardX + 110, cardY + 112);

        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Verified Honest Review', cardX + 160, cardY + 110);

        // Published Review Text on Business Page
        ctx.fillStyle = BRAND_COLORS.starGold;
        ctx.font = '40px sans-serif';
        ctx.fillText('★ ★ ★ ★ ★', cardX + 60, cardY + 220);

        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('"No business fit pay us to comot honest review."', cardX + 60, cardY + 290);

        ctx.fillStyle = BRAND_COLORS.warmGrey;
        ctx.font = '500 28px sans-serif';
        ctx.fillText('Your review stays permanently on the business page.', cardX + 60, cardY + 360);
        ctx.fillText('Protecting other customers across Africa.', cardX + 60, cardY + 410);

        // Core Guarantee Banner in Darker Gold
        ctx.fillStyle = BRAND_COLORS.cream;
        ctx.beginPath();
        ctx.roundRect(cardX + 50, cardY + 470, cardW - 100, 140, 20);
        ctx.fill();
        ctx.strokeStyle = BRAND_COLORS.gold;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = BRAND_COLORS.darkerGold;
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText('100% UNBIASED & FREE', cardX + 90, cardY + 530);
        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = '26px sans-serif';
        ctx.fillText('No sponsored deletions · No fake ratings', cardX + 90, cardY + 575);
      }

      // ----------------------------------------------------
      // SCENE 8: Official End Card
      // End card: LegitAfrica logo, "legitafrica.com", and underneath:
      // "Trusted businesses · Verified reviews · Always free to read"
      // ----------------------------------------------------
      else {
        // Main Background: Cream #FBF8F1
        ctx.fillStyle = BRAND_COLORS.cream;
        ctx.fillRect(0, 0, W, H);

        // Light sand soft background panel
        const panelW = 920;
        const panelH = 960;
        const panelX = (W - panelW) / 2;
        const panelY = 160;

        ctx.save();
        ctx.shadowColor = 'rgba(24, 22, 20, 0.15)';
        ctx.shadowBlur = 40;
        ctx.fillStyle = BRAND_COLORS.white;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 36);
        ctx.fill();
        ctx.strokeStyle = BRAND_COLORS.borders;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        // LegitAfrica Wordmark Logo
        const wordmark = preloadedImages.current.get('/brand/logo-clean.png');
        if (wordmark && wordmark.complete) {
          const wmW = 740;
          const wmH = (wmW / wordmark.naturalWidth) * wordmark.naturalHeight;
          ctx.drawImage(wordmark, (W - wmW) / 2, panelY + 160 - wmH / 2, wmW, wmH);
        } else {
          ctx.fillStyle = BRAND_COLORS.nearBlack;
          ctx.font = '900 68px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('LEGIT AFRICA', W / 2, panelY + 180);
        }

        // Call to action: "Drop your review"
        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = 'bold 38px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Save person money.', W / 2, panelY + 320);

        // Web Address: "legitafrica.com"
        ctx.fillStyle = BRAND_COLORS.gold;
        ctx.beginPath();
        ctx.roundRect((W - 560) / 2, panelY + 380, 560, 96, 28);
        ctx.fill();

        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = '900 46px sans-serif';
        ctx.fillText('legitafrica.com', W / 2, panelY + 444);

        // "Na free!" badge
        ctx.fillStyle = BRAND_COLORS.darkerGold;
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText('Na free!', W / 2, panelY + 540);

        // Divider
        ctx.strokeStyle = BRAND_COLORS.borders;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(panelX + 80, panelY + 600);
        ctx.lineTo(panelX + panelW - 80, panelY + 600);
        ctx.stroke();

        // Exact Underneath Tagline (Strict Brief Requirement):
        // "Trusted businesses · Verified reviews · Always free to read"
        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText('Trusted businesses  ·  Verified reviews', W / 2, panelY + 680);
        ctx.fillStyle = BRAND_COLORS.warmGrey;
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('Always free to read', W / 2, panelY + 740);

        // Small Kudu seal at bottom
        const kudu = preloadedImages.current.get('/brand/legitafrica-icon-transparent.png');
        if (kudu && kudu.complete) {
          ctx.drawImage(kudu, (W - 70) / 2, panelY + 810, 70, 70);
        }
      }

      // ----------------------------------------------------
      // BURNED-IN SPOKEN CAPTIONS (Near the bottom, strictly adhering to brand colors)
      // ----------------------------------------------------
      if (subtitlesEnabled && currentCue) {
        const text = currentCue.text;
        ctx.save();

        const capY = H - 240;
        ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const textMetrics = ctx.measureText(text);
        const textW = textMetrics.width;
        const boxPadX = 48;
        const boxPadY = 24;
        const boxW = Math.min(W - 120, textW + boxPadX * 2);
        const boxH = 92;
        const boxX = (W - boxW) / 2;

        if (subtitleStyle === 'gold_capsule') {
          // White pill with gold border and near-black text
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 24;
          ctx.fillStyle = BRAND_COLORS.white;
          ctx.beginPath();
          ctx.roundRect(boxX, capY - boxPadY, boxW, boxH, 46);
          ctx.fill();
          ctx.strokeStyle = BRAND_COLORS.gold;
          ctx.lineWidth = 4;
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.fillStyle = BRAND_COLORS.nearBlack;
          ctx.textAlign = 'center';
          ctx.fillText(text, W / 2, capY + 36);
        } else if (subtitleStyle === 'star_contrast') {
          // Darker sand/near-black with Star Gold highlight
          ctx.fillStyle = 'rgba(24, 22, 20, 0.9)';
          ctx.beginPath();
          ctx.roundRect(boxX, capY - boxPadY, boxW, boxH, 20);
          ctx.fill();
          ctx.strokeStyle = BRAND_COLORS.borders;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = BRAND_COLORS.starGold;
          ctx.textAlign = 'center';
          ctx.fillText(text, W / 2, capY + 36);
        } else {
          // Light sand card with near-black text
          ctx.fillStyle = BRAND_COLORS.sand;
          ctx.beginPath();
          ctx.roundRect(boxX, capY - boxPadY, boxW, boxH, 24);
          ctx.fill();
          ctx.strokeStyle = BRAND_COLORS.borders;
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.fillStyle = BRAND_COLORS.nearBlack;
          ctx.textAlign = 'center';
          ctx.fillText(text, W / 2, capY + 36);
        }

        ctx.restore();
      }

      // ----------------------------------------------------
      // TOP BRAND WATERMARK (Official Kudu + Name)
      // ----------------------------------------------------
      ctx.save();
      const kudu = preloadedImages.current.get('/brand/legitafrica-icon-transparent.png');
      if (kudu && kudu.complete) {
        ctx.drawImage(kudu, 60, 60, 64, 64);
      }
      ctx.fillStyle = BRAND_COLORS.nearBlack;
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('LegitAfrica', 140, 102);

      // 4:5 indicator badge
      ctx.fillStyle = 'rgba(244, 238, 226, 0.9)';
      ctx.beginPath();
      ctx.roundRect(W - 240, 60, 180, 52, 16);
      ctx.fill();
      ctx.strokeStyle = BRAND_COLORS.borders;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = BRAND_COLORS.nearBlack;
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('4:5 · 1080×1350', W - 150, 94);
      ctx.restore();

      // Bottom Gold Progress Line
      ctx.fillStyle = 'rgba(24, 22, 20, 0.15)';
      ctx.fillRect(60, H - 24, W - 120, 8);
      ctx.fillStyle = BRAND_COLORS.gold;
      ctx.fillRect(60, H - 24, (W - 120) * progress, 8);
    },
    [sceneList, cues, subtitlesEnabled, subtitleStyle]
  );

  // Render static frame when paused or when time/scene/subtitles change
  useEffect(() => {
    if (!isPlaying) {
      drawSceneToCanvas(currentTime);
    }
  }, [isPlaying, currentTime, drawSceneToCanvas]);

  // Handle external jump request safely without trigger loops
  useEffect(() => {
    if (
      typeof externalSceneIndex === 'number' &&
      externalSceneIndex >= 0 &&
      externalSceneIndex <= 7 &&
      externalSceneIndex !== lastExternalSceneRef.current
    ) {
      lastExternalSceneRef.current = externalSceneIndex;
      lastNotifiedSceneRef.current = externalSceneIndex;
      const sceneDuration = (totalDuration || 32) / 8;
      const targetTime = externalSceneIndex * sceneDuration + 0.05;
      if (audioRef.current && audioUrl) {
        audioRef.current.currentTime = targetTime;
      }
      currentTimeRef.current = targetTime;
      setCurrentTime(targetTime);
      if (!isPlayingRef.current) {
        drawSceneToCanvas(targetTime);
      }
    }
  }, [externalSceneIndex, totalDuration, audioUrl, drawSceneToCanvas]);

  // Smooth animation loop when playing (both audio and visual-only preview)
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      let nextTime: number;
      if (audioRef.current && audioUrl) {
        nextTime = audioRef.current.currentTime;
      } else {
        nextTime = currentTimeRef.current + dt;
        if (nextTime >= (totalDurationRef.current || 32)) {
          nextTime = 0;
          setIsPlaying(false);
        }
      }

      currentTimeRef.current = nextTime;
      setCurrentTime(nextTime);
      drawSceneToCanvas(nextTime);

      if (isPlayingRef.current) {
        animId = requestAnimationFrame(loop);
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, audioUrl, drawSceneToCanvas]);

  // Video Export / Recording (1080x1350 30fps with audio)
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio) return;

    try {
      setIsRecordingVideo(true);
      setRecordingProgress(0);

      // Stop any active play
      audio.pause();
      audio.currentTime = 0;
      setCurrentTime(0);

      // Capture stream from canvas at 30fps
      const stream = canvas.captureStream(30);

      // Route audio into stream if supported
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaElementSource(audio);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.connect(audioCtx.destination);
        dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      } catch (e) {
        console.warn('Audio capture routing warning:', e);
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 6000000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'legit-africa-pidgin-advert-4x5.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsRecordingVideo(false);
      };

      recorder.start();
      await audio.play();
      setIsPlaying(true);

      const checkInterval = setInterval(() => {
        if (audio.ended || audio.currentTime >= (totalDuration || 32)) {
          clearInterval(checkInterval);
          recorder.stop();
          setIsPlaying(false);
        } else {
          setRecordingProgress(Math.round((audio.currentTime / (totalDuration || 32)) * 100));
        }
      }, 300);
    } catch (err) {
      console.error('Video recording failed:', err);
      setIsRecordingVideo(false);
    }
  };

  const handleDownloadSRT = () => {
    const srtContent = exportToSRT(cues);
    downloadFile(srtContent, 'legit-africa-pidgin-advert.srt', 'text/plain');
  };

  return (
    <div className="bg-white rounded-3xl border border-[#EAE3D4] shadow-sm overflow-hidden">
      {/* Hidden Audio Player */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        className="hidden"
      />

      {/* Top Header Bar strictly in LegitAfrica Brand Palette */}
      <div className="bg-[#F4EEE2] border-b border-[#EAE3D4] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FBF8F1] border border-[#EAE3D4] flex items-center justify-center shadow-xs">
            <img
              src="/brand/legitafrica-icon-transparent.png"
              alt="LegitAfrica Kudu"
              className="w-7 h-7 object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#181614]">
                Official 4:5 Social Video Advert Studio
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E8A317] text-[#181614]">
                1080 × 1350 (4:5)
              </span>
            </div>
            <p className="text-xs text-[#6B6256]">
              Nigerian Pidgin Voiceover • 8 Synchronized Scenes • Burned-in Captions
            </p>
          </div>
        </div>

        {/* Action Downloads */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="download-srt-btn"
            type="button"
            onClick={handleDownloadSRT}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#181614] bg-[#FBF8F1] hover:bg-white border border-[#EAE3D4] rounded-xl transition-all cursor-pointer shadow-xs"
            title="Download .SRT subtitles for CapCut, Premiere, InShot"
          >
            <Subtitles className="w-3.5 h-3.5 text-[#E8A317]" />
            Download .SRT
          </button>

          <a
            id="download-voiceover-wav-btn"
            href={audioUrl}
            download="legit-africa-pidgin-voiceover.wav"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#181614] bg-[#E8A317] hover:bg-[#C6860C] rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Download Voice WAV
          </a>

          <button
            id="export-4x5-video-btn"
            type="button"
            onClick={handleExportVideo}
            disabled={isRecordingVideo}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#181614] hover:bg-black rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isRecordingVideo ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin text-[#E8A317]" />
                Recording {recordingProgress}%...
              </>
            ) : (
              <>
                <Film className="w-3.5 h-3.5 text-[#E8A317]" />
                Export 4:5 Video
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Left is 4:5 Portrait Frame, Right is 8 Scene Controller */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: 4:5 Portrait Video Frame */}
        <div className="lg:col-span-5 flex flex-col items-center">
          {/* Quick Scene Selector Buttons */}
          <div className="w-full max-w-[360px] mb-2.5">
            <div className="flex items-center justify-between text-xs text-[#6B6256] mb-1.5 px-0.5">
              <span className="font-bold text-[#181614] flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#E8A317]" />
                Jump to Scene:
              </span>
              <span className="text-[11px] font-bold text-[#E8A317]">
                Scene {currentSceneIndex + 1} of 8
              </span>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((sIdx) => {
                const isActive = currentSceneIndex === sIdx;
                return (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => handleJumpToScene(sIdx)}
                    className={`py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#E8A317] text-[#181614] border-[#E8A317] shadow-xs ring-1 ring-[#E8A317]'
                        : 'bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#181614] border-[#EAE3D4]'
                    }`}
                    title={`Preview Scene ${sIdx + 1}`}
                  >
                    {sIdx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full max-w-[360px] flex items-center justify-between text-xs text-[#6B6256] mb-2 px-1">
            <span className="font-semibold text-[#181614] flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#E8A317]" />
              Exact 4:5 Frame (1080×1350)
            </span>
            <span className="font-mono text-[11px]">
              {Math.floor(currentTime)}s / {Math.floor(totalDuration)}s
            </span>
          </div>

          {/* 4:5 Canvas Stage with Phone Shell */}
          <div
            id="phone-video-frame"
            className="relative w-[300px] h-[375px] sm:w-[360px] sm:h-[450px] bg-[#FBF8F1] rounded-[28px] border-4 border-[#181614] shadow-2xl overflow-hidden flex items-center justify-center cursor-pointer group"
            onClick={togglePlayPause}
          >
            {/* The 1080x1350 Canvas Element */}
            <canvas
              ref={canvasRef}
              width={VIDEO_CONFIG.width}
              height={VIDEO_CONFIG.height}
              className="w-full h-full object-cover"
            />

            {/* Play/Pause Watermark Overlay when paused */}
            {!isPlaying && (
              <div className="absolute inset-0 bg-[#181614]/30 z-20 flex items-center justify-center pointer-events-none transition-opacity">
                <div className="w-14 h-14 rounded-full bg-[#FBF8F1] text-[#181614] flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform border border-[#E8A317]">
                  <Play className="w-7 h-7 ml-1 fill-[#181614]" />
                </div>
              </div>
            )}
          </div>

          {/* Transport Bar Controls */}
          <div className="w-full max-w-[360px] mt-4 space-y-2">
            {/* Scrubber Slider */}
            <input
              type="range"
              min="0"
              max={totalDuration || 32}
              step="0.1"
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#EAE3D4] rounded-lg appearance-none cursor-pointer accent-[#E8A317]"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="w-8 h-8 rounded-lg bg-[#E8A317] hover:bg-[#C6860C] text-[#181614] flex items-center justify-center transition-all cursor-pointer font-bold"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleSeek(0)}
                  className="w-8 h-8 rounded-lg bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#181614] flex items-center justify-center transition-all cursor-pointer"
                  title="Rewind to start"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Subtitles Toggle & Style */}
              <div className="flex items-center gap-1.5 text-xs text-[#6B6256]">
                <button
                  type="button"
                  onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                  className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer border ${
                    subtitlesEnabled
                      ? 'bg-[#181614] text-white border-[#181614]'
                      : 'bg-[#F4EEE2] text-[#6B6256] border-[#EAE3D4]'
                  }`}
                >
                  Burned Captions: {subtitlesEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: 8 Synchronized Scenes & Visual Storyboard */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between border-b border-[#EAE3D4] pb-3">
            <div>
              <h4 className="text-sm font-bold text-[#181614] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#E8A317]" />
                8 Synchronized Storyboard Scenes (30–35s)
              </h4>
              <p className="text-xs text-[#6B6256]">
                Click any scene to jump playback directly to that visual moment.
              </p>
            </div>
            <div className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#F4EEE2] text-[#181614] border border-[#EAE3D4]">
              Active: Scene {currentSceneIndex + 1} of 8
            </div>
          </div>

          {/* List of 8 Scenes */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {ADVERT_SCENES.map((scene, idx) => {
              const isActive = currentSceneIndex === idx;
              return (
                <div
                  key={scene.id}
                  onClick={() => handleJumpToScene(idx)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    isActive
                      ? 'bg-[#FBF8F1] border-[#E8A317] shadow-sm ring-1 ring-[#E8A317]'
                      : 'bg-white hover:bg-[#F4EEE2]/50 border-[#EAE3D4]'
                  }`}
                >
                  {/* Scene Number / Badge */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                      isActive
                        ? 'bg-[#E8A317] text-[#181614]'
                        : 'bg-[#F4EEE2] text-[#6B6256]'
                    }`}
                  >
                    {scene.id}
                  </div>

                  {/* Scene Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-[#181614] truncate">
                        "{scene.voiceLine}"
                      </p>
                      <span className="text-[10px] text-[#6B6256] font-mono shrink-0">
                        {idx * 4}s–{(idx + 1) * 4}s
                      </span>
                    </div>

                    <p className="text-[11px] text-[#6B6256] leading-relaxed">
                      <strong className="text-[#181614]">Visual:</strong> {scene.visualPrompt}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Brand Rules Compliance Checklist */}
          <div className="p-4 bg-[#FBF8F1] rounded-2xl border border-[#EAE3D4] space-y-2">
            <h5 className="text-xs font-bold text-[#181614] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#E8A317]" />
              LegitAfrica Creative Brief Standards
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#6B6256]">
              <div className="flex items-center gap-1.5">
                <span className="text-[#E8A317] font-bold">✓</span>
                Exact 1080 × 1350 (4:5 portrait)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#E8A317] font-bold">✓</span>
                Official Cream `#FBF8F1` & Gold `#E8A317`
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#E8A317] font-bold">✓</span>
                No green, blue, purple, or red colors
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#E8A317] font-bold">✓</span>
                Authentic Nigerian Pidgin voiceover
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#E8A317] font-bold">✓</span>
                No fake stats or review scores
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#E8A317] font-bold">✓</span>
                Official End Card with 3 pillars
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
