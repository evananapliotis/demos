// node scripts/screenshot.mjs [url]   → full-page screenshot of dist/ (or a URL) at 390px into reports/,
// plus a viewport shot with the sticky bar, and a check that every rendered <img> loaded, there is
// one h1, and the tel: link exists. WIDTH=1440 for a desktop pass.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { chromePath } from './_chrome.mjs';
import { serveDist } from './serve.mjs';

const arg = process.argv[2];
const width = Number(process.env.WIDTH) || 390;
const out = process.env.OUT || `reports/mobile-${width}.png`;
mkdirSync('reports', { recursive: true });
const local = arg ? null : await serveDist();
const url = arg || local.url;

const browser = await chromium.launch({ executablePath: chromePath(), args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: width < 768, hasTouch: width < 768, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const failed = [];
page.on('response', (r) => { if (r.request().resourceType() === 'image' && r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
const res = await page.goto(url, { waitUntil: 'networkidle' });

// Walk the page slowly so every lazy image is requested, then wait for them all to decode.
await page.evaluate(async () => {
  const h = () => document.documentElement.scrollHeight;
  for (let y = 0; y < h(); y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 140)); }
  window.scrollTo(0, h());
  await new Promise((r) => setTimeout(r, 400));
  window.scrollTo(0, 0);
});
await page.waitForLoadState('networkidle');
await page.waitForFunction(() => [...document.images].filter((i) => i.getClientRects().length).every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(500);

const imgs = await page.$$eval('img', (els) => els.filter((i) => i.getClientRects().length).map((i) => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0, alt: i.alt })));
const h1 = await page.$$eval('h1', (hs) => hs.map((h) => h.textContent?.replace(/\s+/g, ' ').trim()));
const tel = await page.$$eval('a[href^="tel:"]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
const height = await page.evaluate(() => document.documentElement.scrollHeight);

// Viewport shot part-way down, with the sticky bar showing.
if (width < 768) {
  await page.evaluate(() => window.scrollTo(0, 1400));
  await page.waitForTimeout(600);
  await page.screenshot({ path: out.replace(/\.png$/, '-viewport.png'), fullPage: false });
  await page.evaluate(() => window.scrollTo(0, 0));
}
// Full page without the fixed bar, which would otherwise be stamped into the middle of the capture.
await page.addStyleTag({ content: '.sticky-bar{display:none!important}' });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
local?.server.close();

const broken = imgs.filter((i) => !i.ok && i.src);
console.log(`URL: ${url}  status ${res?.status()}  page height ${height}px at ${width}px`);
console.log(`h1: ${JSON.stringify(h1)}`);
console.log(`tel: ${tel.join(', ')}`);
console.log(`images rendered: ${imgs.length}, broken ${broken.length}${failed.length ? `, HTTP errors: ${failed.join('; ')}` : ''}`);
console.log(`screenshot: ${out}`);
if (broken.length) console.log(broken.map((b) => ` - ${b.src}`).join('\n'));
process.exit(res?.status() === 200 && h1.length === 1 && !broken.length ? 0 : 1);
