export interface VoiceOption {
  id: string;
  name: string;
  actor: string;
  gender: 'Female' | 'Male';
  tagline: string;
  recommendedFor: string;
}

export interface VoiceStyle {
  id: string;
  name: string;
  description: string;
}

export interface GeneratedCommercial {
  id: string;
  audioUrl: string;
  duration: number;
  voice: string;
  voiceName: string;
  style: string;
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
