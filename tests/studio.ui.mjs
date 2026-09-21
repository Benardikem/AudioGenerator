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
  browserDialogs++;
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

check(pageErrors.length === 0, `no errors in the page (${pageErrors.slice(0, 2).join(' | ')})`);

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nstudio: all checks passed');
process.exit(fails.length ? 1 : 0);
