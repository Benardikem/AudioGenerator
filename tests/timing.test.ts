/**
 * Scene timing, clip fitting and voiceover matching — the rules every scene's length and every
 * cut depend on. Run with the rest of the checks: sh tests/run.sh
 */
import { sceneTimeline, clipFrameAt, sideRows } from '../src/utils/sceneTimeline';
import { pickCuts } from '../src/utils/audioAlign';
import { generateScenesFromScript } from '../src/utils/sceneGenerator';
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

// The wedding ad's real voiceover (Folake, 128.9s): the narrator pauses as long at a full stop
// inside a line as between lines. Cutting on those put scenes 9 to 18 each a line behind.
const weddingLines = [
"i no understand why my sister go dey cry for her own wedding morning.",
"Three months before the day, she find one makeup and gèlè vendor for Instagram.",
"The page get plenty bridal fine pictures. Plenty followers.  Before and after pictures. Testimonies everywhere.",
"Dem collect eighty-five thousand naira deposit.",
"the vendor call her, them assure her say \"Madam, we don lock your date.\"",
"Every week she go message: \"Sis, hope we dey alright?\"",
"Dem go reply with love emoji.",
"Six a.m. for Wedding morning. Nobody show.",
"She call — e ring, nobody pick.",
"Seven a.m., the line don go off.",
"Her mama dey shout. The photographer don land.",
"The bride sit down for chair, face bare, wrapper for her laps.",
"Na her cousin friend come to her rescue that morning, she sharp sharp do am with her own personal kit.",
"Nor be say the vendor die o. No be say the vendor sick either.",
"Na block dem block am",
"By afternoon, that same page don post another bride. Same gele. Same caption.",
"Now my sister don carry the whole matter go write for Legit Africa —",
"She attach proofs - the deposit alert, the date, the blocking —",
"so the next bride wey land for that page go read am before she pay.",
"Before you pay deposit to any vendor — Instagram, WhatsApp, anywhere —",
"search their name for Legit Africa first.",
"And if any business don do you, or dem do you well, go drop your review. Good or bad.",
"Nobody fit pay us to wipe honest review commot.",
"Legit Africa dot com. E completely free."
];
const weddingPauses = '0.13:0.26 0.58:0.12 2.55:0.14 5.62:1.20 7.87:0.74 11.24:0.88 11.82:0.12 12.22:0.12 12.55:0.14 15.11:0.38 16.78:0.40 18.61:0.54 20.04:0.20 20.39:0.26 22.01:1.62 23.58:0.24 23.86:0.16 24.18:0.24 27.00:1.72 29.13:0.78 31.03:0.38 32.20:0.12 33.21:1.66 36.23:0.66 37.10:0.52 38.91:1.46 42.11:1.62 45.21:1.02 47.56:1.40 48.49:0.14 49.08:0.44 50.50:0.12 51.63:1.46 53.18:0.24 55.07:1.46 57.53:0.86 60.12:1.48 62.27:0.22 62.77:0.26 63.49:0.70 65.89:1.58 67.01:0.14 69.54:0.72 73.09:1.66 75.65:0.98 77.90:0.72 80.57:1.50 82.28:0.52 85.47:0.42 88.30:1.68 92.94:1.08 94.58:0.28 95.81:0.22 96.56:0.16 97.70:0.80 100.65:0.18 102.47:1.82 103.82:0.12 104.74:0.24 106.05:0.82 107.23:0.50 108.07:0.14 109.37:0.98 112.45:1.30 113.35:0.14 114.30:0.12 114.79:0.18 116.32:0.76 117.97:0.66 118.99:0.18 119.30:0.12 119.96:1.16 121.16:0.20 122.21:0.18 123.19:0.14 124.10:1.52 125.15:0.14 126.68:0.76 127.42:0.12'
  .split(' ')
  .map((p) => { const [at, length] = p.split(':').map(Number); return { at, length }; });
const weddingTruth = [5.62, 11.24, 22.01, 27, 33.21, 38.91, 42.11, 47.56, 51.63, 55.07, 60.12, 65.89, 73.09, 77.9, 80.57, 88.3, 92.94, 97.7, 102.47, 109.37, 112.45, 119.96, 124.1];
const weddingCuts = pickCuts(weddingLines.map((voiceLine) => ({ voiceLine }) as any), 128.92, weddingPauses);
const offLines = weddingCuts.map((c, i) => (Math.abs(c - weddingTruth[i]) > 0.3 ? i + 2 : 0)).filter(Boolean);
check(offLines.length === 0, `a full stop inside a line is not taken for the end of the scene (off: ${offLines.join(', ')})`);

// Every voice offered is one the server will use — otherwise it silently speaks as Fenrir
const blocked = VOICE_OPTIONS.map((v) => v.id.replace('_Baritone', '').replace('_Bass', '')).filter((id) => !VOICE_NAMES.includes(id));
check(blocked.length === 0, `every voice on screen is allowed by the server (${blocked.join(', ')})`);

// Side fly-in rows start from the spoken line, one row per phrase
check(sideRows('the deposit alert, the date, the blocking —') === 'the deposit alert\nthe date\nthe blocking', 'a line splits into one row per phrase at commas and dashes');

// A script one line over the cap joins one pair, not every line
const longScript = Array.from({ length: 24 }, (_, i) => `This is spoken line number ${i + 1} of the story.`);
longScript.splice(10, 0, 'He pay am.');
const longScenes = generateScenesFromScript(longScript.join('\n'));
check(longScenes.length === 24, `a script one line over 24 still gets 24 scenes (${longScenes.length})`);
check(/number 10 of the story\. He pay am\.$/.test(longScenes[9].voiceLine), 'the short line joins the line before it');
check(longScenes[23].voiceLine === 'This is spoken line number 24 of the story.', 'the closing line keeps its own scene');

console.log(fails.length ? `\n${fails.length} FAILED` : '\ntiming: all checks passed');
process.exit(fails.length ? 1 : 0);
