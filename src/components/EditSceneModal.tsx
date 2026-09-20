import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Camera,
  Film,
  FileText,
  Video,
  Trash2,
  Wand2,
  Clock,
  Eye,
} from 'lucide-react';
import { AdvertScene, SceneOverlay, OverlayPosition } from '../types';

interface EditSceneModalProps {
  isOpen: boolean;
  scene: AdvertScene | null;
  totalScenes?: number;
  /** e.g. "12s – 18s"; scenes are timed by their spoken lines, so the storyboard works it out. */
  timeLabel?: string;
  onClose: () => void;
  onSave: (updatedScene: AdvertScene) => void;
  onPreview: (sceneIndex: number) => void;
}

const PRESET_ARTWORKS = [
  { label: 'Bank Alert / Payment', path: '/scenes/scene1.jpg' },
  { label: 'Tailor / Happy Fit', path: '/scenes/scene2.jpg' },
  { label: 'Frustrated Customer', path: '/scenes/scene3.jpg' },
  { label: 'WhatsApp Call Busy', path: '/scenes/scene3_v2.jpg' },
  { label: 'Another Buyer Typing', path: '/scenes/scene4.jpg' },
  { label: 'LegitAfrica Brand Lockup', path: '/brand/logo-clean.png' },
  { label: 'Gold Kudu Icon Badge', path: '/brand/legitafrica-icon-transparent.png' },
];

export const EditSceneModal: React.FC<EditSceneModalProps> = ({
  isOpen,
  scene,
  totalScenes = 8,
  timeLabel,
  onClose,
  onSave,
  onPreview,
}) => {
  const [voiceLine, setVoiceLine] = useState('');
  const [visualPrompt, setVisualPrompt] = useState('');
  const [imageSrc, setImageSrc] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sceneType, setSceneType] = useState<AdvertScene['type']>('photo');
  const [eyebrow, setEyebrow] = useState('');
  const [headline, setHeadline] = useState('');
  const [textBackground, setTextBackground] = useState<'cream' | 'photo'>('cream');
  const [videoSrc, setVideoSrc] = useState('');
  const [clipUploading, setClipUploading] = useState(false);
  const [clipError, setClipError] = useState<string | null>(null);
  const [clipLibrary, setClipLibrary] = useState<{ url: string; label: string; bytes: number }[]>([]);
  const [clipFit, setClipFit] = useState<'slow' | 'loop' | 'hold'>('slow');
  const [drawing, setDrawing] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [lengthSeconds, setLengthSeconds] = useState('');
  const [overlay, setOverlay] = useState<SceneOverlay | null>(null);
  const [screenText, setScreenText] = useState<{ query?: string; business?: string; quote?: string }>({});
  const [disclaimer, setDisclaimer] = useState(false);
  const [rating, setRating] = useState(5);

  useEffect(() => {
    if (scene) {
      setVoiceLine(scene.voiceLine || '');
      setVisualPrompt(scene.visualPrompt || '');
      setImageSrc(scene.imageSrc || '/scenes/scene1.jpg');
      setSceneType(scene.type || 'photo');
      setEyebrow(scene.eyebrow || '');
      setHeadline(scene.headline || '');
      setTextBackground(scene.textBackground || 'cream');
      setVideoSrc(scene.videoSrc || '');
      setClipFit(scene.clipFit || 'slow');
      setLengthSeconds(scene.lengthSeconds ? String(scene.lengthSeconds) : '');
      setOverlay(scene.overlay ?? null);
      setScreenText(scene.screenText ?? {});
      setDisclaimer(!!scene.disclaimer);
      setRating(scene.rating ?? 5);
      setClipError(null);
    }
  }, [scene]);

  // Every clip uploaded so far, so a scene can be put back on one without uploading it again.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch('/api/scene-videos', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { clips: [] }))
      .then((d) => { if (!cancelled) setClipLibrary(Array.isArray(d.clips) ? d.clips : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen]);

  if (!isOpen || !scene) return null;

  // Shrink to video size, then store on the server and keep only its URL in the scene. Embedding
  // the photo itself made the saved ad megabytes long, and Save failed with "Scenes are too large".
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const dataUrl = await shrinkPhoto(file, 1350);
      const res = await fetch('/api/scene-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'The photo could not be uploaded.');
      setImageSrc(data.url);
    } catch (err: any) {
      setUploadError(err?.message || 'The photo could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  // Clips are sent as the raw file, not a data URL: base64 is a third larger again, and a 40 MB
  // clip would have to be held in memory twice over on both sides.
  const handleClipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setClipError(null);
    if (file.size > 60 * 1024 * 1024) {
      setClipError('That clip is too large (60 MB max). Export it shorter or at a lower resolution.');
      return;
    }
    setClipUploading(true);
    try {
      const res = await fetch('/api/scene-videos', {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'video/mp4', 'X-Clip-Name': file.name.replace(/[^\x20-\x7E]/g, '') },
        credentials: 'same-origin',
        body: file,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'The clip could not be uploaded.');
      setVideoSrc(data.url);
      setClipLibrary((prev) =>
        prev.some((c) => c.url === data.url)
          ? prev
          : [{ url: data.url, label: data.label || file.name, bytes: file.size }, ...prev]
      );
    } catch (err: any) {
      setClipError(err?.message || 'The clip could not be uploaded.');
    } finally {
      setClipUploading(false);
    }
  };

  // Makes a picture from the visual prompt and drops it straight into this scene.
  const handleGenerateImage = async () => {
    const prompt = visualPrompt.trim();
    if (!prompt) {
      setDrawError('Write the visual prompt first, then press this.');
      return;
    }
    setDrawError(null);
    setDrawing(true);
    try {
      const res = await fetch('/api/generate-scene-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'The picture could not be generated.');
      setImageSrc(data.url);
      setVideoSrc('');
    } catch (err: any) {
      setDrawError(err?.message || 'The picture could not be generated.');
    } finally {
      setDrawing(false);
    }
  };

  const handleSave = () => {
    onSave({
      ...scene,
      voiceLine: voiceLine.trim() || scene.voiceLine,
      visualPrompt: visualPrompt.trim() || scene.visualPrompt,
      imageSrc: imageSrc.trim() || scene.imageSrc,
      videoSrc: videoSrc.trim() || undefined,
      ...(videoSrc.trim() ? { clipFit } : {}),
      lengthSeconds: Number(lengthSeconds) > 0 ? Number(lengthSeconds) : undefined,
      overlay: overlay ?? undefined,
      screenText:
        sceneType === 'ui_search' && (screenText.query || screenText.business || screenText.quote)
          ? screenText
          : undefined,
      disclaimer: sceneType === 'end_card' && disclaimer ? true : undefined,
      rating: (sceneType === 'ui_search' || sceneType === 'ui_review') && rating !== 5 ? rating : undefined,
      type: sceneType,
      ...(sceneType === 'text' ? { eyebrow: eyebrow.trim(), headline: headline.trim(), textBackground } : {}),
    });
    onClose();
  };

  // Kept as a value so the artwork controls can be placed once, wherever they read best.
  const artworkSection =
    sceneType === 'photo' || sceneType === 'end_card' || (sceneType === 'text' && textBackground === 'photo') ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#181614]">
                Scene Artwork / Background Image
              </label>

              {/* What this scene shows, with the ways to change it beside it */}
              <div className="flex items-start gap-3">
                <div className="w-16 h-20 rounded-xl overflow-hidden border border-[#E8A317] shrink-0 bg-[#F4EEE2] shadow-2xs">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt="Scene preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#6B6256]">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
                  <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#181614] text-xs font-bold rounded-xl cursor-pointer transition-colors border border-[#EAE3D4] text-center">
                    <Upload className="w-3.5 h-3.5 text-[#E8A317] shrink-0" />
                    <span className="truncate">{uploading ? 'Uploading...' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>

                  <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#181614] text-xs font-bold rounded-xl cursor-pointer transition-colors border border-[#EAE3D4] text-center">
                    <Video className="w-3.5 h-3.5 text-[#E8A317] shrink-0" />
                    <span className="truncate">
                      {clipUploading ? 'Uploading...' : videoSrc ? 'Replace Clip' : 'Upload Clip'}
                    </span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm"
                      onChange={handleClipUpload}
                      disabled={clipUploading}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => onPreview(scene.id - 1)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F4EEE2] text-[#6B6256] hover:text-[#181614] text-xs font-semibold rounded-xl border border-[#EAE3D4] transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Preview in Canvas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVideoSrc('')}
                    disabled={!videoSrc}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-red-50 text-[#6B6256] hover:text-red-600 text-xs font-semibold rounded-xl border border-[#EAE3D4] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default disabled:hover:bg-white disabled:hover:text-[#6B6256]"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Remove clip</span>
                  </button>
                </div>
              </div>

              {uploadError && <p className="text-[11px] font-semibold text-red-700">{uploadError}</p>}
              {clipError && <p className="text-[11px] font-semibold text-red-700">{clipError}</p>}

              {/* The pickers and the fit choice run the full width, so nothing sits in a narrow column */}
              <select
                value={imageSrc}
                onChange={(e) => setImageSrc(e.target.value)}
                className="w-full p-2 text-xs bg-white border border-[#EAE3D4] rounded-xl text-[#181614] font-medium outline-hidden"
              >
                <option value="">Custom Uploaded Image</option>
                {PRESET_ARTWORKS.map((preset) => (
                  <option key={preset.path} value={preset.path}>
                    Preset: {preset.label}
                  </option>
                ))}
              </select>

              {clipLibrary.length > 0 && (
                <select
                  value={videoSrc}
                  onChange={(e) => setVideoSrc(e.target.value)}
                  className="w-full p-2 text-xs bg-white border border-[#EAE3D4] rounded-xl text-[#181614] font-medium outline-hidden"
                >
                  <option value="">No clip — show the photo above</option>
                  {clipLibrary.map((clip) => (
                    <option key={clip.url} value={clip.url}>
                      {`${clip.label} (${
                        clip.bytes >= 1048576 ? `${(clip.bytes / 1048576).toFixed(1)} MB` : `${Math.round(clip.bytes / 1024)} KB`
                      })`}
                    </option>
                  ))}
                </select>
              )}

              {videoSrc && !clipError && (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-[#6B6256]">
                    The clip plays instead of the photo, and is silent. If it is shorter than this scene:
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'slow', label: 'Slow it to fit', hint: 'Plays in slow motion so it lasts the whole line. Nothing repeats.' },
                      { id: 'loop', label: 'Loop it', hint: 'Starts again from the beginning. You will see the jump back.' },
                      { id: 'hold', label: 'Hold last frame', hint: 'Plays through, then stays on its final frame.' },
                    ] as { id: 'slow' | 'loop' | 'hold'; label: string; hint: string }[]).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        title={option.hint}
                        onClick={() => setClipFit(option.id)}
                        className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                          clipFit === option.id
                            ? 'bg-[#E8A317] border-[#E8A317] text-[#181614]'
                            : 'bg-white border-[#EAE3D4] text-[#6B6256] hover:text-[#181614] hover:bg-[#F4EEE2]'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 bg-[#181614]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-5 sm:p-6 shadow-2xl border border-[#EAE3D4] my-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAE3D4] pb-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E8A317] text-[#181614] flex items-center justify-center font-black text-sm shadow-xs">
              {scene.id}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#181614] flex items-center gap-2">
                Edit Scene {scene.id} of {totalScenes}
                <span className="text-xs font-mono font-medium text-[#6B6256] bg-[#F4EEE2] px-2 py-0.5 rounded-md">
                  {timeLabel}
                </span>
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#181614] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form: what is said and shot on the left, how it is timed and dressed on the
            right, so the whole scene fits one screen instead of a long scroll. */}
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-3 items-start">
          <div className="space-y-3">
          {/* 0. Scene style */}
          <div>
            <label className="block text-xs font-bold text-[#181614] mb-1.5">Scene style</label>
            <div className="flex flex-wrap gap-2">
              {([
                { id: 'photo', label: 'Photo' },
                { id: 'text', label: 'Text (fly-in)' },
                { id: 'logo', label: 'LegitAfrica: tell them' },
                { id: 'ui_search', label: 'LegitAfrica: search & review' },
                { id: 'ui_review', label: 'LegitAfrica: honest reviews' },
                { id: 'end_card', label: 'LegitAfrica: end card' },
              ] as { id: AdvertScene['type']; label: string }[]).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSceneType(opt.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    sceneType === opt.id
                      ? 'bg-[#E8A317] border-[#E8A317] text-[#181614]'
                      : 'bg-white border-[#EAE3D4] text-[#6B6256] hover:text-[#181614]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>


          {/* Overlay card: shown over the photo or clip, in this advert's own words */}
          <div>
            <label className="block text-xs font-bold text-[#181614] mb-1.5">Overlay on the picture</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setOverlay(null)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                  !overlay
                    ? 'bg-[#E8A317] border-[#E8A317] text-[#181614]'
                    : 'bg-white border-[#EAE3D4] text-[#6B6256] hover:text-[#181614] hover:bg-[#F4EEE2]'
                }`}
              >
                None
              </button>
              <button
                type="button"
                onClick={() =>
                  setOverlay(
                    overlay?.kind === 'debit_alert'
                      ? overlay
                      : {
                          kind: 'debit_alert',
                          title: 'BANK DEBIT ALERT',
                          amount: '₦300,000.00',
                          line1: 'Txn: Instant transfer to agent',
                          line2: 'Status: Successful',
                        }
                  )
                }
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                  overlay?.kind === 'debit_alert'
                    ? 'bg-[#E8A317] border-[#E8A317] text-[#181614]'
                    : 'bg-white border-[#EAE3D4] text-[#6B6256] hover:text-[#181614] hover:bg-[#F4EEE2]'
                }`}
              >
                Debit alert
              </button>
            </div>

            {overlay?.kind === 'debit_alert' && (
              <div className="mt-2 space-y-1.5 bg-[#FBF8F1] p-2.5 rounded-2xl border border-[#E8A317]/40">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={overlay.title ?? ''}
                    onChange={(e) => setOverlay({ ...overlay, title: e.target.value })}
                    maxLength={28}
                    placeholder="BANK DEBIT ALERT"
                    className="w-full p-2 text-xs bg-white border border-[#EAE3D4] rounded-xl outline-hidden text-[#181614]"
                  />
                  <input
                    value={overlay.amount ?? ''}
                    onChange={(e) => setOverlay({ ...overlay, amount: e.target.value })}
                    maxLength={20}
                    placeholder="₦300,000.00"
                    className="w-full p-2 text-xs bg-white border border-[#EAE3D4] rounded-xl outline-hidden text-[#181614] font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={overlay.line1 ?? ''}
                    onChange={(e) => setOverlay({ ...overlay, line1: e.target.value })}
                    maxLength={44}
                    placeholder="Txn: Instant transfer to agent"
                    className="w-full p-2 text-xs bg-white border border-[#EAE3D4] rounded-xl outline-hidden text-[#181614]"
                  />
                  <input
                    value={overlay.line2 ?? ''}
                    onChange={(e) => setOverlay({ ...overlay, line2: e.target.value })}
                    maxLength={44}
                    placeholder="Status: Successful"
                    className="w-full p-2 text-xs bg-white border border-[#EAE3D4] rounded-xl outline-hidden text-[#181614]"
                  />
                </div>
                {/* Where it sits, as a 3x3 of the frame */}
                <div className="flex items-center gap-3">
                  <div className="grid grid-cols-3 gap-1">
                    {(['top-left', 'top-center', 'top-right',
                       'middle-left', 'middle-center', 'middle-right',
                       'bottom-left', 'bottom-center', 'bottom-right'] as OverlayPosition[]).map((pos) => {
                      const active = (overlay.position ?? 'middle-center') === pos;
                      return (
                        <button
                          key={pos}
                          type="button"
                          title={pos.replace('-', ' ')}
                          aria-label={pos.replace('-', ' ')}
                          onClick={() => setOverlay({ ...overlay, position: pos })}
                          className={`w-6 h-5 rounded-md border transition-colors cursor-pointer ${
                            active ? 'bg-[#E8A317] border-[#E8A317]' : 'bg-white border-[#EAE3D4] hover:bg-[#F4EEE2]'
                          }`}
                        >
                          <span className={`block w-1.5 h-1.5 rounded-full mx-auto ${active ? 'bg-[#181614]' : 'bg-[#DACFBE]'}`} />
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-[#6B6256] flex-1">
                    Where the card sits in the frame — currently{' '}
                    <span className="font-semibold text-[#181614]">
                      {(overlay.position ?? 'middle-center').replace('-', ' ')}
                    </span>
                    . It slides up as the scene starts.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 1. Voiceover Narration */}
          <div>
            <label className="flex items-center justify-between text-xs font-bold text-[#181614] mb-1.5">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#E8A317]" />
                Voiceover Narration Line
              </span>
              <span className="text-[10px] text-[#6B6256] font-normal">
                Burned into video captions
              </span>
            </label>
            <textarea
              value={voiceLine}
              onChange={(e) => setVoiceLine(e.target.value)}
              rows={2}
              placeholder="Spoken words for this beat. The scene lasts as long as this line takes to say..."
              className="w-full p-3 text-sm bg-[#FBF8F1] border border-[#EAE3D4] rounded-xl focus:ring-2 focus:ring-[#E8A317] focus:border-transparent outline-hidden text-[#181614] font-medium"
            />
          </div>

          {/* 2. Visual Prompt & Action Description (Prominently Highlighted) */}
          <div className="bg-[#FBF8F1] p-3.5 rounded-2xl border border-[#E8A317]/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#181614]">
                <Camera className="w-4 h-4 text-[#E8A317]" />
                Visual Prompt & Action Description
              </label>
              <span className="text-[10px] uppercase font-bold text-[#C6860C] bg-[#E8A317]/15 px-2 py-0.5 rounded-md">
                Director's Vision
              </span>
            </div>
            <p className="text-[11px] text-[#6B6256] leading-relaxed">
              Camera angle, actor reaction, mood, on-screen action.
            </p>
            <textarea
              value={visualPrompt}
              onChange={(e) => setVisualPrompt(e.target.value)}
              rows={3}
              placeholder="e.g. Medium close-up of a buyer unboxing a gadget in Ikeja, looking disappointed as battery indicator shows 0%..."
              className="w-full p-3 text-xs bg-white border border-[#EAE3D4] rounded-xl focus:ring-2 focus:ring-[#E8A317] focus:border-transparent outline-hidden text-[#181614]"
            />
          </div>

          </div>

          <div className="space-y-3">
          {(sceneType === 'photo' || sceneType === 'end_card' || (sceneType === 'text' && textBackground === 'photo')) && (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={drawing}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#181614] hover:bg-black disabled:opacity-60 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5 text-[#E8A317]" />
                {drawing ? 'Drawing the picture...' : 'Make a picture from this prompt'}
              </button>
              {drawError ? (
                <p className="text-[11px] font-semibold text-red-700">{drawError}</p>
              ) : (
                <p className="text-[11px] text-[#6B6256]">
                  Draws this scene from the words above and puts it in as the scene photo. Free, and you can
                  press it again for a different one.
                </p>
              )}
            </div>
          )}

          {/* Scene length */}
          <div>
            <label className="block text-xs font-bold text-[#181614] mb-1.5">How long this scene holds</label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setLengthSeconds('')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                  lengthSeconds === ''
                    ? 'bg-[#E8A317] border-[#E8A317] text-[#181614]'
                    : 'bg-white border-[#EAE3D4] text-[#6B6256] hover:text-[#181614] hover:bg-[#F4EEE2]'
                }`}
              >
                Automatic
              </button>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={lengthSeconds}
                  onChange={(e) => setLengthSeconds(e.target.value)}
                  placeholder="e.g. 7"
                  className="w-24 p-2 text-xs bg-white border border-[#EAE3D4] rounded-xl text-[#181614] font-medium outline-hidden"
                />
                <span className="text-[11px] font-semibold text-[#6B6256]">seconds</span>
              </div>
            </div>
            <p className="text-[11px] text-[#6B6256] mt-1.5">
              Automatic splits the voiceover by how much is spoken in each scene. Set the seconds when a
              scene must match what you hear — the automatic ones share the rest.
            </p>
          </div>

          {artworkSection}

          {sceneType === 'end_card' && (
            <label className="flex items-start gap-2 p-2.5 rounded-2xl bg-[#FBF8F1] border border-[#E8A317]/40 cursor-pointer">
              <input
                type="checkbox"
                checked={disclaimer}
                onChange={(e) => setDisclaimer(e.target.checked)}
                className="mt-0.5 accent-[#E8A317] cursor-pointer"
              />
              <span className="text-[11px] text-[#6B6256]">
                <span className="block text-xs font-bold text-[#181614]">Show "Dramatisation · Names withheld"</span>
                Small print at the foot of the end card, for an advert that acts out a scenario rather than
                reporting a real case.
              </span>
            </label>
          )}

          {(sceneType === 'ui_search' || sceneType === 'ui_review') && (
            <div>
              <label className="block text-xs font-bold text-[#181614] mb-1.5">Stars shown</label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      aria-label={`${n} star${n === 1 ? '' : 's'}`}
                      title={`${n} star${n === 1 ? '' : 's'}`}
                      className={`text-lg leading-none transition-colors cursor-pointer ${
                        n <= rating ? 'text-[#F5B301]' : 'text-[#DACFBE] hover:text-[#C6860C]'
                      }`}
                    >
                      {n <= rating ? '★' : '☆'}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] font-semibold text-[#6B6256]">
                  {rating} of 5
                </span>
              </div>
              {rating <= 2 && screenText.business && (
                <p className="text-[11px] font-semibold text-red-700 mt-1.5">
                  A low rating beside a business name is the combination that can defame a real business.
                  Clear the name, or raise the rating.
                </p>
              )}
            </div>
          )}

          {/* The words on the search screen. Without these every advert showed the same shop. */}
          {sceneType === 'ui_search' && (
            <div>
              <label className="block text-xs font-bold text-[#181614] mb-1.5">What the search screen says</label>
              <div className="space-y-1.5 bg-[#FBF8F1] p-2.5 rounded-2xl border border-[#E8A317]/40">
                <input
                  value={screenText.query ?? ''}
                  onChange={(e) => setScreenText({ ...screenText, query: e.target.value })}
                  maxLength={34}
                  placeholder="Typed in the search box, e.g. Yaba flat agent"
                  className="w-full p-2 text-xs bg-white border border-[#EAE3D4] rounded-xl outline-hidden text-[#181614]"
                />
                <input
                  value={screenText.business ?? ''}
                  onChange={(e) => setScreenText({ ...screenText, business: e.target.value })}
                  maxLength={34}
                  placeholder="The business found, e.g. *** Properties Ltd"
                  className="w-full p-2 text-xs bg-white border border-[#EAE3D4] rounded-xl outline-hidden text-[#181614] font-semibold"
                />
                <input
                  value={screenText.quote ?? ''}
                  onChange={(e) => setScreenText({ ...screenText, quote: e.target.value })}
                  maxLength={44}
                  placeholder={'The review shown, e.g. "Dem collect money, no house."'}
                  className="w-full p-2 text-xs bg-white border border-[#EAE3D4] rounded-xl outline-hidden text-[#181614]"
                />
                <p className="text-[11px] text-[#6B6256]">
                  Leave a box empty for the standard wording.{' '}
                  <span className="font-semibold text-[#181614]">
                    If the story is about something going wrong, leave the business name out
                  </span>{' '}
                  — a made-up name may belong to a real business, and a bad review against it is defamation.
                  Name one only for a good review, or when the business is yours.
                </p>
              </div>
            </div>
          )}

          {/* The fly-in text fields live in this column: in the left one they made the editor
              twice as tall as the right side, which was sitting empty. */}
          {sceneType === 'text' && (
            <div className="bg-[#FBF8F1] p-3.5 rounded-2xl border border-[#E8A317]/40 space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#181614] mb-1">Small label (optional)</label>
                <input
                  value={eyebrow}
                  onChange={(e) => setEyebrow(e.target.value)}
                  maxLength={40}
                  placeholder="e.g. WHAT HAPPENED NEXT"
                  className="w-full p-2.5 text-xs bg-white border border-[#EAE3D4] rounded-xl focus:ring-2 focus:ring-[#E8A317] outline-hidden text-[#181614]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#181614] mb-1">Headline</label>
                <textarea
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  rows={2}
                  placeholder="Type your headline here"
                  className="w-full p-3 text-sm bg-white border border-[#EAE3D4] rounded-xl focus:ring-2 focus:ring-[#E8A317] outline-hidden text-[#181614] font-semibold"
                />
                <p className="text-[11px] text-[#6B6256] mt-1 leading-snug">
                  One row per line, each flying in after the one before.{' '}
                  <span className="font-mono font-semibold text-[#181614]">*stars*</span> make a word gold:{' '}
                  <span className="font-mono text-[#181614]">
                    <span className="text-[#C6860C]">*Gone*</span> in one Saturday.
                  </span>
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#181614] mb-1">Background</label>
                <div className="flex gap-2">
                  {(['cream', 'photo'] as const).map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setTextBackground(bg)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        textBackground === bg
                          ? 'bg-[#181614] border-[#181614] text-white'
                          : 'bg-white border-[#EAE3D4] text-[#6B6256] hover:text-[#181614]'
                      }`}
                    >
                      {bg === 'cream' ? 'Plain cream' : 'Over my photo'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[#EAE3D4] pt-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#6B6256] hover:text-[#181614] rounded-xl hover:bg-[#F4EEE2] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#E8A317] hover:bg-[#C6860C] text-[#181614] text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply Changes to Video</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Scale a photo so its longest side is at most maxSide pixels, and re-encode as JPEG. */
function shrinkPhoto(file: File, maxSide: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('This browser could not process the photo.'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file could not be read as a photo.'));
    };
    img.src = url;
  });
}
