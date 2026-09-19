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

const wordCount = (s?: string) => (s || '').trim().split(/\s+/).filter(Boolean).length;

export interface SceneSpan {
  start: number;
  end: number;
}

/**
 * Start and end time of every scene. Each scene's share of the voiceover matches its share of the
 * words, with a floor of four words so a label-only or silent scene still gets about two seconds.
 */
export function sceneTimeline(scenes: AdvertScene[], total: number): SceneSpan[] {
  if (scenes.length === 0) return [];
  const weights = scenes.map((s) => Math.max(4, wordCount(s.voiceLine)));
  const sum = weights.reduce((a, b) => a + b, 0);
  let t = 0;
  return weights.map((w, i) => {
    const start = t;
    t += (total * w) / sum;
    return { start, end: i === weights.length - 1 ? total : t };
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
      if (!byPosition || s.type === 'text') return s;
      return { ...s, type: (i < 4 ? 'photo' : BRAND_TYPES[i - 4]) as AdvertScene['type'] };
    })
  );
}
