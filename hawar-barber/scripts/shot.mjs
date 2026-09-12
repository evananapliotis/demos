import { chromium } from 'playwright-core';
const [url, prefix] = process.argv.slice(2);
const exe = process.env.PLAYWRIGHT_BROWSERS_PATH + '/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, h, tag, mobile] of [[390, 844, '390', true], [1280, 800, 'desktop', false]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${prefix}-fold-${tag}.png` });
  await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in')));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${prefix}-full-${tag}.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
console.log('shots done');
