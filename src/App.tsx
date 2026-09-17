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
} from 'lucide-react';
import { ScriptEditor, DEFAULT_SCRIPT } from './components/ScriptEditor';
import { VoiceSelector, VOICE_OPTIONS } from './components/VoiceSelector';
import { AudioVisualizer } from './components/AudioVisualizer';
import { SocialVideoOverlay } from './components/SocialVideoOverlay';
import { StoryboardEditor } from './components/StoryboardEditor';
import { GoogleTasksPanel } from './components/GoogleTasksPanel';
import { GeneratedCommercial, CommercialPreset, AdvertScene, AspectRatio } from './types';
import { BRAND_COLORS, ADVERT_SCENES } from './data/advertScenes';
import { CommercialsDrawer } from './components/CommercialsDrawer';
import {
  CommercialRecord,
  getSavedCommercials,
  subscribeToSavedCommercials,
  saveCommercial,
  deleteCommercial,
} from './lib/commercialsDb';
import { testConnection } from './lib/firebase';
import { FolderOpen, Save } from 'lucide-react';

export default function App() {
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  // Default to the deep masculine baritone voice (Obinna / Fenrir)
  const [selectedVoice, setSelectedVoice] = useState('Fenrir_Baritone');
  const [selectedTimbre, setSelectedTimbre] = useState<'standard' | 'baritone' | 'bass'>('baritone');
  // Default to pidgin_warm for authentic Nigerian Pidgin video background audio
  const [selectedStyle, setSelectedStyle] = useState('pidgin_warm');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGitModal, setShowGitModal] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [dbNotice, setDbNotice] = useState<string | null>(null);

  // Initialize and subscribe to Firestore saved commercials
  useEffect(() => {
    testConnection();
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
      setDbNotice('Campaign saved to database successfully!');
      setTimeout(() => setDbNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to save commercial:', err);
      setDbNotice('Failed to save to database. Check connection.');
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
      setTakes((prev) => [loadedTake, ...prev.filter((t) => t.id !== loadedTake.id)]);
    }

    setDbNotice(`Loaded: "${comm.title}"`);
    setTimeout(() => setDbNotice(null), 3500);
  };

  // Create a brand new commercial (resets to fresh state ready for title)
  const handleNewCommercial = () => {
    setActiveCommercialId(null);
    setCampaignTitle('New LegitAfrica Commercial');
    setScript(DEFAULT_SCRIPT);
    setScenes(ADVERT_SCENES);
    setActiveSceneIndex(0);
    setSceneVersion((v) => v + 1);
    setActiveCommercial(null);
    setDbNotice('Started new commercial draft.');
    setTimeout(() => setDbNotice(null), 3000);
  };

  // Delete a commercial from the database
  const handleDeleteSavedCommercial = async (id: string) => {
    try {
      await deleteCommercial(id);
      if (activeCommercialId === id) {
        setActiveCommercialId(null);
      }
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

  // Navigation tabs for smaller screens or switching views
  const [activeTab, setActiveTab] = useState<'studio' | 'tasks'>('studio');

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

  // Automatically generate official Nigerian Pidgin Baritone commercial voiceover on initial load so video has audio immediately
  const hasAutoGeneratedRef = useRef(false);
  useEffect(() => {
    if (!hasAutoGeneratedRef.current && !activeCommercial) {
      hasAutoGeneratedRef.current = true;
      handleGenerateAudio();
    }
  }, []);

  const handleApplyPreset = (preset: CommercialPreset) => {
    setScript(preset.script);
    setSelectedVoice(preset.suggestedVoice);
    setSelectedStyle(preset.suggestedStyle);
    const matchedVoice = VOICE_OPTIONS.find((v) => v.id === preset.suggestedVoice);
    if (matchedVoice?.defaultPitch) {
      setSelectedTimbre(matchedVoice.defaultPitch);
    }
  };

  const isScriptOutOfSync = Boolean(
    activeCommercial && activeCommercial.script.trim() !== script.trim()
  );

  return (
    <div className="min-h-screen bg-[#FBF8F1] text-[#181614] flex flex-col font-sans selection:bg-[#E8A317]/30">
      {/* Top Brand Bar */}
      <header className="bg-white border-b border-[#EAE3D4] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#FBF8F1] border border-[#EAE3D4] flex items-center justify-center shadow-xs">
              <img
                src="/brand/legitafrica-icon-transparent.png"
                alt="LegitAfrica Kudu Logo"
                className="w-7 h-7 object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-[#181614]">
                  LEGIT <span className="text-[#E8A317]">AFRICA</span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F4EEE2] text-[#181614] border border-[#EAE3D4]">
                  1080 × 1350 (4:5)
                </span>
              </div>
              <p className="text-[11px] text-[#6B6256] hidden sm:block">
                Official Commercial Video Advert & Background Audio Generator
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Database Campaign Drawer Toggle */}
            <button
              type="button"
              id="campaigns-archive-btn"
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[#181614] bg-[#E8A317]/15 hover:bg-[#E8A317]/30 border border-[#E8A317]/50 transition-all font-bold text-xs cursor-pointer shadow-xs"
              title="Open saved commercials & history database"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#C6860C]" />
              <span className="hidden sm:inline">Campaigns</span>
              {savedCommercials.length > 0 && (
                <span className="bg-[#181614] text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {savedCommercials.length}
                </span>
              )}
            </button>

            {/* Quick Save button */}
            <button
              type="button"
              id="quick-save-btn"
              onClick={() => handleSaveCurrentCommercial(campaignTitle)}
              disabled={isSavingDb}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[#181614] bg-[#F4EEE2] hover:bg-[#EAE3D4] border border-[#EAE3D4] transition-all font-semibold text-xs cursor-pointer shadow-xs"
              title="Save changes to current campaign"
            >
              <Save className="w-3.5 h-3.5 text-[#C6860C]" />
              <span className="hidden md:inline">{isSavingDb ? 'Saving...' : 'Save'}</span>
            </button>

            <button
              type="button"
              id="git-repo-btn"
              onClick={() => setShowGitModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[#181614] hover:text-[#181614] bg-[#F4EEE2] hover:bg-[#EAE3D4] transition-all font-semibold text-xs border border-[#EAE3D4] cursor-pointer shadow-xs"
            >
              <Github className="w-3.5 h-3.5 text-[#E8A317]" />
              <span className="hidden lg:inline">Push to GitHub</span>
            </button>

            {/* Tab toggle */}
            <div className="flex items-center gap-1 bg-[#F4EEE2] p-1 rounded-xl border border-[#EAE3D4] text-xs">
              <button
                id="tab-studio-btn"
                onClick={() => setActiveTab('studio')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'studio'
                    ? 'bg-[#E8A317] text-[#181614] shadow-xs font-bold'
                    : 'text-[#6B6256] hover:text-[#181614]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                4:5 Video Studio
              </button>
              <button
                id="tab-tasks-btn"
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'tasks'
                    ? 'bg-[#E8A317] text-[#181614] shadow-xs font-bold'
                    : 'text-[#6B6256] hover:text-[#181614]'
                }`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                Production Tasks
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Purpose Banner strictly in brand palette */}
      <section className="bg-[#F4EEE2] border-b border-[#EAE3D4] py-2.5 sm:py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-[#EAE3D4] flex items-center justify-center text-[#E8A317] shrink-0">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  className="font-bold text-xs sm:text-sm text-[#181614] bg-transparent hover:bg-white/60 focus:bg-white border-b border-transparent focus:border-[#E8A317] px-1 py-0.5 rounded outline-none transition-colors"
                  title="Click to rename commercial title"
                />
                {activeCommercialId && (
                  <span className="text-[10px] font-mono text-[#6B6256] bg-white/70 px-1.5 py-0.5 rounded border border-[#DACFBE]">
                    Saved in Cloud DB
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#6B6256]">
                Warm Nigerian Pidgin narration • Burned-in captions near the bottom • 8 timed storyboard scenes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#6B6256] flex-wrap">
            {dbNotice && (
              <span className="text-[11px] font-bold text-[#181614] bg-[#E8A317] px-2.5 py-1 rounded-lg animate-in fade-in">
                {dbNotice}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#E8A317]" />
              Exact 4:5 Portrait
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#E8A317]" />
              30 FPS Fast H.264
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#E8A317]" />
              Cloud Database
            </span>
          </div>
        </div>
      </section>

      {/* Main Container */}
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (Main Studio Controls & Active Audio) */}
          <div className={`space-y-6 ${activeTab === 'studio' ? 'lg:col-span-7' : 'hidden lg:block lg:col-span-7'}`}>
            {/* 1. Active Audio & Video Player (With Live Preview Mode) */}
            <div className="space-y-3">
              {/* Mode Selector between 4:5 Social Video and Radio Jingle */}
              <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-[#EAE3D4] shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#181614] ml-2">Preview Mode:</span>
                  <div className="flex bg-[#F4EEE2] p-1 rounded-lg text-xs">
                    <button
                      type="button"
                      id="mode-video-overlay-btn"
                      onClick={() => setPlayerMode('video_overlay')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        playerMode === 'video_overlay'
                          ? 'bg-[#E8A317] text-[#181614] shadow-xs'
                          : 'text-[#6B6256] hover:text-[#181614]'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      📱 Social Video Player ({aspectRatio})
                    </button>
                    <button
                      type="button"
                      id="mode-radio-jingle-btn"
                      onClick={() => setPlayerMode('radio_jingle')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        playerMode === 'radio_jingle'
                          ? 'bg-[#E8A317] text-[#181614] shadow-xs'
                          : 'text-[#6B6256] hover:text-[#181614]'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5" />
                      📻 Radio Jingle Mode (Retained)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mr-2">
                  {activeCommercial ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#E8A317] text-[#181614]">
                      🎙️ Audio Recorded
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#F4EEE2] text-[#6B6256] border border-[#EAE3D4]">
                      👁️ Storyboard Preview Mode
                    </span>
                  )}
                </div>
              </div>

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

            {/* 2. Script Editor */}
            <ScriptEditor
              script={script}
              onChangeScript={setScript}
              onApplyPreset={handleApplyPreset}
            />

            {/* 3. Voice & Delivery Style Selection */}
            <div className="bg-white rounded-2xl border border-[#EAE3D4] shadow-sm p-6">
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

            {/* 4. Audio Takes History */}
            {takes.length > 1 && (
              <div className="bg-white rounded-2xl border border-[#EAE3D4] shadow-sm p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B6256] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#E8A317]" />
                    Previous Audio Takes ({takes.length})
                  </h4>
                  <span className="text-[11px] text-[#6B6256]">Click to preview in video player</span>
                </div>

                <div className="space-y-2">
                  {takes.map((take) => {
                    const isCurrent = activeCommercial?.id === take.id;
                    return (
                      <div
                        key={take.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-[#FBF8F1] border-[#E8A317] font-medium ring-1 ring-[#E8A317]'
                            : 'bg-white border-[#EAE3D4] hover:bg-[#F4EEE2]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setActiveCommercial(take)}
                            className="p-1.5 rounded-lg bg-[#F4EEE2] hover:bg-[#E8A317] text-[#181614] cursor-pointer"
                            title="Play this take in video simulator"
                          >
                            <Play className="w-3.5 h-3.5" />
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
                          className="p-1.5 text-[#6B6256] hover:text-[#181614] rounded-lg"
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

          {/* Right Column (Google Tasks & Creative Brief Storyboard Reference) */}
          <div className={`space-y-6 ${activeTab === 'tasks' ? 'lg:col-span-5' : 'hidden lg:block lg:col-span-5'}`}>
            {/* Google Tasks Panel */}
            <GoogleTasksPanel currentCommercialTitle="Legit Africa 4:5 Social Video" />

            {/* Interactive Creative Brief & Storyboard Studio */}
            <StoryboardEditor
              scenes={scenes}
              activeSceneIndex={activeSceneIndex}
              onSelectScene={handleSelectScene}
              onUpdateScene={handleUpdateScenes}
              onSyncToScript={(newScript) => setScript(newScript)}
              onResetScenes={() => handleUpdateScenes(ADVERT_SCENES)}
              onGenerateAudio={handleGenerateAudio}
              isGeneratingAudio={isGenerating}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-[#F4EEE2] border-t border-[#EAE3D4] py-6 text-center text-xs text-[#6B6256]">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-bold text-[#181614]">
            Legit Africa Commercial Video & Voiceover Studio
          </p>
          <p className="text-[#6B6256]">
            1080 × 1350 (4:5 Portrait) • Nigerian Pidgin Narration • Burned-in Captions • Radio templates retained
          </p>
        </div>
      </footer>

      {/* Push to GitHub Modal strictly in brand palette */}
      {showGitModal && (
        <div className="fixed inset-0 z-50 bg-[#181614]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#EAE3D4] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE3D4] pb-3">
              <div className="flex items-center gap-2">
                <Github className="w-5 h-5 text-[#181614]" />
                <h3 className="text-base font-bold text-[#181614]">Push to Your GitHub Repository</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGitModal(false)}
                className="text-[#6B6256] hover:text-[#181614] p-1 rounded-lg hover:bg-[#F4EEE2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#6B6256]">
              <div className="p-3.5 bg-[#FBF8F1] rounded-2xl border border-[#EAE3D4] text-[#181614] space-y-1">
                <strong className="block font-bold text-[#181614] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#E8A317]" />
                  Method 1: Built-in 1-Click AI Studio Export (Recommended)
                </strong>
                <p className="text-[#6B6256] leading-relaxed">
                  In the top-right corner of Google AI Studio, click the <strong>Settings (⚙️)</strong> icon or project menu, select <strong>"Export to GitHub"</strong>, and sign in to link your GitHub account. All your commits, brand assets, and 4:5 video engine will be pushed automatically!
                </p>
              </div>

              <div className="p-3.5 bg-[#F4EEE2] rounded-2xl border border-[#EAE3D4] space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="font-bold text-[#181614] flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-[#181614]" />
                    Method 2: Command Line Git Push
                  </strong>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git\ngit branch -M main\ngit push -u origin main`);
                      setCopiedCommand(true);
                      setTimeout(() => setCopiedCommand(false), 2500);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#181614] bg-[#E8A317] hover:bg-[#C6860C] px-2 py-1 rounded-lg cursor-pointer"
                  >
                    {copiedCommand ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCommand ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="p-3 bg-[#181614] text-[#FBF8F1] font-mono text-[11px] rounded-xl overflow-x-auto select-all">
{`git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main`}
                </pre>
                <p className="text-[11px] text-[#6B6256]">
                  Replace <code>YOUR_USERNAME/YOUR_REPO</code> with your repository URL.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowGitModal(false)}
                className="px-5 py-2.5 bg-[#181614] hover:bg-black text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Database Commercials Drawer */}
      <CommercialsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        commercials={savedCommercials}
        activeCommercialId={activeCommercialId}
        onLoadCommercial={handleLoadSavedCommercial}
        onSaveCurrent={handleSaveCurrentCommercial}
        onDeleteCommercial={handleDeleteSavedCommercial}
        onDuplicateCommercial={handleDuplicateCommercial}
        onNewCommercial={handleNewCommercial}
        isSaving={isSavingDb}
        currentTitle={campaignTitle}
      />
    </div>
  );
}
