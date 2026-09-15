import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  RotateCcw,
  Clock,
  CheckCheck,
  Zap,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import { CommercialPreset } from '../types';

export const DEFAULT_SCRIPT = `Maybe the tailor delivered on time.
Or the seller stopped picking your calls.
Now another buyer is about to pay the same seller.
Tell them what you know. On Legit Africa.
Search the business. Say what happened. Good or bad.
No business can pay to remove an honest review.
Save someone's money. Legit Africa dot com. It's free.`;

export const SOCIAL_PRESETS: CommercialPreset[] = [
  {
    id: 'original',
    title: 'Social Video Overlay (Original)',
    timing: '~25s',
    suggestedVoice: 'Fenrir_Baritone',
    suggestedStyle: 'creator_pov',
    description: 'The requested 7-line script with deep masculine baritone voiceover formatted for video background.',
    script: DEFAULT_SCRIPT,
  },
  {
    id: 'reels_hook',
    title: 'Reels / TikTok Hook',
    timing: '~18s',
    suggestedVoice: 'Charon_Bass',
    suggestedStyle: 'social_warning',
    description: 'Scroll-stopping heavy bass advisory designed to grab attention immediately.',
    script: `Ever paid a tailor and then they stop picking your calls?
Now another buyer is about to pay that exact same seller.
Tell them what you know on Legit Africa.
Search the business. Say what happened. Good or bad.
No business can pay to remove an honest review.
Save someone's money. Legit Africa dot com. It's free.`,
  },
  {
    id: 'storytime_video',
    title: 'Storytime POV Overlay',
    timing: '~28s',
    suggestedVoice: 'Fenrir_Baritone',
    suggestedStyle: 'storytime',
    description: 'Relatable storytelling baritone voiceover designed to sit beneath talking head or B-roll.',
    script: `Maybe the tailor delivered on time, neat and clean.
Or maybe you sent money and they completely ghosted you.
Right now, another person is about to make that same transfer.
Save someone's hard-earned money.
Go on Legit Africa dot com. Search the business. Share your experience.
Nobody can buy off an honest review. It's 100% free.`,
  },
  {
    id: 'pidgin_social',
    title: 'Pidgin Social Story',
    timing: '~25s',
    suggestedVoice: 'Fenrir_Baritone',
    suggestedStyle: 'creator_pov',
    description: 'Everyday relatable African street tone for TikTok/Instagram in deep baritone cadence.',
    script: `Maybe that tailor sew your cloth sharp sharp.
Or that seller stop picking your calls after payment.
Right now, another person dey about to transfer money give that same person!
Abeg, tell them wetin you know. On Legit Africa.
Search the business. Say what happened. Good or bad.
No business fit pay to delete honest review.
Save person money. Legit Africa dot com. E free die!`,
  },
];

export const BROADCAST_PRESETS: CommercialPreset[] = [
  {
    id: 'radio_30s',
    title: 'Standard 30s Radio Spot',
    timing: '~30s',
    suggestedVoice: 'Kore',
    suggestedStyle: 'commercial',
    description: 'High-clarity broadcast spot with traditional commercial announcer pacing.',
    script: DEFAULT_SCRIPT,
  },
  {
    id: 'punchy_15s',
    title: '15s Radio Bumper',
    timing: '~15s',
    suggestedVoice: 'Puck',
    suggestedStyle: 'punchy',
    description: 'High-energy quick radio hit for busy drive-time commercial slots.',
    script: `Tailor delivered late? Seller blocked your calls?
Don't let another buyer get burned.
Search any vendor. Drop an honest review.
No business can buy off a bad rating.
Save someone's money. Legit Africa dot com. It's free!`,
  },
  {
    id: 'extended_60s',
    title: '60s Broadcast Narrative',
    timing: '~50-60s',
    suggestedVoice: 'Fenrir',
    suggestedStyle: 'advocate',
    description: 'Full narrative spot highlighting everyday trade & consumer protection.',
    script: `Think about the last time you bought something online in Africa.
Maybe the tailor delivered exactly when promised, neatly packaged.
Or maybe you sent money, and suddenly the seller stopped picking your calls.
Every day, honest buyers lose hard-earned money to bad merchants, while great businesses go unnoticed.
Now, another buyer is holding their phone, about to pay that same seller.
You have the power to protect them. Tell them what you know on Legit Africa.
Simply search the business name. Share your real experience, good or bad.
Our guarantee: No business can ever pay to remove an honest review.
Protect your community. Save someone's money.
Visit Legit Africa dot com today. It's completely free.`,
  },
];

interface ScriptEditorProps {
  script: string;
  onChangeScript: (script: string) => void;
  onApplyPreset: (preset: CommercialPreset) => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  script,
  onChangeScript,
  onApplyPreset,
}) => {
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishStyle, setPolishStyle] = useState('social_reels');
  const [presetTab, setPresetTab] = useState<'social' | 'broadcast'>('social');

  const words = script.trim() ? script.trim().split(/\s+/).length : 0;
  // Natural social video voiceover pacing: ~130 words per minute (~2.15 words per second)
  const estimatedSeconds = Math.round(words / 2.15);

  const handlePolishScript = async () => {
    setIsPolishing(true);
    try {
      const res = await fetch('/api/polish-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalScript: script, targetStyle: polishStyle }),
      });
      const data = await res.json();
      if (data.script) {
        onChangeScript(data.script);
      }
    } catch (err) {
      console.error('Polish error:', err);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleReset = () => {
    onChangeScript(DEFAULT_SCRIPT);
  };

  const currentPresets = presetTab === 'social' ? SOCIAL_PRESETS : BROADCAST_PRESETS;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-5">
      {/* Header & Preset Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-700" />
          <h3 className="font-bold text-slate-900">Voiceover Script & Timings</h3>
        </div>

        {/* Word and time badge */}
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg">
            {words} words
          </span>
          <span className="flex items-center gap-1 font-mono font-semibold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5" />
            Est. ~{estimatedSeconds}s audio
          </span>
          <button
            id="reset-script-btn"
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-stone-500 hover:text-slate-900 transition-colors"
            title="Reset to original script"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Preset Category Switcher */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Script Formats
          </span>
          <div className="flex bg-stone-100 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setPresetTab('social')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                presetTab === 'social'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-stone-600 hover:text-slate-900'
              }`}
            >
              📱 Social Video Overlay
            </button>
            <button
              type="button"
              onClick={() => setPresetTab('broadcast')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                presetTab === 'broadcast'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-slate-900'
              }`}
            >
              📻 Retained Radio Jingles
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {currentPresets.map((p) => {
            const isActive = script.trim() === p.script.trim();
            return (
              <button
                key={p.id}
                id={`preset-btn-${p.id}`}
                type="button"
                onClick={() => onApplyPreset(p)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold'
                    : 'bg-stone-50/60 border-stone-200 hover:bg-stone-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{p.title}</span>
                  <span className="text-[10px] text-stone-500 font-mono">{p.timing}</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1 line-clamp-1">{p.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Script Textarea */}
      <div className="relative">
        <textarea
          id="commercial-script-textarea"
          value={script}
          onChange={(e) => onChangeScript(e.target.value)}
          rows={7}
          placeholder="Enter video voiceover script..."
          className="w-full p-4 text-slate-800 text-base leading-relaxed bg-stone-50/40 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:border-transparent outline-hidden font-sans resize-y"
        />
        <div className="text-[11px] text-stone-400 mt-1 flex justify-between">
          <span>Tip: Line breaks create natural broadcast speaking pauses in the audio.</span>
          <span>Target: 15-30 seconds for TikTok / Instagram Reels</span>
        </div>
      </div>

      {/* AI Script Optimizer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200/80">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-semibold text-slate-800">AI Copywriter Polish:</span>
          <select
            id="polish-style-select"
            value={polishStyle}
            onChange={(e) => setPolishStyle(e.target.value)}
            className="text-xs bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-slate-700 font-medium outline-hidden"
          >
            <option value="social_reels">TikTok / Reels Video Hook (Viral 20s)</option>
            <option value="storytime_pov">Storytime Video POV (Relatable 30s)</option>
            <option value="cinematic_voiceover">Cinematic Documentary Voiceover</option>
            <option value="pidgin_blend">Pidgin Urban Social Video</option>
            <option value="urgent_alert">Urgent Consumer Alert Video</option>
            <option value="radio_30s">Standard 30s Radio Commercial Spot</option>
            <option value="punchy_15s">15s Short Radio Bumper</option>
          </select>
        </div>

        <button
          id="polish-script-btn"
          type="button"
          onClick={handlePolishScript}
          disabled={isPolishing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-950 bg-amber-400 hover:bg-amber-500 rounded-lg shadow-xs transition-colors disabled:opacity-50"
        >
          {isPolishing ? (
            <>
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              Polishing...
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" />
              Optimize Script
            </>
          )}
        </button>
      </div>
    </div>
  );
};
