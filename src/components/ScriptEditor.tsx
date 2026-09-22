import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Clock,
  CheckCheck,
  Zap,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';

export const DEFAULT_SCRIPT = `You don already pay. So you sabi wetin happen.
Maybe that tailor sew your cloth sharp sharp.
Or that seller no dey pick your call again after you pay.
Right now, another person wan send money give that same seller.
Abeg, tell that person wetin you know. For Legit Africa.
Search the business. Yarn wetin happen. Good or bad.
No business fit pay us to comot honest review.
Save person money. Drop your review for Legit Africa dot com. Na free!`;

interface ScriptEditorProps {
  script: string;
  onChangeScript: (script: string) => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  script,
  onChangeScript,
}) => {
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishStyle, setPolishStyle] = useState('social_reels');

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


  return (
    <div className="bg-white rounded-2xl border border-[#EAE3D4] shadow-sm p-6 space-y-5">
      {/* Header & Preset Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EAE3D4]">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#E8A317]" />
          <h3 className="font-bold text-[#181614]">Voiceover Script & Timings</h3>
        </div>

        {/* Word and time badge */}
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono bg-[#F4EEE2] text-[#181614] px-2.5 py-1 rounded-lg">
            {words} words
          </span>
          <span className="flex items-center gap-1 font-mono font-semibold bg-[#FBF8F1] text-[#181614] border border-[#E8A317] px-2.5 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-[#E8A317]" />
            Est. ~{estimatedSeconds}s audio
          </span>
        </div>
      </div>

      {/* The sample scripts and the Reset button that used to sit here replaced the whole
          script, voice and style in one click, with nothing asked. They were taken out. */}

      {/* Script Textarea */}
      <div className="relative">
        <textarea
          id="commercial-script-textarea"
          value={script}
          onChange={(e) => onChangeScript(e.target.value)}
          rows={8}
          placeholder="Enter video voiceover script..."
          className="w-full p-4 text-[#181614] text-base leading-relaxed bg-[#FBF8F1]/60 border border-[#EAE3D4] rounded-xl focus:ring-2 focus:ring-[#E8A317] focus:border-transparent outline-hidden font-sans resize-y"
        />
        <div className="text-[11px] text-[#6B6256] mt-1 flex justify-between">
          <span>Tip: Line breaks create natural pauses in spoken Nigerian Pidgin.</span>
          <span>Target: 30-35 seconds for 4:5 Instagram & TikTok video</span>
        </div>
      </div>

      {/* AI Script Optimizer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#F4EEE2] rounded-xl border border-[#EAE3D4]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#E8A317]" />
          <span className="text-xs font-semibold text-[#181614]">AI Copywriter Polish:</span>
          <select
            id="polish-style-select"
            value={polishStyle}
            onChange={(e) => setPolishStyle(e.target.value)}
            className="text-xs bg-white border border-[#EAE3D4] rounded-lg px-2.5 py-1 text-[#181614] font-medium outline-hidden"
          >
            <option value="pidgin_blend">Authentic Nigerian Pidgin (Warm & Relatable)</option>
            <option value="social_reels">TikTok / Reels Video Hook (Viral 20s)</option>
            <option value="storytime_pov">Storytime Video POV (Relatable 30s)</option>
            <option value="cinematic_voiceover">Cinematic Documentary Voiceover</option>
            <option value="radio_30s">Standard 30s Radio Commercial Spot</option>
          </select>
        </div>

        <button
          id="polish-script-btn"
          type="button"
          onClick={handlePolishScript}
          disabled={isPolishing}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#181614] bg-[#E8A317] hover:bg-[#C6860C] rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
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
