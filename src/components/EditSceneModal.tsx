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
  Clock,
  Eye,
} from 'lucide-react';
import { AdvertScene } from '../types';

interface EditSceneModalProps {
  isOpen: boolean;
  scene: AdvertScene | null;
  totalScenes?: number;
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

  useEffect(() => {
    if (scene) {
      setVoiceLine(scene.voiceLine || '');
      setVisualPrompt(scene.visualPrompt || '');
      setImageSrc(scene.imageSrc || '/scenes/scene1.jpg');
      setSceneType(scene.type || 'photo');
    }
  }, [scene]);

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

  const handleSave = () => {
    onSave({
      ...scene,
      voiceLine: voiceLine.trim() || scene.voiceLine,
      visualPrompt: visualPrompt.trim() || scene.visualPrompt,
      imageSrc: imageSrc.trim() || scene.imageSrc,
      type: sceneType,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#181614]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-[#EAE3D4] my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAE3D4] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E8A317] text-[#181614] flex items-center justify-center font-black text-sm shadow-xs">
              {scene.id}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#181614] flex items-center gap-2">
                Edit Scene {scene.id} of {totalScenes}
                <span className="text-xs font-mono font-medium text-[#6B6256] bg-[#F4EEE2] px-2 py-0.5 rounded-md">
                  {(scene.id - 1) * 4}s – {scene.id * 4}s
                </span>
              </h3>
              <p className="text-xs text-[#6B6256]">
                Configure the spoken voice line, camera direction, and visual artwork for this beat.
              </p>
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

        {/* Content Form */}
        <div className="space-y-4">
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
              placeholder="Spoken words for this 4-second beat..."
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
              Describes the camera angle, actor reaction, mood, and on-screen graphic action.
            </p>
            <textarea
              value={visualPrompt}
              onChange={(e) => setVisualPrompt(e.target.value)}
              rows={3}
              placeholder="e.g. Medium close-up of a buyer unboxing a gadget in Ikeja, looking disappointed as battery indicator shows 0%..."
              className="w-full p-3 text-xs bg-white border border-[#EAE3D4] rounded-xl focus:ring-2 focus:ring-[#E8A317] focus:border-transparent outline-hidden text-[#181614]"
            />
          </div>

          {/* 3. Artwork & Image Selection */}
          <div>
            <label className="block text-xs font-bold text-[#181614] mb-1.5">
              Scene Artwork / Background Image
            </label>
            <div className="flex items-center gap-3">
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

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#181614] text-xs font-bold rounded-xl cursor-pointer transition-colors border border-[#EAE3D4]">
                    <Upload className="w-3.5 h-3.5 text-[#E8A317]" />
                    <span>{uploading ? 'Uploading...' : 'Upload Custom Photo'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => onPreview(scene.id - 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-[#F4EEE2] text-[#6B6256] hover:text-[#181614] text-xs font-semibold rounded-xl border border-[#EAE3D4] transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview in Canvas</span>
                  </button>
                </div>

                {uploadError && <p className="text-[11px] font-semibold text-red-700">{uploadError}</p>}

                {/* Preset Picker */}
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
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[#EAE3D4] pt-4 mt-5">
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
