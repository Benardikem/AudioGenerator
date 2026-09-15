import React, { useState } from 'react';
import {
  Radio,
  Sparkles,
  Volume2,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Clock,
  History,
  Play,
  Download,
  Trash2,
  ArrowRight,
  ListTodo,
  Smartphone,
  Video,
  Subtitles,
  GitBranch,
  Github,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { ScriptEditor, DEFAULT_SCRIPT } from './components/ScriptEditor';
import { VoiceSelector, VOICE_OPTIONS } from './components/VoiceSelector';
import { AudioVisualizer } from './components/AudioVisualizer';
import { SocialVideoOverlay } from './components/SocialVideoOverlay';
import { GoogleTasksPanel } from './components/GoogleTasksPanel';
import { GeneratedCommercial, CommercialPreset } from './types';

export default function App() {
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  // Default to the new deep masculine baritone voice (Obinna / Fenrir)
  const [selectedVoice, setSelectedVoice] = useState('Fenrir_Baritone');
  const [selectedTimbre, setSelectedTimbre] = useState<'standard' | 'baritone' | 'bass'>('baritone');
  // Default to creator_pov for social media video background audio
  const [selectedStyle, setSelectedStyle] = useState('creator_pov');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGitModal, setShowGitModal] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);

  // Active generated commercial
  const [activeCommercial, setActiveCommercial] = useState<GeneratedCommercial | null>(null);

  // Mode: 'video_overlay' (Active Social Media Focus) vs 'radio_jingle' (Retained Broadcast)
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
      // Map UI voice ID to backend Gemini prebuilt voice
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

  return (
    <div className="min-h-screen bg-stone-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Brand Bar */}
      <header className="bg-emerald-900 text-white border-b border-emerald-950 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black text-lg shadow-sm">
              LA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-stone-50">
                  Legit Africa
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-800 text-amber-300 border border-emerald-700">
                  Social Video Audio Studio
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 hidden sm:block">
                Social Media Video Overlay Voiceover & Campaign Production Studio
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="git-repo-btn"
              onClick={() => setShowGitModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-emerald-200 hover:text-white bg-emerald-950/60 hover:bg-emerald-800 transition-all font-semibold text-xs border border-emerald-800/80 cursor-pointer shadow-xs"
            >
              <Github className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Push to GitHub</span>
            </button>

            {/* Tab toggle */}
            <div className="flex items-center gap-1 bg-emerald-950/80 p-1 rounded-xl border border-emerald-800 text-xs">
              <button
                id="tab-studio-btn"
                onClick={() => setActiveTab('studio')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'studio'
                    ? 'bg-emerald-800 text-white shadow-xs font-bold'
                    : 'text-emerald-300 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Video Audio Studio
              </button>
              <button
                id="tab-tasks-btn"
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'tasks'
                    ? 'bg-emerald-800 text-white shadow-xs font-bold'
                    : 'text-emerald-300 hover:text-white'
                }`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                Google Tasks
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Purpose Banner: Highlights the new Social Media Video focus and retained templates */}
      <section className="bg-emerald-800 text-emerald-50 py-4 px-4 sm:px-6 lg:px-8 border-b border-emerald-900">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Video className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Social Media Background Audio for Video Overlays
              </h2>
              <p className="text-xs text-emerald-200">
                Natural, conversational voiceover paced to sit seamlessly under TikTok, Reels, and YouTube Shorts footage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-emerald-100">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              9:16 Video Simulator
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              SRT Subtitles Export
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              Radio Templates Retained
            </span>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs font-bold underline hover:no-underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (Main Studio Controls & Active Audio) */}
          <div className={`space-y-6 ${activeTab === 'studio' ? 'lg:col-span-7' : 'hidden lg:block lg:col-span-7'}`}>
            {/* 1. Active Audio & Video Player */}
            {activeCommercial ? (
              <div className="space-y-3">
                {/* Mode Selector between 9:16 Social Video Overlay and Radio Jingle Studio */}
                <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-stone-200 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 ml-2">Preview Experience:</span>
                    <div className="flex bg-stone-100 p-1 rounded-lg text-xs">
                      <button
                        type="button"
                        id="mode-video-overlay-btn"
                        onClick={() => setPlayerMode('video_overlay')}
                        className={`flex items-center gap-1 px-3 py-1 rounded-md font-semibold transition-all ${
                          playerMode === 'video_overlay'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'text-stone-600 hover:text-slate-900'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        📱 9:16 Social Video Overlay (Active)
                      </button>
                      <button
                        type="button"
                        id="mode-radio-jingle-btn"
                        onClick={() => setPlayerMode('radio_jingle')}
                        className={`flex items-center gap-1 px-3 py-1 rounded-md font-semibold transition-all ${
                          playerMode === 'radio_jingle'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-stone-600 hover:text-slate-900'
                        }`}
                      >
                        <Radio className="w-3.5 h-3.5" />
                        📻 Radio Jingle Player (Retained)
                      </button>
                    </div>
                  </div>

                  <span className="text-xs text-stone-500 font-mono hidden sm:inline mr-2">
                    {new Date(activeCommercial.createdAt).toLocaleTimeString()}
                  </span>
                </div>

                {playerMode === 'video_overlay' ? (
                  <SocialVideoOverlay
                    audioUrl={activeCommercial.audioUrl}
                    duration={activeCommercial.duration}
                    script={activeCommercial.script}
                    voiceName={activeCommercial.voiceName}
                    style={activeCommercial.style}
                  />
                ) : (
                  <AudioVisualizer
                    audioUrl={activeCommercial.audioUrl}
                    duration={activeCommercial.duration}
                    script={activeCommercial.script}
                    voiceName={activeCommercial.voiceName}
                    style={activeCommercial.style}
                  />
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-dashed border-emerald-300/80 bg-emerald-50/20 p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <Smartphone className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Ready to Generate Social Media Video Background Audio
                  </h3>
                  <p className="text-xs text-stone-600 max-w-md mx-auto mt-1 leading-relaxed">
                    Choose a natural creator voice below, select your TikTok/Reels delivery style, and click
                    <strong> "Generate Voiceover Audio"</strong>. You can then preview it running over video footage with live kinetic captions!
                  </p>
                </div>
              </div>
            )}

            {/* 2. Script Editor */}
            <ScriptEditor
              script={script}
              onChangeScript={setScript}
              onApplyPreset={handleApplyPreset}
            />

            {/* 3. Voice & Delivery Style Selection */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
              <VoiceSelector
                selectedVoice={selectedVoice}
                onSelectVoice={setSelectedVoice}
                selectedStyle={selectedStyle}
                onSelectStyle={setSelectedStyle}
                selectedTimbre={selectedTimbre}
                onSelectTimbre={setSelectedTimbre}
              />

              {/* Generate Audio Action Button */}
              <div className="mt-8 pt-6 border-t border-stone-100 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-stone-500">
                  Selected Narrator: <strong className="text-slate-800">{selectedVoiceObj.name}</strong> •{' '}
                  <span className="capitalize">{selectedStyle.replace('_', ' ')}</span> •{' '}
                  <span className="font-semibold text-emerald-800">
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
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-98 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
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
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    Previous Audio Takes ({takes.length})
                  </h4>
                  <span className="text-[11px] text-stone-400">Click to preview in video player</span>
                </div>

                <div className="space-y-2">
                  {takes.map((take) => {
                    const isCurrent = activeCommercial?.id === take.id;
                    return (
                      <div
                        key={take.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-emerald-50 border-emerald-400 font-medium'
                            : 'bg-stone-50/70 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setActiveCommercial(take)}
                            className="p-1.5 rounded-lg bg-white border border-stone-200 hover:border-emerald-600 text-emerald-800"
                            title="Play this take in video simulator"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <div>
                            <div className="text-xs font-bold text-slate-800">
                              Voice: {take.voiceName} • {take.style} (~{take.duration}s)
                            </div>
                            <div className="text-[11px] text-stone-500 line-clamp-1">
                              "{take.script.slice(0, 70)}..."
                            </div>
                          </div>
                        </div>

                        <a
                          href={take.audioUrl}
                          download={`legit-africa-${take.voiceName.toLowerCase()}.wav`}
                          className="p-1.5 text-stone-500 hover:text-slate-800 rounded-lg"
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

          {/* Right Column (Google Tasks & Social Video Campaign Strategy) */}
          <div className={`space-y-6 ${activeTab === 'tasks' ? 'lg:col-span-5' : 'hidden lg:block lg:col-span-5'}`}>
            {/* Google Tasks Panel */}
            <GoogleTasksPanel currentCommercialTitle="Legit Africa Social Video" />

            {/* Social Media Video Overlay Workflow & Strategy Guide */}
            <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-stone-800">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">
                  Social Video Overlay & B-Roll Strategy
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700">
                  <div className="font-bold text-amber-300 mb-1">
                    1. 0s–3s: The Relatable Visual Hook
                  </div>
                  <p className="text-stone-300 leading-relaxed italic">
                    "Maybe the tailor delivered on time. Or the seller stopped picking your calls."
                  </p>
                  <p className="text-stone-400 text-[11px] mt-1">
                    <strong>Suggested Video Footage:</strong> Close-up shot of hands measuring cloth, or POV screen recording of WhatsApp chat with unread checks.
                  </p>
                </div>

                <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700">
                  <div className="font-bold text-amber-300 mb-1">
                    2. 3s–8s: The Danger of Silent Unverified Trade
                  </div>
                  <p className="text-stone-300 leading-relaxed italic">
                    "Now another buyer is about to pay the same seller."
                  </p>
                  <p className="text-stone-400 text-[11px] mt-1">
                    <strong>Suggested Video Footage:</strong> A customer holding their smartphone with banking app open ready to hit 'Transfer'.
                  </p>
                </div>

                <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700">
                  <div className="font-bold text-amber-300 mb-1">
                    3. 8s–18s: The Ironclad Trust Guarantee
                  </div>
                  <p className="text-stone-300 leading-relaxed italic">
                    "Tell them what you know. On Legit Africa. Search the business. Say what happened. Good or bad. No business can pay to remove an honest review."
                  </p>
                  <p className="text-stone-400 text-[11px] mt-1">
                    <strong>Suggested Video Footage:</strong> Screen recording of legitafrica.com search bar typing the vendor name and showing real customer reviews.
                  </p>
                </div>

                <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700">
                  <div className="font-bold text-amber-300 mb-1">
                    4. 18s–25s: Outro & Call to Action
                  </div>
                  <p className="text-stone-300 leading-relaxed italic">
                    "Save someone's money. Legit Africa dot com. It's free."
                  </p>
                  <p className="text-stone-400 text-[11px] mt-1">
                    <strong>Suggested Video Footage:</strong> Clean graphic card of LegitAfrica.com logo with "100% Free for Everyone".
                  </p>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-stone-400 flex items-center justify-between border-t border-stone-800">
                <span>Video Editor Export: 24kHz WAV + .SRT</span>
                <span>Aspect Ratio: 9:16 Vertical</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-stone-200/60 border-t border-stone-300 py-6 text-center text-xs text-stone-600">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-800">
            Legit Africa Social Video Voiceover Studio
          </p>
          <p className="text-stone-500">
            Engineered for TikTok, Instagram Reels, and Shorts • Radio templates retained for future broadcast.
          </p>
        </div>
      </footer>

      {/* Push to GitHub Modal */}
      {showGitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Github className="w-5 h-5 text-slate-900" />
                <h3 className="text-base font-bold text-slate-900">Push to Your GitHub Repository</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGitModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-600">
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 space-y-1">
                <strong className="block font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Method 1: Built-in 1-Click AI Studio Export (Recommended)
                </strong>
                <p className="text-emerald-900 leading-relaxed">
                  Look at the top-right corner of your AI Studio interface. Click the <strong>Settings (⚙️)</strong> icon or project menu, select <strong>"Export to GitHub"</strong>, and sign in to link your GitHub account. AI Studio will automatically push all your files and commits!
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="font-bold text-slate-800 flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-slate-700" />
                    Method 2: Command Line Git Push
                  </strong>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git\ngit branch -M main\ngit push -u origin main`);
                      setCopiedCommand(true);
                      setTimeout(() => setCopiedCommand(false), 2500);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    {copiedCommand ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCommand ? 'Copied!' : 'Copy Commands'}
                  </button>
                </div>
                <pre className="p-2.5 bg-slate-900 text-emerald-300 font-mono text-[11px] rounded-lg overflow-x-auto select-all">
{`git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main`}
                </pre>
                <p className="text-[11px] text-stone-500 leading-normal">
                  In your terminal, replace <code>YOUR_USERNAME/YOUR_REPO</code> with your GitHub repository link to sync everything immediately.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowGitModal(false)}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

