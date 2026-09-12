// node scripts/poster.mjs → hawar-barber-poster.pdf (A4, print-ready) and reports/poster.png (preview).
// A window or counter poster: the shop's name, rating, hours line, phone, and a QR code that opens the site.
// The QR encodes `url` from site.config.ts, so re-run this after changing the domain.
import { chromium } from 'playwright-core';
import QRCode from 'qrcode';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromePath } from './_chrome.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { site } = await import('../site.config.ts');
const font = (p) => `url(data:font/woff2;base64,${readFileSync(resolve(root, 'node_modules', p)).toString('base64')}) format('woff2')`;
const display = font('@fontsource-variable/big-shoulders-display/files/big-shoulders-display-latin-wght-normal.woff2');
const sans = font('@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2');
const qr = await QRCode.toString(site.url, { type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: { dark: '#0e0c0a', light: '#ffffff00' } });
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const [first, ...rest] = site.name.split(' ');
const star = 'M12 2.8l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.6 6 20.9l1.3-6.6L2.4 9.7l6.7-.8z';
const stars = Array.from({ length: 5 }, () => `<svg viewBox="0 0 24 24" width="18" height="18"><path d="${star}" fill="#f2a93b"/></svg>`).join('');
const openDays = site.hours.week ? Object.values(site.hours.week).filter(Boolean).length : 0;
const host = site.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
const wheelchair = (site.features ?? []).some((f) => /wheelchair/i.test(f));

const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>${esc(site.name)} poster</title>
<style>
  @font-face { font-family: 'Big Shoulders Display'; src: ${display}; font-weight: 100 900; }
  @font-face { font-family: 'DM Sans'; src: ${sans}; font-weight: 100 900; }
  @page { size: A4; margin: 0; }
  html, body { margin: 0; width: 210mm; height: 297mm; background: #0e0c0a; color: #f4eee4; font-family: 'DM Sans', system-ui, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { position: relative; box-sizing: border-box; width: 210mm; height: 297mm; padding: 16mm 16mm 14mm; display: flex; flex-direction: column; overflow: hidden; }
  .stripe { position: absolute; top: 0; bottom: 0; right: 0; width: 9mm; background: repeating-linear-gradient(-45deg, #f2a93b 0 7mm, #0e0c0a 7mm 14mm); }
  .glow { position: absolute; inset: 0; background: radial-gradient(70% 45% at 85% 0%, rgba(242,169,59,0.22), transparent 70%); }
  .eyebrow { position: relative; font-weight: 700; font-size: 11pt; letter-spacing: 0.22em; text-transform: uppercase; color: #f2a93b; }
  .name { position: relative; font-family: 'Big Shoulders Display'; font-weight: 800; text-transform: uppercase; font-size: 88pt; line-height: 0.86; margin-top: 6mm; letter-spacing: 0.01em; }
  .name .amber { color: #f2a93b; }
  .rating { position: relative; margin-top: 8mm; font-size: 15pt; font-weight: 700; }
  .rating .stars { color: #f2a93b; display: inline-flex; align-items: center; gap: 1.5mm; vertical-align: -1mm; margin-right: 2mm; }
  .rating .stars svg { width: 5mm; height: 5mm; }
  .rating .muted { color: #b9b0a2; font-weight: 500; }
  .qr-wrap { position: relative; margin-top: 12mm; display: grid; grid-template-columns: 62mm 1fr; gap: 10mm; align-items: center; }
  .qr { box-sizing: border-box; width: 62mm; height: 62mm; padding: 5mm; background: #f4eee4; border-radius: 4mm; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .scan { font-family: 'Big Shoulders Display'; font-weight: 800; text-transform: uppercase; font-size: 34pt; line-height: 0.95; }
  .scan .amber { color: #f2a93b; }
  .host { margin-top: 4mm; font-size: 12.5pt; font-weight: 700; color: #b9b0a2; word-break: break-all; }
  .foot { position: relative; margin-top: auto; border-top: 0.5mm solid rgba(244,238,228,0.18); padding-top: 7mm; display: grid; grid-template-columns: 1fr auto; gap: 8mm; align-items: end; }
  .phone { font-family: 'Big Shoulders Display'; font-weight: 800; font-size: 40pt; line-height: 1; color: #f2a93b; }
  .addr { margin-top: 2mm; font-size: 13pt; line-height: 1.35; }
  .days { font-size: 12pt; font-weight: 700; text-align: right; color: #b9b0a2; text-transform: uppercase; letter-spacing: 0.14em; }
</style></head><body><div class="page">
  <div class="glow"></div><div class="stripe"></div>
  <p class="eyebrow">Barber shop · ${esc(site.address.street)}, ${esc(site.address.locality)}</p>
  <h1 class="name">${esc(first)}<br><span class="amber">${esc(rest.join(' '))}</span></h1>
  <p class="rating"><span class="stars"><span>${site.google.rating.toFixed(1)}</span>${stars}</span> <span class="muted">from ${site.google.reviewCount} Google reviews</span></p>
  <div class="qr-wrap">
    <div class="qr">${qr}</div>
    <div><p class="scan">Scan for<br>hours, directions<br><span class="amber">&amp; our work.</span></p><p class="host">${esc(host)}</p></div>
  </div>
  <div class="foot">
    <div><p class="phone">${esc(site.phone.display)}</p><p class="addr">${esc(site.address.street)}, ${esc(site.address.locality)} ${esc(site.address.postcode)}</p></div>
    <p class="days">${openDays === 7 ? 'Open 7 days' : openDays ? `Open ${openDays} days a week` : ''}${wheelchair ? '<br>Wheelchair accessible' : ''}</p>
  </div>
</div></body></html>`;

const browser = await chromium.launch({ executablePath: chromePath(), args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
mkdirSync(resolve(root, 'reports'), { recursive: true });
await page.screenshot({ path: resolve(root, 'reports/poster.png'), fullPage: true });
const pdf = resolve(root, 'hawar-barber-poster.pdf');
await page.pdf({ path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log(`poster: wrote ${pdf} (QR → ${site.url}) and reports/poster.png`);
