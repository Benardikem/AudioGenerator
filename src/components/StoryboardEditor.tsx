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
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
} from 'lucide-react';
import { sceneTimeline, MAX_SCENES } from '../utils/sceneTimeline';
import { AdvertScene } from '../types';
import { BRAND_COLORS, ADVERT_SCENES } from '../data/advertScenes';
import { EditSceneModal } from './EditSceneModal';
import { ConfirmationModal } from './ConfirmationModal';
import { alignScenesToVoiceover } from '../utils/audioAlign';

interface StoryboardEditorProps {
  scenes: AdvertScene[];
  activeSceneIndex: number;
  onSelectScene: (index: number) => void;
  /** Jumps to the Preview step with this scene showing. Without it the canvas isn't on screen. */
  onPreviewScene?: (index: number) => void;
  onUpdateScene: (updatedScenes: AdvertScene[]) => void;
  onSyncToScript: (newScript: string) => void;
  onResetScenes: () => void;
  onGenerateAudio?: () => void;
  isGeneratingAudio?: boolean;
  onGenerateScenesFromCurrentScript?: () => void;
  /** Voiceover length in seconds, used to time the scenes. */
  duration?: number;
  /** The voiceover itself, so scenes can be timed to where each line is really spoken. */
  audioUrl?: string;
}

export const StoryboardEditor: React.FC<StoryboardEditorProps> = ({
  scenes,
  activeSceneIndex,
  onSelectScene,
  onPreviewScene,
  onUpdateScene,
  onSyncToScript,
  onResetScenes,
  onGenerateAudio,
  isGeneratingAudio = false,
  onGenerateScenesFromCurrentScript,
  audioUrl,
  duration = 32,
}) => {
  const spans = sceneTimeline(scenes, duration);
  const timeLabel = (idx: number) =>
    `${Math.round(spans[idx]?.start ?? 0)}s – ${Math.round(spans[idx]?.end ?? 0)}s`;

  // Ids follow order; App renumbers too, but doing it here keeps the edit modal's lookups right.
  const replaceScenes = (next: AdvertScene[]) => onUpdateScene(next.map((s, i) => ({ ...s, id: i + 1 })));
  const addSceneAfter = (idx: number) => {
    if (scenes.length >= MAX_SCENES) return;
    const blank: AdvertScene = { id: idx + 2, voiceLine: '', visualPrompt: '', imageSrc: '/scenes/scene1.jpg', type: 'photo' };
    replaceScenes([...scenes.slice(0, idx + 1), blank, ...scenes.slice(idx + 1)]);
    setModalScene(blank);
    setIsModalOpen(true);
    onSelectScene(idx + 1);
  };
  const removeScene = (idx: number) => {
    if (scenes.length <= 1) return;
    setConfirming({
      title: `Delete scene ${idx + 1}?`,
      message: `"${(scenes[idx]?.voiceLine || '').slice(0, 90) || 'This scene'}" and its picture, clip and cards are removed from the advert.`,
      confirmLabel: 'Delete scene',
      onConfirm: () => {
        replaceScenes(scenes.filter((_, i) => i !== idx));
        onSelectScene(Math.max(0, Math.min(idx, scenes.length - 2)));
      },
    });
  };
  const moveScene = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= scenes.length) return;
    const next = [...scenes];
    [next[idx], next[j]] = [next[j], next[idx]];
    replaceScenes(next);
    onSelectScene(j);
  };

  const [modalScene, setModalScene] = useState<AdvertScene | null>(null);
  const [aligning, setAligning] = useState(false);
  const [alignNotice, setAlignNotice] = useState<string | null>(null);

  // Listens to the voiceover and starts each scene where its line is actually spoken, instead of
  // where a word count guesses it will be.
  const matchToVoiceover = async () => {
    if (!audioUrl) return;
    setAligning(true);
    setAlignNotice(null);
    try {
      const result = await alignScenesToVoiceover(scenes, audioUrl);
      replaceScenes(result.scenes);
      setAlignNotice(
        result.matched === result.joins
          ? `Every scene now starts where its line is spoken (${result.joins} joins matched to pauses in the voiceover).`
          : `${result.matched} of ${result.joins} joins matched to pauses in the voiceover. The rest are estimates — check them in the preview.`
      );
    } catch (err: any) {
      setAlignNotice(err?.message || 'The voiceover could not be read.');
    } finally {
      setAligning(false);
    }
  };

  const [confirming, setConfirming] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);
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
            <span>Visual Storyboard · {scenes.length} scene{scenes.length === 1 ? '' : 's'}</span>
          </div>
          <h2 className="text-xl font-bold text-[#181614]">
            Visual Prompts, Camera Actions & Scene Imagery
          </h2>
          <p className="text-xs text-[#6B6256] mt-0.5">
            Add, remove and reorder scenes. Each one lasts as long as its spoken line.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!audioUrl || aligning}
            onClick={() =>
              setConfirming({
                title: 'Match every scene to the voiceover?',
                message: `The studio listens to the voiceover, finds the pause before each line, and sets all ${scenes.length} scenes to start there. Any lengths you set by hand are replaced.`,
                confirmLabel: 'Match scenes',
                onConfirm: matchToVoiceover,
              })
            }
            title={audioUrl ? 'Time every scene to where its line is actually spoken' : 'Generate the voiceover first'}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#181614] hover:bg-black disabled:opacity-40 disabled:cursor-default text-white text-xs font-bold transition-all cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-[#E8A317]" />
            <span>{aligning ? 'Listening to the voiceover…' : 'Match scenes to voiceover'}</span>
          </button>
          {onGenerateScenesFromCurrentScript && (
            <button
              type="button"
              onClick={() =>
                setConfirming({
                  title: 'Rebuild the storyboard from the script?',
                  message: `All ${scenes.length} scenes are replaced by one scene per line of the script. Their photos, clips, cards and lengths are lost.`,
                  confirmLabel: 'Rebuild scenes',
                  onConfirm: () => onGenerateScenesFromCurrentScript(),
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#181614] text-xs font-bold transition-all cursor-pointer border border-[#EAE3D4]"
              title="Rebuild the scenes from the script: one scene per line"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E8A317]" />
              <span>Rebuild scenes from script</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleApplyAllToScript}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E8A317] hover:bg-[#C6860C] text-[#181614] text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 text-[#181614]" />
            <span>Copy scene lines into the script</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setConfirming({
                title: 'Throw away this storyboard?',
                message: `All ${scenes.length} scenes are replaced by the eight-scene example, losing every photo, clip and card on them.`,
                confirmLabel: 'Replace with the example',
                onConfirm: onResetScenes,
              })
            }
            className="p-2 rounded-xl bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#6B6256] hover:text-red-600 text-xs transition-colors cursor-pointer"
            title="Replace this storyboard with the eight-scene example"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {alignNotice && (
        <div className="p-3.5 bg-[#FBF8F1] border-2 border-[#E8A317] text-[#181614] text-xs font-bold rounded-2xl flex items-center justify-between shadow-xs">
          <span>{alignNotice}</span>
          <button type="button" onClick={() => setAlignNotice(null)} className="text-[#6B6256] hover:text-[#181614] font-normal">
            Dismiss
          </button>
        </div>
      )}

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
        <div className="flex flex-wrap gap-2">
          {scenes.map((scene, idx) => {
            const isActive = activeSceneIndex === idx;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => (onPreviewScene ?? onSelectScene)(idx)}
                className={`py-2 px-1 min-w-[76px] flex-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  isActive
                    ? 'bg-[#E8A317] text-[#181614] border-[#E8A317] shadow-xs'
                    : 'bg-[#FBF8F1] hover:bg-[#F4EEE2] text-[#6B6256] border-[#EAE3D4]'
                }`}
              >
                <span>Scene {scene.id}</span>
                <span className="text-[10px] font-mono opacity-80">{Math.round(spans[idx]?.start ?? 0)}s</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scene cards */}
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
                      {timeLabel(idx)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveScene(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 rounded-lg text-[#6B6256] hover:text-[#181614] hover:bg-[#F4EEE2] disabled:opacity-30 disabled:cursor-default cursor-pointer"
                      title="Move scene earlier"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveScene(idx, 1)}
                      disabled={idx === scenes.length - 1}
                      className="p-1 rounded-lg text-[#6B6256] hover:text-[#181614] hover:bg-[#F4EEE2] disabled:opacity-30 disabled:cursor-default cursor-pointer"
                      title="Move scene later"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeScene(idx)}
                      disabled={scenes.length <= 1}
                      className="p-1 rounded-lg text-[#6B6256] hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-default cursor-pointer"
                      title="Delete scene"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => (onPreviewScene ?? onSelectScene)(idx)}
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

      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => addSceneAfter(scenes.length - 1)}
          disabled={scenes.length >= MAX_SCENES}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F4EEE2] disabled:opacity-50 disabled:cursor-default text-[#181614] text-xs font-bold border border-dashed border-[#DACFBE] transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#E8A317]" />
          Add scene
        </button>
        <span className="text-[11px] text-[#6B6256]">
          {scenes.length} of {MAX_SCENES} scenes. Use the arrows on a scene to move it.
        </span>
      </div>

      {/* Edit Scene Focused Modal */}
      <ConfirmationModal
        isOpen={confirming !== null}
        title={confirming?.title ?? ''}
        message={confirming?.message ?? ''}
        confirmLabel={confirming?.confirmLabel ?? 'Confirm'}
        isDestructive
        onConfirm={() => {
          confirming?.onConfirm();
          setConfirming(null);
        }}
        onCancel={() => setConfirming(null)}
      />

      <EditSceneModal
        isOpen={isModalOpen}
        scene={modalScene}
        totalScenes={scenes.length}
        timeLabel={modalScene ? timeLabel(modalScene.id - 1) : undefined}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModalScene}
        onPreview={(idx) => {
          setIsModalOpen(false);
          (onPreviewScene ?? onSelectScene)(idx);
        }}
      />
    </div>
  );
};
