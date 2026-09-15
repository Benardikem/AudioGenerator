import { AdvertScene } from '../types';

export const BRAND_COLORS = {
  cream: '#FBF8F1',
  sand: '#F4EEE2',
  white: '#FFFFFF',
  nearBlack: '#181614',
  warmGrey: '#6B6256',
  gold: '#E8A317',
  darkerGold: '#C6860C',
  starGold: '#F5B301',
  borders: '#EAE3D4',
} as const;

export const VIDEO_CONFIG = {
  width: 1080,
  height: 1350,
  aspectRatio: '4:5',
  fps: 30,
  targetDuration: 32, // 30–35s
};

export const ADVERT_SCENES: AdvertScene[] = [
  {
    id: 1,
    voiceLine: 'You don already pay. So you sabi wetin happen.',
    visualPrompt: 'Close-up of a hand holding a phone showing a bank debit alert for ₦45,000.',
    imageSrc: '/scenes/scene1.jpg',
    type: 'photo',
  },
  {
    id: 2,
    voiceLine: 'Maybe that tailor sew your cloth sharp sharp.',
    visualPrompt: "A smiling young woman trying on a well-fitted ankara outfit in a tailor's shop.",
    imageSrc: '/scenes/scene2.jpg',
    type: 'photo',
  },
  {
    id: 3,
    voiceLine: 'Or that seller no dey pick your call again after you pay.',
    visualPrompt: 'A frustrated man staring at his phone; calls to "Seller" going unanswered.',
    imageSrc: '/scenes/scene3.jpg',
    type: 'photo',
  },
  {
    id: 4,
    voiceLine: 'Right now, another person wan send money give that same seller.',
    visualPrompt: 'A different person on WhatsApp, typing "Is it still available?", about to pay.',
    imageSrc: '/scenes/scene4.jpg',
    type: 'photo',
  },
  {
    id: 5,
    voiceLine: 'Abeg, tell that person wetin you know. For Legit Africa.',
    visualPrompt: 'The LegitAfrica logo appears on a cream background.',
    imageSrc: '/brand/logo-clean.png',
    type: 'logo',
  },
  {
    id: 6,
    voiceLine: 'Search the business. Yarn wetin happen. Good or bad.',
    visualPrompt: 'A phone screen — searching a business name, tapping gold stars, typing a short review.',
    imageSrc: '/brand/legitafrica-icon-transparent.png',
    type: 'ui_search',
  },
  {
    id: 7,
    voiceLine: 'No business fit pay us to comot honest review.',
    visualPrompt: 'The review sitting on the business page, with a gold tick beside it.',
    imageSrc: '/brand/legitafrica-icon-transparent.png',
    type: 'ui_review',
  },
  {
    id: 8,
    voiceLine: "Save person money. Drop your review for Legit Africa dot com. Na free!",
    visualPrompt: 'End card: the LegitAfrica logo, "legitafrica.com", and underneath: Trusted businesses · Verified reviews · Always free to read',
    imageSrc: '/brand/logo-clean.png',
    type: 'end_card',
  },
];
