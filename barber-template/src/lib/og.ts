/**
 * The link-preview image for a /demo page (1200x630): the listing's first
 * photo behind the name, address, rating and review count, in the page's own
 * faces and its own palette, so the shared link looks like the page it opens.
 * JPEG under 290KB so WhatsApp shows it. Rendered at build time by
 * src/pages/[slug]/og.jpg.ts.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
  const og = site.theme.og;
  const [line1, line2] = site.nameLines;
  const longest = Math.max(line1.length, line2.length, 1);
  // Each theme's face sets at its own width (Big Shoulders is condensed at 0.46em
  // a character; a grotesk in caps is half again as wide), so the name is sized
  // against the face it is actually drawn in.
  const size = Math.min(210, Math.floor(1040 / (og.width * longest)));
  const caps = (line: string) => (og.upper ? line.toUpperCase() : line);
  const baseline2 = 500;
  const baseline1 = line2 ? baseline2 - Math.round(size * 0.84) : baseline2;
  const eyebrow = `${site.kind} · ${site.roadName}, ${site.address.locality}`.toUpperCase();
  const full = site.google.rating != null ? Math.round(site.google.rating) : 0;
  const stars = (x: number, y: number) =>
    Array.from({ length: 5 }, (_, i) => `<path d="${STAR}" fill="${i < full ? og.accent : 'none'}" stroke="${og.accent}" stroke-width="1.6" transform="translate(${x + i * 28} ${y}) scale(1.15)"/>`).join('');
  const ratingRow =
    site.google.rating != null
      ? `<text x="80" y="566" font-family="DM Sans" font-weight="700" font-size="30" fill="${og.accent}">${site.google.rating.toFixed(1)}</text>
  ${stars(138, 540)}
  <text x="290" y="566" font-family="DM Sans" font-weight="700" font-size="30" fill="${og.text}">from ${esc(site.google.reviewsText)}</text>`
      : `<text x="80" y="566" font-family="DM Sans" font-weight="700" font-size="30" fill="${og.text}">${esc(site.google.reviewsText)}</text>`;

  const heroFile = site.hero ? fileURLToPath(new URL(`public${site.hero.path}`, root)) : null;
  const hasHero = !!heroFile && existsSync(heroFile);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="0.95" cy="0.05" r="0.7"><stop offset="0" stop-color="${og.accent}" stop-opacity="0.22"/><stop offset="1" stop-color="${og.accent}" stop-opacity="0"/></radialGradient>
    <linearGradient id="photo-x" x1="0" x2="1"><stop offset="0" stop-color="${og.ground}" stop-opacity="0.94"/><stop offset="0.55" stop-color="${og.ground}" stop-opacity="0.72"/><stop offset="1" stop-color="${og.ground}" stop-opacity="0.25"/></linearGradient>
    <linearGradient id="photo-y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${og.ground}" stop-opacity="0.15"/><stop offset="0.7" stop-color="${og.ground}" stop-opacity="0.35"/><stop offset="1" stop-color="${og.ground}" stop-opacity="0.85"/></linearGradient>
  </defs>
  ${hasHero ? '<rect width="1200" height="630" fill="url(#photo-x)"/><rect width="1200" height="630" fill="url(#photo-y)"/>' : `<rect width="1200" height="630" fill="${og.ground}"/><rect width="1200" height="630" fill="url(#glow)"/>`}
  <rect x="0" y="0" width="14" height="630" fill="${og.accent}"/>
  <text x="80" y="128" font-family="DM Sans" font-weight="700" font-size="24" letter-spacing="5" fill="${og.accent}">${esc(eyebrow)}</text>
  <text x="76" y="${baseline1}" font-family="${og.display}" font-weight="800" font-size="${size}" fill="${og.text}">${esc(caps(line1))}</text>
  ${line2 ? `<text x="76" y="${baseline2}" font-family="${og.display}" font-weight="800" font-size="${size}"${og.italicAccent ? ' font-style="italic"' : ''} fill="${og.accent}">${esc(caps(line2))}</text>` : ''}
  ${ratingRow}
  <text x="80" y="604" font-family="DM Sans" font-weight="500" font-size="24" fill="${og.muted}">${esc(site.fullAddress)}  ·  ${esc(site.phone.display)}</text>
</svg>`;

  const base = hasHero
    ? sharp(heroFile!).rotate().resize(1200, 630, { fit: 'cover', position: 'centre' }).modulate({ brightness: 0.9, saturation: 0.95 })
    : sharp({ create: { width: 1200, height: 630, channels: 3, background: og.ground } });
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
  // The front page's share image in the brand: paper, the lockup from public/brand, navy type with the second line in copper.
  const lockup = readFileSync(fileURLToPath(new URL('public/brand/lockup.svg', root)), 'utf8')
    .replace(/^<svg[^>]*viewBox="([^"]+)"[^>]*>/, (_m, vb: string) => `<svg x="80" y="72" height="56" viewBox="${vb}">`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f4efe6"/>
  <rect x="0" y="0" width="1200" height="2" fill="rgb(15,29,51)" fill-opacity="0.14"/>
  ${lockup}
  <text x="76" y="330" font-family="Instrument Serif" font-size="196" letter-spacing="-4" fill="#0f1d33">Get seen.</text>
  <text x="76" y="488" font-family="Instrument Serif" font-style="italic" font-size="196" letter-spacing="-4" fill="#b8623a">Get booked.</text>
  <text x="80" y="556" font-family="Instrument Sans" font-weight="400" font-size="30" fill="#46506a">Your shop online, built first. £500 one-off, no monthly fee, live in 48 hours.</text>
  <rect x="80" y="589" width="24" height="2" fill="#b8623a"/>
  <text x="116" y="596" font-family="Geist Mono" font-weight="500" font-size="19" letter-spacing="1.5" fill="#5a6379">MYBARBERSITE.CO.UK  ·  07546 685660</text>
</svg>`;
  const composed = await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#f4efe6' } })
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toBuffer();
  return sharp(composed).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}
