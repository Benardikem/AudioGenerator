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
  Camera,
  Film,
} from 'lucide-react';
import { AdvertScene } from '../types';
import { BRAND_COLORS, ADVERT_SCENES } from '../data/advertScenes';
import { EditSceneModal } from './EditSceneModal';

interface StoryboardEditorProps {
  scenes: AdvertScene[];
  activeSceneIndex: number;
  onSelectScene: (index: number) => void;
  onUpdateScene: (updatedScenes: AdvertScene[]) => void;
  onSyncToScript: (newScript: string) => void;
  onResetScenes: () => void;
  onGenerateAudio?: () => void;
  isGeneratingAudio?: boolean;
  onGenerateScenesFromCurrentScript?: () => void;
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
  onGenerateScenesFromCurrentScript,
}) => {
  const [modalScene, setModalScene] = useState<AdvertScene | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');

  const openSceneModal = (scene: AdvertScene) => {
    setModalScene(scene);
    setIsModalOpen(true);
    onSelectScene(scene.id - 1);
  };

  const handleSaveModalScene = (updatedScene: AdvertScene) => {
    const updated = scenes.map((s) => (s.id === updatedScene.id ? updatedScene : s));
    onUpdateScene([...updated]);
    setSyncSuccess(true);
    setSyncNotice(`✅ Scene ${updatedScene.id} updated! Visual Prompt & Action Description applied to video canvas.`);
    setTimeout(() => {
      setSyncSuccess(false);
      setSyncNotice('');
    }, 4500);
    onSelectScene(updatedScene.id - 1);
  };

  // Sync script lines from scenes
  const handleApplyAllToScript = () => {
    const joinedScript = scenes
      .map((s) => s.voiceLine)
      .filter(Boolean)
      .join('\n');
    onSyncToScript(joinedScript);
    setSyncSuccess(true);
    setSyncNotice('✅ Spoken lines synced to Voiceover Script Editor!');
    setTimeout(() => {
      setSyncSuccess(false);
      setSyncNotice('');
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-3xl border border-[#EAE3D4] p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#C6860C] uppercase tracking-wider mb-1">
            <Camera className="w-4 h-4 text-[#E8A317]" />
            <span>8-Beat Synchronized Visual Storyboard</span>
          </div>
          <h2 className="text-xl font-bold text-[#181614]">
            Visual Prompts, Camera Actions & Scene Imagery
          </h2>
          <p className="text-xs text-[#6B6256] mt-0.5">
            Every scene features its own tailored camera direction, actor action, and visual prompt. Click any scene to edit in a focused modal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onGenerateScenesFromCurrentScript && (
            <button
              type="button"
              onClick={onGenerateScenesFromCurrentScript}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#181614] text-xs font-bold transition-all cursor-pointer border border-[#EAE3D4]"
              title="Automatically generate 8 scenes matching the script in the Script Editor"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E8A317]" />
              <span>Auto-Sync Scenes from Script</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleApplyAllToScript}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E8A317] hover:bg-[#C6860C] text-[#181614] text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 text-[#181614]" />
            <span>Push Lines to Script</span>
          </button>

          <button
            type="button"
            onClick={onResetScenes}
            className="p-2 rounded-xl bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#6B6256] hover:text-[#181614] text-xs transition-colors cursor-pointer"
            title="Reset scenes to official template"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sync Notification Notice */}
      {syncSuccess && (
        <div className="p-3.5 bg-[#FBF8F1] border-2 border-[#E8A317] text-[#181614] text-xs font-bold rounded-2xl flex items-center justify-between shadow-xs">
          <span>{syncNotice}</span>
          <button
            type="button"
            onClick={() => setSyncSuccess(false)}
            className="text-[#6B6256] hover:text-[#181614] font-normal"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quick Scene Selector Grid */}
      <div className="bg-white rounded-2xl border border-[#EAE3D4] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#181614] flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-[#E8A317]" />
            Jump to Scene Preview:
          </span>
          <span className="text-xs font-bold text-[#E8A317]">
            Active: Scene {activeSceneIndex + 1} of {scenes.length}
          </span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {scenes.map((scene, idx) => {
            const isActive = activeSceneIndex === idx;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => onSelectScene(idx)}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  isActive
                    ? 'bg-[#E8A317] text-[#181614] border-[#E8A317] shadow-xs'
                    : 'bg-[#FBF8F1] hover:bg-[#F4EEE2] text-[#6B6256] border-[#EAE3D4]'
                }`}
              >
                <span>Scene {scene.id}</span>
                <span className="text-[10px] font-mono opacity-80">{idx * 4}s</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 8 Detailed Storyboard Scene Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenes.map((scene, idx) => {
          const isActive = activeSceneIndex === idx;

          return (
            <div
              key={scene.id}
              className={`bg-white rounded-2xl border p-4.5 transition-all flex flex-col justify-between ${
                isActive
                  ? 'border-[#E8A317] ring-2 ring-[#E8A317]/30 shadow-md'
                  : 'border-[#EAE3D4] hover:border-[#E8A317]/60 hover:shadow-xs'
              }`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
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
                    <span className="text-[10px] text-[#6B6256] font-mono bg-[#F4EEE2] px-2 py-0.5 rounded-md">
                      {idx * 4}s – {(idx + 1) * 4}s
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectScene(idx)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#E8A317] text-[#181614]'
                          : 'bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#181614]'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      {isActive ? 'Previewing' : 'Preview'}
                    </button>

                    <button
                      type="button"
                      onClick={() => openSceneModal(scene)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#181614] text-[11px] font-bold transition-colors cursor-pointer border border-[#EAE3D4]"
                      title="Edit Visual Prompt & Action in Modal"
                    >
                      <Edit3 className="w-3 h-3 text-[#E8A317]" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

                {/* Content Details */}
                <div className="flex gap-3 items-start">
                  {scene.imageSrc && (
                    <div className="shrink-0 w-16 h-20 rounded-xl overflow-hidden border border-[#EAE3D4] bg-[#F4EEE2] shadow-2xs">
                      <img
                        src={scene.imageSrc}
                        alt={`Scene ${scene.id} artwork`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Voiceover Spoken Line */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#6B6256] tracking-wider block mb-0.5">
                        Voiceover Narration:
                      </span>
                      <p className="text-xs font-semibold text-[#181614] italic bg-[#FBF8F1] p-2 rounded-xl border border-[#EAE3D4]/70">
                        "{scene.voiceLine}"
                      </p>
                    </div>

                    {/* Visual Prompt & Action Description (PROMINENTLY DISPLAYED) */}
                    <div className="bg-[#F4EEE2]/60 p-2.5 rounded-xl border border-[#E8A317]/30">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[#C6860C] mb-1">
                        <Camera className="w-3 h-3 text-[#E8A317]" />
                        <span>Visual Prompt & Action Description:</span>
                      </div>
                      <p className="text-[11px] text-[#181614] leading-relaxed">
                        {scene.visualPrompt || 'No camera prompt specified. Click Edit to add director visual directions.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Scene Focused Modal */}
      <EditSceneModal
        isOpen={isModalOpen}
        scene={modalScene}
        totalScenes={scenes.length}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModalScene}
        onPreview={onSelectScene}
      />
    </div>
  );
};
