import { AdvertScene } from '../types';

/**
 * Intelligently generates or parses an 8-scene synchronized video storyboard
 * from any script or prompt description, with detailed Visual Prompts and Action Descriptions.
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
  const isPhoneTech = lower.includes('phone') || lower.includes('gadget') || lower.includes('computer village') || lower.includes('battery');
  const isTailorFashion = lower.includes('tailor') || lower.includes('cloth') || lower.includes('wedding') || lower.includes('ankara') || lower.includes('sew');
  const isVendorGhost = lower.includes('instagram') || lower.includes('seller') || lower.includes('dm') || lower.includes('transfer') || lower.includes('blocked');
  const isRentalAuto = lower.includes('car') || lower.includes('house') || lower.includes('rent') || lower.includes('landlord');

  // Split lines into 8 beats
  let voiceLines: string[] = [];
  if (rawLines.length === 8) {
    voiceLines = rawLines;
  } else if (rawLines.length > 8) {
    // Merge into 8 chunks
    const chunkSize = Math.ceil(rawLines.length / 8);
    for (let i = 0; i < 8; i++) {
      const slice = rawLines.slice(i * chunkSize, (i + 1) * chunkSize);
      voiceLines.push(slice.join(' '));
    }
  } else if (rawLines.length > 0) {
    // If fewer lines, distribute them across 8 beats with sensible cadence
    const totalLines = rawLines.length;
    for (let i = 0; i < 8; i++) {
      const lineIndex = Math.floor((i / 8) * totalLines);
      voiceLines.push(rawLines[lineIndex] || rawLines[rawLines.length - 1]);
    }
  } else {
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

  return voiceLines.map((voiceLine, idx) => ({
    id: idx + 1,
    voiceLine: voiceLine || `Scene ${idx + 1}`,
    visualPrompt: sceneTemplates[idx]?.visualPrompt || `Scene ${idx + 1} camera direction.`,
    imageSrc: sceneTemplates[idx]?.imageSrc || '/scenes/scene1.jpg',
    type: sceneTemplates[idx]?.type || (idx < 4 ? 'photo' : idx === 4 ? 'ui_search' : idx === 5 ? 'ui_review' : idx === 6 ? 'logo' : 'end_card'),
  }));
}
