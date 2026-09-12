// node scripts/verify.mjs <url> → phone checks at 390×844 and 320×568, screenshots to reports/
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { chromePath } from './_chrome.mjs';

const url = process.argv[2];
if (!url) { console.error('Usage: node scripts/verify.mjs <url>'); process.exit(1); }
mkdirSync('reports', { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath(), args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const problems = [];
const check = (ok, msg) => { console.log(`${ok ? 'ok ' : 'FAIL'} ${msg}`); if (!ok) problems.push(msg); };

async function run(width, height, tag) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const page = await ctx.newPage();
  let weight = 0, weightGz = 0; const urls = [];
  page.on('response', async (r) => {
    try {
      const u = r.url();
      if (!u.startsWith(new URL(url).origin)) return;
      const b = await r.body();
      weight += b.length; weightGz += gzipSync(b).length; urls.push(`${u.replace(new URL(url).origin, '')} ${(b.length / 1024).toFixed(1)}KB`);
    } catch {}
  });
  const res = await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(900); // let the short entrance animations finish before measuring
  console.log(`\n== ${width}×${height} (${tag}) ==`);
  check(res?.status() === 200, `HTTP ${res?.status()}`);
  const h1 = await page.$$eval('h1', (hs) => hs.map((h) => h.textContent?.replace(/\s+/g, ' ').trim()));
  check(h1.length === 1, `one h1: ${JSON.stringify(h1)}`);
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, document.body.scrollWidth, innerWidth]);
  check(sw[0] <= sw[2] && sw[1] <= sw[2], `no horizontal scroll (scrollWidth ${sw[0]}/${sw[1]} vs ${sw[2]})`);
  const fs = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  check(fs >= 16, `body font-size ${fs}px`);
  // above the fold without scrolling
  const fold = await page.evaluate(() => {
    const barTop = document.querySelector('[role="region"][aria-label$="directions"]')?.getBoundingClientRect().top ?? innerHeight;
    const vis = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: r.height, w: r.width, visible: r.top >= 0 && r.bottom <= barTop && r.width > 0 }; };
    const call = [...document.querySelectorAll('a[href^="tel:"]')].map((a) => { const fixed = getComputedStyle(a.closest('[class*="fixed"]') || a).position === 'fixed'; const r = a.getBoundingClientRect(); return { text: a.textContent.trim(), top: r.top, bottom: r.bottom, h: r.height, w: r.width, fixed, visible: fixed ? r.bottom <= innerHeight : r.top >= 0 && r.bottom <= barTop }; });
    return { h1: vis(document.querySelector('h1')), rating: vis(document.querySelector('header a[href*="google.com/maps"]')), calls: call };
  });
  check(fold.h1?.visible, `h1 fully visible above the fold and clear of the sticky bar (top ${Math.round(fold.h1?.top)} bottom ${Math.round(fold.h1?.bottom)})`);
  check(fold.rating?.visible, `rating link visible above the fold and clear of the sticky bar (bottom ${Math.round(fold.rating?.bottom)})`);
  const visibleCalls = fold.calls.filter((c) => c.visible && c.h >= 48);
  check(visibleCalls.length > 0, `Call button ≥48px visible above the fold (hero button must clear the sticky bar): ${visibleCalls.map((c) => `"${c.text}" ${Math.round(c.h)}px${c.fixed ? ' (sticky)' : ''}`).join(', ')}`);
  const sticky = await page.evaluate(() => {
    const bar = document.querySelector('[role="region"][aria-label$="directions"]');
    if (!bar) return null; const r = bar.getBoundingClientRect();
    const btns = [...bar.querySelectorAll('a')].map((a) => ({ h: a.getBoundingClientRect().height, w: a.getBoundingClientRect().width, href: a.getAttribute('href') }));
    return { position: getComputedStyle(bar).position, bottom: r.bottom, inner: innerHeight, btns };
  });
  check(sticky && sticky.position === 'fixed' && Math.abs(sticky.bottom - sticky.inner) < 1 && sticky.btns.every((b) => b.h >= 48 && b.w >= 48), `sticky bar fixed at bottom with ≥48px targets: ${JSON.stringify(sticky?.btns.map((b) => Math.round(b.h)))}`);
  check(sticky?.btns.some((b) => b.href.startsWith('tel:')) && sticky?.btns.some((b) => b.href.includes('maps/dir')), 'sticky bar has tel: and directions links');
  // booking entry points: hero (above the fold), sticky bar, final band
  const book = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href^="/book"]')].filter((a) => a.getBoundingClientRect().width > 0);
    const barTop = document.querySelector('[role="region"][aria-label*="Book"]')?.getBoundingClientRect().top ?? innerHeight;
    return links.map((a) => { const r = a.getBoundingClientRect(); const fixed = getComputedStyle(a.closest('[class*="fixed"]') || a).position === 'fixed'; return { in: a.closest('header') ? 'hero' : fixed ? 'sticky' : a.closest('section[aria-labelledby="cta-title"]') ? 'cta' : 'other', h: r.height, w: r.width, aboveFold: fixed ? r.bottom <= innerHeight : r.top >= 0 && r.bottom <= barTop }; });
  });
  const where = new Set(book.map((b) => b.in));
  check(['hero', 'sticky', 'cta'].every((w) => where.has(w)) && book.every((b) => b.h >= 48 && b.w >= 48), `Book links in hero, sticky bar and final band, all ≥48px: ${JSON.stringify(book.map((b) => `${b.in} ${Math.round(b.h)}px`))}`);
  check(book.some((b) => (b.in === 'hero' && b.aboveFold) || (b.in === 'sticky' && b.aboveFold)), 'a Book button is reachable without scrolling (hero above the fold, or the sticky bar)');
  // headings never overflow
  const overflow = await page.$$eval('h1,h2,h3', (els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent.trim().slice(0, 30)));
  check(overflow.length === 0, `no heading overflow ${overflow.length ? JSON.stringify(overflow) : ''}`);
  await page.screenshot({ path: `reports/fold-${tag}.png` });
  // booking page: no horizontal scroll at any step
  if (await page.goto(new URL('/book', url).href, { waitUntil: 'networkidle' }).then((r) => r?.ok()).catch(() => false)) {
    const w0 = await page.evaluate(() => document.documentElement.scrollWidth);
    await page.check('input[name="service"]', { force: true }).catch(() => {});
    await page.waitForFunction(() => document.querySelectorAll('[data-days] .chip').length > 0, null, { timeout: 15000 }).catch(() => {});
    const day = await page.$('[data-days] .chip input:not([disabled])');
    if (day) { await day.check({ force: true }); await page.waitForFunction(() => document.querySelectorAll('[data-slots] .chip').length > 0, null, { timeout: 15000 }).catch(() => {}); }
    const w1 = await page.evaluate(() => document.documentElement.scrollWidth);
    check(w0 <= width && w1 <= width, `/book has no horizontal scroll before or after picking a service and day (${w0}/${w1} vs ${width})`);
    await page.goto(url, { waitUntil: 'networkidle' });
  }
  // lazy images + full page shot
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); }
    // swipe through horizontal galleries so their lazy images get requested too
    for (const track of document.querySelectorAll('.gallery-track')) {
      track.scrollIntoView({ block: 'center' });
      for (let x = 0; x <= track.scrollWidth; x += 200) { track.scrollLeft = x; await new Promise((r) => setTimeout(r, 60)); }
      track.scrollLeft = 0;
    }
    scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  const imgs = await page.$$eval('img', (els) => els.map((i) => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0 })));
  check(imgs.every((i) => i.ok), `images: ${imgs.length} found, ${imgs.filter((i) => !i.ok).length} broken`);
  // gallery lightbox: opens full size on tap, closes on Escape, focus returns to the thumbnail
  if (await page.$('.gallery-open')) {
    await page.evaluate(() => document.querySelector('.gallery-open').scrollIntoView({ block: 'center' }));
    await page.click('.gallery-open');
    const lb = await page.waitForFunction(() => {
      const d = document.querySelector('[data-lightbox]');
      const img = d?.querySelector('.lb-track img');
      return d?.open && img?.complete && img.naturalWidth > 0 ? { count: d.querySelector('[data-lb-count]')?.textContent, w: img.naturalWidth } : null;
    }, null, { timeout: 8000 }).then((h) => h.jsonValue()).catch(() => null);
    check(!!lb, `lightbox opens with a full-size photo (${lb?.count}, ${lb?.w}px wide)`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ open: document.querySelector('[data-lightbox]')?.open, focusBack: document.activeElement?.classList.contains('gallery-open'), scrollLocked: document.documentElement.classList.contains('lb-open') }));
    check(after.open === false && after.focusBack === true && after.scrollLocked === false, `lightbox closes on Escape and returns focus (${JSON.stringify(after)})`);
  }
  await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in')));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `reports/mobile-${tag}.png`, fullPage: true });
  console.log(`weight (same-origin): ${(weight / 1024).toFixed(0)} KB raw / ${(weightGz / 1024).toFixed(0)} KB gzip`);
  console.log(urls.map((u) => '   ' + u).join('\n'));
  await ctx.close();
}
await run(390, 844, '390');
await run(320, 568, '320');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'reports/desktop-fold.png' });
  await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in')));
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'reports/desktop-1280.png', fullPage: true });
  await ctx.close();
  console.log('\ndesktop screenshots: reports/desktop-fold.png, reports/desktop-1280.png');
}
await browser.close();
console.log(problems.length ? `\nVERIFY FAILED (${problems.length})` : '\nVERIFY OK');
process.exit(problems.length ? 1 : 0);
