// npm run verify -- <url>   → 200 check, tel: link, every <img> loads, 390px screenshot to reports/
// Uses playwright-core with the system Chromium (PLAYWRIGHT_BROWSERS_PATH or CHROME_PATH).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { chromePath } from './_chrome.mjs';

const url = process.argv[2];
if (!url) { console.error('Usage: npm run verify -- <url>'); process.exit(1); }
mkdirSync('reports', { recursive: true });

const browser = await chromium.launch({ executablePath: chromePath(), args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const failedImages = [];
page.on('response', (r) => { if (r.request().resourceType() === 'image' && r.status() >= 400) failedImages.push(`${r.status()} ${r.url()}`); });

const res = await page.goto(url, { waitUntil: 'networkidle' });
const status = res?.status();
const tel = await page.$$eval('a[href^="tel:"]', (as) => as.map((a) => a.getAttribute('href')));
const wa = await page.$$eval('a[href^="https://wa.me/"]', (as) => as.map((a) => a.getAttribute('href')));
const h1 = await page.$$eval('h1', (hs) => hs.map((h) => h.textContent?.replace(/\s+/g, ' ').trim()));
// scroll so lazy images load, then check naturalWidth on every <img>
await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
await page.waitForLoadState('networkidle');
const imgs = await page.$$eval('img', (els) => els.map((i) => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0 })));
const broken = imgs.filter((i) => !i.ok);
const shot = 'reports/mobile-390.png';
await page.screenshot({ path: shot, fullPage: true });
await browser.close();

console.log(`URL:         ${url}`);
console.log(`Status:      ${status}`);
console.log(`h1:          ${h1.length} → ${JSON.stringify(h1)}`);
console.log(`tel links:   ${tel.length} → ${[...new Set(tel)].join(', ')}`);
console.log(`WhatsApp:    ${[...new Set(wa)].join(', ')}`);
console.log(`Images:      ${imgs.length} found, ${broken.length} broken${failedImages.length ? `, HTTP errors: ${failedImages.join('; ')}` : ''}`);
console.log(`Screenshot:  ${shot}`);
const ok = status === 200 && tel.length > 0 && broken.length === 0 && h1.length === 1;
console.log(ok ? '\nVERIFY OK' : '\nVERIFY FAILED');
process.exit(ok ? 0 : 1);
