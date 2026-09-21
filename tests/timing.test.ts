/**
 * Scene timing, clip fitting and voiceover matching — the rules every scene's length and every
 * cut depend on. Run with the rest of the checks: sh tests/run.sh
 */
import { sceneTimeline, clipFrameAt, sideRows } from '../src/utils/sceneTimeline';
import { pickCuts } from '../src/utils/audioAlign';
import { VOICE_OPTIONS } from '../src/components/VoiceSelector';
import { VOICE_NAMES } from '../voiceNames';

const fails: string[] = [];
const check = (ok: boolean, what: string) => {
  if (!ok) fails.push(what);
  console.log(ok ? 'ok  ' : 'FAIL', what);
};
const near = (a: number, b: number, t = 0.05) => Math.abs(a - b) <= t;
const sc = (words: number, lengthSeconds?: number) => ({ voiceLine: 'w '.repeat(words).trim(), lengthSeconds }) as any;

// Scene lengths
const set = sceneTimeline([sc(6, 4), sc(14), sc(15), sc(13)], 40);
check(near(set[0].end - set[0].start, 4), 'a scene given a length holds for exactly that long');
check(near(set[3].end, 40), 'the last scene ends with the voiceover');
check(set.every((s, i) => i === 0 || near(s.start, set[i - 1].end)), 'scenes follow on without gaps');
check(near(sceneTimeline([sc(5, 30), sc(5, 30)], 20)[1].end, 20), 'lengths longer than the voiceover are scaled to fit');
const even = sceneTimeline([sc(5), sc(5)], 10);
check(near(even[0].end, 5), 'lines of equal length share the voiceover equally');
const money = (line: string) => {
  const s = sceneTimeline([{ voiceLine: line } as any, sc(4), sc(4)], 30);
  return s[0].end - s[0].start;
};
check(money('Dem collect eighty-five thousand naira deposit.') > money('Dem collect eightyfive thousand naira deposit.'), 'hyphenated numbers count as spoken');
check(money('Dem collect 84k deposit.') > money('Dem collect deposit.'), 'figures count as the words it takes to say them');

// Clips shorter than their scene
check(near(clipFrameAt(5, 0, 7).rate, 5 / 7), 'a short clip slows to fit its scene');
check(near(clipFrameAt(5, 6, 7, 'loop').time, 1), 'a looped clip restarts');
check(near(clipFrameAt(5, 6, 7, 'hold').time, clipFrameAt(5, 7, 7, 'hold').time), 'a held clip freezes on its last frame');
check(clipFrameAt(12, 3, 7).rate === 1, 'a clip longer than its scene is never sped up');

// Matching scenes to the voiceover
const truth = [3.1, 7.9, 10.2, 15.0];
const pauses = [...truth.map((at) => ({ at, length: 0.4 })), { at: 4.1, length: 0.14 }, { at: 12.1, length: 0.15 }, { at: 16.2, length: 0.13 }];
const cuts = pickCuts([sc(8), sc(8), sc(8), sc(8), sc(8)], 20, pauses);
check(cuts.every((c, i) => near(c, truth[i], 0.01)), 'cuts land on line breaks, not on commas nearby');
// The case from the wedding advert: a long pause just before a short breath in the next line
const wedding = pickCuts(
  [sc(20), sc(13), sc(5), sc(12)],
  22,
  [{ at: 6.2, length: 1.62 }, { at: 8.5, length: 0.66 }, { at: 10.5, length: 0.84 }, { at: 12.8, length: 1.34 }]
);
check(near(wedding[0], 6.2, 0.01), 'a long line break beats a short breath the word count expects');
const bare = pickCuts([sc(8), sc(8), sc(8)], 20, []);
check(bare.length === 2 && bare[0] < bare[1] && bare[1] < 20, 'with no pauses it falls back to an ordered estimate');

// Every voice offered is one the server will use — otherwise it silently speaks as Fenrir
const blocked = VOICE_OPTIONS.map((v) => v.id.replace('_Baritone', '').replace('_Bass', '')).filter((id) => !VOICE_NAMES.includes(id));
check(blocked.length === 0, `every voice on screen is allowed by the server (${blocked.join(', ')})`);

// Side fly-in rows start from the spoken line, one row per phrase
check(sideRows('the deposit alert, the date, the blocking —') === 'the deposit alert\nthe date\nthe blocking', 'a line splits into one row per phrase at commas and dashes');

console.log(fails.length ? `\n${fails.length} FAILED` : '\ntiming: all checks passed');
process.exit(fails.length ? 1 : 0);
