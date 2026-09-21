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
 * Picks the pauses to cut on, all at once rather than one join at a time.
 *
 * Choosing each cut as "the pause nearest where the word count expects it" failed on a real
 * voiceover: a line read faster than its word count suggests put the estimate a couple of seconds
 * late, and the matcher took a short breath inside the next line over the long pause that
 * actually ended the scene. So instead every possible set of cuts is weighed together, and the
 * winner is the one that cuts on the longest pauses while keeping each scene near its expected
 * length. Long silences are line breaks; the durations stop it drifting onto the wrong one.
 */
export function pickCuts(scenes: AdvertScene[], duration: number, pauses: Pause[]): number[] {
  const estimate = sceneTimeline(
    scenes.map((s) => ({ ...s, lengthSeconds: undefined })),
    duration
  ).map((span) => span.end - span.start);

  const joins = scenes.length - 1;
  if (joins <= 0) return [];

  const candidates = [...pauses].filter((p) => p.at > 0.4 && p.at < duration - 0.4).sort((a, b) => a.at - b.at);
  if (candidates.length < joins) return estimatedCuts(estimate, duration);

  // How badly a scene of this length fits the one expected: a proportion, so a second off a
  // two-second scene matters more than a second off a ten-second one.
  const misfit = (length: number, expected: number) => Math.abs(length - expected) / Math.max(expected, 1);
  const LENGTH_WEIGHT = 2; // per 100% off the expected length
  const PAUSE_WEIGHT = 2; // per typical line break's worth of silence cut on
  const MIN_SCENE = 0.4;

  // Pauses are judged against this voiceover's own line breaks, not in absolute seconds: one
  // narrator pauses half a second between lines, another two. The typical line break is the
  // middle of the longest few pauses — there is roughly one per join.
  const longest = [...candidates].sort((a, b) => b.length - a.length).slice(0, joins);
  const typicalBreak = Math.max(0.1, longest[Math.floor(longest.length / 2)]?.length ?? 0.5);
  const weight = (p: Pause) => p.length / typicalBreak;

  const n = candidates.length;
  // best[j][k]: lowest cost with join j placed on candidate k
  const best: number[][] = Array.from({ length: joins }, () => new Array(n).fill(Infinity));
  const from: number[][] = Array.from({ length: joins }, () => new Array(n).fill(-1));

  for (let k = 0; k < n; k++) {
    const length = candidates[k].at;
    if (length < MIN_SCENE) continue;
    best[0][k] = LENGTH_WEIGHT * misfit(length, estimate[0]) - PAUSE_WEIGHT * weight(candidates[k]);
  }
  for (let j = 1; j < joins; j++) {
    for (let k = j; k < n; k++) {
      for (let i = j - 1; i < k; i++) {
        if (best[j - 1][i] === Infinity) continue;
        const length = candidates[k].at - candidates[i].at;
        if (length < MIN_SCENE) continue;
        const cost = best[j - 1][i] + LENGTH_WEIGHT * misfit(length, estimate[j]) - PAUSE_WEIGHT * weight(candidates[k]);
        if (cost < best[j][k]) {
          best[j][k] = cost;
          from[j][k] = i;
        }
      }
    }
  }

  // The last scene runs from the last cut to the end of the voiceover
  let last = -1;
  let lastCost = Infinity;
  for (let k = 0; k < n; k++) {
    if (best[joins - 1][k] === Infinity) continue;
    const length = duration - candidates[k].at;
    if (length < MIN_SCENE) continue;
    const cost = best[joins - 1][k] + LENGTH_WEIGHT * misfit(length, estimate[joins]);
    if (cost < lastCost) {
      lastCost = cost;
      last = k;
    }
  }
  if (last < 0) return estimatedCuts(estimate, duration);

  const chosen: number[] = [];
  for (let j = joins - 1, k = last; j >= 0; j--) {
    chosen.unshift(candidates[k].at);
    k = from[j][k];
  }
  return chosen;
}

/** Cuts at the word-count estimate, for a voiceover with too few pauses to go on. */
function estimatedCuts(estimate: number[], duration: number): number[] {
  const cuts: number[] = [];
  let t = 0;
  for (let i = 0; i < estimate.length - 1; i++) {
    t += estimate[i];
    cuts.push(Math.min(duration - 0.4 * (estimate.length - 1 - i), t));
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
