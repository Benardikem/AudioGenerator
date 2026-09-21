import { AdvertScene } from '../types';

/**
 * Scene timing and scene-list rules shared by the storyboard, the preview and the export.
 *
 * The studio used to assume exactly eight scenes of equal length, which suited a 32-second
 * script and nothing else: a 70-second story got eight 9-second shots. Now an ad has as many
 * scenes as it needs, and each lasts in proportion to its own spoken line.
 */

export const MAX_SCENES = 24;

const BRAND_TYPES = ['logo', 'ui_search', 'ui_review', 'end_card'];

/** The LegitAfrica screens (tell them, search, honest reviews, end card). Anything else shows a photo or text. */
export const isBrandType = (type: AdvertScene['type']) => BRAND_TYPES.includes(type);

/** Words it takes to say a number aloud: 85 -> 2 ("eighty five"), 84000 -> 3, 300000 -> 3. */
function spokenNumberWords(n: number): number {
  if (!isFinite(n) || n < 0) return 1;
  n = Math.floor(n);
  if (n < 20) return 1;
  if (n < 100) return n % 10 ? 2 : 1;
  if (n < 1000) return 2 + (n % 100 ? spokenNumberWords(n % 100) : 0);
  if (n < 1_000_000) return spokenNumberWords(n / 1000) + 1 + (n % 1000 ? spokenNumberWords(n % 1000) : 0);
  return spokenNumberWords(n / 1_000_000) + 1 + (n % 1_000_000 ? spokenNumberWords(n % 1_000_000) : 0);
}

/**
 * Roughly how many words are spoken, which is what a scene's share of the voiceover is based on.
 * Counting what is written undercounts badly on money lines: "eighty-five" is two words aloud,
 * "84k" is three, and "₦300,000" is four with the "naira" — and those are exactly the lines a
 * narrator slows down on.
 */
const wordCount = (s?: string) =>
  (s || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .reduce((total, token) => {
      const money = /^[₦$£€]/.test(token);
      const digits = /^[₦$£€]?([\d,.]+)([kKmM])?/.exec(token);
      if (digits) {
        const base = parseFloat(digits[1].replace(/,/g, ''));
        const scale = digits[2] ? (/k/i.test(digits[2]) ? 1000 : 1_000_000) : 1;
        return total + spokenNumberWords(base * scale) + (money ? 1 : 0);
      }
      // "eighty-five", "two-bedroom": each part is spoken
      return total + token.split('-').filter(Boolean).length;
    }, 0);

export interface SceneSpan {
  start: number;
  end: number;
}

/**
 * Start and end time of every scene.
 *
 * A scene with `lengthSeconds` holds for exactly that long: word counts are a guess at where the
 * words fall in the voiceover, and a line delivered with pauses — "Three hundred thousand naira.
 * Gone." — takes far longer to say than its length on the page suggests. Whatever is left over is
 * shared between the remaining scenes in proportion to how much is spoken in each, with a floor of
 * four words so a label-only or silent scene still gets about two seconds.
 */
export function sceneTimeline(scenes: AdvertScene[], total: number): SceneSpan[] {
  if (scenes.length === 0) return [];

  const fixed = scenes.map((s) =>
    typeof s.lengthSeconds === 'number' && s.lengthSeconds > 0 ? s.lengthSeconds : null
  );
  const fixedTotal = fixed.reduce((sum: number, f) => sum + (f ?? 0), 0);
  // Set lengths that overrun the voiceover are scaled back together, rather than pushing the last
  // scenes off the end of the advert.
  const squeeze = fixedTotal > total ? total / fixedTotal : 1;

  const weights = scenes.map((s, i) => (fixed[i] === null ? Math.max(4, wordCount(s.voiceLine)) : 0));
  const weightTotal = weights.reduce((a, b) => a + b, 0);
  const free = Math.max(0, total - fixedTotal * squeeze);

  let t = 0;
  return scenes.map((_, i) => {
    const start = t;
    t += fixed[i] !== null ? fixed[i]! * squeeze : weightTotal > 0 ? (free * weights[i]) / weightTotal : 0;
    return { start, end: i === scenes.length - 1 ? total : t };
  });
}

/** Index of the scene playing at `time`. */
export function sceneIndexAt(spans: SceneSpan[], time: number): number {
  for (let i = spans.length - 1; i >= 0; i--) if (time >= spans[i].start) return i;
  return 0;
}

/** Rough voiceover length before any audio exists, at an unhurried narration pace. */
export function estimateDuration(script: string): number {
  return Math.max(8, Math.round(wordCount(script) / 2.3));
}

export type ClipFit = 'slow' | 'loop' | 'hold';

/**
 * Where a clip should be, and how fast it should run, at a given moment in its scene.
 *
 * A five-second clip under a seven-second line has to fill the gap somehow, and which way looks
 * right depends on the shot: slow it down so nothing repeats (the default — AI footage takes slow
 * motion well), loop it back to the start, or play it through and hold the last frame. A clip
 * longer than its scene is simply cut off when the scene ends.
 */
export function clipFrameAt(
  clipDuration: number,
  timeIntoScene: number,
  sceneDuration: number,
  fit: ClipFit = 'slow'
): { rate: number; time: number; ended: boolean } {
  if (!clipDuration || !isFinite(clipDuration) || clipDuration <= 0) return { rate: 1, time: 0, ended: false };

  // Below about half speed the motion starts to judder, so the rest is held instead.
  const rate = fit === 'slow' && clipDuration < sceneDuration ? Math.max(0.5, clipDuration / sceneDuration) : 1;
  const reached = Math.max(0, timeIntoScene) * rate;
  if (reached < clipDuration) return { rate, time: reached, ended: false };
  return {
    rate,
    time: fit === 'loop' ? reached % clipDuration : Math.max(0, clipDuration - 0.05),
    // Played out: 'loop' starts again, the others stop on the final frame.
    ended: fit !== 'loop',
  };
}

/** Renumber ids to match order and mark the list as using type-based drawing. */
export function stampScenes(scenes: AdvertScene[]): AdvertScene[] {
  return scenes.map((s, i) => ({ ...s, id: i + 1, layoutVersion: 2 }));
}

/**
 * Scenes as loaded from a saved ad. Before this change, scenes were drawn by position (1-4 a photo,
 * then the tell-them, search, honest-review and end-card screens) and their stored `type` was
 * ignored, so older ads carry types that don't match what they showed. Converting them to the
 * types they were actually drawn as keeps every old ad looking exactly as it did.
 */
export function normalizeScenes(scenes: AdvertScene[]): AdvertScene[] {
  if (scenes.some((s) => s.layoutVersion === 2)) return stampScenes(scenes);
  const byPosition = scenes.length === 8;
  return stampScenes(
    scenes.map((s, i) => {
      if (!byPosition || s.type === 'text' || s.type === 'text_side') return s;
      return { ...s, type: (i < 4 ? 'photo' : BRAND_TYPES[i - 4]) as AdvertScene['type'] };
    })
  );
}

/** The spoken line broken into rows at its commas and dashes: "the alert, the date" → two rows. */
export const sideRows = (line: string) =>
  (line || '')
    .split(/\s*[,;—–]\s*|\s+-\s+/)
    .map((r) => r.trim())
    .filter(Boolean)
    .join('\n');
