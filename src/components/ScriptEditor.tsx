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

export const COMMERCIAL_PRESETS: CommercialPreset[] = [
  {
    id: 'original',
    title: 'Standard 30s Spot',
    timing: '~25-30s',
    suggestedVoice: 'Kore',
    suggestedStyle: 'commercial',
    description: 'The requested original script: crisp, balanced, and direct.',
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
    id: 'pidgin_blend',
    title: 'Pidgin Radio Blend',
    timing: '~30s',
    suggestedVoice: 'Puck',
    suggestedStyle: 'punchy',
    description: 'Vibrant local radio blend connecting with everyday street shoppers.',
    script: `Maybe that tailor sew your cloth sharp sharp.
Or that vendor block your number after payment.
Right now, another person dey about to transfer money give that same seller!
Abeg, tell them wetin you know. On Legit Africa.
Search the business. Talk your mind. Good or bad.
Nobody fit pay us make we delete honest review.
Save person money today. Legit Africa dot com. E free die!`,
  },
  {
    id: 'extended_60s',
    title: '60s Story Commercial',
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
  const [polishStyle, setPolishStyle] = useState('radio_30s');

  const words = script.trim() ? script.trim().split(/\s+/).length : 0;
  // Professional voiceover pacing: ~130 words per minute (~2.15 words per second)
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

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-5">
      {/* Header & Preset Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-700" />
          <h3 className="font-bold text-slate-900">Commercial Voiceover Script</h3>
        </div>

        {/* Word and time badge */}
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg">
            {words} words
          </span>
          <span className="flex items-center gap-1 font-mono font-semibold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5" />
            Est. ~{estimatedSeconds}s
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

      {/* Script Preset Buttons */}
      <div>
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
          Commercial Script Formats
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {COMMERCIAL_PRESETS.map((p) => {
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
                  <span className="text-xs">{p.title}</span>
                  <span className="text-[10px] text-stone-500 font-mono">{p.timing}</span>
                </div>
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
          placeholder="Enter commercial voiceover script..."
          className="w-full p-4 text-slate-800 text-base leading-relaxed bg-stone-50/40 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:border-transparent outline-hidden font-sans resize-y"
        />
        <div className="text-[11px] text-stone-400 mt-1 flex justify-between">
          <span>Tip: Line breaks create natural broadcast speaking pauses in the audio.</span>
          <span>Target: 20-35 seconds for radio spot</span>
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
            <option value="radio_30s">30s Radio Commercial Spot</option>
            <option value="punchy_15s">15s Short Bumper Cut</option>
            <option value="pidgin_blend">Pidgin Urban Radio Cut</option>
            <option value="urgent_alert">Urgent Consumer Alert</option>
            <option value="extended_60s">60s Narrative Testimonial</option>
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
