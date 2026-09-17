import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Sparkles,
  Volume2,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Clock,
  History,
  Play,
  Download,
  ListTodo,
  Smartphone,
  Video,
  Subtitles,
  GitBranch,
  Github,
  Copy,
  Check,
  X,
  Radio,
  Layers,
  ChevronRight,
  Star,
  Plus,
  FileText,
  Eye,
} from 'lucide-react';
import { ScriptEditor, DEFAULT_SCRIPT } from './components/ScriptEditor';
import { VoiceSelector, VOICE_OPTIONS } from './components/VoiceSelector';
import { AudioVisualizer } from './components/AudioVisualizer';
import { SocialVideoOverlay } from './components/SocialVideoOverlay';
import { StoryboardEditor } from './components/StoryboardEditor';
import { CampaignArchiveView } from './components/CampaignArchiveView';
import { generateScenesFromScript } from './utils/sceneGenerator';
import { GeneratedCommercial, CommercialPreset, AdvertScene, AspectRatio } from './types';
import { BRAND_COLORS, ADVERT_SCENES } from './data/advertScenes';
import {
  CommercialRecord,
  getSavedCommercials,
  subscribeToSavedCommercials,
  saveCommercial,
  deleteCommercial,
} from './lib/commercialsDb';
import { FolderOpen, Save, ArrowLeft, LogOut } from 'lucide-react';
import { ConfirmationModal } from './components/ConfirmationModal';
import { NewCommercialModal } from './components/NewCommercialModal';

export default function App() {
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  // Default to the deep masculine baritone voice (Obinna / Fenrir)
  const [selectedVoice, setSelectedVoice] = useState('Fenrir_Baritone');
  const [selectedTimbre, setSelectedTimbre] = useState<'standard' | 'baritone' | 'bass'>('baritone');
  // Default to pidgin_warm for authentic Nigerian Pidgin video background audio
  const [selectedStyle, setSelectedStyle] = useState('pidgin_warm');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // Synchronized 8 scenes with interactive editing and preview
  const [scenes, setScenes] = useState<AdvertScene[]>(ADVERT_SCENES);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [sceneVersion, setSceneVersion] = useState(0);

  const handleSceneChange = useCallback((idx: number) => {
    setActiveSceneIndex((prev) => (prev === idx ? prev : idx));
  }, []);

  const handleSelectScene = useCallback((idx: number) => {
    setActiveSceneIndex(idx);
    setSceneVersion((v) => v + 1);
  }, []);

  const handleUpdateScenes = useCallback((updated: AdvertScene[]) => {
    setScenes(updated);
    setSceneVersion((v) => v + 1);
  }, []);

  // Active generated commercial
  const [activeCommercial, setActiveCommercial] = useState<GeneratedCommercial | null>(null);

  // Active saved commercial ID & title in database
  const [activeCommercialId, setActiveCommercialId] = useState<string | null>(null);
  const [campaignTitle, setCampaignTitle] = useState('LegitAfrica Commercial (Baritone Pidgin)');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:5');
  const [savedCommercials, setSavedCommercials] = useState<CommercialRecord[]>([]);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [dbNotice, setDbNotice] = useState<string | null>(null);

  // Initialize and subscribe to Firestore saved commercials
  useEffect(() => {
    const unsubscribe = subscribeToSavedCommercials(
      (records) => {
        setSavedCommercials(records);
      },
      (err) => {
        console.warn('Real-time sync error:', err);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Save current active state to database
  const handleSaveCurrentCommercial = async (title: string) => {
    setIsSavingDb(true);
    setDbNotice(null);
    try {
      const saved = await saveCommercial({
        id: activeCommercialId || undefined,
        title,
        script,
        voice: selectedVoice,
        voiceName: selectedVoiceObj.name,
        timbre: selectedTimbre,
        style: selectedStyle,
        audioUrl: activeCommercial?.audioUrl,
        duration: activeCommercial?.duration,
        scenes: JSON.stringify(scenes),
        aspectRatio: aspectRatio,
      });
      setActiveCommercialId(saved.id);
      setCampaignTitle(saved.title);
      if (activeCommercial && saved.audioUrl) {
        const synced = { ...activeCommercial, audioUrl: saved.audioUrl };
        setActiveCommercial(synced);
        setTakes((prev) => prev.map((t) => (t.id === activeCommercial.id ? synced : t)));
      }
      setDbNotice('Saved');
      setTimeout(() => setDbNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to save commercial:', err);
      setDbNotice('Could not save. Check your connection and try again.');
      setTimeout(() => setDbNotice(null), 5000);
    } finally {
      setIsSavingDb(false);
    }
  };

  // Load a previously saved commercial from the database
  const handleLoadSavedCommercial = (comm: CommercialRecord) => {
    setActiveCommercialId(comm.id);
    setCampaignTitle(comm.title);
    setScript(comm.script);
    setSelectedVoice(comm.voice);
    if (comm.timbre) setSelectedTimbre(comm.timbre);
    if (comm.style) setSelectedStyle(comm.style);
    if (comm.aspectRatio === '9:16' || comm.aspectRatio === '4:5') {
      setAspectRatio(comm.aspectRatio as AspectRatio);
    }

    // Restore scenes if stored
    if (comm.scenes) {
      try {
        const parsedScenes = JSON.parse(comm.scenes);
        if (Array.isArray(parsedScenes) && parsedScenes.length > 0) {
          setScenes(parsedScenes);
          setActiveSceneIndex(0);
          setSceneVersion((v) => v + 1);
        }
      } catch (e) {
        console.warn('Could not parse stored scenes:', e);
      }
    }

    // Restore audio if available
    if (comm.audioUrl && comm.duration) {
      const loadedTake: GeneratedCommercial = {
        id: `take-${comm.id}`,
        audioUrl: comm.audioUrl,
        duration: comm.duration,
        voice: comm.voice,
        voiceName: comm.voiceName || comm.voice,
        style: comm.style,
        timbre: comm.timbre || 'baritone',
        script: comm.script,
        createdAt: new Date(comm.createdAt || Date.now()).getTime(),
      };
      setActiveCommercial(loadedTake);
      setTakes([loadedTake]);
    } else {
      // Without this, opening an ad that has no voiceover kept playing the previous ad's audio.
      setActiveCommercial(null);
      setTakes([]);
    }

    setActivePage('script');
    setView('ad');
    window.scrollTo(0, 0);
    setDbNotice(`Loaded: "${comm.title}"`);
    setTimeout(() => setDbNotice(null), 3500);
  };

  // Open the New Commercial creation modal
  const handleNewCommercial = () => {
    setShowNewModal(true);
  };

  // Called when user creates or generates a new commercial in the modal
  const handleCreateCommercialFromModal = (data: {
    title: string;
    script: string;
    scenes?: AdvertScene[];
    aspectRatio?: AspectRatio;
  }) => {
    setActiveCommercialId(null);
    setCampaignTitle(data.title);
    setScript(data.script);
    const newScenes = data.scenes && data.scenes.length === 8
      ? data.scenes
      : generateScenesFromScript(data.script, data.title);
    setScenes(newScenes);
    if (data.aspectRatio) {
      setAspectRatio(data.aspectRatio);
    }
    setActiveSceneIndex(0);
    setSceneVersion((v) => v + 1);
    // Clear old audio takes and active commercial so previous commercial never lingers
    setActiveCommercial(null);
    setTakes([]);
    setActivePage('script');
    setView('ad');
    window.scrollTo(0, 0);
    setDbNotice(`Draft created: "${data.title}". Click 'Generate Voiceover Audio' below!`);
    setTimeout(() => setDbNotice(null), 5000);
  };

  // Auto-synchronize all 8 storyboard scenes directly from the current script
  const handleGenerateScenesFromCurrentScript = () => {
    const newScenes = generateScenesFromScript(script, campaignTitle);
    handleUpdateScenes(newScenes);
    setDbNotice('Synced 8 visual storyboard scenes to match your current script!');
    setTimeout(() => setDbNotice(null), 4000);
  };

  // Delete a commercial from the database
  const handleDeleteSavedCommercial = async (id: string, title?: string) => {
    try {
      await deleteCommercial(id);
      if (activeCommercialId === id) {
        setActiveCommercialId(null);
      }
      setDbNotice(`Deleted "${title || 'commercial'}"`);
      setTimeout(() => setDbNotice(null), 3000);
    } catch (err) {
      console.error('Failed to delete commercial:', err);
    }
  };

  // Duplicate / Fork a saved commercial into a new editable variation
  const handleDuplicateCommercial = async (comm: CommercialRecord) => {
    setIsSavingDb(true);
    setDbNotice(`Duplicating "${comm.title}"...`);
    try {
      const forkedTitle = `${comm.title} (Copy)`;
      const newRecord = await saveCommercial({
        title: forkedTitle,
        script: comm.script,
        voice: comm.voice,
        voiceName: comm.voiceName || comm.voice,
        timbre: comm.timbre,
        style: comm.style,
        audioUrl: comm.audioUrl,
        duration: comm.duration,
        scenes: comm.scenes,
        aspectRatio: comm.aspectRatio || '4:5',
      });
      // Immediately load the duplicated version as active
      handleLoadSavedCommercial(newRecord);
      setDbNotice(`Duplicated & switched to "${forkedTitle}"`);
      setTimeout(() => setDbNotice(null), 3500);
    } catch (err) {
      console.error('Failed to duplicate commercial:', err);
      setDbNotice('Failed to duplicate commercial.');
      setTimeout(() => setDbNotice(null), 3500);
    } finally {
      setIsSavingDb(false);
    }
  };

  // Mode: 'video_overlay' (4:5 Social Video Focus) vs 'radio_jingle' (Retained Broadcast)
  const [playerMode, setPlayerMode] = useState<'video_overlay' | 'radio_jingle'>('video_overlay');

  // History of generated takes
  const [takes, setTakes] = useState<GeneratedCommercial[]>([]);

  // Multi-page navigation state: clean, decongested, focused views
  // Two levels: the list of saved ads (home), and inside one ad, three steps in the order the
  // work actually happens.
  type AppPage = 'script' | 'storyboard' | 'video';
  const [view, setView] = useState<'home' | 'ad'>('home');
  const [activePage, setActivePage] = useState<AppPage>('script');
  const [confirmLeave, setConfirmLeave] = useState(false);

  const selectedVoiceObj = VOICE_OPTIONS.find((v) => v.id === selectedVoice) || VOICE_OPTIONS[0];

  const handleGenerateAudio = async () => {
    if (!script.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const cleanVoice = selectedVoice.replace('_Baritone', '').replace('_Bass', '');

      const response = await fetch('/api/generate-commercial-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: script.trim(),
          voice: cleanVoice,
          style: selectedStyle,
          timbre: selectedTimbre,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${response.status})`);
      }

      const data = await response.json();

      const newTake: GeneratedCommercial = {
        id: `take-${Date.now()}`,
        audioUrl: data.audioUrl,
        duration: data.duration,
        voice: data.voice,
        voiceName: selectedVoiceObj.name,
        style: data.style,
        timbre: data.timbre || selectedTimbre,
        script: data.script,
        createdAt: Date.now(),
      };

      setActiveCommercial(newTake);
      setTakes((prev) => [newTake, ...prev]);
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate audio. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyPreset = (preset: CommercialPreset) => {
    setScript(preset.script);
    setSelectedVoice(preset.suggestedVoice);
    setSelectedStyle(preset.suggestedStyle);
    const matchedVoice = VOICE_OPTIONS.find((v) => v.id === preset.suggestedVoice);
    if (matchedVoice?.defaultPitch) {
      setSelectedTimbre(matchedVoice.defaultPitch);
    }
  };

  // Whether the open ad matches what's saved. Drives the status next to its name, the Save
  // button, and the warning when leaving with unsaved work.
  const savedAd = savedCommercials.find((c) => c.id === activeCommercialId);
  const currentState = JSON.stringify({
    title: campaignTitle,
    script,
    voice: selectedVoice,
    timbre: selectedTimbre,
    style: selectedStyle,
    scenes: JSON.stringify(scenes),
    aspectRatio,
    audioUrl: activeCommercial?.audioUrl ?? null,
  });
  const savedState = savedAd
    ? JSON.stringify({
        title: savedAd.title,
        script: savedAd.script,
        voice: savedAd.voice,
        timbre: savedAd.timbre ?? selectedTimbre,
        style: savedAd.style,
        scenes: savedAd.scenes ?? JSON.stringify(scenes),
        aspectRatio: savedAd.aspectRatio || '4:5',
        audioUrl: savedAd.audioUrl && savedAd.duration ? savedAd.audioUrl : null,
      })
    : null;
  const saveStatus: 'new' | 'saved' | 'changed' = !savedAd ? 'new' : currentState === savedState ? 'saved' : 'changed';

  const goHome = () => {
    if (saveStatus === 'saved') {
      setView('home');
      window.scrollTo(0, 0);
    } else {
      setConfirmLeave(true);
    }
  };

  const isScriptOutOfSync = Boolean(
    activeCommercial && activeCommercial.script.trim() !== script.trim()
  );

  const steps: { id: AppPage; label: string }[] = [
    { id: 'script', label: 'Script & Voiceover' },
    { id: 'storyboard', label: 'Storyboard' },
    { id: 'video', label: 'Preview & Download' },
  ];
  const goToStep = (page: AppPage) => {
    setActivePage(page);
    window.scrollTo(0, 0);
  };
  const nextStep = (page: AppPage, label: string) => (
    <div className="max-w-4xl mx-auto mt-8 flex justify-end">
      <button
        type="button"
        onClick={() => goToStep(page)}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#181614] hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
      >
        Next: {label}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FBF8F1] text-[#181614] flex flex-col font-sans selection:bg-[#E8A317]/30">
      {/* Header */}
      <header className="bg-white border-b border-[#EAE3D4] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FBF8F1] border border-[#EAE3D4] flex items-center justify-center">
              <img src="/brand/legitafrica-icon-transparent.png" alt="" className="w-6 h-6 object-contain" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-[#181614]">
              LEGIT <span className="text-[#E8A317]">AFRICA</span>{' '}
              <span className="font-semibold text-[#6B6256]">Studio</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {view === 'home' && (
              <button
                type="button"
                id="header-new-ad-btn"
                onClick={handleNewCommercial}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[#181614] bg-[#E8A317] hover:bg-[#C6860C] transition-all font-bold text-xs cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>New Ad</span>
              </button>
            )}
            <form method="post" action="/logout">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[#6B6256] hover:text-[#181614] hover:bg-[#F4EEE2] transition-all font-semibold text-xs cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>

        {/* Inside an ad: its name, whether it's saved, and the three steps */}
        {view === 'ad' && (
          <div className="border-t border-[#EAE3D4] bg-[#FBF8F1]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={goHome}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#6B6256] hover:text-[#181614] hover:bg-[#F4EEE2] transition-all cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  All ads
                </button>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  size={Math.min(50, Math.max(20, campaignTitle.length + 2))}
                  aria-label="Ad name"
                  title="Click to rename this ad"
                  className="min-w-0 font-bold text-sm text-[#181614] bg-white border border-[#EAE3D4] hover:border-[#E8A317] focus:border-[#E8A317] px-2.5 py-1.5 rounded-lg outline-none transition-colors"
                />
                <span
                  className={`text-[11px] font-semibold whitespace-nowrap ${
                    saveStatus === 'saved' ? 'text-emerald-700' : 'text-[#C6860C]'
                  }`}
                >
                  {saveStatus === 'saved' && 'Saved'}
                  {saveStatus === 'changed' && 'Unsaved changes'}
                  {saveStatus === 'new' && 'Not saved yet'}
                </span>
                {saveStatus === 'changed' && savedAd && (
                  <button
                    type="button"
                    onClick={() => handleLoadSavedCommercial(savedAd)}
                    className="text-[11px] font-semibold text-[#6B6256] hover:text-[#181614] underline whitespace-nowrap cursor-pointer"
                    title="Throw away unsaved changes and go back to the saved version"
                  >
                    Discard changes
                  </button>
                )}
              </div>
              <button
                type="button"
                id="save-ad-btn"
                onClick={() => handleSaveCurrentCommercial(campaignTitle)}
                disabled={isSavingDb || saveStatus === 'saved'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[#181614] bg-[#E8A317] hover:bg-[#C6860C] disabled:opacity-50 disabled:cursor-default transition-all font-bold text-xs cursor-pointer shadow-xs"
              >
                <Save className="w-4 h-4" />
                {isSavingDb ? 'Saving...' : 'Save'}
              </button>
            </div>

            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3 flex flex-wrap items-center gap-1.5">
              {steps.map((step, i) => (
                <React.Fragment key={step.id}>
                  {i > 0 && <ChevronRight className="w-4 h-4 text-[#DACFBE]" />}
                  <button
                    type="button"
                    id={`step-${step.id}-btn`}
                    onClick={() => goToStep(step.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activePage === step.id
                        ? 'bg-[#E8A317] text-[#181614] shadow-xs'
                        : 'bg-white text-[#6B6256] hover:text-[#181614] border border-[#EAE3D4]'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                        activePage === step.id ? 'bg-[#181614] text-white' : 'bg-[#F4EEE2] text-[#181614]'
                      }`}
                    >
                      {i + 1}
                    </span>
                    {step.label}
                  </button>
                </React.Fragment>
              ))}
            </nav>
          </div>
        )}
      </header>

      {dbNotice && (
        <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-2rem)] text-center text-xs font-bold text-[#181614] bg-[#E8A317] px-4 py-2 rounded-xl shadow-md animate-in fade-in">
          {dbNotice}
        </div>
      )}

      <main className="grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#F4EEE2] border border-[#C6860C] text-[#181614] text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#C6860C] shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs font-bold underline hover:no-underline ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {view === 'home' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-200">
            <CampaignArchiveView
              savedCommercials={savedCommercials}
              onLoadCommercial={handleLoadSavedCommercial}
              onOpenStoryboard={(comm) => {
                handleLoadSavedCommercial(comm);
                setActivePage('storyboard');
              }}
              onDuplicateCommercial={handleDuplicateCommercial}
              onDeleteCommercial={handleDeleteSavedCommercial}
              onNewCommercial={handleNewCommercial}
            />
          </div>
        )}

        {view === 'ad' && (
          <>
        {/* PAGE 1: SCRIPT & VOICE STUDIO */}
        {activePage === 'script' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
            {/* Audio Bridge Notice */}
            {activeCommercial ? (
              <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                    🎙️
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">
                      Voiceover Audio Ready ({Math.round(activeCommercial.duration)}s)
                    </h4>
                    <p className="text-[11px] text-emerald-700">
                      Narrator: {activeCommercial.voiceName} • {activeCommercial.style.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePage('video')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Preview & Download</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="bg-[#FBF8F1] border border-[#EAE3D4] p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs text-[#6B6256]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E8A317]" />
                  <span>Ready to voice this script? Click below to generate authentic Pidgin studio audio.</span>
                </div>
              </div>
            )}

            {/* Script Editor */}
            <div id="script-editor-section">
              <ScriptEditor
                script={script}
                onChangeScript={setScript}
                onApplyPreset={handleApplyPreset}
              />
            </div>

            {/* Voice & Delivery Style Selection */}
            <div className="bg-white rounded-3xl border border-[#EAE3D4] shadow-sm p-6 sm:p-7">
              <VoiceSelector
                selectedVoice={selectedVoice}
                onSelectVoice={setSelectedVoice}
                selectedStyle={selectedStyle}
                onSelectStyle={setSelectedStyle}
                selectedTimbre={selectedTimbre}
                onSelectTimbre={setSelectedTimbre}
              />

              {/* Generate Audio Action Button */}
              <div className="mt-8 pt-6 border-t border-[#EAE3D4] flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-[#6B6256]">
                  Narrator: <strong className="text-[#181614]">{selectedVoiceObj.name}</strong> •{' '}
                  <span className="capitalize">{selectedStyle.replace('_', ' ')}</span> •{' '}
                  <span className="font-semibold text-[#181614]">
                    {selectedTimbre === 'bass'
                      ? '⚡ Heavy Bass (-3.2 st)'
                      : selectedTimbre === 'baritone'
                      ? '🎙️ Deep Baritone (-1.8 st)'
                      : '🎵 Standard Pitch'}
                  </span>
                </div>

                <button
                  id="generate-commercial-audio-btn"
                  type="button"
                  onClick={handleGenerateAudio}
                  disabled={isGenerating || !script.trim()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-bold text-[#181614] bg-[#E8A317] hover:bg-[#C6860C] active:scale-98 rounded-xl shadow-xs hover:shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-[#181614]" />
                      Generating Voiceover Audio...
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      Generate Voiceover Audio
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Audio Takes History */}
            {takes.length > 1 && (
              <div className="bg-white rounded-3xl border border-[#EAE3D4] shadow-sm p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B6256] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#E8A317]" />
                    Session Audio Takes ({takes.length})
                  </h4>
                  <span className="text-[11px] text-[#6B6256]">Click to preview in video simulator</span>
                </div>

                <div className="space-y-2">
                  {takes.map((take) => {
                    const isCurrent = activeCommercial?.id === take.id;
                    return (
                      <div
                        key={take.id}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                          isCurrent
                            ? 'bg-[#FBF8F1] border-[#E8A317] font-medium ring-1 ring-[#E8A317]'
                            : 'bg-white border-[#EAE3D4] hover:bg-[#F4EEE2]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setActiveCommercial(take);
                              setActivePage('video');
                            }}
                            className="p-2 rounded-xl bg-[#F4EEE2] hover:bg-[#E8A317] text-[#181614] cursor-pointer"
                            title="Play this take in video simulator"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <div>
                            <div className="text-xs font-bold text-[#181614]">
                              Voice: {take.voiceName} • {take.style} (~{Math.round(take.duration)}s)
                            </div>
                            <div className="text-[11px] text-[#6B6256] line-clamp-1">
                              "{take.script.slice(0, 70)}..."
                            </div>
                          </div>
                        </div>

                        <a
                          href={take.audioUrl}
                          download={`legit-africa-${take.voiceName.toLowerCase()}.wav`}
                          className="p-2 text-[#6B6256] hover:text-[#181614] rounded-xl hover:bg-[#F4EEE2]"
                          title="Download take WAV"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activePage === 'script' && nextStep('storyboard', 'Storyboard')}

        {activePage === 'storyboard' && (
          <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
            <StoryboardEditor
              scenes={scenes}
              activeSceneIndex={activeSceneIndex}
              onSelectScene={handleSelectScene}
              onUpdateScene={handleUpdateScenes}
              onSyncToScript={(newScript) => setScript(newScript)}
              onResetScenes={() => handleUpdateScenes(ADVERT_SCENES)}
              onGenerateAudio={handleGenerateAudio}
              isGeneratingAudio={isGenerating}
              onGenerateScenesFromCurrentScript={handleGenerateScenesFromCurrentScript}
            />
          </div>
        )}
        {activePage === 'storyboard' && nextStep('video', 'Preview & Download')}

        {/* PAGE 2: VIDEO STUDIO */}
        {activePage === 'video' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
            {/* Top Bar for Video Studio */}
            <div className="flex flex-wrap items-center justify-between bg-white p-3 rounded-2xl border border-[#EAE3D4] shadow-xs gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#181614] ml-2">Preview Mode:</span>
                <div className="flex bg-[#F4EEE2] p-1 rounded-xl text-xs">
                  <button
                    type="button"
                    id="mode-video-overlay-btn"
                    onClick={() => setPlayerMode('video_overlay')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      playerMode === 'video_overlay'
                        ? 'bg-[#E8A317] text-[#181614] shadow-xs'
                        : 'text-[#6B6256] hover:text-[#181614]'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    📱 Social Video ({aspectRatio})
                  </button>
                  <button
                    type="button"
                    id="mode-radio-jingle-btn"
                    onClick={() => setPlayerMode('radio_jingle')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      playerMode === 'radio_jingle'
                        ? 'bg-[#E8A317] text-[#181614] shadow-xs'
                        : 'text-[#6B6256] hover:text-[#181614]'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" />
                    📻 Radio Jingle Mode
                  </button>
                </div>
              </div>

            </div>

            {/* Video Player or Visualizer */}
            {playerMode === 'video_overlay' ? (
              <SocialVideoOverlay
                audioUrl={activeCommercial?.audioUrl}
                duration={activeCommercial?.duration || 32}
                script={script}
                voiceName={activeCommercial?.voiceName || selectedVoiceObj.name}
                style={activeCommercial?.style || selectedStyle}
                scenes={scenes}
                externalSceneIndex={activeSceneIndex}
                sceneVersion={sceneVersion}
                onSceneChange={handleSceneChange}
                onGenerateAudioClick={handleGenerateAudio}
                isGeneratingAudio={isGenerating}
                isScriptOutOfSync={isScriptOutOfSync}
                aspectRatio={aspectRatio}
                onAspectRatioChange={setAspectRatio}
              />
            ) : (
              <AudioVisualizer
                audioUrl={activeCommercial?.audioUrl || ''}
                duration={activeCommercial?.duration || 32}
                script={script}
                voiceName={activeCommercial?.voiceName || selectedVoiceObj.name}
                style={activeCommercial?.style || selectedStyle}
              />
            )}
          </div>
        )}

          </>
        )}
      </main>

      <ConfirmationModal
        isOpen={confirmLeave}
        title={saveStatus === 'new' ? 'Leave without saving this ad?' : 'Leave without saving?'}
        message={
          saveStatus === 'new'
            ? 'This ad has never been saved. If you leave now, it will be lost.'
            : 'You have unsaved changes. If you leave now, they will be lost and the ad stays as it was last saved.'
        }
        confirmLabel="Leave without saving"
        cancelLabel="Stay"
        isDestructive
        onConfirm={() => {
          setConfirmLeave(false);
          setView('home');
          window.scrollTo(0, 0);
        }}
        onCancel={() => setConfirmLeave(false)}
      />

      <NewCommercialModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreateCommercial={handleCreateCommercialFromModal}
      />
    </div>
  );
}
