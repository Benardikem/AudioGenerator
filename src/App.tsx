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
} from 'lucide-react';
import { ScriptEditor, DEFAULT_SCRIPT } from './components/ScriptEditor';
import { VoiceSelector, VOICE_OPTIONS } from './components/VoiceSelector';
import { AudioVisualizer } from './components/AudioVisualizer';
import { GoogleTasksPanel } from './components/GoogleTasksPanel';
import { GeneratedCommercial, CommercialPreset } from './types';

export default function App() {
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [selectedStyle, setSelectedStyle] = useState('commercial');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active generated commercial
  const [activeCommercial, setActiveCommercial] = useState<GeneratedCommercial | null>(null);

  // History of generated takes
  const [takes, setTakes] = useState<GeneratedCommercial[]>([]);

  // Navigation tabs if user wants to switch between Audio Studio and Production Tasks on smaller screens
  const [activeTab, setActiveTab] = useState<'studio' | 'tasks'>('studio');

  const selectedVoiceObj = VOICE_OPTIONS.find((v) => v.id === selectedVoice) || VOICE_OPTIONS[0];

  const handleGenerateAudio = async () => {
    if (!script.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-commercial-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: script.trim(),
          voice: selectedVoice,
          style: selectedStyle,
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
        script: data.script,
        createdAt: Date.now(),
      };

      setActiveCommercial(newTake);
      setTakes((prev) => [newTake, ...prev]);
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate commercial audio. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyPreset = (preset: CommercialPreset) => {
    setScript(preset.script);
    setSelectedVoice(preset.suggestedVoice);
    setSelectedStyle(preset.suggestedStyle);
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
                  Commercial Studio
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 hidden sm:block">
                Broadcast Voiceover Generator & Ad Production Manager
              </p>
            </div>
          </div>

          {/* Quick tab toggle for mobile / tab switching */}
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
              <Radio className="w-3.5 h-3.5" />
              Audio Studio
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
      </header>

      {/* Hero Banner Sub-Header */}
      <section className="bg-emerald-800 text-emerald-50 py-4 px-4 sm:px-6 lg:px-8 border-b border-emerald-900">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                "Search the business. Say what happened. Good or bad."
              </h2>
              <p className="text-xs text-emerald-200">
                Official radio campaign for LegitAfrica.com — No business can pay to remove an honest review.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-emerald-100">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              Neural 24kHz Audio
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              Google Tasks Synced
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
            {/* 1. Master Audio Player (Displayed if an audio take exists) */}
            {activeCommercial ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-emerald-700" />
                    Current Broadcast Master
                  </span>
                  <span className="text-xs text-stone-500 font-mono">
                    Take generated {new Date(activeCommercial.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <AudioVisualizer
                  audioUrl={activeCommercial.audioUrl}
                  duration={activeCommercial.duration}
                  script={activeCommercial.script}
                  voiceName={activeCommercial.voiceName}
                  style={activeCommercial.style}
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-dashed border-stone-300 p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Ready to Generate Commercial Audio
                  </h3>
                  <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 leading-relaxed">
                    Review the Legit Africa script below, choose your narrator and broadcast style, then click
                    "Generate Commercial Audio" to synthesize your broadcast WAV master.
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
              />

              {/* Generate Commercial Action Button */}
              <div className="mt-8 pt-6 border-t border-stone-100 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-stone-500">
                  Selected Narrator: <strong className="text-slate-800">{selectedVoiceObj.name}</strong> •{' '}
                  <span className="capitalize">{selectedStyle}</span> delivery
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
                      Synthesizing Commercial Audio...
                    </>
                  ) : (
                    <>
                      <Radio className="w-4 h-4" />
                      Generate Commercial Audio
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 4. Commercial Takes History */}
            {takes.length > 1 && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    Previous Commercial Takes ({takes.length})
                  </h4>
                  <span className="text-[11px] text-stone-400">Click to load into player</span>
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
                            title="Play this take"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <div>
                            <div className="text-xs font-bold text-slate-800">
                              Voice: {take.voiceName} • {take.style} cut (~{take.duration}s)
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

          {/* Right Column (Google Tasks & Campaign Production Strategy) */}
          <div className={`space-y-6 ${activeTab === 'tasks' ? 'lg:col-span-5' : 'hidden lg:block lg:col-span-5'}`}>
            {/* Google Tasks Panel */}
            <GoogleTasksPanel currentCommercialTitle="Legit Africa 30s Ad" />

            {/* Campaign Script Breakdown & Radio Specs */}
            <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-stone-800">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">
                  Legit Africa Commercial Strategy
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700">
                  <div className="font-bold text-amber-300 mb-1">
                    1. The Relatable Hook
                  </div>
                  <p className="text-stone-300 leading-relaxed italic">
                    "Maybe the tailor delivered on time. Or the seller stopped picking your calls."
                  </p>
                  <p className="text-stone-400 text-[11px] mt-1">
                    Establishes instant emotional connection with real daily African consumer friction.
                  </p>
                </div>

                <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700">
                  <div className="font-bold text-amber-300 mb-1">
                    2. The Impending Danger
                  </div>
                  <p className="text-stone-300 leading-relaxed italic">
                    "Now another buyer is about to pay the same seller."
                  </p>
                  <p className="text-stone-400 text-[11px] mt-1">
                    Urgency triggers protective instincts to help a fellow buyer before they lose money.
                  </p>
                </div>

                <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700">
                  <div className="font-bold text-amber-300 mb-1">
                    3. The Solution & Ironclad Guarantee
                  </div>
                  <p className="text-stone-300 leading-relaxed italic">
                    "Search the business. Say what happened. Good or bad. No business can pay to remove an honest review."
                  </p>
                  <p className="text-stone-400 text-[11px] mt-1">
                    Builds ultimate trust by clarifying that paid review suppression is impossible.
                  </p>
                </div>

                <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700">
                  <div className="font-bold text-amber-300 mb-1">
                    4. The Actionable Outro
                  </div>
                  <p className="text-stone-300 leading-relaxed italic">
                    "Save someone's money. Legit Africa dot com. It's free."
                  </p>
                  <p className="text-stone-400 text-[11px] mt-1">
                    Clear altruistic call to action + memorable web address.
                  </p>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-stone-400 flex items-center justify-between">
                <span>Recommended Broadcast Format: WAV 24kHz</span>
                <span>Pacing: 25–30 Seconds</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-stone-200/60 border-t border-stone-300 py-6 text-center text-xs text-stone-600">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-800">
            Legit Africa Audio Commercial Studio
          </p>
          <p className="text-stone-500">
            Powered by Gemini Neural Speech & Google Tasks Workspace Integration.
          </p>
        </div>
      </footer>
    </div>
  );
}
