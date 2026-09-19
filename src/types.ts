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

export type OverlayPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface SceneOverlay {
  kind: 'debit_alert';
  /** Where the card sits in the frame. Default: middle-center. */
  position?: OverlayPosition;
  /** The small badge at the top, e.g. "BANK DEBIT ALERT". */
  title?: string;
  /** The big line, e.g. "₦300,000.00". */
  amount?: string;
  /** Two smaller lines under the amount. */
  line1?: string;
  line2?: string;
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
  /** A video clip that plays as this scene's background instead of imageSrc. */
  videoSrc?: string;
  /** What to do when the clip is shorter than the spoken line. Default: slow it to fit. */
  clipFit?: 'slow' | 'loop' | 'hold';
  /** Stars shown on the LegitAfrica search and review screens, 1 to 5. Default: 5. */
  rating?: number;
  /**
   * Small print at the foot of the end card: "Dramatisation · Names withheld". Settles for the
   * viewer whether the advert is pointing at a real business.
   */
  disclaimer?: boolean;
  /**
   * The words on the LegitAfrica search screen. Without these it showed a tailor's shop from the
   * very first campaign on every advert.
   */
  screenText?: {
    /** What is typed in the search box. */
    query?: string;
    /** The business found. */
    business?: string;
    /** The review shown under the stars. */
    quote?: string;
  };
  /**
   * A card laid over the scene's picture — a bank alert, say — to show what the line is talking
   * about. Every word on it belongs to this advert; nothing is filled in from another campaign.
   */
  overlay?: SceneOverlay;
  /**
   * How long this scene holds, in seconds. Unset means it shares the voiceover with the other
   * unset scenes in proportion to how much is spoken in each.
   */
  lengthSeconds?: number;
  /** 2 = drawn by type, any number of scenes. Absent on ads saved when scenes were drawn by position. */
  layoutVersion?: 2;
}

export type AspectRatio = '4:5' | '9:16';

