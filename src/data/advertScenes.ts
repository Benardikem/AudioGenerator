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

export const VIDEO_CONFIGS = {
  '4:5': {
    width: 1080,
    height: 1350,
    aspectRatio: '4:5' as const,
    label: '4:5 Portrait',
    description: 'Instagram & Facebook Feed',
    previewW: 340,
    previewH: 425,
    fps: 30,
  },
  '9:16': {
    width: 1080,
    height: 1920,
    aspectRatio: '9:16' as const,
    label: '9:16 Full Vertical',
    description: 'TikTok, Reels, Shorts & Stories',
    previewW: 300,
    previewH: 533,
    fps: 30,
  },
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
    visualPrompt:
      'A young Nigerian man sitting in a dimly lit room, holding a smartphone close to his face. His expression is a mix of intense frustration and sudden panic—his jaw is clenched, his brows are deeply furrowed, and his eyes are wide with disbelief. On the phone screen, a WhatsApp chat window is visible, showing a contact named "Seller" with multiple sent messages that only have single grey ticks (undelivered). The active call screen on the phone suddenly changes to display "Call Ended" or "Line Busy." The scene is highly dramatic and moody. The cold blue light from the smartphone screen sharply illuminates his face, casting deep, tense shadows across the room. High-end cinematography, shallow depth of field with the background softly blurred, 35mm lens style, hyper-realistic skin textures and micro-expressions of raw stress.',
    imageSrc: '/scenes/scene3_v2.jpg',
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
    visualPrompt:
      'A professional graphic design layout in a 4:5 vertical aspect ratio (1080x1350) for a brand asset, clean minimalist aesthetic. Off-white/cream background color (#FBF8F1). Upper left corner branding placement featuring a small gold kudu antelope head logo next to "LegitAfrica". Large central branding lockup: large gold kudu antelope head silhouette, bold typography "LEGITAFRICA" (Charcoal/Gold), and sub-headline tagline "REVIEWS YOU CAN TRUST" underneath. Exact slogan text below logo: "Tell them wetin you know." in clean dark charcoal gray. Highly professional modern pill-shaped button solidly filled with vibrant premium gold (no outline) displaying "100% FREE FOR EVERYONE" in crisp clean white bold geometric capital letters with elegant wide letter-spacing.',
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
    visualPrompt:
      'A professional graphic design layout in a 4:5 vertical aspect ratio (1080x1350) for a brand asset, clean minimalist aesthetic.[KEEP THESE ELEMENTS]:Retain the off-white/cream background color.Keep the upper left corner branding placement featuring a small gold kudu antelope head logo next to the text "LegitAfrica".[CENTRAL CARD INTERFACE]:Centered in the middle of the frame, display a prominent, crisp white rounded rectangle card with a soft, clean drop shadow separating it from the cream background. Ensure generous internal padding so text elements do not touch or spill over the edges.Verified Badge Area: Inside the top of the white card, feature a wide, light-beige pill banner. On the left of this banner, place a solid gold circular checkmark icon, followed by the text "Verified Honest Review" in a bold, clean charcoal sans-serif font.Star Ratings: Directly below the badge banner, display a horizontal row of five perfectly aligned, sharp gold five-point stars.[FIXED INTERIOR TEXT & OVERFLOW PREVENTION]:Main Headline Layout: Below the stars, display the prominent quote text: "No business fit pay us to comot honest review."Typography Rules: The text must be in a highly modern, medium-bold charcoal geometric sans-serif font. The font size must be carefully scaled down to fit cleanly inside the width of the card. The text must automatically wrap perfectly into two clean, balanced lines with generous breathing room on the left and right margins.Subtext Paragraphs: Safely underneath the wrapped headline, write the supportive details in a clean, smaller regular-weight gray sans-serif font:Your review stays permanently on the business page.Protecting other customers across Africa.[SOLID GOLD BUTTON LOOK]:Near the bottom inside the white card, place a professional, modern pill-shaped call-to-action box. The box must be solidly filled with a vibrant, premium gold color (no outline).Font Modification: Inside the solid gold box, display the call-to-action text: "100% UNBIASED & FREE" on the first line, with subtext "No sponsored deletions · No fake ratings" directly underneath it. The text must be in a premium, bold, geometric sans-serif font written in crisp, clean white capital letters with elegant, slightly wider letter-spacing for premium readability.[STYLE & QUALITY]:Modern app UI dashboard graphic style, ultra-crisp typography layout, perfect center alignment, perfectly sharp elements, premium corporate look, zero text clipping or layout overflow.',
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
