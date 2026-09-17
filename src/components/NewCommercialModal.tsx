import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Plus,
  Wand2,
  FileText,
  Bookmark,
  CheckCircle2,
  Loader2,
  Tv,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { AdvertScene, AspectRatio } from '../types';
import { ADVERT_SCENES } from '../data/advertScenes';
import { generateScenesFromScript } from '../utils/sceneGenerator';

interface NewCommercialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCommercial: (data: {
    title: string;
    script: string;
    scenes?: AdvertScene[];
    aspectRatio?: AspectRatio;
  }) => void;
}

const STORY_INSPIRATIONS = [
  {
    label: '👗 Tailor Wedding Delay',
    topic: 'A tailor promised wedding clothes for Friday morning, but Sunday night the customer is still waiting. Before paying tailoring deposits, check Legit Africa.',
    businessType: 'Fashion & Tailoring',
  },
  {
    label: '📱 Computer Village Phone Scam',
    topic: 'Buyer bought a phone labeled brand new in Computer Village Ikeja, but the battery died after 48 hours. Legit Africa helps buyers identify trusted gadget shops.',
    businessType: 'Electronics & Gadgets',
  },
  {
    label: '🛍️ Instagram DM Vendor Ghosting',
    topic: 'Customer paid 45,000 Naira to an Instagram shoe vendor with 50k followers, then got blocked immediately after bank transfer. Search before sending money on Legit Africa.',
    businessType: 'Online Vendors & Social Commerce',
  },
  {
    label: '🚗 Car Dealer & Mileage Fraud',
    topic: 'Car dealer in Abuja advertised foreign-used mint condition, but hidden engine fault was covered with temporary additive. Real buyer reviews protect you.',
    businessType: 'Automotive & Mechanics',
  },
  {
    label: '🏠 Lagos Landlord & Agent Caution',
    topic: 'Fake housing agent collected inspection fees and caution deposit for an apartment already rented to two other tenants.',
    businessType: 'Real Estate & Rentals',
  },
];

const PRESET_CAMPAIGNS = [
  {
    id: 'tailor_30s',
    title: 'Lagos Tailor Dilemma (30s Spot)',
    tag: '30s • Nigerian Pidgin',
    description: 'Relatable everyday African experience with tailor delays and why honest feedback on Legit Africa saves money.',
    script: `Tailor promise you say clothes go ready Friday morning.
Sunday afternoon, you still dey wait for wedding reception.
Why you go dey stress like this?
Before you pay any tailor, mechanic, or online vendor money,
First open Legit Africa dot com.
Search the business.
See wetin other customers talk with their own eye.
And when you finish with any seller, drop your own review too.
Good or bad, nobody fit pay to delete am.
Search the business. Say wetin happen. Legit Africa dot com. E free!`,
  },
  {
    id: 'phone_seller_30s',
    title: 'Computer Village Tech Caution (30s)',
    tag: '30s • Tech Advisory',
    description: 'Protective consumer advisory for gadget buyers navigating phone repairs and refurb sellers.',
    script: `Guy, you know how e be when you buy phone for Computer Village.
The boy swear say na direct London used.
Two days later, screen begin shake, battery dey die for 20 minutes!
No be by sweet mouth.
Before you hand over your hard-earned money to any tech shop or vendor,
Check their name on Legit Africa dot com.
Real Nigerians dey share their genuine experience every day.
Save your money. Check the review first.
Legit Africa dot com. Search the business. E free!`,
  },
  {
    id: 'dm_vendor_15s',
    title: '15s Instagram DM Alert (High Impact)',
    tag: '15s • Social Bumper',
    description: 'Crisp, fast-paced bumper specifically timed for Instagram Stories and TikTok hooks.',
    script: `Before you tap 'Send Money' to that Instagram store with 50,000 followers...
Hold on!
Check their real customer reviews on Legit Africa dot com first.
No vendor fit pay to wipe their bad reviews.
Check am first, save your money. Legit Africa dot com!`,
  },
];

export const NewCommercialModal: React.FC<NewCommercialModalProps> = ({
  isOpen,
  onClose,
  onCreateCommercial,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'presets' | 'blank'>('ai');
  const [topicInput, setTopicInput] = useState('');
  const [businessType, setBusinessType] = useState('General Business');
  const [toneStyle, setToneStyle] = useState('pidgin_warm');
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>('4:5');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Blank draft state
  const [blankTitle, setBlankTitle] = useState('Legit Africa New Campaign');
  const [blankScript, setBlankScript] = useState('');

  if (!isOpen) return null;

  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/create-ad-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicInput.trim() || 'Protecting everyday buyers from unverified vendors',
          businessType,
          style: toneStyle,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate ad with AI.');
      }

      const data = await response.json();
      const generatedScenes = data.scenes && data.scenes.length === 8
        ? data.scenes
        : generateScenesFromScript(data.script || topicInput, data.title);

      onCreateCommercial({
        title: data.title || 'New Legit Africa Commercial',
        script: data.script,
        scenes: generatedScenes,
        aspectRatio: selectedRatio,
      });
      onClose();
    } catch (err: any) {
      // Show why and stay open. Loading a stand-in script here made a failure look like a
      // strange result, unrelated to the topic that was asked for.
      setErrorMsg(err?.message || 'The ad could not be generated. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_CAMPAIGNS[0]) => {
    const scenes = generateScenesFromScript(preset.script, preset.title);
    onCreateCommercial({
      title: preset.title,
      script: preset.script,
      scenes,
      aspectRatio: selectedRatio,
    });
    onClose();
  };

  const handleCreateBlank = () => {
    const finalTitle = blankTitle.trim() || 'New Legit Africa Commercial';
    const finalScript = blankScript.trim() || `Search the business on Legit Africa dot com.\nSay wetin happen. Good or bad.\nLegit Africa dot com. E free!`;
    const scenes = generateScenesFromScript(finalScript, finalTitle);
    onCreateCommercial({
      title: finalTitle,
      script: finalScript,
      scenes,
      aspectRatio: selectedRatio,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#181614]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-[#EAE3D4] my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAE3D4] pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E8A317]/15 border border-[#E8A317]/30 flex items-center justify-center text-[#E8A317]">
              <Sparkles className="w-5 h-5 text-[#C6860C]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#181614] flex items-center gap-2">
                Create New Ad Campaign
              </h2>
              <p className="text-xs text-[#6B6256]">
                Generate an authentic Nigerian commercial with AI, pick a proven template, or start blank.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#6B6256] hover:text-[#181614] p-1.5 rounded-xl hover:bg-[#F4EEE2] cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-2xl bg-[#F4EEE2] p-1 border border-[#EAE3D4] mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-white text-[#181614] shadow-xs'
                : 'text-[#6B6256] hover:text-[#181614]'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-[#C6860C]" />
            <span>Generate with AI</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-white text-[#181614] shadow-xs'
                : 'text-[#6B6256] hover:text-[#181614]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-[#C6860C]" />
            <span>Commercial Presets</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('blank')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'blank'
                ? 'bg-white text-[#181614] shadow-xs'
                : 'text-[#6B6256] hover:text-[#181614]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#6B6256]" />
            <span>Blank Draft</span>
          </button>
        </div>

        {/* Aspect Ratio Selector (Shared across all methods) */}
        <div className="mb-4 p-3 bg-[#FBF8F1] rounded-2xl border border-[#EAE3D4] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#181614]">Video Aspect Ratio:</span>
          </div>
          <div className="inline-flex p-0.5 rounded-xl bg-[#EAE3D4] border border-[#D8CEBA]">
            <button
              type="button"
              onClick={() => setSelectedRatio('4:5')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedRatio === '4:5'
                  ? 'bg-[#E8A317] text-[#181614] shadow-xs'
                  : 'text-[#6B6256] hover:text-[#181614]'
              }`}
            >
              <Tv className="w-3 h-3" />
              <span>4:5 Portrait (1080×1350)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRatio('9:16')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedRatio === '9:16'
                  ? 'bg-[#E8A317] text-[#181614] shadow-xs'
                  : 'text-[#6B6256] hover:text-[#181614]'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>9:16 Vertical (Reels/TikTok)</span>
            </button>
          </div>
        </div>

        {/* Tab 1: AI Generator */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#181614] mb-1.5">
                What is your commercial about?
              </label>
              <textarea
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g. A customer in Abuja bought a generator online, but it stopped working after 3 days. Before buying any appliance, check Legit Africa dot com..."
                rows={3}
                className="w-full p-3 text-xs bg-[#FBF8F1] border border-[#D8CEBA] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8A317] text-[#181614] placeholder-[#8A8175] resize-none"
              />
            </div>

            {/* Quick Inspiration Chips */}
            <div>
              <p className="text-[11px] font-bold text-[#6B6256] uppercase tracking-wider mb-2">
                Or pick a common Nigerian business dilemma:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STORY_INSPIRATIONS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setTopicInput(item.topic);
                      setBusinessType(item.businessType);
                    }}
                    className="px-2.5 py-1 rounded-xl text-xs bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#181614] border border-[#EAE3D4] transition-colors cursor-pointer text-left"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone & Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#181614] mb-1">
                  Delivery Tone & Style
                </label>
                <select
                  value={toneStyle}
                  onChange={(e) => setToneStyle(e.target.value)}
                  className="w-full p-2.5 text-xs bg-[#FBF8F1] border border-[#D8CEBA] rounded-xl text-[#181614] focus:outline-none focus:ring-2 focus:ring-[#E8A317] cursor-pointer"
                >
                  <option value="pidgin_warm">Authentic Nigerian Pidgin (Warm & Trusted)</option>
                  <option value="social_reels">Social Media Reels (Creator Talking to Phone)</option>
                  <option value="storytime_pov">Storytime Narrative (Relatable true scenario)</option>
                  <option value="urgent_alert">Urgent Consumer Advisory (Serious warning)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#181614] mb-1">
                  Business Category
                </label>
                <input
                  type="text"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  placeholder="e.g. Tailoring, Gadgets, Cars"
                  className="w-full p-2.5 text-xs bg-[#FBF8F1] border border-[#D8CEBA] rounded-xl text-[#181614] focus:outline-none focus:ring-2 focus:ring-[#E8A317]"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            {/* Generate Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={isGenerating}
                className="w-full py-3 px-4 rounded-2xl bg-[#E8A317] hover:bg-[#C6860C] text-[#181614] font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#181614]" />
                    <span>Gemini is drafting your Nigerian Pidgin script & scenes...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#181614]" />
                    <span>Generate Commercial with AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Presets */}
        {activeTab === 'presets' && (
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {PRESET_CAMPAIGNS.map((preset) => (
              <div
                key={preset.id}
                className="p-3.5 rounded-2xl bg-[#FBF8F1] border border-[#EAE3D4] hover:border-[#E8A317] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-[#181614]">{preset.title}</h4>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[#E8A317]/15 text-[#C6860C]">
                      {preset.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B6256] leading-relaxed">
                    {preset.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#E8A317] hover:bg-[#C6860C] text-[#181614] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-xs"
                >
                  <span>Use Template</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Blank Draft */}
        {activeTab === 'blank' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#181614] mb-1.5">
                Commercial Campaign Title
              </label>
              <input
                type="text"
                value={blankTitle}
                onChange={(e) => setBlankTitle(e.target.value)}
                placeholder="e.g. Lagos Food Vendor Spot"
                className="w-full p-2.5 text-xs bg-[#FBF8F1] border border-[#D8CEBA] rounded-xl text-[#181614] focus:outline-none focus:ring-2 focus:ring-[#E8A317]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#181614] mb-1.5">
                Initial Script (Optional)
              </label>
              <textarea
                value={blankScript}
                onChange={(e) => setBlankScript(e.target.value)}
                placeholder="Type or paste your custom commercial lines here, or leave blank to write in the editor..."
                rows={4}
                className="w-full p-3 text-xs bg-[#FBF8F1] border border-[#D8CEBA] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8A317] text-[#181614] placeholder-[#8A8175] resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleCreateBlank}
                className="w-full py-2.5 px-4 rounded-xl bg-[#E8A317] hover:bg-[#C6860C] text-[#181614] font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#181614]" />
                <span>Start Blank Draft</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
