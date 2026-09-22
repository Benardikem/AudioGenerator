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
const pauseButton = () => page.locator('button').filter({ has: page.locator('svg.lucide-pause') }).first();
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

// Moving on while a new take still waits to be chosen asks, instead of silently keeping the old one
await page.locator('#generate-commercial-audio-btn').click();
await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Next: Storyboard/i }).click();
await page.waitForTimeout(400);
check((await page.locator("text=/You haven't chosen the new voiceover/").count()) > 0, 'leaving with a new voiceover not yet chosen asks which to keep');
await page.getByRole('button', { name: 'Keep the old one' }).click();
await page.waitForTimeout(500);
check((await page.locator('text=/Storyboard Scenes|Match scenes to voiceover/').count()) > 0, 'after answering, it goes on to the Storyboard');
await page.getByRole('button', { name: /Script & Voiceover/i }).first().click();
await page.waitForTimeout(500);

// Saving records the voice the recording was made with, not whichever voice is selected now
await page.getByText('Kofi', { exact: true }).first().click();
await page.waitForTimeout(200);
const saveReq = page.waitForRequest((r) => r.url().includes('/api/commercials') && ['POST', 'PUT'].includes(r.method()), { timeout: 8000 });
await page.getByRole('button', { name: /^Save$/ }).first().click();
const savedBody = JSON.parse((await saveReq).postData() || '{}');
check(savedBody.voice === 'Zephyr', `saving records the recording's own voice (${savedBody.voice}), not the one picked afterwards`);
await page.waitForTimeout(800);
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
check(/all from the right\. The first arrives 1\.5s after the picture is in, then one every 0\.5s; the last at 2\.5s/.test(plan), 'the plan says which side and when the rows arrive');
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
check(/6 rows, all from the left\. The first arrives 3\.0s after the picture is in, then one every 1\.0s; the last at 8\.0s/.test(planLine), `the plan says it in one line (${planLine.slice(0, 90)})`);
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

// The same scene after another one: the wait counts from when its picture has dissolved fully in,
// not from the first frame of the dissolve (0.6s from there looked like no wait at all).
await newAd('Fly-in after a scene', [
  'Three months before the day, she find one makeup and gele vendor for Instagram.',
  'The page get plenty bridal fine pictures. Plenty followers. Before and after pictures. Testimonies everywhere.',
  'Dem collect deposit.',
]);
await editScene(1);
await page.getByPlaceholder('e.g. 7').fill('3');
await apply();
await editScene(2);
await page.getByRole('button', { name: 'Text (side fly-in)' }).click();
await page.getByRole('button', { name: 'Over my photo' }).click();
await page.waitForTimeout(300);
await page.locator('input[type="file"][accept*="image"]').setInputFiles(path.join(here, '../public/scenes/scene1.jpg'));
await page.waitForTimeout(2200);
await page.getByPlaceholder('Type your headline here').fill('Plenty\nBridal Pictures.\nTestimonies');
await page.getByPlaceholder('0.2').fill('0.6');
await page.getByPlaceholder('Auto').fill('0.3');
await page.getByPlaceholder('e.g. 7').fill('8');
await apply();
await toPreview();
await page.locator('#preview-scene-list [data-scene-index="0"]').click();
await page.waitForTimeout(1000);
const trace = page.evaluate(
  () =>
    new Promise((res) => {
      const c = document.querySelector('canvas');
      const g = c.getContext('2d', { willReadFrequently: true });
      const out = [];
      const t0 = performance.now();
      const tick = () => {
        const now = performance.now() - t0;
        const d = g.getImageData(0, Math.round(c.height * 0.14), c.width, Math.round(c.height * 0.6)).data;
        let lum = 0, text = 0, n = 0;
        for (let i = 0; i < d.length; i += 4 * 97) {
          n++;
          lum += d[i] + d[i + 1] + d[i + 2];
          if (d[i] > 200 && d[i + 1] > 190) text++;
        }
        out.push([now, lum / n / 3, text]);
        if (now < 6000) requestAnimationFrame(tick);
        else res(out);
      };
      requestAnimationFrame(tick);
    })
);
await playButton().click();
const frames = await trace;
await playButton().click();
// The dissolve has finished once the darkened picture stops getting darker
const darkest = Math.min(...frames.map(([, l]) => l));
const pictureIn = frames.find(([, l]) => l <= darkest + 1.5)?.[0] ?? 0;
const firstText = frames.find(([t, , x]) => t > pictureIn && x > 20)?.[0] ?? 0;
check(firstText - pictureIn >= 500, `after a scene change, row 1 waits for the picture to be in (${Math.round(firstText - pictureIn)}ms after)`);

// Scene 20 of the wedding ad: a small label as well as rows, taking turns, 1.1s wait, 1.4s gap.
// The label came up at once, so the whole scene looked as if it ignored the wait.
await newAd('Fly-in with a label', [
  'Three months before the day, she find one makeup and gele vendor for Instagram.',
  'Before you pay deposit to any vendor, Instagram, WhatsApp, anywhere, check them well well first.',
  'Dem collect deposit.',
]);
await editScene(1);
await page.getByPlaceholder('e.g. 7').fill('3');
await apply();
await editScene(2);
await page.getByRole('button', { name: 'Text (side fly-in)' }).click();
await page.getByRole('button', { name: 'Over my photo' }).click();
await page.waitForTimeout(300);
await page.locator('input[type="file"][accept*="image"]').setInputFiles(path.join(here, '../public/scenes/scene1.jpg'));
await page.waitForTimeout(2200);
await page.getByPlaceholder('e.g. WHAT HAPPENED NEXT').fill('BEFORE YOU PAY ANY DEPOSIT');
await page.getByPlaceholder('Type your headline here').fill('Instagram\nWhatsApp\n*anywhere*');
await page.getByPlaceholder('0.2').fill('1.1');
await page.getByPlaceholder('Auto').fill('1.4');
await page.getByPlaceholder('e.g. 7').fill('6.9');
check(/The small label arrives with row 1/.test(await page.locator('#fly-plan').innerText()), 'the plan says the label waits with row 1');
await apply();
await toPreview();
await page.locator('#preview-scene-list [data-scene-index="0"]').click();
await page.waitForTimeout(1000);
const labelTrace = page.evaluate(
  () =>
    new Promise((res) => {
      const c = document.querySelector('canvas');
      const g = c.getContext('2d', { willReadFrequently: true });
      const out = [];
      const t0 = performance.now();
      const tick = () => {
        const now = performance.now() - t0;
        const d = g.getImageData(0, Math.round(c.height * 0.12), c.width, Math.round(c.height * 0.64)).data;
        let lum = 0, text = 0, n = 0;
        for (let i = 0; i < d.length; i += 4 * 97) {
          n++;
          lum += d[i] + d[i + 1] + d[i + 2];
          if ((d[i] > 160 && d[i + 1] > 150 && d[i + 2] > 140) || (d[i] > 200 && d[i + 1] > 130 && d[i + 2] < 90)) text++;
        }
        out.push([now, lum / n / 3, text]);
        if (now < 7000) requestAnimationFrame(tick);
        else res(out);
      };
      requestAnimationFrame(tick);
    })
);
await playButton().click();
const labelFrames = await labelTrace;
await pauseButton().click();
const labelDarkest = Math.min(...labelFrames.map(([, l]) => l));
const labelPictureIn = labelFrames.find(([, l]) => l <= labelDarkest + 1.5)?.[0] ?? 0;
const labelFirst = labelFrames.find(([t, , x]) => t > labelPictureIn && x > 8)?.[0] ?? 0;
check(labelFirst - labelPictureIn >= 1000, `a scene with a small label keeps all its text back for the wait (first text ${Math.round(labelFirst - labelPictureIn)}ms after the picture)`);

// The label can have its own wait: label at 0.3s, rows from 2.5s, on the same scene
await editScene(2);
await page.getByPlaceholder('With row 1').fill('0.3');
await page.getByPlaceholder('0.2').fill('2.5');
check(/The small label arrives 0\.3s after the picture is in/.test(await page.locator('#fly-plan').innerText()), 'the plan gives the label its own time');
await apply();
await toPreview();
await page.locator('#preview-scene-list [data-scene-index="0"]').click();
await page.waitForTimeout(1000);
const ownTrace = page.evaluate(
  () =>
    new Promise((res) => {
      const c = document.querySelector('canvas');
      const g = c.getContext('2d', { willReadFrequently: true });
      const out = [];
      const t0 = performance.now();
      const tick = () => {
        const now = performance.now() - t0;
        const d = g.getImageData(0, Math.round(c.height * 0.12), c.width, Math.round(c.height * 0.64)).data;
        let lum = 0, text = 0, n = 0;
        for (let i = 0; i < d.length; i += 4 * 97) {
          n++;
          lum += d[i] + d[i + 1] + d[i + 2];
          if ((d[i] > 160 && d[i + 1] > 150 && d[i + 2] > 140) || (d[i] > 200 && d[i + 1] > 130 && d[i + 2] < 90)) text++;
        }
        out.push([now, lum / n / 3, text]);
        if (now < 8000) requestAnimationFrame(tick);
        else res(out);
      };
      requestAnimationFrame(tick);
    })
);
await playButton().click();
const ownFrames = await ownTrace;
await pauseButton().click();
const ownDarkest = Math.min(...ownFrames.map(([, l]) => l));
const ownIn = ownFrames.find(([, l]) => l <= ownDarkest + 1.5)?.[0] ?? 0;
const labelSeen = ownFrames.find(([t, , x]) => t > ownIn && x > 8);
const labelOnly = labelSeen ? labelSeen[2] : 0;
const rowsSeen = ownFrames.find(([t, , x]) => t > ownIn && x > labelOnly * 3 + 20)?.[0] ?? 0;
const labelMs = Math.round((labelSeen?.[0] ?? 0) - ownIn);
const rowsMs = Math.round(rowsSeen - ownIn);
check(labelMs >= 200 && labelMs < 1200 && rowsMs >= 2400, `the label keeps its own time, the rows theirs (label ${labelMs}ms, rows ${rowsMs}ms after the picture)`);

// The scene list beside the preview follows playback, and there is no second row of scene buttons
await newAd('List follows', Array.from({ length: 12 }, (_, i) => `Scene number ${i + 1} line.`));
await toPreview();
check((await page.locator('text=/Jump to Scene/').count()) === 0, 'the preview has one scene list, not a second row of buttons');
await page.locator('#preview-scene-list [data-scene-index="8"]').click();
await page.waitForTimeout(1200);
const inView = (i) =>
  page.evaluate((i) => {
    const list = document.querySelector('#preview-scene-list');
    const item = list.querySelector(`[data-scene-index="${i}"]`);
    const a = list.getBoundingClientRect();
    const b = item.getBoundingClientRect();
    return b.top >= a.top - 1 && b.bottom <= a.bottom + 1 && /ring-1/.test(item.className);
  }, i);
check(await inView(8), 'clicking a scene far down the list highlights it and keeps it in view');
await page.locator('#preview-scene-list [data-scene-index="0"]').click();
await page.waitForTimeout(1200);
await playButton().click();
for (let i = 0; i < 80 && !/Scene ([7-9]|1\d) of/.test((await page.locator('text=/Active: Scene \\d+ of/').first().textContent()) || ''); i++) 
  await page.waitForTimeout(250);
await pauseButton().click(); // while playing, the play-icon helper would find the restart button
await page.waitForTimeout(900);
const playing = parseInt(/Scene (\d+) of/.exec((await page.locator('text=/Active: Scene \\d+ of/').first().textContent()) || '')?.[1] || '0') - 1;
check(playing >= 6 && (await inView(playing)), `the list moves along with playback (scene ${playing + 1} highlighted and in view)`);

// The script screen has nothing that replaces the script in one click
await newAd('Script safe', ['My own line one.', 'My own line two.']);
await page.getByRole('button', { name: /Script & Voiceover/i }).first().click();
await page.waitForTimeout(600);
check(
  (await page.locator('[id^="preset-btn-"], #reset-script-btn').count()) === 0 && (await page.locator('text=/Script Formats/').count()) === 0,
  'the script screen has no sample scripts or Reset to overwrite your script'
);
check((await page.locator('#commercial-script-textarea').inputValue()).startsWith('My own line one.'), 'your script is still there');

// The AI rewrite is shown to choose, never put straight into the script
await page.route('**/api/polish-script', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ script: 'A totally different script.' }) })
);
await page.locator('#polish-script-btn').click();
await page.waitForTimeout(800);
const scriptNow = () => page.locator('#commercial-script-textarea').inputValue();
check((await page.locator('#polish-suggestion').count()) === 1 && (await scriptNow()).startsWith('My own line one.'), 'the AI rewrite waits to be chosen and leaves your script alone');
await page.getByRole('button', { name: 'Keep my script' }).click();
await page.waitForTimeout(200);
check((await page.locator('#polish-suggestion').count()) === 0 && (await scriptNow()).startsWith('My own line one.'), 'keeping your script throws the rewrite away');
await page.locator('#polish-script-btn').click();
await page.waitForTimeout(800);
await page.getByRole('button', { name: 'Use this version' }).click();
await page.waitForTimeout(200);
check((await scriptNow()) === 'A totally different script.', 'choosing the rewrite puts it in the script');
await page.unroute('**/api/polish-script');

// Editing the script after the scenes were made is pointed out on the Storyboard
await newAd('Script edited', ['First line.', 'Second line.']);
await page.locator('#commercial-script-textarea').fill('First line changed.\nSecond line.');
await toStoryboard();
check((await page.locator('#script-changed-banner').count()) === 1, 'the Storyboard says when the script has changed since its scenes were made');
await page.getByRole('button', { name: 'Keep these scenes' }).click();
await page.waitForTimeout(200);
check((await page.locator('#script-changed-banner').count()) === 0, 'keeping the scenes puts the notice away');

// Captions were taken out: the ads carry their own text, and captions on top made scenes noisy
await toPreview();
check((await page.locator('text=/Captions: (ON|OFF)/').count()) === 0, 'the preview has no captions switch');

check(pageErrors.length === 0, `no errors in the page (${pageErrors.slice(0, 2).join(' | ')})`);

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nstudio: all checks passed');
process.exit(fails.length ? 1 : 0);
