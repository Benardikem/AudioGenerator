import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { sceneTimeline, sceneIndexAt, isBrandType, clipFrameAt, ClipFit } from '../utils/sceneTimeline';

/** The star row for a scene's rating: filled stars up to the rating, hollow ones after it. */
const starRow = (rating?: number) => {
  const filled = Math.max(1, Math.min(5, Math.round(rating ?? 5)));
  return [0, 1, 2, 3, 4].map((i) => (i < filled ? '★' : '☆')).join(' ');
};
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
  X,
  AlertTriangle,
  Zap,
  Upload,
  Smartphone,
  CheckCircle,
} from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';
import {
  generateSubtitleCues,
  exportToSRT,
  exportToVTT,
  downloadFile,
} from '../utils/subtitleGenerator';
import { SubtitleCue, AdvertScene, AspectRatio } from '../types';
import { BRAND_COLORS, VIDEO_CONFIG, VIDEO_CONFIGS, ADVERT_SCENES } from '../data/advertScenes';

interface SocialVideoOverlayProps {
  audioUrl?: string;
  duration?: number;
  script: string;
  voiceName: string;
  style: string;
  scenes?: AdvertScene[];
  externalSceneIndex?: number;
  sceneVersion?: number;
  onSceneChange?: (idx: number) => void;
  onGenerateAudioClick?: () => void;
  isGeneratingAudio?: boolean;
  isScriptOutOfSync?: boolean;
  aspectRatio?: AspectRatio;
  onAspectRatioChange?: (ratio: AspectRatio) => void;
}

export const SocialVideoOverlay: React.FC<SocialVideoOverlayProps> = ({
  audioUrl,
  duration,
  script,
  voiceName,
  style,
  scenes,
  externalSceneIndex,
  sceneVersion,
  onSceneChange,
  onGenerateAudioClick,
  isGeneratingAudio = false,
  isScriptOutOfSync = false,
  aspectRatio = '4:5',
  onAspectRatioChange,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pendingPlayRef = useRef(false);

  const [activeRatio, setActiveRatio] = useState<AspectRatio>(aspectRatio);

  // Sync external aspectRatio prop if changed
  useEffect(() => {
    if (aspectRatio && aspectRatio !== activeRatio) {
      setActiveRatio(aspectRatio);
    }
  }, [aspectRatio]);

  const handleSelectRatio = (ratio: AspectRatio) => {
    setActiveRatio(ratio);
    onAspectRatioChange?.(ratio);
  };

  const currentVideoConfig = VIDEO_CONFIGS[activeRatio] || VIDEO_CONFIGS['4:5'];

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 32);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(1);

  // Background audio bed & Custom BGM uploader
  const [bgmTheme, setBgmTheme] = useState<'off' | 'lofi' | 'ambient' | 'custom'>('ambient');
  const [bgmVolume, setBgmVolume] = useState(0.1);
  const [customBgmUrl, setCustomBgmUrl] = useState<string | null>(null);
  const [customBgmName, setCustomBgmName] = useState<string | null>(null);
  const bgmFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCustomBgmUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const blobUrl = URL.createObjectURL(file);
      setCustomBgmUrl(blobUrl);
      setCustomBgmName(file.name);
      setBgmTheme('custom');
      if (isPlaying) {
        soundEngine.startCustomAudio(blobUrl, bgmVolume);
      }
    } catch (err) {
      console.error('Failed to load custom BGM file:', err);
    }
  };

  // Subtitle burned-in settings
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [subtitleStyle, setSubtitleStyle] = useState<'gold_capsule' | 'star_contrast' | 'sand_card'>('gold_capsule');

  // Director's Scene Visual Action Banner on canvas (off by default for clean commercial output)
  const [showActionOverlay, setShowActionOverlay] = useState(false);

  // Video recording / export state
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordingStatusText, setRecordingStatusText] = useState('');
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [exportedVideoBlob, setExportedVideoBlob] = useState<Blob | null>(null);
  const [exportedMp4Url, setExportedMp4Url] = useState<string | null>(null);
  const [exportedMp4Blob, setExportedMp4Blob] = useState<Blob | null>(null);
  const [isConvertingToMp4, setIsConvertingToMp4] = useState(false);
  const [conversionElapsed, setConversionElapsed] = useState(0);
  const [mp4ConversionError, setMp4ConversionError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const activeRecorderRef = useRef<MediaRecorder | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Compute timed subtitle cues
  const [cues, setCues] = useState<SubtitleCue[]>([]);

  // Active scene list (custom or default)
  const sceneList = scenes && scenes.length > 0 ? scenes : ADVERT_SCENES;

  // Preload scene imagery
  const preloadedImages = useRef<Map<string, HTMLImageElement>>(new Map());

  /**
   * Video clips used as scene backgrounds. One element per clip, kept across redraws: the canvas
   * draws whatever frame the element is showing, so the element is the playhead, not a decoder we
   * poke at. Always muted — the voiceover is the only sound in the advert.
   */
  const preloadedVideos = useRef<Map<string, HTMLVideoElement>>(new Map());
  const activeClipSrc = useRef<string | null>(null);

  const getSceneVideo = (scene: AdvertScene | undefined) => {
    const src = scene?.videoSrc;
    if (!src) return null;
    let video = preloadedVideos.current.get(src);
    if (!video) {
      video = document.createElement('video');
      video.src = src;
      video.muted = true;
      // Looping is decided per scene in syncSceneVideo. Left on, the element would wrap round on
      // its own and fight a scene set to hold its last frame.
      video.loop = false;
      video.playsInline = true;
      video.preload = 'auto';
      const redraw = () => {
        if (!isPlayingRef.current) drawSceneToCanvas(currentTimeRef.current);
      };
      video.onloadeddata = redraw;
      video.onseeked = redraw;
      preloadedVideos.current.set(src, video);
    }
    return video;
  };

  const videoReady = (video: HTMLVideoElement | null): video is HTMLVideoElement =>
    !!video && video.readyState >= 2 && video.videoWidth > 0;

  /**
   * Holds the clip at the point of the scene it is playing under.
   *
   * A five-second clip under a seven-second line has to fill the gap somehow, and which way looks
   * right depends on the shot, so the scene chooses: slow it down to fit (the default — AI footage
   * takes slow motion well and nothing repeats), loop it back to the start, or hold on the last
   * frame. A clip longer than its scene is simply cut off when the scene ends.
   *
   * While the preview is paused the element is parked on the matching frame, so scrubbing shows
   * the moment the playhead is actually on.
   */
  const syncSceneVideo = (
    video: HTMLVideoElement,
    timeIntoScene: number,
    sceneDuration: number,
    fit: ClipFit,
    playing: boolean
  ) => {
    if (!video.duration || !isFinite(video.duration) || video.duration <= 0) return;
    const { rate, time: want, ended } = clipFrameAt(video.duration, timeIntoScene, sceneDuration, fit);
    if (video.playbackRate !== rate) video.playbackRate = rate;
    if (video.loop !== (fit === 'loop')) video.loop = fit === 'loop';

    // Played out and holding: park it on the last frame rather than letting it run to the end
    // again and again.
    if (ended) {
      if (!video.paused) video.pause();
      if (Math.abs(video.currentTime - want) > 0.05) video.currentTime = want;
      return;
    }
    if (playing) {
      if (video.paused) video.play().catch(() => {});
      // Only correct real drift: nudging it every frame would stutter the picture.
      if (Math.abs(video.currentTime - want) > 0.3) video.currentTime = want;
    } else {
      if (!video.paused) video.pause();
      if (Math.abs(video.currentTime - want) > 0.05) video.currentTime = want;
    }
  };

  // Helper to get or dynamically load scene images (supports local files, data URLs, custom uploads)
  const getSceneImage = (scene: AdvertScene | undefined, defaultFallback: string) => {
    const src = scene?.imageSrc || defaultFallback;
    let img = preloadedImages.current.get(src);
    if (!img) {
      img = new Image();
      img.src = src;
      img.onload = () => {
        preloadedImages.current.set(src, img!);
        if (!isPlaying) {
          drawSceneToCanvas(currentTimeRef.current);
        }
      };
      preloadedImages.current.set(src, img);
    }
    return img;
  };

  useEffect(() => {
    const wanted = new Set(sceneList.map((s) => s.videoSrc).filter(Boolean) as string[]);
    preloadedVideos.current.forEach((video, src) => {
      if (wanted.has(src)) return;
      video.pause();
      video.removeAttribute('src');
      video.load();
      preloadedVideos.current.delete(src);
    });
    wanted.forEach((src) => getSceneVideo({ videoSrc: src } as AdvertScene));
  }, [sceneList]);

  useEffect(
    () => () => {
      preloadedVideos.current.forEach((video) => video.pause());
    },
    []
  );

  // Pausing the preview must stop the clips too, or they play on behind a frozen canvas.
  useEffect(() => {
    if (!isPlaying) preloadedVideos.current.forEach((video) => video.pause());
  }, [isPlaying]);

  useEffect(() => {
    const imagesToPreload = [
      ...sceneList.map((s) => s.imageSrc).filter(Boolean) as string[],
      '/scenes/scene1.jpg',
      '/scenes/scene2.jpg',
      '/scenes/scene3.jpg',
      '/scenes/scene3_v2.jpg',
      '/scenes/scene4.jpg',
      '/brand/logo-clean.png',
      '/brand/legitafrica-icon-transparent.png',
    ];

    imagesToPreload.forEach((src) => {
      if (src && !preloadedImages.current.has(src)) {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          preloadedImages.current.set(src, img);
          if (!isPlaying) {
            drawSceneToCanvas(currentTimeRef.current);
          }
        };
        preloadedImages.current.set(src, img);
      }
    });
  }, [sceneList]);

  useEffect(() => {
    const calculatedCues = generateSubtitleCues(script, totalDuration || duration || 32);
    setCues(calculatedCues);
  }, [script, totalDuration, duration]);

  // When each scene starts and ends: proportional to its spoken line, not equal eighths
  const spans = useMemo(() => sceneTimeline(sceneList, totalDuration || 32), [sceneList, totalDuration]);
  const spansRef = useRef(spans);
  spansRef.current = spans;
  const currentSceneIndex = sceneIndexAt(spans, currentTime);
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
      setCurrentTime(0);
      currentTimeRef.current = 0;
      if (!isPlayingRef.current) {
        drawSceneToCanvas(0);
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

  // Keep volume and mute state in direct sync with HTMLAudioElement
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : voiceVolume;
      audioRef.current.muted = isMuted;
    }
  }, [voiceVolume, isMuted]);

  // When audioUrl changes or arrives, reload audio element and trigger pending playback
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audioUrl) {
      audio.load();
      if (pendingPlayRef.current) {
        pendingPlayRef.current = false;
        audio.play().then(() => {
          setIsPlaying(true);
          if (bgmTheme === 'custom' && customBgmUrl) {
            soundEngine.startCustomAudio(customBgmUrl, bgmVolume);
          } else if (bgmTheme !== 'off') {
            soundEngine.startBgmBed(bgmTheme, bgmVolume);
          }
        }).catch((err) => console.warn('Autoplay error:', err));
      }
    }
  }, [audioUrl, bgmTheme, bgmVolume, customBgmUrl]);

  // Play / Pause Sync with bulletproof fallback
  const togglePlayPause = () => {
    const audio = audioRef.current;

    if (isPlaying) {
      if (audio && audioUrl) {
        audio.pause();
      }
      setIsPlaying(false);
      soundEngine.stopBgmBed();
      return;
    }

    // Starting playback
    setIsPlaying(true);

    if (audio && audioUrl) {
      if (audio.ended || audio.currentTime >= (totalDuration || 32) - 0.2) {
        audio.currentTime = 0;
        setCurrentTime(0);
        currentTimeRef.current = 0;
      }
      if (audio.muted && !isMuted) {
        audio.muted = false;
      }
      audio.play().catch((e) => {
        console.warn('Audio play notice (clock fallback active):', e);
      });
    }

    if (bgmTheme === 'custom' && customBgmUrl) {
      soundEngine.startCustomAudio(customBgmUrl, bgmVolume);
    } else if (bgmTheme !== 'off') {
      soundEngine.startBgmBed(bgmTheme, bgmVolume);
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
    handleSeek((spansRef.current[sceneIndex]?.start ?? 0) + 0.05);
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
    const drawSpans = spansRef.current;
    const sceneIndex = Math.min(sceneList.length - 1, sceneIndexAt(drawSpans, time));
    const currentSceneIndex = sceneIndex;
    const span = drawSpans[sceneIndex] || { start: 0, end: dur };
    const sceneProgress = Math.min(1, Math.max(0, (time - span.start) / Math.max(0.001, span.end - span.start))); // 0 to 1 inside each scene
    const activeScene = sceneList[sceneIndex] || sceneList[0];

    const activeVideo = getSceneVideo(activeScene);
    if (activeClipSrc.current !== (activeScene?.videoSrc ?? null)) {
      // Leaving a scene: stop its clip and rewind, so coming back to it starts from the top.
      preloadedVideos.current.forEach((video, src) => {
        if (src === activeScene?.videoSrc) return;
        video.pause();
        if (video.currentTime !== 0) video.currentTime = 0;
      });
      activeClipSrc.current = activeScene?.videoSrc ?? null;
    }
    if (activeVideo) {
      syncSceneVideo(
        activeVideo,
        time - span.start,
        span.end - span.start,
        activeScene?.clipFit ?? 'slow',
        isPlayingRef.current
      );
    }

      ctx.clearRect(0, 0, W, H);

      // Helper function to draw image centered and cover
      const drawCoverImage = (img: HTMLImageElement | HTMLVideoElement, zoomScale = 1.0, panY = 0) => {
        // A clip in 3:4 or 16:9 is cropped to the 4:5 frame from the centre, exactly like a photo.
        const mediaW = (img as HTMLVideoElement).videoWidth || (img as HTMLImageElement).naturalWidth;
        const mediaH = (img as HTMLVideoElement).videoHeight || (img as HTMLImageElement).naturalHeight;
        const imgRatio = mediaW / mediaH;
        const targetRatio = W / H;
        let sW, sH, sx, sy;

        if (imgRatio > targetRatio) {
          sH = mediaH;
          sW = mediaH * targetRatio;
          sx = (mediaW - sW) / 2;
          sy = 0;
        } else {
          sW = mediaW;
          sH = mediaW / targetRatio;
          sx = 0;
          sy = (mediaH - sH) / 2;
        }

        const scale = 1.0 + (zoomScale - 1.0) * sceneProgress;
        const dW = W * scale;
        const dH = H * scale;
        const dx = (W - dW) / 2;
        const dy = (H - dH) / 2 + panY;

        ctx.drawImage(img, sx, sy, sW, sH, dx, dy, dW, dH);
      };

      // Helper function to wrap text neatly for canvas cards
      const wrapCanvasText = (text: string, maxWidth: number): string[] => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = words[0] || '';

        for (let i = 1; i < words.length; i++) {
          const word = words[i];
          const width = ctx.measureText(currentLine + ' ' + word).width;
          if (width < maxWidth) {
            currentLine += ' ' + word;
          } else {
            lines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }
        return lines;
      };

      // ----------------------------------------------------
      // TEXT (FLY-IN): any scene can be a headline card in the style of the "Check before you pay"
      // promo. A label fades in, then each line rises from behind its own edge, one after another.
      // ----------------------------------------------------
      const drawFlyInText = () => {
        const sceneDur = span.end - span.start;
        const t = sceneProgress * sceneDur; // seconds into this scene
        const onPhoto = activeScene.textBackground === 'photo';
        const FONT = '-apple-system, "SF Pro Display", "Helvetica Neue", Inter, Arial, sans-serif';
        const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
        const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 4);
        const setSpacing = (em: number, size: number) => {
          if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${em * size}px`;
        };

        if (onPhoto) {
          const img = getSceneImage(activeScene, '/scenes/scene1.jpg');
          if (videoReady(activeVideo)) drawCoverImage(activeVideo);
          else if (img && img.complete && img.naturalWidth) drawCoverImage(img, 1.04);
          else { ctx.fillStyle = BRAND_COLORS.nearBlack; ctx.fillRect(0, 0, W, H); }
          ctx.fillStyle = 'rgba(24, 22, 20, 0.64)';
          ctx.fillRect(0, 0, W, H);
        } else {
          ctx.fillStyle = BRAND_COLORS.cream;
          ctx.fillRect(0, 0, W, H);
        }
        const ink = onPhoto ? BRAND_COLORS.cream : BRAND_COLORS.nearBlack;
        const muted = onPhoto ? 'rgba(251, 248, 241, 0.78)' : BRAND_COLORS.warmGrey;
        const gold = onPhoto ? BRAND_COLORS.gold : BRAND_COLORS.darkerGold;

        // Words carry a gold flag; *stars* may span several words.
        const source = (activeScene.headline || activeScene.voiceLine || '').split('\n').map((l) => l.trim()).filter(Boolean);
        const rows = source.map((line) => {
          const words: { text: string; gold: boolean }[] = [];
          for (const seg of line.split(/(\*[^*]+\*)/).filter(Boolean)) {
            const isGold = seg.length > 2 && seg.startsWith('*') && seg.endsWith('*');
            for (const w of (isGold ? seg.slice(1, -1) : seg).split(/\s+/).filter(Boolean)) words.push({ text: w, gold: isGold });
          }
          return words;
        });

        // Largest size at which every row fits the width (wrapping long rows) and the block fits.
        const padX = 96;
        const maxW = W - padX * 2;
        let size = 112;
        let lines: { text: string; gold: boolean }[][] = [];
        for (; size >= 52; size -= 4) {
          ctx.font = `800 ${size}px ${FONT}`;
          setSpacing(-0.035, size);
          const space = ctx.measureText(' ').width;
          lines = [];
          for (const words of rows) {
            let cur: typeof words = [];
            let curW = 0;
            for (const w of words) {
              const ww = ctx.measureText(w.text).width;
              if (cur.length && curW + space + ww > maxW) { lines.push(cur); cur = []; curW = 0; }
              curW += (cur.length ? space : 0) + ww;
              cur.push(w);
            }
            if (cur.length) lines.push(cur);
          }
          if (lines.length * size * 1.06 <= H * 0.52 && lines.length <= 6) break;
        }
        const lineH = size * 1.06;
        const eyebrow = (activeScene.eyebrow || '').trim().toUpperCase();
        const eyebrowH = eyebrow ? 30 + 44 : 0;
        const blockH = eyebrowH + lines.length * lineH + 46;
        let y = Math.max(200, (H - blockH) / 2 - 60); // sit a little high, clear of the captions

        if (eyebrow) {
          const p = easeOut((t - 0.12) / 0.5);
          ctx.save();
          ctx.globalAlpha = p;
          ctx.font = `800 30px ${FONT}`;
          setSpacing(0.3, 30);
          ctx.fillStyle = muted;
          ctx.textAlign = 'left';
          ctx.fillText(eyebrow, padX, y + 26 + (1 - p) * 10);
          ctx.restore();
          y += eyebrowH;
        }

        ctx.textAlign = 'left';
        lines.forEach((words, i) => {
          const delay = 0.35 + i * 0.14;
          const p = easeOut((t - delay) / 0.78);
          const top = y + i * lineH;
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, top - size * 0.08, W, lineH + size * 0.16); // the edge each line rises from behind
          ctx.clip();
          ctx.font = `800 ${size}px ${FONT}`;
          setSpacing(-0.035, size);
          const space = ctx.measureText(' ').width;
          let x = padX;
          const baseline = top + size * 0.9 + (1 - p) * lineH * 1.12;
          for (const w of words) {
            ctx.fillStyle = w.gold ? gold : ink;
            ctx.fillText(w.text, x, baseline);
            x += ctx.measureText(w.text).width + space;
          }
          ctx.restore();
        });

        // Gold rule that draws in once the last line has landed.
        const barP = easeOut((t - (0.35 + lines.length * 0.14 + 0.45)) / 0.6);
        if (barP > 0) {
          ctx.fillStyle = BRAND_COLORS.gold;
          ctx.beginPath();
          ctx.roundRect(padX, y + lines.length * lineH + 30, 220 * barP, 10, 5);
          ctx.fill();
        }
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';
      };

      if (activeScene?.type === 'text') {
        drawFlyInText();
      }

      // ----------------------------------------------------
      // PHOTO SCENES: the ad's own photo. Scenes 1-4 These used to draw fixed graphics from the first campaign
      // (a ₦45,000 debit alert, a named tailor shop, a "Seller (Vendor)" call card, a WhatsApp
      // chat) over whatever photo was chosen, so every ad looked like that one. Now each is the
      // photo alone, with a slow zoom and shading that keeps the watermark and captions readable.
      // ----------------------------------------------------
      else if (!isBrandType(activeScene.type)) {
        const fallbacks = ['/scenes/scene1.jpg', '/scenes/scene2.jpg', '/scenes/scene3_v2.jpg', '/scenes/scene4.jpg'];
        const img = getSceneImage(activeScene, fallbacks[currentSceneIndex % fallbacks.length]);
        if (videoReady(activeVideo)) {
          drawCoverImage(activeVideo); // no slow zoom: the footage already moves
        } else if (img && img.complete && img.naturalWidth) {
          drawCoverImage(img, 1.08);
        } else {
          ctx.fillStyle = BRAND_COLORS.sand;
          ctx.fillRect(0, 0, W, H);
        }
        const topShade = ctx.createLinearGradient(0, 0, 0, H * 0.22);
        topShade.addColorStop(0, 'rgba(24, 22, 20, 0.35)');
        topShade.addColorStop(1, 'rgba(24, 22, 20, 0)');
        ctx.fillStyle = topShade;
        ctx.fillRect(0, 0, W, H * 0.22);
        const bottomShade = ctx.createLinearGradient(0, H * 0.55, 0, H);
        bottomShade.addColorStop(0, 'rgba(24, 22, 20, 0)');
        bottomShade.addColorStop(1, 'rgba(24, 22, 20, 0.72)');
        ctx.fillStyle = bottomShade;
        ctx.fillRect(0, H * 0.55, W, H * 0.45);
      }

      // ----------------------------------------------------
      // 'logo' SCENE: Official LegitAfrica Brand Asset Layout (4:5 1080x1350)
      // "Abeg, tell that person wetin you know. For Legit Africa."
      // ----------------------------------------------------
      else if (activeScene.type === 'logo') {
        // Strict Brand Main Background: Cream #FBF8F1
        ctx.fillStyle = BRAND_COLORS.cream;
        ctx.fillRect(0, 0, W, H);

        // Check if user uploaded a custom image for Scene 5
        const isCustomImg =
          activeScene.imageSrc &&
          activeScene.imageSrc !== '/brand/logo-clean.png' &&
          activeScene.imageSrc !== '/brand/legitafrica-icon-transparent.png';

        if (isCustomImg) {
          const custom = getSceneImage(activeScene, '/brand/logo-clean.png');
          if (custom && custom.complete && custom.naturalWidth > 0) {
            drawCoverImage(custom, 1.0);
            return;
          }
        }

        // Elegant warm ambient glow behind central lockup
        const aura = ctx.createRadialGradient(W / 2, 540, 50, W / 2, 540, 480);
        aura.addColorStop(0, 'rgba(232, 163, 23, 0.10)');
        aura.addColorStop(0.6, 'rgba(244, 238, 226, 0.3)');
        aura.addColorStop(1, 'rgba(251, 248, 241, 0)');
        ctx.fillStyle = aura;
        ctx.fillRect(0, 0, W, H);

        // 1. Large Central Branding Lockup: Gold Kudu Antelope Head Silhouette
        const kudu = preloadedImages.current.get('/brand/legitafrica-icon-transparent.png');
        if (kudu && kudu.complete && kudu.naturalWidth > 0) {
          const kuduW = 200;
          const kuduH = (kuduW / kudu.naturalWidth) * kudu.naturalHeight;
          ctx.drawImage(kudu, (W - kuduW) / 2, 280, kuduW, kuduH);
        }

        // 2. Bold Typography: "LEGIT AFRICA" Wordmark
        const wordmark = preloadedImages.current.get('/brand/logo-clean.png');
        if (wordmark && wordmark.complete && wordmark.naturalWidth > 0) {
          const wmW = 740;
          const wmH = (wmW / wordmark.naturalWidth) * wordmark.naturalHeight;
          ctx.drawImage(wordmark, (W - wmW) / 2, 495, wmW, wmH);
        } else {
          ctx.fillStyle = BRAND_COLORS.nearBlack;
          ctx.font = '900 68px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('LEGITAFRICA', W / 2, 560);
        }

        // 3. Sub-Headline Tagline: "REVIEWS YOU CAN TRUST"
        ctx.fillStyle = BRAND_COLORS.gold;
        ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('R E V I E W S   Y O U   C A N   T R U S T', W / 2, 670);

        // 4. Exact Slogan Text: "Tell them wetin you know." in dark charcoal gray sans-serif
        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = '600 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Tell them wetin you know.', W / 2, 755);

        // 5. [NEW BUTTON & TEXT LOOK]: Highly professional modern pill-shaped button
        // Solidly filled with vibrant, premium gold color (strictly NO outline)
        const btnW = 540;
        const btnH = 82;
        const btnX = (W - btnW) / 2;
        const btnY = 825;
        const btnRadius = 41;

        ctx.save();
        ctx.shadowColor = 'rgba(232, 163, 23, 0.45)';
        ctx.shadowBlur = 28;
        ctx.shadowOffsetY = 10;
        ctx.fillStyle = '#E8A317'; // Solid vibrant premium gold
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, btnRadius);
        ctx.fill(); // Solid fill ONLY — no stroke or outline
        ctx.restore();

        // Button Text: "100% Free For Everyone" in crisp clean white bold geometric capital letters with elegant wide letter-spacing
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('100% FREE FOR EVERYONE', W / 2, btnY + btnH / 2);
        ctx.restore();
      }

      // ----------------------------------------------------
      // 'ui_search' SCENE: Phone screen — searching a business name, tapping gold stars, typing a short review
      // ----------------------------------------------------
      else if (activeScene.type === 'ui_search') {
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
        ctx.fillText(`🔍  ${activeScene.screenText?.query || 'Search business name...'}`, phoneX + 90, searchY + 56);

        // The business this advert is about, named by whoever made it
        const resultY = searchY + 130;
        ctx.fillStyle = BRAND_COLORS.white;
        ctx.beginPath();
        ctx.roundRect(phoneX + 50, resultY, phoneW - 100, 480, 24);
        ctx.fill();
        ctx.strokeStyle = BRAND_COLORS.borders;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = BRAND_COLORS.nearBlack;
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(activeScene.screenText?.business || '*** Properties Ltd', phoneX + 90, resultY + 65);

        // 5 Gold Stars (Star gold #F5B301)
        ctx.fillStyle = BRAND_COLORS.starGold;
        ctx.font = '48px sans-serif';
        ctx.fillText(starRow(activeScene.rating), phoneX + 90, resultY + 135);

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
        ctx.fillText(activeScene.screenText?.quote || '"Dem do am as dem talk. Correct."', phoneX + 120, textY + 60);
        ctx.fillStyle = BRAND_COLORS.warmGrey;
        ctx.font = 'italic 24px sans-serif';
        ctx.fillText('Yarn wetin happen. Good or bad.', phoneX + 120, textY + 110);
      }

      // ----------------------------------------------------
      // 'ui_review' SCENE: Official Brand Asset Layout (4:5 1080x1350)
      // "No business fit pay us to comot honest review."
      // ----------------------------------------------------
      else if (activeScene.type === 'ui_review') {
        // Retain the off-white/cream background color (#FBF8F1)
        ctx.fillStyle = BRAND_COLORS.cream;
        ctx.fillRect(0, 0, W, H);

        // Check if user provided an uploaded custom image for Scene 7
        const isCustomImg =
          activeScene.imageSrc &&
          activeScene.imageSrc !== '/brand/logo-clean.png' &&
          activeScene.imageSrc !== '/brand/legitafrica-icon-transparent.png';

        if (isCustomImg) {
          const custom = getSceneImage(activeScene, '/brand/legitafrica-icon-transparent.png');
          if (custom && custom.complete && custom.naturalWidth > 0) {
            drawCoverImage(custom, 1.0);
            return;
          }
        }

        // Subtle ambient radial glow behind central card
        const glow = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 500);
        glow.addColorStop(0, 'rgba(232, 163, 23, 0.08)');
        glow.addColorStop(0.6, 'rgba(244, 238, 226, 0.35)');
        glow.addColorStop(1, 'rgba(251, 248, 241, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);

        // [CENTRAL CARD INTERFACE]:
        // Centered in the middle of the frame, prominent, crisp white rounded rectangle card
        // with a soft, clean drop shadow separating it from the cream background.
        // Generous internal padding so text elements do not touch or spill over the edges.
        const cardW = 900;
        const cardH = 800;
        const cardX = (W - cardW) / 2;
        const cardY = (H - cardH) / 2; // 275 - perfectly centered in 1350h

        ctx.save();
        ctx.shadowColor = 'rgba(24, 22, 20, 0.12)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 16;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 32);
        ctx.fill();
        ctx.restore();

        // Subtle crisp hairline card border
        ctx.strokeStyle = '#EAE3D4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 32);
        ctx.stroke();

        // Verified Badge Area:
        // Inside top of white card, wide, light-beige pill banner
        // Left: solid gold circular checkmark icon, followed by "Verified Honest Review" in bold clean charcoal sans-serif
        const badgeW = 540;
        const badgeH = 68;
        const badgeX = (W - badgeW) / 2;
        const badgeY = cardY + 48;
        const badgeRadius = 34;

        ctx.fillStyle = '#F4EEE2'; // Light-beige / sand
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeRadius);
        ctx.fill();

        // Solid gold circular checkmark icon
        const iconRadius = 20;
        const iconCenterY = badgeY + badgeH / 2;
        const iconCenterX = badgeX + 38;

        ctx.fillStyle = '#E8A317'; // Solid gold
        ctx.beginPath();
        ctx.arc(iconCenterX, iconCenterY, iconRadius, 0, Math.PI * 2);
        ctx.fill();

        // Checkmark symbol ✓ in white
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', iconCenterX, iconCenterY + 1);

        // "Verified Honest Review" in bold clean charcoal sans-serif
        ctx.fillStyle = '#181614';
        ctx.font = 'bold 25px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Verified Honest Review', iconCenterX + 32, iconCenterY);

        // Star Ratings:
        // Directly below badge banner, horizontal row of five perfectly aligned, sharp gold five-point stars
        const starsY = badgeY + badgeH + 42;
        ctx.fillStyle = '#F5B301'; // Vibrant star gold
        ctx.font = '38px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(starRow(activeScene.rating), W / 2, starsY);

        // [FIXED INTERIOR TEXT & OVERFLOW PREVENTION]:
        // Main Headline Layout: Prominent quote: "No business fit pay us to comot honest review."
        // Highly modern, medium-bold charcoal geometric sans-serif font.
        // Scaled down to fit cleanly inside card width, automatically wrapped perfectly into two clean balanced lines
        // with generous breathing room on left and right margins.
        const rawQuote = (activeScene.voiceLine?.trim() || 'No business fit pay us to comot honest review.').replace(/^["']|["']$/g, '');
        const quoteWords = rawQuote.split(' ');
        let headlineLine1 = '';
        let headlineLine2 = '';
        if (quoteWords.length <= 4) {
          headlineLine1 = `"${rawQuote}"`;
        } else {
          const splitIdx = Math.ceil(quoteWords.length / 2);
          headlineLine1 = `"${quoteWords.slice(0, splitIdx).join(' ')}`;
          headlineLine2 = `${quoteWords.slice(splitIdx).join(' ')}"`;
        }
        const headlineY1 = starsY + 54;
        const headlineY2 = headlineLine2 ? headlineY1 + 46 : headlineY1;

        ctx.fillStyle = '#181614';
        ctx.font = '700 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(headlineLine1, W / 2, headlineY1);
        if (headlineLine2) {
          ctx.fillText(headlineLine2, W / 2, headlineY2);
        }

        // Subtext Paragraphs:
        // Safely underneath wrapped headline in clean, smaller regular-weight gray sans-serif font:
        // "Your review stays permanently on the business page."
        // "Protecting other customers across Africa."
        const subtextY1 = headlineY2 + 50;
        const subtextY2 = subtextY1 + 32;

        ctx.fillStyle = '#6B6256';
        ctx.font = '500 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Your review stays permanently on the business page.', W / 2, subtextY1);
        ctx.fillText('Protecting other customers across Africa.', W / 2, subtextY2);

        // [SOLID GOLD BUTTON LOOK]:
        // Near the bottom inside white card, professional modern pill-shaped call-to-action box
        // Solidly filled with vibrant premium gold color (NO outline).
        // First line: "100% UNBIASED & FREE"
        // Subtext: "No sponsored deletions · No fake ratings"
        // Crisp clean white capital letters with elegant wider letter-spacing
        const btnW = 740;
        const btnH = 96;
        const btnX = (W - btnW) / 2;
        const btnY = cardY + cardH - 52 - btnH; // 927
        const btnRadius = 48;

        ctx.save();
        ctx.shadowColor = 'rgba(232, 163, 23, 0.42)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 8;
        ctx.fillStyle = '#E8A317'; // Solid vibrant premium gold — strictly no outline
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, btnRadius);
        ctx.fill();
        ctx.restore();

        // CTA Line 1: "100% UNBIASED & FREE"
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('100% UNBIASED & FREE', W / 2, btnY + 36);

        // CTA Line 2: "No sponsored deletions · No fake ratings"
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No sponsored deletions  ·  No fake ratings', W / 2, btnY + 68);
      }

      // ----------------------------------------------------
      // 'end_card' SCENE (anything left): Official End Card
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

        if (activeScene.disclaimer) {
          ctx.fillStyle = BRAND_COLORS.warmGrey;
          ctx.font = '500 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Dramatisation  ·  Names withheld', W / 2, panelY + 930);
        }
      }

      // ----------------------------------------------------
      // SCENE OVERLAY CARD: a bank alert laid over the picture, in this advert's own words.
      // Slides up and fades in just after the scene starts, then stays put.
      // ----------------------------------------------------
      if (activeScene?.overlay?.kind === 'debit_alert') {
        const o = activeScene.overlay;
        const into = time - span.start;
        // It slides in while the advert plays. Paused — scrubbing, or judging a still frame — it is
        // shown in place, so the scene doesn't look empty at its first moment.
        const appear = isPlayingRef.current ? Math.min(1, Math.max(0, (into - 0.25) / 0.45)) : 1;
        if (appear > 0) {
          const ease = 1 - Math.pow(1 - appear, 3);
          const cardW = 780;
          const cardH = 360;
          const [vertical, horizontal] = (o.position ?? 'middle-center').split('-');
          const margin = 60;
          const cardX =
            horizontal === 'left' ? margin : horizontal === 'right' ? W - cardW - margin : (W - cardW) / 2;
          // The bottom row stops above the captions rather than sitting behind them.
          const restY = vertical === 'top' ? 170 : vertical === 'bottom' ? H - cardH - 290 : 320;
          const cardY = restY + (1 - ease) * 60;

          ctx.save();
          ctx.globalAlpha = ease;

          // Darken the picture behind it, so the card reads whatever the footage is doing
          const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
          vig.addColorStop(0, 'rgba(24, 22, 20, 0.15)');
          vig.addColorStop(1, 'rgba(24, 22, 20, 0.7)');
          ctx.fillStyle = vig;
          ctx.fillRect(0, 0, W, H);

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

          const title = (o.title || 'BANK DEBIT ALERT').toUpperCase();
          ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const badgeW = Math.min(cardW - 160, ctx.measureText(title).width + 40);
          ctx.fillStyle = BRAND_COLORS.sand;
          ctx.beginPath();
          ctx.roundRect(cardX + 40, cardY + 40, badgeW, 52, 16);
          ctx.fill();
          ctx.fillStyle = BRAND_COLORS.nearBlack;
          ctx.textAlign = 'left';
          ctx.fillText(title, cardX + 60, cardY + 74);

          // The amount, shrunk to fit rather than run off the card
          const amount = o.amount || '₦0.00';
          let amountSize = 68;
          ctx.font = `900 ${amountSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          while (ctx.measureText(amount).width > cardW - 80 && amountSize > 34) {
            amountSize -= 4;
            ctx.font = `900 ${amountSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          }
          ctx.fillStyle = BRAND_COLORS.nearBlack;
          ctx.fillText(amount, cardX + 40, cardY + 180);

          ctx.fillStyle = BRAND_COLORS.warmGrey;
          ctx.font = '500 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          if (o.line1) ctx.fillText(o.line1, cardX + 40, cardY + 235);
          if (o.line2) ctx.fillText(o.line2, cardX + 40, cardY + 280);

          ctx.fillStyle = BRAND_COLORS.gold;
          ctx.beginPath();
          ctx.arc(cardX + cardW - 70, cardY + 70, 24, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = BRAND_COLORS.cream;
          ctx.font = 'bold 26px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('✓', cardX + cardW - 70, cardY + 78);
          ctx.restore();
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
      // Adjusted with padding-left: -20px (X: 40) and high-contrast protective pill so the icon is never hidden
      // ----------------------------------------------------
      ctx.save();
      const kudu = preloadedImages.current.get('/brand/legitafrica-icon-transparent.png');
      const brandX = 40; // 60 - 20px padding adjustment
      const brandY = 56;
      const pillW = 260;
      const pillH = 68;

      // Protective high-contrast brand capsule pill ensuring icon and text stay crisp over all photo/dark backgrounds
      ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = 'rgba(251, 248, 241, 0.95)';
      ctx.beginPath();
      ctx.roundRect(brandX, brandY, pillW, pillH, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(232, 163, 23, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Reset shadow for crisp icon & text rendering
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      if (kudu && kudu.complete) {
        ctx.drawImage(kudu, brandX + 10, brandY + 6, 56, 56);
      }
      ctx.fillStyle = BRAND_COLORS.nearBlack;
      ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('LegitAfrica', brandX + 78, brandY + 44);
      ctx.restore();

      // ----------------------------------------------------
      // DIRECTOR'S SCENE VISUAL ACTION BANNER
      // Displays the active scene's Visual Prompt & Action directly on canvas (preview only, never in recording)
      // ----------------------------------------------------
      if (showActionOverlay && !isRecordingVideo) {
        ctx.save();
        const actionBannerY = 135;
        const bannerW = W - 120;
        const bannerX = 60;
        const bannerH = 58;

        ctx.fillStyle = 'rgba(24, 22, 20, 0.9)';
        ctx.beginPath();
        ctx.roundRect(bannerX, actionBannerY, bannerW, bannerH, 16);
        ctx.fill();
        ctx.strokeStyle = BRAND_COLORS.gold;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = BRAND_COLORS.gold;
        ctx.font = 'bold 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`SCENE ${sceneIndex + 1} ACTION:`, bannerX + 24, actionBannerY + 36);

        ctx.fillStyle = BRAND_COLORS.cream;
        ctx.font = '500 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const promptText = activeScene.visualPrompt;
        const maxLen = 58;
        const displayPrompt = promptText.length > maxLen ? promptText.slice(0, maxLen - 3) + '...' : promptText;
        ctx.fillText(displayPrompt, bannerX + 225, actionBannerY + 36);
        ctx.restore();
      }

      // Bottom Gold Progress Line
      ctx.fillStyle = 'rgba(24, 22, 20, 0.15)';
      ctx.fillRect(60, H - 24, W - 120, 8);
      ctx.fillStyle = BRAND_COLORS.gold;
      ctx.fillRect(60, H - 24, (W - 120) * progress, 8);
    },
    [sceneList, cues, subtitlesEnabled, subtitleStyle, showActionOverlay, spans]
  );

  // Render static frame when paused or when time/scene/subtitles change
  useEffect(() => {
    if (!isPlaying) {
      drawSceneToCanvas(currentTime);
    }
  }, [isPlaying, currentTime, drawSceneToCanvas]);

  // Handle external jump request and force-redraw on sceneVersion or scenes updates
  useEffect(() => {
    if (
      typeof externalSceneIndex === 'number' &&
      externalSceneIndex >= 0 &&
      externalSceneIndex < sceneList.length
    ) {
      lastExternalSceneRef.current = externalSceneIndex;
      lastNotifiedSceneRef.current = externalSceneIndex;
      const targetTime = (spansRef.current[externalSceneIndex]?.start ?? 0) + 0.05;
      if (audioRef.current && audioUrl) {
        audioRef.current.currentTime = targetTime;
      }
      currentTimeRef.current = targetTime;
      setCurrentTime(targetTime);
      if (!isPlayingRef.current) {
        drawSceneToCanvas(targetTime);
      }
    } else if (!isPlayingRef.current) {
      drawSceneToCanvas(currentTimeRef.current);
    }
    // Invalidate previously rendered video file so user is aware a new export can be generated
    if (sceneVersion && sceneVersion > 0) {
      setExportedVideoUrl(null);
    }
  }, [externalSceneIndex, sceneVersion, scenes, totalDuration, audioUrl, drawSceneToCanvas]);

  // Smooth animation loop when playing (both audio and visual-only preview)
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      let nextTime: number;
      const audio = audioRef.current;
      const dur = totalDurationRef.current || 32;

      // If audio element is playing and advancing, lock frame-accurately to audio
      if (audio && audioUrl && !audio.paused && audio.currentTime > 0) {
        nextTime = audio.currentTime;
      } else {
        nextTime = currentTimeRef.current + dt;
      }

      if (nextTime >= dur) {
        nextTime = 0;
        if (audio && audioUrl) {
          audio.pause();
          audio.currentTime = 0;
        }
        setIsPlaying(false);
        soundEngine.stopBgmBed();
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

  // Convert WebM canvas capture to social-media-ready MP4 (H.264 / AAC)
  const convertBlobToMp4 = async (webmBlob: Blob): Promise<{ url: string; blob: Blob } | null> => {
    const controller = new AbortController();
    const abortTimeout = setTimeout(() => {
      controller.abort();
    }, 65000);

    let timerInterval: any = null;
    try {
      setIsConvertingToMp4(true);
      setConversionElapsed(0);
      setMp4ConversionError(null);
      setRecordingStatusText('Converting to Social Media MP4 (H.264/AAC for Instagram, TikTok, WhatsApp)...');

      timerInterval = setInterval(() => {
        setConversionElapsed((prev) => prev + 1);
      }, 1000);

      const response = await fetch('/api/convert-to-mp4', {
        method: 'POST',
        headers: {
          'Content-Type': 'video/webm',
        },
        body: webmBlob,
        signal: controller.signal,
      });

      clearTimeout(abortTimeout);
      if (timerInterval) clearInterval(timerInterval);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Server video conversion failed');
      }

      const mp4Blob = await response.blob();
      const mp4Url = URL.createObjectURL(mp4Blob);
      setExportedMp4Blob(mp4Blob);
      setExportedMp4Url(mp4Url);
      return { url: mp4Url, blob: mp4Blob };
    } catch (err: any) {
      clearTimeout(abortTimeout);
      if (timerInterval) clearInterval(timerInterval);
      console.error('MP4 conversion error:', err);
      const isAbort = err.name === 'AbortError';
      const msg = isAbort
        ? 'MP4 encoding took longer than expected. You can download the raw WebM file or click Retry MP4 below.'
        : err.message || 'Failed to convert to MP4';
      setMp4ConversionError(msg);
      return null;
    } finally {
      clearTimeout(abortTimeout);
      if (timerInterval) clearInterval(timerInterval);
      setIsConvertingToMp4(false);
    }
  };

  const handleManualConvertToMp4 = () => {
    if (exportedVideoBlob && !isConvertingToMp4) {
      convertBlobToMp4(exportedVideoBlob).then((res) => {
        if (res) {
          try {
            const a = document.createElement('a');
            a.href = res.url;
            a.download = 'legit-africa-commercial-4x5.mp4';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              try {
                document.body.removeChild(a);
              } catch (_) {}
            }, 3000);
          } catch (_) {}
        }
      });
    }
  };

  // Video Export / Recording (1080x1350 30fps with synchronized audio)
  const handleExportVideo = async () => {
    if (!audioUrl) {
      if (onGenerateAudioClick) {
        pendingPlayRef.current = true;
        onGenerateAudioClick();
      }
      return;
    }

    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio) return;

    try {
      setIsRecordingVideo(true);
      setRecordingProgress(0);
      setRecordingStatusText(`Initializing ${currentVideoConfig.label} (${currentVideoConfig.width}×${currentVideoConfig.height}) canvas & audio stream...`);

      // Stop any active BGM bed to prevent double synth audio
      soundEngine.stopBgmBed();

      // Pause audio and reset to start
      audio.pause();
      audio.currentTime = 0;
      setCurrentTime(0);

      // Save previous speaker mute & volume state, then completely silence physical speakers during recording to eliminate double echo
      const prevMuted = audio.muted;
      const prevVolume = audio.volume;
      audio.muted = true;
      audio.volume = 0;

      // Capture 30fps stream from high-res canvas
      const stream = canvas.captureStream(30);

      // Route audio cleanly into stream using Web Audio destination (STRICTLY into stream, NOT to physical speakers!)
      let audioBufferSource: AudioBufferSourceNode | null = null;
      let bgmBufferSource: AudioBufferSourceNode | null = null;
      let exportAudioCtx: AudioContext | null = null;
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        exportAudioCtx = new AudioCtxClass();
        if (exportAudioCtx.state === 'suspended') {
          await exportAudioCtx.resume();
        }

        const dest = exportAudioCtx.createMediaStreamDestination();

        // 1. Voiceover track
        const resp = await fetch(audioUrl);
        const arrayBuf = await resp.arrayBuffer();
        const decodedBuffer = await exportAudioCtx.decodeAudioData(arrayBuf);

        audioBufferSource = exportAudioCtx.createBufferSource();
        audioBufferSource.buffer = decodedBuffer;
        // Connect ONLY to destination stream (NOT exportAudioCtx.destination) -> prevents echo!
        audioBufferSource.connect(dest);

        // 2. Custom BGM track if active and theme is custom
        if (bgmTheme === 'custom' && customBgmUrl) {
          try {
            const bgmResp = await fetch(customBgmUrl);
            const bgmBuf = await bgmResp.arrayBuffer();
            const decodedBgm = await exportAudioCtx.decodeAudioData(bgmBuf);
            bgmBufferSource = exportAudioCtx.createBufferSource();
            bgmBufferSource.buffer = decodedBgm;
            bgmBufferSource.loop = true;

            const bgmGainNode = exportAudioCtx.createGain();
            bgmGainNode.gain.value = 0.18; // Balanced background level under Pidgin VO
            bgmBufferSource.connect(bgmGainNode);
            bgmGainNode.connect(dest);
          } catch (bgmErr) {
            console.warn('Could not mix custom BGM into video export:', bgmErr);
          }
        }

        dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      } catch (e) {
        console.warn('Audio capture routing note:', e);
      }

      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : '';
      }

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType, videoBitsPerSecond: 6000000 } : undefined
      );
      activeRecorderRef.current = recorder;

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        // Restore physical speaker mute state & volume
        if (audioRef.current) {
          audioRef.current.muted = prevMuted;
          audioRef.current.volume = prevVolume;
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
        setCurrentTime(0);
        currentTimeRef.current = 0;
        drawSceneToCanvas(0);

        try {
          audioBufferSource?.stop();
          exportAudioCtx?.close();
        } catch (_) {}

        const mime = mimeType || 'video/webm';
        const blob = new Blob(chunks, { type: mime });
        const url = URL.createObjectURL(blob);

        setExportedVideoUrl(url);
        setExportedVideoBlob(blob);
        setShowExportModal(true);
        setIsRecordingVideo(false);
        setRecordingProgress(100);

        // Immediately start conversion to broadcast-grade Social Media MP4 (H.264 / AAC)
        setRecordingStatusText('Converting to Social Media MP4 (H.264/AAC)...');
        convertBlobToMp4(blob).then((mp4Res) => {
          if (mp4Res) {
            setRecordingStatusText('Social Media MP4 Ready!');
            // Attempt direct browser download of MP4
            try {
              const a = document.createElement('a');
              a.href = mp4Res.url;
              a.download = 'legit-africa-commercial-4x5.mp4';
              document.body.appendChild(a);
              a.click();
              setTimeout(() => {
                try {
                  document.body.removeChild(a);
                } catch (_) {}
              }, 3000);
            } catch (downloadErr) {
              console.warn('Auto-download was restricted by browser iframe, modal download available:', downloadErr);
            }
          } else {
            setRecordingStatusText('WebM ready (MP4 conversion can be retried in modal)');
          }
        });
      };

      // Start recorder with 250ms chunks to ensure continuous data capture
      recorder.start(250);
      if (audioBufferSource) {
        audioBufferSource.start(0);
      }

      // Audio drives internal animation loop silently
      await audio.play();
      setIsPlaying(true);

      const targetDuration = totalDuration || 32;
      let highestProgress = 0;
      let hasCompleted = false;

      const checkInterval = setInterval(() => {
        if (hasCompleted) return;

        const currentSec = audio.currentTime;
        const pct = Math.min(99, Math.round((currentSec / targetDuration) * 100));
        if (pct > highestProgress) {
          highestProgress = pct;
          setRecordingProgress(highestProgress);
          setRecordingStatusText(`Recording ${currentVideoConfig.label} video: ${highestProgress}% (${currentVideoConfig.width}×${currentVideoConfig.height})`);
        }

        if (audio.ended || currentSec >= targetDuration - 0.25) {
          hasCompleted = true;
          clearInterval(checkInterval);
          setRecordingProgress(100);
          setRecordingStatusText('Finalizing video container & audio tracks...');

          try {
            if (recorder.state === 'recording') {
              recorder.requestData();
              recorder.stop();
            }
          } catch (stopErr) {
            console.error('Error stopping recorder:', stopErr);
            setIsRecordingVideo(false);
          }
        }
      }, 200);
    } catch (err) {
      console.error('Video recording failed:', err);
      setIsRecordingVideo(false);
      if (audioRef.current) {
        audioRef.current.muted = isMuted;
      }
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
                Social Video Advert Studio
              </h3>
              {/* Aspect Ratio Switcher Toggle */}
              <div className="inline-flex p-0.5 rounded-lg bg-[#EAE3D4] border border-[#D8CEBA]">
                {(['4:5', '9:16'] as const).map((ratio) => {
                  const isActive = activeRatio === ratio;
                  return (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => handleSelectRatio(ratio)}
                      className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#E8A317] text-[#181614] shadow-xs'
                          : 'text-[#6B6256] hover:text-[#181614]'
                      }`}
                    >
                      {ratio} {ratio === '4:5' ? '(1080×1350)' : '(1080×1920)'}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-[#6B6256]">
              Nigerian Pidgin Voiceover • {sceneList.length} Synchronized Scenes • Burned-in Captions
            </p>
          </div>
        </div>

        {/* Action Downloads */}
        <div className="flex flex-wrap items-center gap-2">
          {(exportedMp4Url || exportedVideoUrl) && (
            <button
              id="view-exported-video-btn"
              type="button"
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#181614] bg-[#A8D5BA] hover:bg-[#96C7A8] rounded-xl transition-all cursor-pointer shadow-xs"
              title="View and download your exported social video"
            >
              <Check className="w-3.5 h-3.5 text-[#181614]" />
              {exportedMp4Url ? 'Social MP4 Ready' : 'Video Ready (.webm)'}
            </button>
          )}

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
            id="export-social-video-btn"
            type="button"
            onClick={handleExportVideo}
            disabled={isRecordingVideo || isConvertingToMp4}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#181614] hover:bg-black rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title={`Record ${currentVideoConfig.width}x${currentVideoConfig.height} canvas and convert to social-media-ready H.264 MP4`}
          >
            {isRecordingVideo ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin text-[#E8A317]" />
                Recording {recordingProgress}%...
              </>
            ) : isConvertingToMp4 ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin text-[#E8A317]" />
                Converting MP4...
              </>
            ) : (
              <>
                <Film className="w-3.5 h-3.5 text-[#E8A317]" />
                Export {currentVideoConfig.label} Video (.mp4)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Script Out Of Sync Alert Banner */}
      {isScriptOutOfSync && (
        <div className="mx-6 mt-4 p-4 bg-[#FBF8F1] border-2 border-[#E8A317] rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5 max-w-xl">
            <AlertTriangle className="w-5 h-5 text-[#E8A317] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-[#181614]">
                Storyboard Synced to Script — Audio Take Needs Re-generation
              </div>
              <div className="text-[11px] text-[#6B6256] leading-relaxed">
                Your visual prompt, canvas actions, and subtitles have updated to your latest script. Click below to synthesize the new Nigerian Pidgin voiceover take.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onGenerateAudioClick}
            disabled={isGeneratingAudio}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E8A317] hover:bg-[#C6860C] text-[#181614] font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isGeneratingAudio ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                Synthesizing Take...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                Generate New Audio Take
              </>
            )}
          </button>
        </div>
      )}

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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => drawSceneToCanvas(currentTimeRef.current)}
                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-[#181614] bg-[#F4EEE2] hover:bg-[#E8A317] border border-[#EAE3D4] rounded-md transition-all cursor-pointer"
                  title="Click to instantly redraw canvas with latest scene changes"
                >
                  <RotateCcw className="w-2.5 h-2.5 text-[#181614]" />
                  <span>Redraw</span>
                </button>
                <span className="text-[11px] font-bold text-[#E8A317]">
                  Scene {currentSceneIndex + 1} of {sceneList.length}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {sceneList.map((_, sIdx) => {
                const isActive = currentSceneIndex === sIdx;
                return (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => handleJumpToScene(sIdx)}
                    className={`py-1 min-w-[40px] flex-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
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
              {currentVideoConfig.label} Frame ({currentVideoConfig.width}×{currentVideoConfig.height})
            </span>
            <span className="font-mono text-[11px]">
              {Math.floor(currentTime)}s / {Math.floor(totalDuration)}s
            </span>
          </div>

          {/* Dynamic Canvas Stage with Phone Shell (Responsive to 4:5 and 9:16) */}
          <div
            id="phone-video-frame"
            style={{
              aspectRatio: activeRatio === '9:16' ? '9 / 16' : '4 / 5',
              height: activeRatio === '9:16' ? '500px' : '450px',
              maxWidth: activeRatio === '9:16' ? '282px' : '360px',
            }}
            className="relative w-full bg-[#FBF8F1] rounded-[28px] border-4 border-[#181614] shadow-2xl overflow-hidden flex items-center justify-center cursor-pointer group"
            onClick={togglePlayPause}
          >
            {/* Dynamic Canvas Element */}
            <canvas
              ref={canvasRef}
              width={currentVideoConfig.width}
              height={currentVideoConfig.height}
              className="w-full h-full object-cover"
            />

            {/* Overlays: Recording state, Generating state, No-Audio call-to-action, or Standard Play */}
            {isRecordingVideo ? (
              <div className="absolute inset-0 bg-[#181614]/85 z-30 flex flex-col items-center justify-center p-6 text-center">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold mb-4 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  REC {currentVideoConfig.width}×{currentVideoConfig.height} ({currentVideoConfig.label})
                </div>

                <p className="text-sm font-bold text-white mb-1">Exporting Commercial Video</p>
                <p className="text-xs text-[#EAE3D4] mb-3">{recordingStatusText || `Packaging ${sceneList.length} Scenes with Voiceover`}</p>

                {/* Progress bar */}
                <div className="w-full max-w-[220px] bg-white/20 rounded-full h-3 overflow-hidden mb-1.5">
                  <div
                    className="bg-[#E8A317] h-full transition-all duration-200 rounded-full"
                    style={{ width: `${recordingProgress}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-bold text-[#E8A317]">{recordingProgress}%</span>
                <p className="text-[10px] text-[#A89F91] mt-2.5">Speakers muted for clean, silent recording</p>
              </div>
            ) : isGeneratingAudio ? (
              <div className="absolute inset-0 bg-[#181614]/75 z-20 flex flex-col items-center justify-center p-4 text-center">
                <div className="w-14 h-14 rounded-full bg-[#E8A317] text-[#181614] flex items-center justify-center shadow-xl mb-3">
                  <Sparkles className="w-7 h-7 animate-spin text-[#181614]" />
                </div>
                <p className="text-sm font-bold text-white mb-1">Generating Voiceover Audio...</p>
                <p className="text-xs text-[#EAE3D4]">Gemini 3.1 Flash TTS · Nigerian Pidgin Baritone</p>
              </div>
            ) : !audioUrl && !isPlaying ? (
              <div className="absolute inset-0 bg-[#181614]/65 z-20 flex flex-col items-center justify-center p-4 text-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    pendingPlayRef.current = true;
                    onGenerateAudioClick?.();
                  }}
                  className="px-5 py-3 rounded-2xl bg-[#E8A317] hover:bg-[#C6860C] text-[#181614] font-bold text-sm shadow-xl flex items-center gap-2 transform hover:scale-105 transition-all cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-[#181614]" />
                  <span>Generate & Play Voiceover</span>
                </button>
                <p className="text-xs text-[#EAE3D4] mt-2.5 font-medium">Click to synthesize authentic Pidgin Baritone audio</p>
              </div>
            ) : !isPlaying ? (
              <div className="absolute inset-0 bg-[#181614]/30 z-20 flex items-center justify-center pointer-events-none transition-opacity">
                <div className="w-14 h-14 rounded-full bg-[#FBF8F1] text-[#181614] flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform border border-[#E8A317]">
                  <Play className="w-7 h-7 ml-1 fill-[#181614]" />
                </div>
              </div>
            ) : null}
          </div>

          {/* Active Scene Visual Action Card */}
          <div className="w-full max-w-[360px] bg-[#FBF8F1] border border-[#EAE3D4] rounded-2xl p-3 my-2.5 shadow-xs text-left">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-[#181614] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E8A317]" />
                Scene {currentSceneIndex + 1} Visual Action & Prompt
              </span>
              {activeScene.visualPrompt !== ADVERT_SCENES[currentSceneIndex]?.visualPrompt && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8A317] text-[#181614]">
                  Custom Action
                </span>
              )}
            </div>
            <p className="text-xs text-[#181614] font-medium leading-relaxed">
              {activeScene.visualPrompt}
            </p>
            <div className="mt-2 pt-2 border-t border-[#EAE3D4] flex items-center justify-between text-[11px] text-[#6B6256]">
              <span className="truncate italic max-w-[230px]">"{activeScene.voiceLine}"</span>
              <span className="font-mono shrink-0 ml-2">{currentSceneIndex * 4}s–{(currentSceneIndex + 1) * 4}s</span>
            </div>
          </div>

          {/* Transport Bar & Comprehensive Audio Controls */}
          <div className="w-full max-w-[360px] space-y-2.5">
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

            {/* Primary Controls Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  disabled={isGeneratingAudio}
                  className="w-8 h-8 rounded-lg bg-[#E8A317] hover:bg-[#C6860C] text-[#181614] flex items-center justify-center transition-all cursor-pointer font-bold disabled:opacity-50"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isGeneratingAudio ? (
                    <Sparkles className="w-4 h-4 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSeek(0)}
                  className="w-8 h-8 rounded-lg bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#181614] flex items-center justify-center transition-all cursor-pointer"
                  title="Rewind to start"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Volume & Mute */}
                <div className="flex items-center gap-1.5 ml-1 bg-[#F4EEE2] px-2 py-1 rounded-lg border border-[#EAE3D4]">
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="text-[#181614] hover:text-[#C6860C] cursor-pointer"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || voiceVolume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-[#181614]" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : voiceVolume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVoiceVolume(v);
                      if (isMuted && v > 0) setIsMuted(false);
                    }}
                    className="w-14 h-1 bg-[#EAE3D4] rounded-lg appearance-none cursor-pointer accent-[#E8A317]"
                    title={`Voice volume: ${Math.round((isMuted ? 0 : voiceVolume) * 100)}%`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Director Action HUD Toggle */}
                <button
                  type="button"
                  onClick={() => setShowActionOverlay(!showActionOverlay)}
                  className={`px-2 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer border ${
                    showActionOverlay
                      ? 'bg-[#181614] text-white border-[#181614]'
                      : 'bg-[#F4EEE2] text-[#6B6256] border-[#EAE3D4]'
                  }`}
                  title="Toggle Director's Visual Action HUD on video preview"
                >
                  Action HUD: {showActionOverlay ? 'ON' : 'OFF'}
                </button>

                {/* Subtitles Toggle */}
                <button
                  type="button"
                  onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                  className={`px-2 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer border ${
                    subtitlesEnabled
                      ? 'bg-[#181614] text-white border-[#181614]'
                      : 'bg-[#F4EEE2] text-[#6B6256] border-[#EAE3D4]'
                  }`}
                >
                  Captions: {subtitlesEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Audio Status & Bed Selector */}
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#EAE3D4]/80">
              <div className="flex items-center gap-1.5">
                {isGeneratingAudio ? (
                  <span className="flex items-center gap-1 text-[#C6860C] font-semibold animate-pulse">
                    <Sparkles className="w-3 h-3 animate-spin" />
                    Generating Baritone Audio...
                  </span>
                ) : audioUrl ? (
                  <span className="flex items-center gap-1 text-[#2E7D32] font-semibold">
                    <Check className="w-3 h-3" />
                    Pidgin Baritone Synced
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      pendingPlayRef.current = true;
                      onGenerateAudioClick?.();
                    }}
                    className="text-[#C6860C] font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Generate Audio
                  </button>
                )}
              </div>

              {/* Background Music Theme & Custom Audio Uploader */}
              <div className="flex flex-wrap items-center gap-1.5 text-[#6B6256]">
                <Music className="w-3 h-3 text-[#E8A317]" />
                <span className="text-[10px] uppercase font-bold text-[#6B6256]">BGM:</span>
                <select
                  value={bgmTheme}
                  onChange={(e) => setBgmTheme(e.target.value as any)}
                  className="bg-[#F4EEE2] border border-[#EAE3D4] rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#181614] cursor-pointer"
                >
                  <option value="ambient">Ambient Bed</option>
                  <option value="lofi">Lofi Groove</option>
                  {customBgmUrl && <option value="custom">Custom: {customBgmName.slice(0, 14)}...</option>}
                  <option value="off">Off</option>
                </select>

                {/* Custom Audio File Upload Button */}
                <label
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-[#181614] bg-[#F4EEE2] hover:bg-[#EAE3D4] border border-[#EAE3D4] rounded cursor-pointer transition-colors"
                  title="Upload your own background music (.mp3 or .wav)"
                >
                  <Upload className="w-2.5 h-2.5 text-[#E8A317]" />
                  <span>Upload BGM</span>
                  <input
                    type="file"
                    accept="audio/mp3,audio/wav,audio/mpeg,audio/aac"
                    onChange={handleCustomBgmUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Synchronized Scenes & Visual Storyboard */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between border-b border-[#EAE3D4] pb-3">
            <div>
              <h4 className="text-sm font-bold text-[#181614] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#E8A317]" />
                {sceneList.length} Storyboard Scenes
              </h4>
              <p className="text-xs text-[#6B6256]">
                Click any scene to jump playback directly to that visual moment.
              </p>
            </div>
            <div className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#F4EEE2] text-[#181614] border border-[#EAE3D4]">
              Active: Scene {currentSceneIndex + 1} of {sceneList.length}
            </div>
          </div>

          {/* Scene list */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {sceneList.map((scene, idx) => {
              const isActive = currentSceneIndex === idx;
              const isCustomized =
                scene.visualPrompt !== ADVERT_SCENES[idx]?.visualPrompt ||
                scene.voiceLine !== ADVERT_SCENES[idx]?.voiceLine;

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
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-xs font-bold text-[#181614] truncate">
                          "{scene.voiceLine}"
                        </p>
                        {isCustomized && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#E8A317] text-[#181614] shrink-0">
                            Custom Action
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#6B6256] font-mono shrink-0">
                        {Math.round(spans[idx]?.start ?? 0)}s–{Math.round(spans[idx]?.end ?? 0)}s
                      </span>
                    </div>

                    <p className="text-[11px] text-[#6B6256] leading-relaxed">
                      <strong className="text-[#181614]">Visual:</strong>{' '}
                      <span className="line-clamp-2">{scene.visualPrompt}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Video Export Completion Modal */}
      {showExportModal && (exportedVideoUrl || exportedMp4Url) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FBF8F1] border border-[#EAE3D4] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EAE3D4] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#2E7D32]/10 text-[#2E7D32] flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#181614]">
                    {exportedMp4Url ? 'Social Media Video Ready (.mp4)' : 'Commercial Video Exported'}
                  </h3>
                  <p className="text-xs text-[#6B6256]">
                    1080×1350 (4:5 Portrait) • Nigerian Pidgin Baritone Audio
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-full bg-[#F4EEE2] hover:bg-[#EAE3D4] flex items-center justify-center text-[#181614] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Social Media Compatibility Badges */}
            <div className="flex flex-wrap items-center gap-1.5 py-1">
              <span className="text-[10px] uppercase font-bold text-[#6B6256] mr-1">Upload Ready:</span>
              {['Instagram Feed & Reels', 'TikTok', 'WhatsApp', 'Facebook', 'LinkedIn', 'YouTube Shorts'].map((net) => (
                <span
                  key={net}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F4EEE2] text-[#181614] border border-[#EAE3D4]"
                >
                  <span className="text-[#2E7D32] font-bold">✓</span> {net}
                </span>
              ))}
            </div>

            {/* Video Player Preview */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/5 max-h-[300px] mx-auto border border-[#181614]">
              <video
                key={exportedMp4Url || exportedVideoUrl || ''}
                src={exportedMp4Url || exportedVideoUrl || undefined}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-mono backdrop-blur-xs">
                {exportedMp4Url ? 'H.264 / AAC MP4' : 'WebM'}
              </div>
            </div>

            {/* Converting Status Indicator */}
            {isConvertingToMp4 && (
              <div className="p-3 bg-[#E8A317]/10 border border-[#E8A317] rounded-2xl flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#E8A317] animate-spin shrink-0" />
                <div className="text-left flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#181614]">Converting to Social Media MP4...</p>
                    <span className="text-[10px] font-mono font-bold text-[#181614] bg-[#E8A317]/20 px-2 py-0.5 rounded-full">
                      {conversionElapsed}s
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B6256] mt-0.5">
                    Fast H.264 encode with AAC audio & faststart flags (~10–15s). Universal playback on Instagram, TikTok, and WhatsApp.
                  </p>
                </div>
              </div>
            )}

            {/* Conversion Notice / Retry Banner */}
            {mp4ConversionError && !exportedMp4Url && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-left">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#181614]">MP4 Encoding Notice</p>
                  <p className="text-[11px] text-[#6B6256]">{mp4ConversionError}</p>
                </div>
                <button
                  type="button"
                  onClick={handleManualConvertToMp4}
                  className="px-2.5 py-1 text-xs font-bold text-[#181614] bg-[#E8A317] hover:bg-[#C6860C] rounded-lg cursor-pointer shrink-0 shadow-xs"
                >
                  Retry MP4
                </button>
              </div>
            )}

            {/* Download Actions */}
            <div className="space-y-2 pt-1">
              {/* Primary MP4 Social Download Button */}
              {exportedMp4Url ? (
                <a
                  href={exportedMp4Url}
                  download="legit-africa-commercial-4x5.mp4"
                  className="w-full py-3.5 px-4 rounded-xl bg-[#E8A317] hover:bg-[#C6860C] text-[#181614] font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Social Video (.mp4)</span>
                  {exportedMp4Blob && (
                    <span className="text-xs font-normal opacity-90">
                      ({(exportedMp4Blob.size / 1024 / 1024).toFixed(1)} MB • H.264)
                    </span>
                  )}
                </a>
              ) : isConvertingToMp4 ? (
                <div className="space-y-1.5">
                  <button
                    disabled
                    className="w-full py-3.5 px-4 rounded-xl bg-[#EAE3D4] text-[#6B6256] font-bold text-sm flex items-center justify-center gap-2 cursor-wait"
                  >
                    <Sparkles className="w-4 h-4 animate-spin text-[#E8A317]" />
                    <span>Preparing Social MP4 ({conversionElapsed}s elapsed)...</span>
                  </button>
                  {exportedVideoUrl && (
                    <p className="text-[11px] text-center text-[#6B6256]">
                      Need it now? You can download the raw WebM file below while MP4 finishes.
                    </p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleManualConvertToMp4}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#E8A317] hover:bg-[#C6860C] text-[#181614] font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>Convert Video to Social MP4</span>
                </button>
              )}

              {/* Secondary Download Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {exportedVideoUrl && (
                  <a
                    href={exportedVideoUrl}
                    download="legit-africa-commercial-4x5.webm"
                    className="py-2 px-2.5 rounded-xl bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#181614] font-semibold text-xs flex items-center justify-center gap-1 border border-[#EAE3D4] cursor-pointer text-center"
                    title="Download raw WebM file for web archives"
                  >
                    <Download className="w-3.5 h-3.5 text-[#6B6256]" />
                    <span>Raw WebM</span>
                    {exportedVideoBlob && (
                      <span className="text-[10px] text-[#6B6256]">
                        ({(exportedVideoBlob.size / 1024 / 1024).toFixed(1)}MB)
                      </span>
                    )}
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleDownloadSRT}
                  className="py-2 px-2.5 rounded-xl bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#181614] font-semibold text-xs flex items-center justify-center gap-1 border border-[#EAE3D4] cursor-pointer"
                >
                  <Subtitles className="w-3.5 h-3.5 text-[#E8A317]" />
                  <span>.SRT Captions</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="py-2 px-3 rounded-xl bg-white hover:bg-gray-50 text-[#6B6256] font-semibold text-xs border border-[#EAE3D4] cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>

            <p className="text-[11px] text-[#8C827A] text-center leading-relaxed">
              Standard <strong>H.264 video + AAC audio</strong> in <strong>4:5 (1080×1350)</strong> with <strong>YUV 4:2:0</strong> and <strong>faststart</strong> metadata — 100% compliant with Instagram, TikTok, WhatsApp, Facebook, and LinkedIn.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
