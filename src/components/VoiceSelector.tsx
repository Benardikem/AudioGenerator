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
  {
    id: 'Sulafat',
    name: 'Halima',
    actor: 'Voice Sulafat',
    gender: 'Female',
    tagline: 'Warm & Expressive Storyteller',
    recommendedFor: 'Wedding ads, a sister telling a sad story',
    isBaritone: false,
    defaultPitch: 'standard',
  },
  {
    id: 'Achernar',
    name: 'Chidinma',
    actor: 'Voice Achernar',
    gender: 'Female',
    tagline: 'Soft & Intimate Delivery',
    recommendedFor: 'Quiet, intimate lines',
    isBaritone: false,
    defaultPitch: 'standard',
  },
  {
    id: 'Vindemiatrix',
    name: 'Folake',
    actor: 'Voice Vindemiatrix',
    gender: 'Female',
    tagline: 'Gentle & Reassuring Cadence',
    recommendedFor: 'A reassuring close',
    isBaritone: false,
    defaultPitch: 'standard',
  },
  {
    id: 'Gacrux',
    name: 'Nkechi',
    actor: 'Voice Gacrux',
    gender: 'Female',
    tagline: 'Mature & Trusted Voice',
    recommendedFor: 'An older, trusted voice',
    isBaritone: false,
    defaultPitch: 'standard',
  },
  {
    id: 'Leda',
    name: 'Simi',
    actor: 'Voice Leda',
    gender: 'Female',
    tagline: 'Youthful & Vibrant Delivery',
    recommendedFor: 'Younger audience, TikTok',
    isBaritone: false,
    defaultPitch: 'standard',
  },
  {
    id: 'Aoede',
    name: 'Zainab',
    actor: 'Voice Aoede',
    gender: 'Female',
    tagline: 'Breezy & Upbeat Delivery',
    recommendedFor: 'Lighter, upbeat ads',
    isBaritone: false,
    defaultPitch: 'standard',
  },
  {
    id: 'Callirrhoe',
    name: 'Funke',
    actor: 'Voice Callirrhoe',
    gender: 'Female',
    tagline: 'Easy-going & Conversational',
    recommendedFor: 'Conversational, relatable delivery',
    isBaritone: false,
    defaultPitch: 'standard',
  },
  {
    id: 'Despina',
    name: 'Yetunde',
    actor: 'Voice Despina',
    gender: 'Female',
    tagline: 'Smooth & Polished Narration',
    recommendedFor: 'Polished narration',
    isBaritone: false,
    defaultPitch: 'standard',
  },
  {
    id: 'Erinome',
    name: 'Blessing',
    actor: 'Voice Erinome',
    gender: 'Female',
    tagline: 'Clear & Direct Guidance',
    recommendedFor: 'Instructions, calls to action',
    isBaritone: false,
    defaultPitch: 'standard',
  },
  {
    id: 'Autonoe',
    name: 'Eniola',
    actor: 'Voice Autonoe',
    gender: 'Female',
    tagline: 'Bright & Energetic Delivery',
    recommendedFor: 'Energetic, lively promos',
    isBaritone: false,
    defaultPitch: 'standard',
  },
  {
    id: 'Laomedeia',
    name: 'Titilayo',
    actor: 'Voice Laomedeia',
    gender: 'Female',
    tagline: 'Upbeat & Cheerful Presence',
    recommendedFor: 'Cheerful, uplifting ads',
    isBaritone: false,
    defaultPitch: 'standard',
  },
  {
    id: 'Pulcherrima',
    name: 'Damilola',
    actor: 'Voice Pulcherrima',
    gender: 'Female',
    tagline: 'Forward, Confident & Direct',
    recommendedFor: 'Confident, direct delivery',
    isBaritone: false,
    defaultPitch: 'standard',
  },
];

export const VOICE_STYLES: VoiceStyle[] = [
  // Social Media Video Overlay Delivery Styles (Primary Focus)
  {
    id: 'pidgin_warm',
    name: 'Warm Nigerian Pidgin (Official 30s Advert)',
    category: 'social',
    tag: 'Official Campaign',
    description: 'Natural, warm Nigerian Pidgin narration. Calm, authentic, friendly everyday tone without shouting.',
  },
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
          <label className="text-xs font-bold uppercase tracking-wider text-[#6B6256] flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-[#E8A317]" />
            Voiceover Delivery Style & Purpose
          </label>
          <div className="flex bg-[#F4EEE2] p-1 rounded-xl border border-[#EAE3D4] text-xs">
            <button
              type="button"
              id="category-social-btn"
              onClick={() => setStyleCategory('social')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                styleCategory === 'social'
                  ? 'bg-[#E8A317] text-[#181614] shadow-xs'
                  : 'text-[#6B6256] hover:text-[#181614]'
              }`}
            >
              📱 Social Media Video Overlay (Active)
            </button>
            <button
              type="button"
              id="category-broadcast-btn"
              onClick={() => setStyleCategory('broadcast')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                styleCategory === 'broadcast'
                  ? 'bg-[#E8A317] text-[#181614] shadow-xs'
                  : 'text-[#6B6256] hover:text-[#181614]'
              }`}
            >
              📻 Radio Commercial Jingles (Retained)
            </button>
          </div>
        </div>

        {styleCategory === 'social' && (
          <div className="mb-3 text-xs bg-[#FBF8F1] border border-[#EAE3D4] text-[#181614] px-3.5 py-2.5 rounded-xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E8A317] shrink-0" />
            <span>
              <strong>Crafted for Video Backgrounds:</strong> Warm, natural Nigerian Pidgin and relatable creator pacing designed to sit under 4:5 social video footage.
            </span>
          </div>
        )}

        {styleCategory === 'broadcast' && (
          <div className="mb-3 text-xs bg-[#F4EEE2] border border-[#EAE3D4] text-[#181614] px-3.5 py-2.5 rounded-xl flex items-center gap-2">
            <Award className="w-4 h-4 text-[#E8A317] shrink-0" />
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
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#FBF8F1] border-[#E8A317] text-[#181614] ring-1 ring-[#E8A317] shadow-xs'
                    : 'bg-white border-[#EAE3D4] hover:border-[#E8A317]/50 text-[#181614]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#181614]">{style.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F4EEE2] text-[#6B6256] font-medium">
                    {style.tag}
                  </span>
                </div>
                <p className="text-[11px] text-[#6B6256] leading-snug line-clamp-2">
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
          <label className="text-xs font-bold uppercase tracking-wider text-[#6B6256] flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-[#E8A317]" />
            Select Voice Narrator
          </label>
          <span className="text-xs text-[#6B6256]">Gemini 3.1 Flash Neural Audio</span>
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
                className={`p-3.5 rounded-xl border text-left transition-all relative cursor-pointer ${
                  isSelected
                    ? 'bg-[#FBF8F1] border-[#E8A317] shadow-xs ring-1 ring-[#E8A317]'
                    : 'bg-white border-[#EAE3D4] hover:border-[#E8A317]/50 hover:bg-[#FBF8F1]/40'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E8A317] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E8A317]"></span>
                  </span>
                )}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isSelected ? 'bg-[#E8A317] text-[#181614]' : 'bg-[#F4EEE2] text-[#181614]'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#181614]">{voice.name}</h4>
                      <span className="text-[11px] text-[#6B6256]">{voice.gender} • {voice.actor}</span>
                    </div>
                  </div>
                  {voice.isBaritone && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F4EEE2] text-[#181614] border border-[#E8A317]">
                      Deep Baritone
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs font-medium text-[#181614] line-clamp-1">{voice.tagline}</p>
                <p className="mt-1 text-[11px] text-[#6B6256] line-clamp-2">{voice.recommendedFor}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vocal Timbre & Pitch Depth Tuning */}
      <div className="p-4 bg-[#F4EEE2] rounded-2xl border border-[#EAE3D4] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#E8A317]" />
            <span className="text-xs font-bold text-[#181614] uppercase tracking-wider">
              Vocal Timbre & Depth Tuning
            </span>
          </div>
          <span className="text-[11px] text-[#6B6256]">
            Tuning acoustic resonance & low register
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onSelectTimbre('baritone')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedTimbre === 'baritone'
                ? 'bg-[#181614] text-white border-[#181614] shadow-xs'
                : 'bg-white border-[#EAE3D4] hover:bg-[#FBF8F1] text-[#181614]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">🎙️ Deep Baritone</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-mono ${selectedTimbre === 'baritone' ? 'bg-[#E8A317] text-[#181614]' : 'bg-[#F4EEE2] text-[#6B6256]'}`}>
                -1.8 st
              </span>
            </div>
            <p className={`text-[11px] mt-1 line-clamp-1 ${selectedTimbre === 'baritone' ? 'text-[#F4EEE2]' : 'text-[#6B6256]'}`}>
              Rich masculine chest resonance. Eliminates feminine undertones.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onSelectTimbre('bass')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedTimbre === 'bass'
                ? 'bg-[#181614] text-white border-[#181614] shadow-xs'
                : 'bg-white border-[#EAE3D4] hover:bg-[#FBF8F1] text-[#181614]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">⚡ Heavy Bass</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-mono ${selectedTimbre === 'bass' ? 'bg-[#E8A317] text-[#181614]' : 'bg-[#F4EEE2] text-[#6B6256]'}`}>
                -3.2 st
              </span>
            </div>
            <p className={`text-[11px] mt-1 line-clamp-1 ${selectedTimbre === 'bass' ? 'text-[#F4EEE2]' : 'text-[#6B6256]'}`}>
              Commanding rumbling register with maximum masculine gravitas.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onSelectTimbre('standard')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedTimbre === 'standard'
                ? 'bg-[#181614] text-white border-[#181614] shadow-xs'
                : 'bg-white border-[#EAE3D4] hover:bg-[#FBF8F1] text-[#181614]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">🎵 Natural Standard</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-mono ${selectedTimbre === 'standard' ? 'bg-[#E8A317] text-[#181614]' : 'bg-[#F4EEE2] text-[#6B6256]'}`}>
                Default
              </span>
            </div>
            <p className={`text-[11px] mt-1 line-clamp-1 ${selectedTimbre === 'standard' ? 'text-[#F4EEE2]' : 'text-[#6B6256]'}`}>
              Standard factory model pitch and neutral frequency response.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

