/**
 * The link-preview image for a /demo page (1200x630): the listing's first
 * photo behind the name, address, rating and review count, in the page's own
 * faces. JPEG under 290KB so WhatsApp shows it. Rendered at build time by
 * src/pages/[slug]/og.jpg.ts.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root } from 'astro:config/server';
import sharp from 'sharp';
import type { DemoSite } from './demo.ts';

// librsvg finds fonts through fontconfig. Point it at the two faces in
// src/og/fonts (the same families the page uses) before the first render.
const fontsDir = fileURLToPath(new URL('src/og/fonts/', root));
const confDir = join(tmpdir(), 'barber-template-og');
mkdirSync(confDir, { recursive: true });
const conf = join(confDir, 'fonts.conf');
writeFileSync(
  conf,
  `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${fontsDir}</dir><cachedir>${join(confDir, 'cache')}</cachedir></fontconfig>`,
);
process.env.FONTCONFIG_FILE = conf;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '’');
const STAR = 'M12 2.8l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.6 6 20.9l1.3-6.6L2.4 9.7l6.7-.8z';

export async function renderOg(site: DemoSite): Promise<Buffer> {
  const [line1, line2] = site.nameLines;
  const longest = Math.max(line1.length, line2.length, 1);
  // Big Shoulders Display is condensed: about 0.46em per character at weight 800.
  const size = Math.min(210, Math.floor(1040 / (0.46 * longest)));
  const baseline2 = 500;
  const baseline1 = line2 ? baseline2 - Math.round(size * 0.84) : baseline2;
  const eyebrow = `${site.kind} · ${site.roadName}, ${site.address.locality}`.toUpperCase();
  const full = site.google.rating != null ? Math.round(site.google.rating) : 0;
  const stars = (x: number, y: number) =>
    Array.from({ length: 5 }, (_, i) => `<path d="${STAR}" fill="${i < full ? '#f2a93b' : 'none'}" stroke="#f2a93b" stroke-width="1.6" transform="translate(${x + i * 28} ${y}) scale(1.15)"/>`).join('');
  const ratingRow =
    site.google.rating != null
      ? `<text x="80" y="566" font-family="DM Sans" font-weight="700" font-size="30" fill="#f2a93b">${site.google.rating.toFixed(1)}</text>
  ${stars(138, 540)}
  <text x="290" y="566" font-family="DM Sans" font-weight="700" font-size="30" fill="#f4eee4">from ${esc(site.google.reviewsText)}</text>`
      : `<text x="80" y="566" font-family="DM Sans" font-weight="700" font-size="30" fill="#f4eee4">${esc(site.google.reviewsText)}</text>`;

  const heroFile = site.hero ? fileURLToPath(new URL(`public${site.hero.path}`, root)) : null;
  const hasHero = !!heroFile && existsSync(heroFile);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="0.95" cy="0.05" r="0.7"><stop offset="0" stop-color="#f2a93b" stop-opacity="0.22"/><stop offset="1" stop-color="#f2a93b" stop-opacity="0"/></radialGradient>
    <linearGradient id="photo-x" x1="0" x2="1"><stop offset="0" stop-color="#0e0c0a" stop-opacity="0.94"/><stop offset="0.55" stop-color="#0e0c0a" stop-opacity="0.72"/><stop offset="1" stop-color="#0e0c0a" stop-opacity="0.25"/></linearGradient>
    <linearGradient id="photo-y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e0c0a" stop-opacity="0.15"/><stop offset="0.7" stop-color="#0e0c0a" stop-opacity="0.35"/><stop offset="1" stop-color="#0e0c0a" stop-opacity="0.85"/></linearGradient>
  </defs>
  ${hasHero ? '<rect width="1200" height="630" fill="url(#photo-x)"/><rect width="1200" height="630" fill="url(#photo-y)"/>' : '<rect width="1200" height="630" fill="#0e0c0a"/><rect width="1200" height="630" fill="url(#glow)"/>'}
  <rect x="0" y="0" width="14" height="630" fill="#f2a93b"/>
  <text x="80" y="128" font-family="DM Sans" font-weight="700" font-size="24" letter-spacing="5" fill="#f2a93b">${esc(eyebrow)}</text>
  <text x="76" y="${baseline1}" font-family="Big Shoulders Display" font-weight="800" font-size="${size}" fill="#f4eee4">${esc(line1.toUpperCase())}</text>
  ${line2 ? `<text x="76" y="${baseline2}" font-family="Big Shoulders Display" font-weight="800" font-size="${size}" fill="#f2a93b">${esc(line2.toUpperCase())}</text>` : ''}
  ${ratingRow}
  <text x="80" y="604" font-family="DM Sans" font-weight="500" font-size="24" fill="#d9d4cb">${esc(site.fullAddress)}  ·  ${esc(site.phone.display)}</text>
</svg>`;

  const base = hasHero
    ? sharp(heroFile!).rotate().resize(1200, 630, { fit: 'cover', position: 'centre' }).modulate({ brightness: 0.9, saturation: 0.95 })
    : sharp({ create: { width: 1200, height: 630, channels: 3, background: '#0e0c0a' } });
  // PNG in between: a created (photo-less) base has no input format for toBuffer() to fall back on.
  const composed = await base.composite([{ input: Buffer.from(svg) }]).png().toBuffer();
  // WhatsApp only shows preview images under ~300 KB.
  let quality = 84;
  for (;;) {
    const out = await sharp(composed).jpeg({ quality, mozjpeg: true }).toBuffer();
    if (out.length < 290 * 1024 || quality <= 50) return out;
    quality -= 6;
  }
}

/**
 * The front page's link-preview image: the name, the one-line offer and the
 * number, on the same dark ground as the page.
 */
export async function renderHomeOg(): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="0.92" cy="0.08" r="0.75"><stop offset="0" stop-color="#f2a93b" stop-opacity="0.26"/><stop offset="1" stop-color="#f2a93b" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#0e0c0a"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="0" y="0" width="14" height="630" fill="#f2a93b"/>
  <text x="80" y="128" font-family="DM Sans" font-weight="700" font-size="24" letter-spacing="5" fill="#f2a93b">FOR UK BARBERS</text>
  <text x="76" y="330" font-family="Big Shoulders Display" font-weight="800" font-size="190" fill="#f4eee4">GET SEEN.</text>
  <text x="76" y="490" font-family="Big Shoulders Display" font-weight="800" font-size="190" fill="#f2a93b">GET BOOKED.</text>
  <text x="80" y="562" font-family="DM Sans" font-weight="700" font-size="30" fill="#f4eee4">Your shop online, built first. £500 one-off, no monthly fee, live in 48 hours.</text>
  <text x="80" y="604" font-family="DM Sans" font-weight="500" font-size="24" fill="#d9d4cb">mybarbersite.co.uk  ·  07546 685660</text>
</svg>`;
  const composed = await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#0e0c0a' } })
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toBuffer();
  return sharp(composed).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}
