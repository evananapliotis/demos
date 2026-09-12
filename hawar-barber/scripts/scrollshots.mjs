// node scripts/scrollshots.mjs <url> <outPrefix> → viewport shots at several scroll offsets (390×844) to check the scroll-driven hero.
import { chromium } from 'playwright-core';
import { chromePath } from './_chrome.mjs';
const [url, prefix] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: chromePath(), args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'load' });
const has3d = await page.waitForSelector('[data-pole-slot].has-3d', { timeout: 12000 }).then(() => true).catch(() => false);
console.log('3D mounted:', has3d);
for (const y of [0, 120, 260, 420]) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);
  await page.waitForTimeout(450);
  const state = await page.$eval('[data-pole-slot]', (el) => ({ p: el.dataset.p, v: el.dataset.v, opacity: getComputedStyle(el.parentElement).opacity, transform: getComputedStyle(el.parentElement).transform }));
  console.log(`scrollY=${y}`, state);
  await page.screenshot({ path: `${prefix}-${y}.png` });
}
// drag the pole horizontally (touch) and confirm it keeps spinning via inertia
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await page.waitForTimeout(300);
const box = await page.$eval('[data-pole-slot]', (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
await page.mouse.move(box.x + box.w * 0.5, box.y + box.h * 0.5);
await page.mouse.down();
for (let i = 1; i <= 8; i++) { await page.mouse.move(box.x + box.w * 0.5 - i * 12, box.y + box.h * 0.5, { steps: 2 }); }
await page.mouse.up();
await page.waitForTimeout(200);
await page.screenshot({ path: `${prefix}-drag.png` });
await browser.close();
console.log('scroll shots done');
