import { AdvertScene } from '../types';
import { sceneTimeline } from './sceneTimeline';

/**
 * Times each scene to where its line is actually spoken in the voiceover.
 *
 * Automatic scene lengths are an estimate from word counts, and a few tenths of a second off per
 * scene adds up: by scene fifteen of twenty the picture can be a whole line behind the voice. But
 * the narrator pauses at every line break, and those pauses are plain to see in the audio — so the
 * studio can find them and cut on them instead of guessing.
 */

export interface Pause {
  /** Middle of the silence, in seconds — where a cut belongs. */
  at: number;
  /** How long the silence lasts, in seconds. Line breaks give longer pauses than commas. */
  length: number;
}

/** Finds the quiet stretches in a voiceover. */
export async function findPauses(audioUrl: string): Promise<{ duration: number; pauses: Pause[] }> {
  const res = await fetch(audioUrl, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('The voiceover could not be loaded.');
  const bytes = await res.arrayBuffer();

  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx: AudioContext = new Ctx();
  let audio: AudioBuffer;
  try {
    audio = await ctx.decodeAudioData(bytes);
  } finally {
    ctx.close().catch(() => {});
  }

  const samples = audio.getChannelData(0);
  const frameSeconds = 0.02;
  const frame = Math.max(1, Math.round(audio.sampleRate * frameSeconds));
  const energy: number[] = [];
  for (let i = 0; i + frame <= samples.length; i += frame) {
    let sum = 0;
    for (let j = i; j < i + frame; j++) sum += samples[j] * samples[j];
    energy.push(Math.sqrt(sum / frame));
  }

  // "Quiet" is relative to how loud the voice is, since every voiceover is recorded at a
  // different level.
  const sorted = [...energy].sort((a, b) => a - b);
  const speaking = sorted[Math.floor(sorted.length * 0.9)] || 0;
  const quiet = speaking * 0.08;

  const pauses: Pause[] = [];
  let runStart = -1;
  energy.forEach((e, i) => {
    if (e < quiet) {
      if (runStart < 0) runStart = i;
      return;
    }
    if (runStart >= 0) {
      const length = (i - runStart) * frameSeconds;
      if (length >= 0.12) pauses.push({ at: ((runStart + i) / 2) * frameSeconds, length });
      runStart = -1;
    }
  });

  return { duration: audio.duration, pauses };
}

/**
 * Picks, for each join between scenes, the pause that best fits: close to where the join is
 * expected, and long rather than short. Each join is expected a scene's estimated length after
 * the one before it — not at an absolute time — so an early error does not carry through the
 * rest of the advert.
 */
export function pickCuts(scenes: AdvertScene[], duration: number, pauses: Pause[]): number[] {
  const estimate = sceneTimeline(
    scenes.map((s) => ({ ...s, lengthSeconds: undefined })),
    duration
  ).map((span) => span.end - span.start);

  // An advert needs one cut per join, and line breaks give the longest pauses — so the longest
  // few pauses are the line breaks, and a comma's short breath is only a fallback.
  const joins = scenes.length - 1;
  const longest = [...pauses].sort((a, b) => b.length - a.length);
  const lineBreak = (longest[Math.min(joins, longest.length) - 1]?.length ?? 0) * 0.7;
  const breaks = pauses.filter((p) => p.length >= lineBreak);

  const nearest = (from: number, expected: number, reach: number, pool: Pause[]) => {
    let best: Pause | null = null;
    for (const p of pool) {
      if (p.at <= from + 0.4 || Math.abs(p.at - expected) > reach) continue;
      if (!best || Math.abs(p.at - expected) < Math.abs(best.at - expected)) best = p;
    }
    return best;
  };

  const cuts: number[] = [];
  let previous = 0;
  for (let i = 0; i < joins; i++) {
    const expected = previous + estimate[i];
    const reach = Math.max(1.2, estimate[i] * 0.6);
    const found = nearest(previous, expected, reach, breaks) ?? nearest(previous, expected, reach, pauses);
    const cut = found
      ? found.at
      : Math.min(duration - 0.4 * (joins - i), Math.max(previous + 0.4, expected));
    cuts.push(cut);
    previous = cut;
  }
  return cuts;
}

/** The scenes, each set to hold for exactly as long as its line takes in the voiceover. */
export async function alignScenesToVoiceover(
  scenes: AdvertScene[],
  audioUrl: string
): Promise<{ scenes: AdvertScene[]; matched: number; joins: number }> {
  const { duration, pauses } = await findPauses(audioUrl);
  const cuts = pickCuts(scenes, duration, pauses);
  const bounds = [0, ...cuts, duration];
  const matched = cuts.filter((c) => pauses.some((p) => Math.abs(p.at - c) < 0.001)).length;
  return {
    scenes: scenes.map((scene, i) => ({
      ...scene,
      lengthSeconds: Math.round((bounds[i + 1] - bounds[i]) * 100) / 100,
    })),
    matched,
    joins: cuts.length,
  };
}
