export interface VoiceOption {
  id: string;
  name: string;
  actor: string;
  gender: 'Female' | 'Male';
  tagline: string;
  recommendedFor: string;
  isBaritone?: boolean;
  defaultPitch?: 'standard' | 'baritone' | 'bass';
}

export interface VoiceStyle {
  id: string;
  name: string;
  category: 'social' | 'broadcast';
  description: string;
  tag: string;
}

export interface SubtitleCue {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface VideoTheme {
  id: string;
  name: string;
  category: string;
  type: 'video' | 'canvas' | 'custom';
  description: string;
  previewColor: string;
  accentColor: string;
}

export interface GeneratedCommercial {
  id: string;
  audioUrl: string;
  duration: number;
  voice: string;
  voiceName: string;
  style: string;
  timbre?: 'standard' | 'baritone' | 'bass';
  script: string;
  createdAt: number;
}

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  updated?: string;
  position?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
}

export interface CommercialPreset {
  id: string;
  title: string;
  timing: string;
  script: string;
  suggestedVoice: string;
  suggestedStyle: string;
  description: string;
}

export interface AdvertScene {
  id: number;
  voiceLine: string;
  visualPrompt: string;
  imageSrc?: string;
  type: 'photo' | 'logo' | 'ui_search' | 'ui_review' | 'end_card' | 'text';
  /** type 'text': small uppercase label that fades in above the headline. */
  eyebrow?: string;
  /** type 'text': one row per line; wrap words in *stars* to make them gold. */
  headline?: string;
  /** type 'text': plain cream background (default), or the scene photo darkened behind the text. */
  textBackground?: 'cream' | 'photo';
  /** 2 = drawn by type, any number of scenes. Absent on ads saved when scenes were drawn by position. */
  layoutVersion?: 2;
}

export type AspectRatio = '4:5' | '9:16';

