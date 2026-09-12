// Renders public/og.jpg (1200×630), the image shown when the link is shared on WhatsApp, Facebook, iMessage etc.
// Uses the real hero photo behind the name when public/images/<hero> exists, else the drawn pole.
// JPEG under 300 KB so WhatsApp shows it. Runs before `astro build`.
import sharp from 'sharp';
import { writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fontsDir = resolve(root, 'src/og/fonts');
const conf = resolve(root, 'src/og/fonts.conf');
writeFileSync(
  conf,
  `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${fontsDir}</dir><cachedir>/tmp/hawar-og-fontcache</cachedir><config></config></fontconfig>`,
);
process.env.FONTCONFIG_FILE = conf;

const { site } = await import('../site.config.ts');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, '’');
const [first, ...rest] = site.name.split(' ');
// Five drawn stars (the embedded fonts have no ★ glyph). 24px each, starting at x.
const star = 'M12 2.8l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.6 6 20.9l1.3-6.6L2.4 9.7l6.7-.8z';
const stars = (x, y) => Array.from({ length: 5 }, (_, i) => `<path d="${star}" fill="#f2a93b" transform="translate(${x + i * 28} ${y}) scale(1.15)"/>`).join('');
const heroPath = resolve(root, 'public/images', site.images.hero);
const hasHero = existsSync(heroPath);

const pole = `<g transform="translate(940 60) rotate(-6 80 250)">
    <circle cx="80" cy="34" r="30" fill="url(#chrome)"/>
    <rect x="64" y="56" width="32" height="18" fill="url(#chrome)"/>
    <rect x="18" y="70" width="124" height="22" rx="5" fill="url(#chrome)"/>
    <rect x="30" y="92" width="100" height="330" fill="url(#stripes)"/>
    <rect x="30" y="92" width="100" height="330" fill="url(#shade)"/>
    <rect x="18" y="420" width="124" height="22" rx="5" fill="url(#chrome)"/>
    <rect x="64" y="442" width="32" height="60" fill="url(#chrome)"/>
  </g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <pattern id="stripes" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
      <rect width="80" height="80" fill="#f4eee4"/><rect width="80" height="26" fill="#f2a93b"/><rect y="42" width="80" height="14" fill="#0e0c0a"/>
    </pattern>
    <linearGradient id="chrome" x1="0" x2="1"><stop offset="0" stop-color="#6d675e"/><stop offset="0.3" stop-color="#ece7dd"/><stop offset="0.5" stop-color="#fbf8f2"/><stop offset="0.75" stop-color="#b3ab9e"/><stop offset="1" stop-color="#4d4840"/></linearGradient>
    <linearGradient id="shade" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="0.3" stop-color="#000" stop-opacity="0"/><stop offset="0.55" stop-color="#fff" stop-opacity="0.14"/><stop offset="1" stop-color="#000" stop-opacity="0.6"/></linearGradient>
    <radialGradient id="glow" cx="0.95" cy="0.05" r="0.7"><stop offset="0" stop-color="#f2a93b" stop-opacity="0.22"/><stop offset="1" stop-color="#f2a93b" stop-opacity="0"/></radialGradient>
    <linearGradient id="photo-x" x1="0" x2="1"><stop offset="0" stop-color="#0e0c0a" stop-opacity="0.94"/><stop offset="0.55" stop-color="#0e0c0a" stop-opacity="0.72"/><stop offset="1" stop-color="#0e0c0a" stop-opacity="0.25"/></linearGradient>
    <linearGradient id="photo-y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e0c0a" stop-opacity="0.15"/><stop offset="0.7" stop-color="#0e0c0a" stop-opacity="0.35"/><stop offset="1" stop-color="#0e0c0a" stop-opacity="0.85"/></linearGradient>
  </defs>
  ${hasHero ? '<rect width="1200" height="630" fill="url(#photo-x)"/><rect width="1200" height="630" fill="url(#photo-y)"/>' : '<rect width="1200" height="630" fill="#0e0c0a"/><rect width="1200" height="630" fill="url(#glow)"/>' + pole}
  <rect x="0" y="0" width="14" height="630" fill="#f2a93b"/>
  <text x="80" y="128" font-family="DM Sans" font-weight="700" font-size="24" letter-spacing="5" fill="#f2a93b">BARBER SHOP · NORTH ROAD, ${esc(site.address.locality.toUpperCase())}</text>
  <text x="76" y="330" font-family="Big Shoulders Display" font-weight="800" font-size="210" fill="#f4eee4">${esc(first)}</text>
  <text x="76" y="500" font-family="Big Shoulders Display" font-weight="800" font-size="210" fill="#f2a93b">${esc(rest.join(' '))}</text>
  <text x="80" y="566" font-family="DM Sans" font-weight="700" font-size="30" fill="#f2a93b">${site.google.rating.toFixed(1)}</text>
  ${stars(138, 540)}
  <text x="290" y="566" font-family="DM Sans" font-weight="700" font-size="30" fill="#f4eee4">from ${site.google.reviewCount} Google reviews</text>
  <text x="80" y="604" font-family="DM Sans" font-weight="500" font-size="24" fill="#d9d4cb">${esc(site.address.street)}, ${esc(site.address.locality)} ${esc(site.address.postcode)}  ·  ${esc(site.phone.display)}</text>
</svg>`;

mkdirSync(resolve(root, 'public'), { recursive: true });
const out = resolve(root, 'public/og.jpg');
const overlay = Buffer.from(svg);
const base = hasHero
  ? sharp(heroPath).resize(1200, 630, { fit: 'cover', position: 'centre' }).modulate({ brightness: 0.9, saturation: 0.95 })
  : sharp({ create: { width: 1200, height: 630, channels: 3, background: '#0e0c0a' } });
const composed = await base.composite([{ input: overlay }]).toBuffer();
// WhatsApp only shows preview images under ~300 KB.
let quality = 84;
for (;;) {
  await sharp(composed).jpeg({ quality, mozjpeg: true }).toFile(out);
  if (statSync(out).size < 290 * 1024 || quality <= 50) break;
  quality -= 6;
}
console.log(`og: wrote ${out} (${hasHero ? 'hero photo' : 'drawn pole'}, q${quality}, ${(statSync(out).size / 1024).toFixed(0)} KB)`);
