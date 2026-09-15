/**
 * Measure, do not judge by eye: the real contrast of every text element sitting
 * over the hero photograph.
 *
 * The hero is captured twice — once as it is, once with every text node made
 * transparent so the backdrop behind it can be sampled — and each element's
 * colour is measured against the WORST pixel inside its own box. Worst, not
 * average: a name is unreadable if one letter lands on a highlight, even when
 * the mean is fine. The ratio comes from the same contrast() the palette gate
 * uses.
 *
 *   npx tsx scripts/hero-contrast.ts <url> "<label>" [candidate.css]
 */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { contrast } from '../src/lib/palette.ts';

const AA_NORMAL = 4.5;
const AA_LARGE = 3.0; // >=24px, or >=18.66px bold

const [url, label = '', cssFile, heroPhoto] = process.argv.slice(2);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
// Tall viewport on purpose: the sticky bar is fixed to the bottom of the
// viewport, and at 900px it sits over the foot of the hero and would be sampled
// as if it were the photograph.
const page = await browser.newPage({ viewport: { width: 1280, height: 1600 }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'load', timeout: 40000 });
if (cssFile) await page.addStyleTag({ content: readFileSync(cssFile, 'utf8') });
// The sticky bar is fixed to the foot of the viewport and overlaps the hero; it
// is not part of the photograph and must not be sampled as if it were.
await page.addStyleTag({ content: '[aria-label="Book, call or get directions"], [aria-label="Call or get directions"] { display: none !important; }' });
// Swap the hero photograph in place, so candidates can be compared without a rebuild.
if (heroPhoto) await page.evaluate(`document.querySelector('.hero-photo').src = ${JSON.stringify(heroPhoto)}`);
await page.evaluate(() => { for (const e of document.querySelectorAll('[data-reveal]')) e.classList.add('is-in'); });
await page.waitForTimeout(1200);

// The in-page code goes over as source text: tsx rewrites function values with
// a __name helper that does not exist in the browser.
const header = (await page.evaluate(`(() => {
  const r = document.querySelector('header').getBoundingClientRect();
  return { x: 0, y: 0, width: 1280, height: Math.ceil(r.height) };
})()`)) as { x: number; y: number; width: number; height: number };

const targets = (await page.evaluate(readFileSync(new URL('hero-probe.js', import.meta.url), 'utf8'))) as { name: string; x: number; y: number; w: number; h: number; color: string; px: number; bold: boolean }[];

await page.addStyleTag({ content: `header h1, header p, header a, header span, header .eyebrow { color: transparent !important; text-shadow: none !important; }
  header svg { opacity: 0 !important; }` });
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/hero-bg.png', clip: header });
await browser.close();

const { data, info } = await sharp('/tmp/hero-bg.png').raw().toBuffer({ resolveWithObject: true });
const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');

console.log(`\n${label}`);
console.log('element'.padEnd(44) + 'text'.padEnd(10) + 'worst bg'.padEnd(11) + 'ratio'.padEnd(8) + 'needs  verdict');
let fails = 0;
const rows: string[] = [];
for (const t of targets) {
  let worst = Infinity, worstBg = '#000000';
  for (let y = t.y; y < Math.min(t.y + t.h, info.height); y += 2) {
    for (let x = t.x; x < Math.min(t.x + t.w, info.width); x += 2) {
      const i = (y * info.width + x) * info.channels;
      const bg = hex(data[i]!, data[i + 1]!, data[i + 2]!);
      const ratio = contrast(t.color, bg);
      if (ratio < worst) { worst = ratio; worstBg = bg; }
    }
  }
  if (!isFinite(worst)) continue;
  const needs = t.px >= 24 || (t.px >= 18.66 && t.bold) ? AA_LARGE : AA_NORMAL;
  const pass = worst >= needs;
  if (!pass) fails++;
  rows.push(t.name.slice(0, 43).padEnd(44) + t.color.padEnd(10) + worstBg.padEnd(11) + worst.toFixed(2).padEnd(8) + String(needs).padEnd(7) + (pass ? 'PASS' : '*** FAIL ***'));
}
if (process.env.SUMMARY_ONLY !== '1') console.log(rows.join('\n'));
console.log(`${label.padEnd(30)} ${rows.length} elements, ${fails} below AA.`);
