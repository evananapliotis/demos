/**
 * MyBarberSite brand assets: the mark (three angled bars, a barber pole's
 * stripe flattened), the wordmark (Instrument Serif, "Barber" italic, set as
 * paths so the files need no font), the lockups, the square icon, and the
 * favicon set. Writes SVGs and PNGs to public/brand/.
 *
 *   node scripts/brand.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const out = fileURLToPath(new URL('public/brand/', root));
mkdirSync(out, { recursive: true });

// The palette: deep navy, warm off-white, one copper accent.
export const BRAND = { navy: '#0f1d33', copper: '#b8623a', paper: '#f4efe6' };

// ---------- The mark: three bars leaning like a pole's stripe, in a 100 x 100 box ----------
const bars = (outer, middle) =>
  `<g transform="rotate(-22 50 50)"><rect x="17" y="17" width="16" height="66" rx="8" fill="${outer}"/><rect x="42" y="17" width="16" height="66" rx="8" fill="${middle}"/><rect x="67" y="17" width="16" height="66" rx="8" fill="${outer}"/></g>`;
const markSvg = (outer, middle = BRAND.copper) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="MyBarberSite">${bars(outer, middle)}</svg>`;

// ---------- The wordmark: glyph outlines from the two faces, kerned, at 100 units per em ----------
const load = (f) => opentype.parse(readFileSync(fileURLToPath(new URL(`src/og/fonts/${f}`, root))).buffer.slice(0));
const regular = load('InstrumentSerif-Regular.ttf');
const italic = load('InstrumentSerif-Italic.ttf');
const SIZE = 100;
const TRACK = -0.6; // a hair tighter than the font's own fit
// opentype's own serialiser drops coordinates to NaN at some offsets, so write the commands out by hand.
const n = (v) => (Math.round(v * 100) / 100).toString();
const pathData = (p) =>
  p.commands
    .map((c) => (c.type === 'Z' ? 'Z' : c.type === 'Q' ? `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}` : c.type === 'C' ? `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}` : `${c.type}${n(c.x)} ${n(c.y)}`))
    .join('');
function run(font, text, x, y) {
  // Plain Latin letters, mapped one to one (the font's GSUB has a lookup opentype.js cannot run; nothing here needs it).
  const glyphs = [...text].map((ch) => font.charToGlyph(ch));
  const scale = SIZE / font.unitsPerEm;
  let d = '';
  glyphs.forEach((g, i) => {
    d += pathData(g.getPath(x, y, SIZE)) + ' ';
    x += g.advanceWidth * scale + TRACK;
    const k = glyphs[i + 1] ? font.getKerningValue(g, glyphs[i + 1]) : 0;
    if (Number.isFinite(k)) x += k * scale;
  });
  return { d: d.trim(), x };
}
const BASELINE = 72; // cap height sits on y = 0
const parts = [];
let x = 0;
let r = run(regular, 'My', x, BASELINE); parts.push(r.d); x = r.x + 1.5;
r = run(italic, 'Barber', x, BASELINE); parts.push(r.d); x = r.x + 1;
r = run(regular, 'Site', x, BASELINE); parts.push(r.d); x = r.x;
const WORD_W = Math.ceil(x + 1);
const WORD_TOP = -2; // the ascender of the M sits at 0; italic strokes rise a touch
const WORD_H = 104; // baseline 72 + descender 31
const wordPaths = (fill) => `<path fill="${fill}" d="${parts[0]}"/><path fill="${fill}" d="${parts[1]}"/><path fill="${fill}" d="${parts[2]}"/>`;
const wordmarkSvg = (fill) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${WORD_TOP} ${WORD_W} ${WORD_H}" width="${WORD_W}" height="${WORD_H}" role="img" aria-label="MyBarberSite">${wordPaths(fill)}</svg>`;

// ---------- Lockup: the mark at the height of the capitals, then the wordmark ----------
const MARK_H = 84; // the bars' box scaled so their extent matches the capitals with a little air
const GAP = 22;
const LOCK_W = MARK_H + GAP + WORD_W;
const lockupSvg = (fill, bg = null) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${WORD_TOP} ${LOCK_W} ${WORD_H}" width="${LOCK_W}" height="${WORD_H}" role="img" aria-label="MyBarberSite">` +
  (bg ? `<rect x="0" y="${WORD_TOP}" width="${LOCK_W}" height="${WORD_H}" fill="${bg}"/>` : '') +
  `<g transform="translate(0 ${BASELINE - MARK_H + 8}) scale(${MARK_H / 100})">${bars(fill, BRAND.copper)}</g>` +
  `<g transform="translate(${MARK_H + GAP} 0)">${wordPaths(fill)}</g></svg>`;

// ---------- Square icon: the mark on a rounded tile ----------
const iconSvg = (tile, outer) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="MyBarberSite"><rect width="512" height="512" rx="112" fill="${tile}"/><g transform="translate(96 96) scale(3.2)">${bars(outer, BRAND.copper)}</g></svg>`;

// ---------- Write the SVGs ----------
const files = {
  'mark.svg': markSvg(BRAND.navy),
  'mark-dark.svg': markSvg(BRAND.paper),
  'wordmark.svg': wordmarkSvg(BRAND.navy),
  'wordmark-dark.svg': wordmarkSvg(BRAND.paper),
  'lockup.svg': lockupSvg(BRAND.navy),
  'lockup-dark.svg': lockupSvg(BRAND.paper),
  'icon.svg': iconSvg(BRAND.navy, BRAND.paper),
  'icon-light.svg': iconSvg(BRAND.paper, BRAND.navy),
  'favicon.svg': iconSvg(BRAND.navy, BRAND.paper),
};
for (const [name, svg] of Object.entries(files)) writeFileSync(out + name, svg + '\n');

// ---------- PNGs: everything on a square canvas at 1600 and 800 ----------
const square = (inner, innerW, innerH, bg, size, pad = 0.12) => {
  const box = size * (1 - 2 * pad);
  const s = Math.min(box / innerW, box / innerH);
  const w = innerW * s, h = innerH * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${bg}"/><g transform="translate(${(size - w) / 2} ${(size - h) / 2}) scale(${s})">${inner}</g></svg>`;
};
const inner = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const png = async (svg, name) => writeFileSync(out + name, await sharp(Buffer.from(svg)).png().toBuffer());
for (const size of [1600, 800]) {
  await png(square(inner(markSvg(BRAND.navy)), 100, 100, BRAND.paper, size, 0.18), `mark-${size}.png`);
  await png(square(inner(markSvg(BRAND.paper)), 100, 100, BRAND.navy, size, 0.18), `mark-dark-${size}.png`);
  await png(square(inner(iconSvg(BRAND.navy, BRAND.paper)), 512, 512, BRAND.paper, size, 0.1), `icon-${size}.png`);
  await png(square(`<g transform="translate(0 ${-WORD_TOP})">${inner(wordmarkSvg(BRAND.navy))}</g>`, WORD_W, WORD_H, BRAND.paper, size), `wordmark-${size}.png`);
  await png(square(`<g transform="translate(0 ${-WORD_TOP})">${inner(lockupSvg(BRAND.navy))}</g>`, LOCK_W, WORD_H, BRAND.paper, size), `lockup-light-${size}.png`);
  await png(square(`<g transform="translate(0 ${-WORD_TOP})">${inner(lockupSvg(BRAND.paper))}</g>`, LOCK_W, WORD_H, BRAND.navy, size), `lockup-dark-${size}.png`);
}

// ---------- Favicons ----------
const fav = iconSvg(BRAND.navy, BRAND.paper);
for (const [name, size] of [['favicon-16.png', 16], ['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  writeFileSync(out + name, await sharp(Buffer.from(fav)).resize(size, size).png().toBuffer());
}
writeFileSync(out + 'site.webmanifest', JSON.stringify({ name: 'MyBarberSite', short_name: 'MyBarberSite', icons: [{ src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' }], theme_color: BRAND.paper, background_color: BRAND.paper, display: 'browser' }, null, 2) + '\n');

console.log(`brand: wordmark ${WORD_W} x ${WORD_H}, lockup ${LOCK_W} x ${WORD_H}; ${Object.keys(files).length} SVGs, PNGs at 1600 and 800, favicons, manifest -> public/brand/`);
