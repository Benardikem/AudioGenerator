import React, { useState } from 'react';
import {
  Layers,
  Edit3,
  Check,
  RotateCcw,
  Eye,
  Sparkles,
  Info,
  ChevronRight,
  ShieldCheck,
  FileText,
  Clock,
  Zap,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { AdvertScene } from '../types';
import { BRAND_COLORS, ADVERT_SCENES } from '../data/advertScenes';

interface StoryboardEditorProps {
  scenes: AdvertScene[];
  activeSceneIndex: number;
  onSelectScene: (index: number) => void;
  onUpdateScene: (updatedScenes: AdvertScene[]) => void;
  onSyncToScript: (newScript: string) => void;
  onResetScenes: () => void;
  onGenerateAudio?: () => void;
  isGeneratingAudio?: boolean;
}

export const StoryboardEditor: React.FC<StoryboardEditorProps> = ({
  scenes,
  activeSceneIndex,
  onSelectScene,
  onUpdateScene,
  onSyncToScript,
  onResetScenes,
  onGenerateAudio,
  isGeneratingAudio = false,
}) => {
  const [editingSceneId, setEditingSceneId] = useState<number | null>(null);
  const [editVoiceLine, setEditVoiceLine] = useState('');
  const [editVisualPrompt, setEditVisualPrompt] = useState('');
  const [editImageSrc, setEditImageSrc] = useState('');
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');

  const startEditing = (scene: AdvertScene) => {
    setEditingSceneId(scene.id);
    setEditVoiceLine(scene.voiceLine);
    setEditVisualPrompt(scene.visualPrompt);
    setEditImageSrc(scene.imageSrc || '');
    // Preview the scene being edited
    onSelectScene(scene.id - 1);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEditImageSrc(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveEditing = (sceneId: number) => {
    const updated = scenes.map((s) => {
      if (s.id === sceneId) {
        return {
          ...s,
          voiceLine: editVoiceLine.trim() || s.voiceLine,
          visualPrompt: editVisualPrompt.trim() || s.visualPrompt,
          imageSrc: editImageSrc.trim() || s.imageSrc,
        };
      }
      return s;
    });
    onUpdateScene([...updated]);
    setEditingSceneId(null);
    setSyncSuccess(true);
    setSyncNotice(`✅ Scene ${sceneId} updated in Live Video Player! Press Play (▶) to preview, or click "Export 4:5 Video" above to render a new file.`);
    setTimeout(() => {
      setSyncSuccess(false);
      setSyncNotice('');
    }, 5500);
    // Jump straight to the saved scene so the user sees the updated canvas frame immediately
    onSelectScene(sceneId - 1);
  };

  const cancelEditing = () => {
    setEditingSceneId(null);
  };

  const handleApplyAllToVideo = () => {
    let updated = [...scenes];
    if (editingSceneId !== null) {
      updated = updated.map((s) => {
        if (s.id === editingSceneId) {
          return {
            ...s,
            voiceLine: editVoiceLine.trim() || s.voiceLine,
            visualPrompt: editVisualPrompt.trim() || s.visualPrompt,
            imageSrc: editImageSrc.trim() || s.imageSrc,
          };
        }
        return s;
      });
      setEditingSceneId(null);
    }
    onUpdateScene([...updated]);
    const combinedScript = updated.map((s) => s.voiceLine.trim()).join('\n');
    onSyncToScript(combinedScript);
    setSyncSuccess(true);
    setSyncNotice('✅ Storyboard changes updated in Live Video Player! Press Play (▶) to preview, or click "Export 4:5 Video" above to render a new file.');
    setTimeout(() => {
      setSyncSuccess(false);
      setSyncNotice('');
    }, 5500);
    onSelectScene(activeSceneIndex);
  };

  const handleSyncClick = (generateAudioAfter = false) => {
    const combinedScript = scenes.map((s) => s.voiceLine.trim()).join('\n');
    onSyncToScript(combinedScript);
    setSyncSuccess(true);

    if (generateAudioAfter && onGenerateAudio) {
      setSyncNotice('Script synced! Synthesizing new voiceover take with Gemini AI...');
      setTimeout(() => {
        onGenerateAudio();
      }, 50);
    } else {
      setSyncNotice('Script synced! Video subtitles updated. Click "Generate Voiceover Audio" to synthesize new speech.');
    }

    setTimeout(() => {
      setSyncSuccess(false);
      setSyncNotice('');
    }, 4500);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#EAE3D4] shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EAE3D4]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F4EEE2] text-[#E8A317] flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#181614]">
              Official Creative Brief & Storyboard (8 Scenes)
            </h3>
            <p className="text-[11px] text-[#6B6256]">
              Customize visual prompts & voice lines — updates canvas frames & video player
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="apply-all-storyboard-changes-btn"
            onClick={handleApplyAllToVideo}
            className="flex items-center gap-1.5 text-xs font-bold text-[#181614] bg-[#E8A317] hover:bg-[#C6860C] border border-[#C6860C] px-3.5 py-1.5 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer active:scale-98"
            title="Effect all new storyboard changes and update the 4:5 video preview immediately"
          >
            <Zap className="w-3.5 h-3.5 text-[#181614]" />
            <span>Apply Changes to Video</span>
          </button>

          <button
            type="button"
            onClick={onResetScenes}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#6B6256] hover:text-[#181614] bg-[#F4EEE2] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Reset scenes to original brief"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>

          <button
            type="button"
            onClick={() => handleSyncClick(false)}
            className="flex items-center gap-1 text-[11px] font-bold text-[#181614] bg-[#F4EEE2] hover:bg-[#EAE3D4] border border-[#EAE3D4] px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
            title="Apply scene voiceover lines to the main script"
          >
            {syncSuccess ? <Check className="w-3.5 h-3.5 text-green-600" /> : <FileText className="w-3.5 h-3.5" />}
            {syncSuccess ? 'Script Synced!' : 'Sync to Script'}
          </button>

          {onGenerateAudio && (
            <button
              type="button"
              onClick={() => handleSyncClick(true)}
              disabled={isGeneratingAudio}
              className="flex items-center gap-1 text-[11px] font-bold text-[#181614] bg-[#F4EEE2] hover:bg-[#EAE3D4] border border-[#EAE3D4] px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Push changes to script AND immediately generate new voiceover audio"
            >
              {isGeneratingAudio ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-[#E8A317]" />
                  Sync & Synthesize Voice
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncNotice && (
        <div className="p-3 bg-[#FBF8F1] border border-[#E8A317] rounded-xl text-xs text-[#181614] flex items-center gap-2">
          <Check className="w-4 h-4 text-[#E8A317] shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Interactive Scene Jump Strip */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[#6B6256]">
          <span>Click any scene to preview immediately:</span>
          <span className="text-[#E8A317] font-bold">Active: Scene {activeSceneIndex + 1}</span>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {scenes.map((scene, idx) => {
            const isActive = activeSceneIndex === idx;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => onSelectScene(idx)}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center border ${
                  isActive
                    ? 'bg-[#E8A317] text-[#181614] border-[#E8A317] shadow-xs ring-2 ring-[#E8A317]/30'
                    : 'bg-[#FBF8F1] hover:bg-[#F4EEE2] text-[#181614] border-[#EAE3D4]'
                }`}
                title={`Jump to Scene ${scene.id}: ${scene.voiceLine}`}
              >
                <span>{scene.id}</span>
                <span className="text-[9px] opacity-75">{idx * 4}s</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Guide Banner: Explaining How to Preview & Edit */}
      <div className="p-3.5 bg-[#FBF8F1] rounded-2xl border border-[#EAE3D4] text-xs text-[#6B6256] space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-[#181614]">
          <Info className="w-3.5 h-3.5 text-[#E8A317]" />
          Quick Guide: How to Preview & Edit
        </div>
        <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
          <li>
            <strong className="text-[#181614]">To Preview:</strong> Click any scene number above or click the <strong>"Preview"</strong> button on any card below. The 4:5 video canvas will jump directly to that frame.
          </li>
          <li>
            <strong className="text-[#181614]">To Edit:</strong> Click the pencil <strong>"Edit"</strong> button on any card to update what the narrator says or change the visual action.
          </li>
          <li>
            <strong className="text-[#181614]">To Apply:</strong> Click <strong>"Sync to Script"</strong> above to push your edited lines to the voice generator.
          </li>
        </ol>
      </div>

      {/* 8 Detailed Scene Cards with Inline Editing */}
      <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
        {scenes.map((scene, idx) => {
          const isActive = activeSceneIndex === idx;
          const isEditing = editingSceneId === scene.id;

          return (
            <div
              key={scene.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isActive
                  ? 'bg-[#FBF8F1] border-[#E8A317] ring-1 ring-[#E8A317] shadow-xs'
                  : 'bg-white border-[#EAE3D4] hover:bg-[#FBF8F1]/40'
              }`}
            >
              {/* Scene Card Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                      isActive
                        ? 'bg-[#E8A317] text-[#181614]'
                        : 'bg-[#F4EEE2] text-[#181614]'
                    }`}
                  >
                    {scene.id}
                  </span>
                  <span className="text-xs font-bold text-[#181614]">
                    Scene {scene.id}
                  </span>
                  <span className="text-[10px] text-[#6B6256] font-mono bg-[#F4EEE2] px-1.5 py-0.5 rounded-md">
                    {idx * 4}s – {(idx + 1) * 4}s
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectScene(idx)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#E8A317] text-[#181614] shadow-xs'
                        : 'bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#181614]'
                    }`}
                    title="View this scene in the 4:5 video canvas"
                  >
                    <Eye className="w-3 h-3" />
                    {isActive ? 'Viewing' : 'Preview'}
                  </button>

                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => startEditing(scene)}
                      className="p-1 text-[#6B6256] hover:text-[#181614] hover:bg-[#F4EEE2] rounded-lg transition-colors cursor-pointer"
                      title="Edit scene narration or visual prompt"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-2 py-0.5 text-[10px] text-[#6B6256] hover:text-[#181614] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Editable Form or Readonly View */}
              {isEditing ? (
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-[#6B6256] uppercase tracking-wider mb-1">
                      Voiceover Narration Line
                    </label>
                    <textarea
                      value={editVoiceLine}
                      onChange={(e) => setEditVoiceLine(e.target.value)}
                      rows={2}
                      className="w-full p-2.5 text-xs bg-white border border-[#E8A317] rounded-xl outline-hidden text-[#181614] focus:ring-1 focus:ring-[#E8A317]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#6B6256] uppercase tracking-wider mb-1">
                      Visual Prompt & Action Description
                    </label>
                    <textarea
                      value={editVisualPrompt}
                      onChange={(e) => setEditVisualPrompt(e.target.value)}
                      rows={3}
                      className="w-full p-2.5 text-xs bg-white border border-[#EAE3D4] rounded-xl outline-hidden text-[#181614] focus:border-[#E8A317]"
                    />
                  </div>

                  {/* Scene Image / Artwork Selection */}
                  <div className="bg-[#FBF8F1] p-3 rounded-xl border border-[#EAE3D4] space-y-2">
                    <label className="block text-[10px] font-bold text-[#6B6256] uppercase tracking-wider">
                      Scene Artwork / Visual Image
                    </label>
                    <div className="flex items-center gap-3">
                      {editImageSrc ? (
                        <div className="w-14 h-16 rounded-lg overflow-hidden border border-[#E8A317] shrink-0 bg-black/10">
                          <img
                            src={editImageSrc}
                            alt="Scene preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-16 rounded-lg border border-dashed border-[#EAE3D4] shrink-0 flex items-center justify-center text-[#6B6256] bg-white">
                          <ImageIcon className="w-5 h-5 text-[#6B6256]" />
                        </div>
                      )}

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#181614] text-[11px] font-bold rounded-lg cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5 text-[#E8A317]" />
                            <span>Upload Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageFileUpload}
                              className="hidden"
                            />
                          </label>
                          {editImageSrc && (
                            <span className="text-[10px] text-[#6B6256] truncate max-w-[160px]">
                              Custom image ready
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={editImageSrc}
                          onChange={(e) => setEditImageSrc(e.target.value)}
                          placeholder="Or paste image URL (e.g. /scenes/scene3.jpg)..."
                          className="w-full px-2 py-1 text-[11px] bg-white border border-[#EAE3D4] rounded-lg text-[#181614] focus:outline-hidden focus:border-[#E8A317]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE3D4]/80">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-3 py-1.5 text-xs font-semibold text-[#6B6256] hover:text-[#181614] rounded-xl hover:bg-[#F4EEE2] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      id={`apply-scene-${scene.id}-btn`}
                      onClick={() => saveEditing(scene.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E8A317] hover:bg-[#C6860C] text-[#181614] text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-98"
                    >
                      <Check className="w-4 h-4 text-[#181614]" />
                      <span>Apply Changes to Video</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 text-xs items-start">
                  {scene.imageSrc && (
                    <div className="shrink-0 w-14 h-18 rounded-xl overflow-hidden border border-[#EAE3D4] bg-[#F4EEE2] shadow-2xs">
                      <img
                        src={scene.imageSrc}
                        alt={`Scene ${scene.id} artwork`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <p className="font-medium text-[#181614] italic bg-[#F4EEE2]/60 p-2 rounded-xl border border-[#EAE3D4]/50">
                      "{scene.voiceLine}"
                    </p>
                    <p className="text-[11px] text-[#6B6256] leading-relaxed">
                      <strong className="text-[#181614]">Visual:</strong> {scene.visualPrompt}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* End Card Mandate Box */}
      <div className="p-4 bg-[#F4EEE2] rounded-2xl border border-[#EAE3D4] text-xs space-y-1.5">
        <div className="font-bold text-[#181614]">Scene 8 End Card Requirement:</div>
        <div className="text-[#6B6256]">
          Official LegitAfrica logo, "legitafrica.com", and underneath:
        </div>
        <div className="font-bold text-[#181614] text-[11px]">
          Trusted businesses · Verified reviews · Always free to read
        </div>
      </div>
    </div>
  );
};
