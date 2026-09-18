import { AdvertScene } from '../types';
import { MAX_SCENES, stampScenes } from './sceneTimeline';

/**
 * Builds a storyboard from a script: one scene per line, so a long story gets as many scenes as
 * it has beats instead of being squeezed into eight. Each scene gets a visual prompt suited to the
 * scenario the script is about.
 */
export function generateScenesFromScript(
  scriptText: string,
  titleHint: string = 'Legit Africa Commercial'
): AdvertScene[] {
  const cleanScript = scriptText.trim();
  const rawLines = cleanScript
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Determine scenario context from text
  const lower = cleanScript.toLowerCase();
  // Pick the scenario with the most matching words. Whole words only: substring checks sent
  // "different" and "current" to housing (they contain "rent") and "card" or "care" to cars.
  // Counting instead of taking the first hit matters because scripts mention everyday things
  // across topics: a landlord script says "agent no dey pick phone", which must not become a
  // phone-shop storyboard just because phones were checked first.
  const SCENARIO_WORDS = {
    phoneTech: /\b(phones?|gadgets?|computer village|battery|laptops?|iphone|samsung)\b/g,
    tailorFashion: /\b(tailors?|cloth(es)?|wedding|ankara|sew(ing)?|aso ebi)\b/g,
    housing: /\b(landlords?|agents?|rent(ed|ing|s)?|house|housing|apartments?|tenants?|caution (fee|deposit)|inspection)\b/g,
    auto: /\b(cars?|mechanics?|tokunbo|mileage|engine)\b/g,
  };
  const scores = Object.fromEntries(
    Object.entries(SCENARIO_WORDS).map(([name, re]) => [name, (lower.match(re) || []).length])
  ) as Record<keyof typeof SCENARIO_WORDS, number>;
  const best = (Object.keys(scores) as (keyof typeof scores)[]).reduce((a, b) => (scores[b] > scores[a] ? b : a));
  const scenario = scores[best] > 0 ? best : 'general';
  const isPhoneTech = scenario === 'phoneTech';
  const isTailorFashion = scenario === 'tailorFashion';
  const isHousing = scenario === 'housing';
  const isAuto = scenario === 'auto';

  // One scene per line of script. Only a script longer than the cap is merged, pairing lines
  // from the start until it fits.
  let voiceLines: string[] = rawLines;
  while (voiceLines.length > MAX_SCENES) {
    const merged: string[] = [];
    for (let i = 0; i < voiceLines.length; i += 2) {
      merged.push(voiceLines.slice(i, i + 2).join(' '));
    }
    voiceLines = merged;
  }
  if (voiceLines.length === 0) {
    voiceLines = [
      'You don already pay. So you sabi wetin happen.',
      'Maybe you bought phone or gadget sharp sharp.',
      'Or that seller no dey pick your call again after payment.',
      'Right now, another person wan send money give that same seller.',
      'Abeg, tell that person wetin you know. For Legit Africa.',
      'Search the business. Yarn wetin happen. Good or bad.',
      'No business fit pay us to comot honest review.',
      'Save person money. Drop your review for Legit Africa dot com. Na free!',
    ];
  }

  // Generate contextual visual prompts & action descriptions
  let sceneTemplates: {
    visualPrompt: string;
    imageSrc: string;
    type: AdvertScene['type'];
  }[] = [];

  if (isPhoneTech) {
    sceneTemplates = [
      {
        visualPrompt: 'Close-up shot of a buyer unboxing a smartphone labeled "Brand New" in Computer Village Ikeja, looking hopeful.',
        imageSrc: '/scenes/scene1.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Frustrated customer tapping an un-responsive phone screen showing 0% battery dying after 48 hours. Stressful lighting.',
        imageSrc: '/scenes/scene3.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Customer returning to the bustling gadget shop counter in Ikeja; the sales clerk looks away and shrugs dismissively.',
        imageSrc: '/scenes/scene3_v2.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Split screen: Another buyer in Lagos holding cash and a debit card, about to purchase from that exact same shop.',
        imageSrc: '/scenes/scene4.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Mobile screen opening Legit Africa app: searching "Computer Village Ikeja Gadgets" with gold star ratings and certified shop tags.',
        imageSrc: '/brand/logo-clean.png',
        type: 'ui_search',
      },
      {
        visualPrompt: 'Customer reading a verified review: "5 Stars - Certified genuine iPhone battery with 1-year warranty receipt".',
        imageSrc: '/brand/legitafrica-icon-transparent.png',
        type: 'ui_review',
      },
      {
        visualPrompt: 'High-contrast brand badge: "No business can pay to remove reviews. 100% Unbiased & Permanent Protection."',
        imageSrc: '/brand/legitafrica-icon-transparent.png',
        type: 'logo',
      },
      {
        visualPrompt: 'End card: LegitAfrica logo with gold kudu mark, "legitafrica.com" — Trusted shops · Verified tech reviews · Always free.',
        imageSrc: '/brand/logo-clean.png',
        type: 'end_card',
      },
    ];
  } else if (isTailorFashion) {
    sceneTemplates = [
      {
        visualPrompt: 'Hand holding a smartphone showing a bank debit alert transfer for wedding ankara fabrics and tailoring.',
        imageSrc: '/scenes/scene1.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Smiling customer trying on tailored outfit, or staring at clock as Friday deadline passes without delivery.',
        imageSrc: '/scenes/scene2.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Customer looking stressed on phone as tailor number rings out with no answer on wedding morning.',
        imageSrc: '/scenes/scene3_v2.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Another customer on WhatsApp texting a tailor "Can you deliver before Saturday?", about to send deposit.',
        imageSrc: '/scenes/scene4.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Smartphone searching "Lekki Fashion Designers" on Legit Africa with transparent ratings and delivery timeliness scores.',
        imageSrc: '/brand/logo-clean.png',
        type: 'ui_search',
      },
      {
        visualPrompt: 'Verified customer review card: "Delivered on Wednesday, two days before my brother wedding. 100% recommended."',
        imageSrc: '/brand/legitafrica-icon-transparent.png',
        type: 'ui_review',
      },
      {
        visualPrompt: 'Clean brand card: "Reviews you can trust. Businesses cannot delete or buy off ratings on Legit Africa."',
        imageSrc: '/brand/legitafrica-icon-transparent.png',
        type: 'logo',
      },
      {
        visualPrompt: 'End card: LegitAfrica logo with gold kudu, "legitafrica.com" — Save someone money · Drop your review · Free forever.',
        imageSrc: '/brand/logo-clean.png',
        type: 'end_card',
      },
    ];
  } else if (isHousing) {
    sceneTemplates = [
      {
        visualPrompt: 'Hand holding phone showing mobile bank transfer debit alert labeled "Inspection Fee & Caution Deposit".',
        imageSrc: '/scenes/scene1.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Excited prospective tenant with suitcases and boxes arriving at the Lagos apartment compound gate.',
        imageSrc: '/scenes/scene2.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Shock and disbelief: two other tenants already inside the flat unpacking their own belongings simultaneously.',
        imageSrc: '/scenes/scene3_v2.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Split-screen: another desperate house-hunter across Lagos about to transfer ₦650,000 to the same fake agent.',
        imageSrc: '/scenes/scene4.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Mobile browser opening legitafrica.com and typing the real estate agency or agent phone number into search.',
        imageSrc: '/brand/logo-clean.png',
        type: 'ui_search',
      },
      {
        visualPrompt: 'Verified tenant review: "Warning: Agent collected double caution fee for flat in Yaba. 1-star verified report."',
        imageSrc: '/brand/legitafrica-icon-transparent.png',
        type: 'ui_review',
      },
      {
        visualPrompt: 'Gold kudu trust badge: "Zero tolerance for fake agents. Reviews cannot be paid off or removed."',
        imageSrc: '/brand/legitafrica-icon-transparent.png',
        type: 'logo',
      },
      {
        visualPrompt: 'End card: LegitAfrica logo with gold kudu, "legitafrica.com" — Check before paying rent · Save your hard-earned money · Free.',
        imageSrc: '/brand/logo-clean.png',
        type: 'end_card',
      },
    ];
  } else if (isAuto) {
    sceneTemplates = [
      {
        visualPrompt: 'Hand holding a car key fob next to a shiny tokunbo vehicle with a "Direct Belgium Used" windshield sticker.',
        imageSrc: '/scenes/scene1.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Steam pouring from under the car hood on Third Mainland bridge while hazards flash in heavy Lagos traffic.',
        imageSrc: '/scenes/scene2.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Mechanic holding a wrench, shaking head while pointing out hidden welded frame and masked engine knocking.',
        imageSrc: '/scenes/scene3_v2.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Another buyer at a roadside car dealership about to wire deposit money to that exact same dealership.',
        imageSrc: '/scenes/scene4.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Smartphone searching "Lagos Auto Dealers & Mechanics" on Legit Africa with mileage tampering warnings.',
        imageSrc: '/brand/logo-clean.png',
        type: 'ui_search',
      },
      {
        visualPrompt: 'Detailed automotive review: "5 Stars - Genuine mileage, computer diagnosis matched, zero hidden faults."',
        imageSrc: '/brand/legitafrica-icon-transparent.png',
        type: 'ui_review',
      },
      {
        visualPrompt: 'Brand integrity seal: "Real Nigerian motorists sharing honest ratings. No dealership can buy off reviews."',
        imageSrc: '/brand/legitafrica-icon-transparent.png',
        type: 'logo',
      },
      {
        visualPrompt: 'End card: LegitAfrica logo, "legitafrica.com" — Check the dealer first · Real experiences · Free.',
        imageSrc: '/brand/logo-clean.png',
        type: 'end_card',
      },
    ];
  } else {
    // General African Consumer & Vendor Protection
    sceneTemplates = [
      {
        visualPrompt: 'Close-up of a hand holding a phone showing a bank debit alert or transfer receipt for online goods.',
        imageSrc: '/scenes/scene1.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Relatable consumer experience: unpackaging a delivery or waiting expectantly for vendor dispatch rider.',
        imageSrc: '/scenes/scene2.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Disappointment or tension: single grey tick on WhatsApp, seller line busy or product completely different from picture.',
        imageSrc: '/scenes/scene3_v2.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Another unsuspecting customer on social media about to click "Send Payment" to the exact same vendor account.',
        imageSrc: '/scenes/scene4.jpg',
        type: 'photo',
      },
      {
        visualPrompt: 'Clean Legit Africa search bar: searching business name or handle, instantly revealing real community track record.',
        imageSrc: '/brand/logo-clean.png',
        type: 'ui_search',
      },
      {
        visualPrompt: 'Detailed review screen: rating stars, verified customer badge, and honest feedback: good or bad.',
        imageSrc: '/brand/legitafrica-icon-transparent.png',
        type: 'ui_review',
      },
      {
        visualPrompt: 'Brand trust guarantee: "No business fit pay us to comot honest review. 100% Free for all buyers across Africa."',
        imageSrc: '/brand/legitafrica-icon-transparent.png',
        type: 'logo',
      },
      {
        visualPrompt: 'End card: LegitAfrica official gold lockup, "legitafrica.com" — Search before you pay · Tell wetin happen · Free.',
        imageSrc: '/brand/logo-clean.png',
        type: 'end_card',
      },
    ];
  }

  // Which scenes show a LegitAfrica screen rather than a photo: the line that tells you to search,
  // the line about honest reviews, the line asking you to tell someone, and the closing line.
  const last = voiceLines.length - 1;
  const types: AdvertScene['type'][] = voiceLines.map(() => 'photo');
  types[last] = 'end_card';

  const claim = (pattern: RegExp, type: AdvertScene['type']) => {
    for (let i = last - 1; i >= 0; i--) {
      if (types[i] === 'photo' && pattern.test(voiceLines[i].toLowerCase())) {
        types[i] = type;
        return i;
      }
    }
    return -1;
  };
  const searchAt = claim(/\b(search|check|legit ?africa|legitafrica)\b/, 'ui_search');
  claim(/\b(review|reviews|honest|comot|remove|pay us)\b/, 'ui_review');
  claim(/\b(tell|yarn|warn|share)\b/, 'logo');
  if (searchAt === -1 && voiceLines.length >= 4) types[last - 1] = 'ui_search';

  const brandTemplate = (type: AdvertScene['type']) => sceneTemplates.find((t) => t.type === type);
  const photoTemplates = sceneTemplates.filter((t) => t.type === 'photo');
  let photoCount = 0;

  return stampScenes(
    voiceLines.map((voiceLine, idx) => {
      const type = types[idx];
      const template =
        type === 'photo' ? photoTemplates[photoCount++ % photoTemplates.length] : brandTemplate(type);
      return {
        id: idx + 1,
        voiceLine: voiceLine || `Scene ${idx + 1}`,
        visualPrompt: template?.visualPrompt || `Scene ${idx + 1} camera direction.`,
        imageSrc: template?.imageSrc || '/scenes/scene1.jpg',
        type,
      };
    })
  );
}
