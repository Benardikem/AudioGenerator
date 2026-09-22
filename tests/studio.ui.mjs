/**
 * The studio, driven in a real browser. Each check is something that has broken before: if one
 * of these fails, a change has undone an earlier fix. Run everything with: sh tests/run.sh
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = await import(path.join(here, '.deps/node_modules/playwright-core/index.mjs'));
const EXE =
  process.env.CHROME ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-x64/chrome-headless-shell`;
const STUDIO = process.env.STUDIO_URL || 'http://localhost:3000';
const PHOTO = path.join(here, '../public/scenes/scene2.jpg');

const browser = await chromium.launch({ executablePath: EXE, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const pageErrors = [];
let browserDialogs = 0;
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('dialog', async (d) => {
  // The browser's own "leave with unsaved changes?" guard is wanted; the test just leaves.
  if (d.type() === 'beforeunload') return d.accept();
  browserDialogs++;
  console.log('dialog:', d.type(), d.message().slice(0, 80));
  await d.dismiss();
});

const fails = [];
const check = (ok, what) => {
  if (!ok) fails.push(what);
  console.log(ok ? 'ok  ' : 'FAIL', what);
};

// --- helpers -------------------------------------------------------------------------------
const newAd = async (title, lines) => {
  await page.goto(STUDIO, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1300);
  await page.getByRole('button', { name: /new ad/i }).first().click();
  await page.waitForTimeout(500);
  await page.getByText('Blank Draft', { exact: true }).first().click();
  await page.waitForTimeout(250);
  await page.locator('input[type="text"]').first().fill(title);
  await page.locator('textarea').first().fill(lines.join('\n'));
  await page.getByRole('button', { name: /Start Blank Draft/i }).click();
  await page.waitForTimeout(1300);
};
const toStoryboard = async () => {
  await page.getByRole('button', { name: /Storyboard/i }).first().click();
  await page.waitForTimeout(800);
};
const toPreview = async () => {
  await page.getByRole('button', { name: /Preview & Download/i }).first().click();
  await page.waitForTimeout(2200);
};
const editScene = async (n) => {
  await toStoryboard();
  await page.getByRole('button', { name: /^Edit$/ }).nth(n - 1).click();
  await page.waitForTimeout(900);
};
const apply = async () => {
  await page.getByRole('button', { name: /Apply Changes to Video/i }).click();
  await page.waitForTimeout(700);
};
const playButton = () =>
  page.locator('button').filter({ has: page.locator('svg.lucide-play') }).filter({ hasNotText: /Generate/ }).first();
const sceneCount = async () => parseInt((await page.locator('text=/\\d+ of 24 scenes/').first().textContent()) || '0');
const creamShare = () =>
  page.evaluate(() => {
    const c = document.querySelector('canvas');
    const g = c.getContext('2d');
    let cream = 0;
    let n = 0;
    for (let x = 0.1; x < 0.9; x += 0.05)
      for (let y = 0.1; y < 0.9; y += 0.05) {
        const d = g.getImageData(Math.round(c.width * x), Math.round(c.height * y), 1, 1).data;
        n++;
        if (d[0] > 225 && d[1] > 215 && d[2] > 195) cream++;
      }
    return cream / n;
  });

// --- the checks ----------------------------------------------------------------------------
const lines = ['First line here.', 'Second line here.', 'Third line here.', 'Fourth line here.', 'Fifth line here.', 'Sixth line here.'];
await newAd('Regression run', lines);

await toStoryboard();
check((await sceneCount()) === lines.length, 'a new ad gets one scene per line of script');

// Jumping from the storyboard lands on that scene, not scene 1
await page.getByRole('button', { name: /Scene 3/ }).first().click();
await page.waitForTimeout(2200);
const label = (await page.locator('text=/Scene \\d+ of \\d+/').first().textContent()) || '';
check(/Scene 3 of/.test(label), `jumping from the storyboard opens that scene (${label.trim()})`);

// Honest reviews shows its screen even though the scene starts with a stock photo
await editScene(1);
await page.getByRole('button', { name: 'LegitAfrica: honest reviews' }).click();
await page.waitForTimeout(300);
await apply();
await toPreview();
check((await creamShare()) > 0.5, 'choosing honest reviews shows the LegitAfrica screen, not the stock photo');

// A photo of your own replaces it, and a review card draws on top of it
await editScene(1);
await page.locator('input[type="file"][accept*="image"]').setInputFiles(PHOTO);
await page.waitForTimeout(2200);
await page.getByRole('button', { name: 'Review card' }).click();
await page.waitForTimeout(300);
await page
  .locator('select')
  .filter({ has: page.locator('option', { hasText: 'Top centre' }) })
  .first()
  .selectOption('top-center');
await apply();
await toPreview();
const topCream = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const g = c.getContext('2d');
  let cream = 0;
  let n = 0;
  for (let x = 0.2; x <= 0.8; x += 0.03)
    for (let y = 0.14; y <= 0.3; y += 0.02) {
      const d = g.getImageData(Math.round(c.width * x), Math.round(c.height * y), 1, 1).data;
      n++;
      if (d[0] > 230 && d[1] > 225 && d[2] > 205) cream++;
    }
  return cream / n;
});
check(topCream > 0.5, `a review card placed top-centre draws there over a photo (${Math.round(topCream * 100)}%)`);

// The playhead only ever moves forward while playing
const readTime = async () => {
  const t = (await page.locator('text=/\\d+s \\/ \\d+s/').first().textContent().catch(() => '')) || '';
  const m = /(\d+)s \/ (\d+)s/.exec(t);
  return m ? Number(m[1]) : -1;
};
await page.locator('text=/First line here/').first().click();
await page.waitForTimeout(800);
await playButton().click();
const seen = [];
for (let i = 0; i < 20; i++) {
  seen.push(await readTime());
  await page.waitForTimeout(250);
}
await playButton().click();
const reversals = seen.filter((v, i) => i > 0 && v < seen[i - 1] && seen[i - 1] < 10).length;
check(reversals === 0 && seen[seen.length - 1] > seen[0], `the playhead only moves forward (${seen.join(' ')})`);

// Playback is smooth enough in both frames
const measure = async () => {
  await page.evaluate(() => {
    window.__frames = 0;
    const tick = () => {
      window.__frames++;
      window.__raf = requestAnimationFrame(tick);
    };
    window.__raf = requestAnimationFrame(tick);
  });
  await playButton().click();
  await page.waitForTimeout(3000);
  await playButton().click();
  return page.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    return window.__frames / 3;
  });
};
const fps45 = await measure();
check(fps45 > 30, `4:5 plays smoothly (${Math.round(fps45)} frames a second)`);

// 9:16 fills its whole frame, and plays smoothly too
await page.getByRole('button', { name: /9:16/ }).first().click();
await page.waitForTimeout(2200);
const filled = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const g = c.getContext('2d');
  let rows = 0;
  for (let r = 0; r < 40; r++) {
    const d = g.getImageData(Math.round(c.width / 2), Math.round(((r + 0.5) / 40) * c.height), 1, 1).data;
    if (d[3] > 10) rows++;
  }
  return { size: `${c.width}x${c.height}`, share: rows / 40 };
});
check(filled.size === '1080x1920' && filled.share > 0.95, `9:16 fills the whole ${filled.size} frame`);
const fps916 = await measure();
check(fps916 > 30, `9:16 plays smoothly (${Math.round(fps916)} frames a second)`);
await page.getByRole('button', { name: /4:5/ }).first().click();
await page.waitForTimeout(1200);

// Destructive storyboard actions ask in the studio's own modal, never the browser's
await toStoryboard();
const before = await sceneCount();
await page.getByRole('button', { name: /Rebuild scenes from script/i }).click();
await page.waitForTimeout(500);
check((await page.locator('text=/Rebuild the storyboard from the script\\?/').count()) > 0, 'rebuilding the storyboard asks first');
await page.getByRole('button', { name: /^Cancel$/ }).first().click();
await page.waitForTimeout(300);
check((await sceneCount()) === before, 'cancelling keeps every scene');
check(browserDialogs === 0, 'no browser pop-ups are used');

// Saved, the Media screen says exactly which scene uses the photo
await page.getByRole('button', { name: /^Save$/ }).first().click();
await page.waitForTimeout(1500);
await page.getByRole('button', { name: /All ads/i }).first().click();
await page.waitForTimeout(1000);
await page.getByRole('button', { name: /^Media$/ }).first().click();
await page.waitForTimeout(1500);
const media = await page.locator('table tbody').innerText().catch(() => '');
check(/Regression run · scene 1/.test(media), 'the Media screen names the scene using a file');

// When the main voice engine's daily allowance is gone, the studio asks before using the backup
// — which reads Pidgin less naturally — rather than switching silently.
const tinyWav = (() => {
  const b = Buffer.alloc(44 + 1600);
  b.write('RIFF', 0); b.writeUInt32LE(36 + 1600, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24);
  b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(1600, 40);
  return 'data:audio/wav;base64,' + b.toString('base64');
})();
const voiceRequests = [];
await page.route('**/api/generate-commercial-audio', async (route) => {
  const body = JSON.parse(route.request().postData() || '{}');
  voiceRequests.push(body);
  if (!body.allowBackup) {
    return route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ backupAvailable: true, error: 'used up' }) });
  }
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ audioUrl: tinyWav, duration: 0.1, voice: 'Zephyr', style: 'storytime', script: 'x', usedBackupModel: true }),
  });
});
await newAd('Voice engine', ['One line.', 'Two line.']);
await page.locator('#generate-commercial-audio-btn').click();
await page.waitForTimeout(1200);
check(voiceRequests[0] && voiceRequests[0].allowBackup === false, 'a plain click never agrees to the backup engine');
check((await page.locator("text=/Today's main voice is used up/").count()) > 0, 'running out of the main voice asks before using the backup');
await page.getByRole('button', { name: /Use the backup now/i }).click();
await page.waitForTimeout(1500);
check(voiceRequests.length === 2 && voiceRequests[1].allowBackup === true, 'agreeing makes one request that allows the backup');
await page.unroute('**/api/generate-commercial-audio');

// A second voiceover on the script screen waits to be heard and chosen before it replaces the first
await page.route('**/api/generate-commercial-audio', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ audioUrl: tinyWav, duration: 7, voice: 'Zephyr', style: 'storytime', script: 'x' }),
  })
);
const readyText = () => page.locator('text=/Voiceover Audio Ready/').first().textContent().catch(() => '');
await page.locator('#generate-commercial-audio-btn').click();
await page.waitForTimeout(1200);
check((await page.locator('#prelisten-take audio').count()) === 1, 'a new take can be heard before it is used');
check(/\(0s\)/.test(await readyText()), 'until chosen, the ad keeps its current voiceover');
await page.getByRole('button', { name: /Keep the current voiceover/i }).click();
await page.waitForTimeout(300);
check((await page.locator('#prelisten-take').count()) === 0 && /\(0s\)/.test(await readyText()), 'keeping the current one throws the new take away');
await page.locator('#generate-commercial-audio-btn').click();
await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Use this voiceover/i }).click();
await page.waitForTimeout(300);
check(/\(7s\)/.test(await readyText()), 'choosing the new take puts it on the ad');
await page.unroute('**/api/generate-commercial-audio');

// Side fly-in text: rows start from the spoken line and arrive one after another
await newAd('Side fly-in', ['the deposit alert, the date, the blocking —', 'Second line here.']);
await editScene(1);
await page.getByRole('button', { name: 'Text (side fly-in)' }).click();
await page.waitForTimeout(300);
const rowsText = await page.getByPlaceholder('Type your headline here').inputValue().catch(() => '');
check(rowsText === 'the deposit alert\nthe date\nthe blocking', 'side fly-in starts with one row per phrase of the line');
await page.getByRole('button', { name: 'All from the right' }).click();
await page.getByPlaceholder('0.2').fill('1.5');
await page.getByPlaceholder('Auto').fill('0.5');
const plan = await page.locator('#fly-plan').innerText();
check(/all from the right\. The first arrives 1\.5s into the scene, then one every 0\.5s; the last at 2\.5s/.test(plan), 'the plan says which side and when the rows arrive');
await apply();
await toPreview();
const ink = () =>
  page.evaluate(() => {
    const c = document.querySelector('canvas');
    const g = c.getContext('2d');
    let dark = 0;
    for (let x = 0.05; x < 0.95; x += 0.02)
      for (let y = 0.15; y < 0.75; y += 0.02) {
        const d = g.getImageData(Math.round(c.width * x), Math.round(c.height * y), 1, 1).data;
        if (d[0] < 80 && d[1] < 80 && d[2] < 80) dark++;
      }
    return dark;
  });
await page.locator('text=/the deposit alert/').first().click();
await page.waitForTimeout(800);
const inkBefore = await ink();
await playButton().click();
for (let i = 0; i < 40 && (await readTime()) < 1; i++) await page.waitForTimeout(100);
const inkWaiting = await ink();
// Wait until the scene has really played for a few seconds, however slowly playback starts
for (let i = 0; i < 40 && (await readTime()) < 4; i++) await page.waitForTimeout(250);
const inkAfter = await ink();
check(inkBefore < 5 && inkWaiting < 5 && inkAfter > 40, `side fly-in rows wait, then arrive while the scene plays (${inkBefore} → ${inkWaiting} → ${inkAfter})`);

// Scene 3 of the wedding ad, as set up by hand: side fly-in over a photo, six rows from the left,
// a 3s wait before the first and 1s between the rest. The wait and gap must hold on screen.
await newAd('Fly-in timing', [
  'The page get plenty bridal fine pictures. Plenty followers. Before and after pictures. Testimonies everywhere, and more words so this line runs long enough to watch.',
  'Short end.',
]);
await page.setViewportSize({ width: 1280, height: 720 });
await editScene(1);
await page.getByRole('button', { name: 'Text (side fly-in)' }).click();
await page.getByRole('button', { name: 'Over my photo' }).click();
await page.waitForTimeout(300);
await page.locator('input[type="file"][accept*="image"]').setInputFiles(PHOTO);
await page.waitForTimeout(2200);
await page.getByPlaceholder('Type your headline here').fill('*Plenty*\nBridal Pictures.\n14.2k followers.\nBefore/After pictures.\nTestimonies\n*everywhere*');
await page.getByRole('button', { name: 'All from the left' }).click();
await page.getByPlaceholder('0.2').fill('3');
await page.getByPlaceholder('Auto').fill('1');
const box = await page.locator('#edit-scene-modal').boundingBox();
check(box && box.y >= 0 && box.y + box.height <= 720, `the scene editor fits a small screen (${Math.round(box?.y ?? -1)} to ${Math.round((box?.y ?? 0) + (box?.height ?? 0))} of 720)`);
const scrolls = await page.locator('#edit-scene-body').evaluate((el) => el.scrollHeight > el.clientHeight + 10);
await page.locator('#edit-scene-body').evaluate((el) => (el.scrollTop = el.scrollHeight));
const headerSeen = await page.locator('text=/Edit Scene 1 of/').isVisible();
check(scrolls && headerSeen, 'its fields scroll while the title stays in view');
const planLine = await page.locator('#fly-plan').innerText();
check(/6 rows, all from the left\. The first arrives 3\.0s into the scene, then one every 1\.0s; the last at 8\.0s/.test(planLine), `the plan says it in one line (${planLine.slice(0, 90)})`);
await apply();
await page.setViewportSize({ width: 1500, height: 1000 });
await toPreview();
const bright = () =>
  page.evaluate(() => {
    const c = document.querySelector('canvas');
    const g = c.getContext('2d');
    let n = 0;
    for (let x = 0.03; x < 0.97; x += 0.015)
      for (let y = 0.14; y < 0.9; y += 0.012) {
        const d = g.getImageData(Math.round(c.width * x), Math.round(c.height * y), 1, 1).data;
        if ((d[0] > 200 && d[1] > 190) || (d[0] > 200 && d[1] > 130 && d[2] < 90)) n++; // cream or gold
      }
    return n;
  });
await page.locator('text=/The page get plenty/').first().click();
await page.waitForTimeout(800);
await playButton().click();
const samples = [];
for (let i = 0; i < 44; i++) {
  samples.push([await readTime(), await bright()]);
  await page.waitForTimeout(250);
}
await playButton().click();
const at = (lo, hi) => samples.filter(([t]) => t >= lo && t <= hi).map(([, b]) => b);
const early = at(0, 2);
const firstRow = at(3.5, 3.5).length ? at(3.5, 3.5) : at(4, 4);
const later = at(7, 7);
const all = at(9, 11);
console.log('     fly-in samples (second:brightness)', samples.map(([t, b]) => `${t}:${b}`).join(' '));
check(early.length > 0 && Math.max(...early) < 3, 'nothing flies in before the 3s wait is up');
check(firstRow.length > 0 && Math.min(...firstRow) > 5, 'the first row is in by 4s');
check(later.length > 0 && Math.min(...later) > Math.max(...firstRow) * 1.5, 'more rows have arrived by 7s, a second apart');
check(all.length > 0 && Math.min(...all) >= Math.max(...later), 'all six rows are in by 9s');

// Captions were taken out: the ads carry their own text, and captions on top made scenes noisy
await toPreview();
check((await page.locator('text=/Captions: (ON|OFF)/').count()) === 0, 'the preview has no captions switch');

check(pageErrors.length === 0, `no errors in the page (${pageErrors.slice(0, 2).join(' | ')})`);

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nstudio: all checks passed');
process.exit(fails.length ? 1 : 0);
