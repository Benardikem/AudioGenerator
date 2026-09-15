import React from 'react';
import { Mic, Sparkles, User, Award } from 'lucide-react';
import { VoiceOption, VoiceStyle } from '../types';

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'Kore',
    name: 'Amara',
    actor: 'Voice Kore',
    gender: 'Female',
    tagline: 'Warm & Authoritative Consumer Advocate',
    recommendedFor: 'Radio commercial, trusted consumer advice, clear broadcast',
  },
  {
    id: 'Puck',
    name: 'Chidi',
    actor: 'Voice Puck',
    gender: 'Male',
    tagline: 'Energetic, Vibrant & Urban Radio Host',
    recommendedFor: 'Fast-paced promo, youth demographic, engaging hook',
  },
  {
    id: 'Fenrir',
    name: 'Kofi',
    actor: 'Voice Fenrir',
    gender: 'Male',
    tagline: 'Deep, Resonant & Commanding Anchor',
    recommendedFor: 'Dramatic broadcast, serious trust message, high impact',
  },
  {
    id: 'Zephyr',
    name: 'Zola',
    actor: 'Voice Zephyr',
    gender: 'Female',
    tagline: 'Articulate, Modern & Tech-Forward',
    recommendedFor: 'Platform introduction, digital service promo, clean delivery',
  },
  {
    id: 'Charon',
    name: 'Tariq',
    actor: 'Voice Charon',
    gender: 'Male',
    tagline: 'Direct, Serious & Urgent Truth',
    recommendedFor: 'Scam warning, buyer protection alert, bold conviction',
  },
];

export const VOICE_STYLES: VoiceStyle[] = [
  {
    id: 'commercial',
    name: 'Radio Commercial',
    description: 'Dynamic radio pacing with clear emphasis on key punchlines & website call-to-action.',
  },
  {
    id: 'advocate',
    name: 'Consumer Advocate',
    description: 'Empathetic, authentic, trustworthy tone protecting everyday shoppers.',
  },
  {
    id: 'punchy',
    name: 'High-Energy Promo',
    description: 'Crisp, upbeat delivery tailored for modern drive-time radio.',
  },
  {
    id: 'dramatic',
    name: 'Dramatic Warning',
    description: 'Intense cadence spotlighting the risks of unvetted sellers.',
  },
];

interface VoiceSelectorProps {
  selectedVoice: string;
  onSelectVoice: (voiceId: string) => void;
  selectedStyle: string;
  onSelectStyle: (styleId: string) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoice,
  onSelectVoice,
  selectedStyle,
  onSelectStyle,
}) => {
  return (
    <div className="space-y-6">
      {/* Voice Selection Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-emerald-700" />
            Select Voice Narrator
          </label>
          <span className="text-xs text-stone-500">Gemini 3.1 Flash Neural TTS</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {VOICE_OPTIONS.map((voice) => {
            const isSelected = selectedVoice === voice.id;
            return (
              <button
                key={voice.id}
                id={`voice-btn-${voice.id}`}
                type="button"
                onClick={() => onSelectVoice(voice.id)}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? 'bg-emerald-50/70 border-emerald-600 shadow-xs ring-1 ring-emerald-600'
                    : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/50'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isSelected ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{voice.name}</h4>
                    <span className="text-[11px] text-stone-500">{voice.gender} • {voice.actor}</span>
                  </div>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-700 line-clamp-1">{voice.tagline}</p>
                <p className="mt-1 text-[11px] text-stone-500 line-clamp-1">{voice.recommendedFor}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Delivery Style Presets */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5 mb-3">
          <Award className="w-3.5 h-3.5 text-amber-600" />
          Broadcast Delivery Style
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {VOICE_STYLES.map((style) => {
            const isSelected = selectedStyle === style.id;
            return (
              <button
                key={style.id}
                id={`style-btn-${style.id}`}
                type="button"
                onClick={() => onSelectStyle(style.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-50 border-amber-500 text-amber-950 ring-1 ring-amber-500'
                    : 'bg-white border-stone-200 hover:border-stone-300 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold">{style.name}</div>
                <div className="text-[11px] text-stone-500 mt-1 leading-snug line-clamp-2">
                  {style.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
