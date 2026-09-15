import React from 'react';
import { Mic, Sparkles, User, Award, Sliders } from 'lucide-react';
import { VoiceOption, VoiceStyle } from '../types';

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'Fenrir_Baritone',
    name: 'Obinna',
    actor: 'Voice Fenrir (Baritone Tuning)',
    gender: 'Male',
    tagline: 'Deep, Resonant & Masculine Baritone Voice',
    recommendedFor: 'Natural, deep masculine voiceover with low chest resonance for social video and consumer reviews',
    isBaritone: true,
    defaultPitch: 'baritone',
  },
  {
    id: 'Charon_Bass',
    name: 'Babatunde',
    actor: 'Voice Charon (Bass Tuning)',
    gender: 'Male',
    tagline: 'Heavy Bass, Commanding Gravitas & Authority',
    recommendedFor: 'Deepest masculine pitch with serious weight — no light or feminine undertones',
    isBaritone: true,
    defaultPitch: 'bass',
  },
  {
    id: 'Fenrir',
    name: 'Kofi',
    actor: 'Voice Fenrir',
    gender: 'Male',
    tagline: 'Commanding African Male Anchor',
    recommendedFor: 'Dramatic broadcast, serious trust message, high impact',
    isBaritone: true,
    defaultPitch: 'baritone',
  },
  {
    id: 'Charon',
    name: 'Tariq',
    actor: 'Voice Charon',
    gender: 'Male',
    tagline: 'Direct, Serious Consumer Protection',
    recommendedFor: 'Scam warning, buyer protection alert, bold conviction',
    isBaritone: false,
    defaultPitch: 'baritone',
  },
  {
    id: 'Puck',
    name: 'Chidi',
    actor: 'Voice Puck',
    gender: 'Male',
    tagline: 'Energetic, Vibrant & Urban Radio Host',
    recommendedFor: 'Fast-paced promo, youth demographic, engaging hook',
    isBaritone: false,
    defaultPitch: 'standard',
  },
  {
    id: 'Kore',
    name: 'Amara',
    actor: 'Voice Kore',
    gender: 'Female',
    tagline: 'Warm & Authoritative Consumer Advocate',
    recommendedFor: 'Radio commercial, trusted consumer advice, clear broadcast',
    isBaritone: false,
    defaultPitch: 'standard',
  },
  {
    id: 'Zephyr',
    name: 'Zola',
    actor: 'Voice Zephyr',
    gender: 'Female',
    tagline: 'Articulate, Modern & Tech-Forward',
    recommendedFor: 'Platform introduction, digital service promo, clean delivery',
    isBaritone: false,
    defaultPitch: 'standard',
  },
];

export const VOICE_STYLES: VoiceStyle[] = [
  // Social Media Video Overlay Delivery Styles (Primary Focus)
  {
    id: 'creator_pov',
    name: 'TikTok / Reels Creator (POV)',
    category: 'social',
    tag: 'Recommended for Video',
    description: 'Natural, intimate, unhyped voice speaking directly to the phone camera like a friend.',
  },
  {
    id: 'storytime',
    name: 'Social Storytime',
    category: 'social',
    tag: 'High Retention',
    description: 'Relatable storytelling pacing ("Listen to what happened..."), captivating without yelling.',
  },
  {
    id: 'cinematic',
    name: 'Cinematic B-Roll Overlay',
    category: 'social',
    tag: 'Documentary Feel',
    description: 'Soft, reflective, measured pauses crafted specifically to sit underneath video footage.',
  },
  {
    id: 'social_warning',
    name: 'Eye-Opening Advisory',
    category: 'social',
    tag: 'Scroll Stopper',
    description: 'Grounded, protective advisory tone that grabs attention in the first 2 seconds.',
  },
  // Radio & Broadcast Delivery Styles (Retained for future broadcast use)
  {
    id: 'commercial',
    name: 'Radio Commercial Spot',
    category: 'broadcast',
    tag: 'Radio Jingle',
    description: 'Dynamic radio pacing with clear broadcast punchlines and traditional station finish.',
  },
  {
    id: 'advocate',
    name: 'Consumer Advocate',
    category: 'broadcast',
    tag: 'Broadcast',
    description: 'Empathetic, authentic, trustworthy tone protecting everyday shoppers.',
  },
  {
    id: 'punchy',
    name: 'High-Energy Promo',
    category: 'broadcast',
    tag: 'Fast Bumper',
    description: 'Crisp, upbeat delivery tailored for modern drive-time radio.',
  },
  {
    id: 'dramatic',
    name: 'Dramatic Warning',
    category: 'broadcast',
    tag: 'Serious Impact',
    description: 'Intense cadence spotlighting the risks of unvetted sellers.',
  },
];

interface VoiceSelectorProps {
  selectedVoice: string;
  onSelectVoice: (voiceId: string) => void;
  selectedStyle: string;
  onSelectStyle: (styleId: string) => void;
  selectedTimbre: 'standard' | 'baritone' | 'bass';
  onSelectTimbre: (timbre: 'standard' | 'baritone' | 'bass') => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoice,
  onSelectVoice,
  selectedStyle,
  onSelectStyle,
  selectedTimbre,
  onSelectTimbre,
}) => {
  const [styleCategory, setStyleCategory] = React.useState<'social' | 'broadcast'>('social');

  // Filter styles by selected category
  const filteredStyles = VOICE_STYLES.filter((s) => s.category === styleCategory);

  const handleVoiceClick = (voice: VoiceOption) => {
    onSelectVoice(voice.id);
    if (voice.defaultPitch) {
      onSelectTimbre(voice.defaultPitch);
    }
  };

  return (
    <div className="space-y-6">
      {/* Delivery Style Category Header & Selection (Social Media vs Radio) */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-emerald-700" />
            Voiceover Delivery Style & Purpose
          </label>
          <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
            <button
              type="button"
              id="category-social-btn"
              onClick={() => setStyleCategory('social')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                styleCategory === 'social'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-stone-600 hover:text-slate-900'
              }`}
            >
              📱 Social Media Video Overlay (Active)
            </button>
            <button
              type="button"
              id="category-broadcast-btn"
              onClick={() => setStyleCategory('broadcast')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                styleCategory === 'broadcast'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-slate-900'
              }`}
            >
              📻 Radio Commercial Jingles (Retained)
            </button>
          </div>
        </div>

        {styleCategory === 'social' && (
          <div className="mb-3 text-xs bg-emerald-50/70 border border-emerald-200 text-emerald-900 px-3 py-2 rounded-xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Crafted for Video Backgrounds:</strong> Natural, un-hyped creator voices designed to sit smoothly under video footage on TikTok, Reels, and Shorts.
            </span>
          </div>
        )}

        {styleCategory === 'broadcast' && (
          <div className="mb-3 text-xs bg-amber-50/80 border border-amber-200 text-amber-900 px-3 py-2 rounded-xl flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Retained Radio Templates:</strong> Traditional high-energy radio commercial announcer styles kept for future broadcast campaigns.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {filteredStyles.map((style) => {
            const isSelected = selectedStyle === style.id;
            return (
              <button
                key={style.id}
                id={`style-btn-${style.id}`}
                type="button"
                onClick={() => onSelectStyle(style.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? style.category === 'social'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-1 ring-emerald-600'
                      : 'bg-amber-50 border-amber-500 text-amber-950 ring-1 ring-amber-500'
                    : 'bg-white border-stone-200 hover:border-stone-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">{style.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">
                    {style.tag}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 leading-snug line-clamp-2">
                  {style.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Voice Selection Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-emerald-700" />
            Select Voice Narrator
          </label>
          <span className="text-xs text-stone-500">Gemini 3.1 Flash Neural Audio</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {VOICE_OPTIONS.map((voice) => {
            const isSelected = selectedVoice === voice.id;
            return (
              <button
                key={voice.id}
                id={`voice-btn-${voice.id}`}
                type="button"
                onClick={() => handleVoiceClick(voice)}
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
                <div className="flex items-center justify-between mb-1.5">
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
                  {voice.isBaritone && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      Deep Baritone
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs font-medium text-slate-700 line-clamp-1">{voice.tagline}</p>
                <p className="mt-1 text-[11px] text-stone-500 line-clamp-2">{voice.recommendedFor}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vocal Timbre & Pitch Depth Tuning */}
      <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-800" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Vocal Timbre & Depth Tuning
            </span>
          </div>
          <span className="text-[11px] text-stone-500">
            Tuning acoustic resonance & low register
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onSelectTimbre('baritone')}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              selectedTimbre === 'baritone'
                ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                : 'bg-white border-stone-200 hover:bg-stone-100 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">🎙️ Deep Baritone</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-mono ${selectedTimbre === 'baritone' ? 'bg-emerald-900 text-amber-300' : 'bg-stone-100 text-stone-600'}`}>
                -1.8 st
              </span>
            </div>
            <p className={`text-[11px] mt-1 line-clamp-1 ${selectedTimbre === 'baritone' ? 'text-emerald-100' : 'text-stone-500'}`}>
              Rich masculine chest resonance. Eliminates feminine undertones.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onSelectTimbre('bass')}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              selectedTimbre === 'bass'
                ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                : 'bg-white border-stone-200 hover:bg-stone-100 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">⚡ Heavy Bass</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-mono ${selectedTimbre === 'bass' ? 'bg-emerald-900 text-amber-300' : 'bg-stone-100 text-stone-600'}`}>
                -3.2 st
              </span>
            </div>
            <p className={`text-[11px] mt-1 line-clamp-1 ${selectedTimbre === 'bass' ? 'text-emerald-100' : 'text-stone-500'}`}>
              Commanding rumbling register with maximum masculine gravitas.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onSelectTimbre('standard')}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              selectedTimbre === 'standard'
                ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                : 'bg-white border-stone-200 hover:bg-stone-100 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">🎵 Natural Standard</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-mono ${selectedTimbre === 'standard' ? 'bg-emerald-900 text-amber-300' : 'bg-stone-100 text-stone-600'}`}>
                Default
              </span>
            </div>
            <p className={`text-[11px] mt-1 line-clamp-1 ${selectedTimbre === 'standard' ? 'text-emerald-100' : 'text-stone-500'}`}>
              Standard factory model pitch and neutral frequency response.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
