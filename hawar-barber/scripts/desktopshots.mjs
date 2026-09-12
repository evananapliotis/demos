// node scripts/desktopshots.mjs → hero at four desktop sizes, boxes printed, screenshots → reports/desktop-*.png
import { chromium } from 'playwright-core';
import { chromePath } from './_chrome.mjs';
const browser = await chromium.launch({ executablePath: chromePath(), args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, h, tag] of [[1747, 800, 'wide'], [1333, 640, 'short'], [1920, 1080, 'fhd'], [1280, 720, 'hd']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(process.argv[2] ?? 'http://127.0.0.1:8788/', { waitUntil: 'load' });
  await page.waitForSelector('[data-pole-slot].has-3d', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);
  const m = await page.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
    return { scrollW: document.documentElement.scrollWidth, innerW: innerWidth, h1: r('h1'), slot: r('[data-pole-slot]'), canvas: r('[data-pole-slot] canvas'), hero: r('#top') };
  });
  console.log(tag, JSON.stringify(m));
  await page.screenshot({ path: `reports/desktop-${tag}.png` });
  await ctx.close();
}
await browser.close();
