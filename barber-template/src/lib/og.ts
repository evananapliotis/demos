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
  const type = site.layout.og;
  const p = site.palette;
  // The share image is the page's own palette: the ground this shop's photo
  // chose and the accent taken from the photo itself.
  const ground = p.ink;
  const text = p.cream;
  const muted = p.cream2;
  const accent = p.accent;

  const heroFile = site.hero ? fileURLToPath(new URL(`public${site.hero.path}`, root)) : null;
  const hasHero = !!heroFile && existsSync(heroFile);

  // A split card: the type sits on a solid panel and the photo keeps its own
  // half. Nothing is set over the photograph, so a blown-out shopfront or a
  // dark interior cannot make the name unreadable — the one failure mode that
  // matters when this is the only thing a prospect ever sees.
  const PANEL = hasHero ? 700 : 1200;
  const PAD = 64;
  const column = PANEL - PAD - (hasHero ? 44 : PAD);

  const [rawLine1, rawLine2] = site.nameLines;
  const caps = (line: string) => (type.upper ? line.toUpperCase() : line);
  const line1 = caps(rawLine1);
  const line2 = caps(rawLine2);
  const longest = Math.max(line1.length, line2.length, 1);
  // Each face sets at its own width, so the name is measured against the face
  // it is actually drawn in and then held inside the column.
  // Without a photograph the name has the whole 1200 to itself and is the only
  // picture the card has, so it is allowed to run far larger, and the band it
  // sits in opens up to take it.
  const cap = hasHero ? (line2 ? 108 : 132) : line2 ? 185 : 240;
  const size = Math.max(40, Math.min(cap, Math.floor(column / (type.width * longest))));
  const leading = Math.round(size * 0.9);

  // The type block is centred in the space between the eyebrow and the rating.
  const blockTop = hasHero ? 168 : 150;
  const blockBottom = hasHero ? 452 : 460;
  const blockHeight = line2 ? leading + size * 0.74 : size * 0.74;
  const firstBaseline = Math.round(blockTop + (blockBottom - blockTop - blockHeight) / 2 + size * 0.74);
  const secondBaseline = firstBaseline + leading;

  const eyebrow = `${site.kind} · ${site.address.locality}`.toUpperCase();
  const full = site.google.rating != null ? Math.round(site.google.rating) : 0;
  const stars = (x: number, y: number, scale: number) =>
    Array.from({ length: 5 }, (_, i) => `<path d="${STAR}" fill="${i < full ? accent : 'none'}" stroke="${accent}" stroke-width="1.6" transform="translate(${x + i * 26 * scale} ${y}) scale(${scale})"/>`).join('');

  // Rating, then the address and number, anchored to the bottom of the panel.
  const ratingY = 520;
  const hasRating = site.google.rating != null;
  const ratingBlock = hasRating
    ? `<text x="${PAD}" y="${ratingY}" font-family="DM Sans" font-weight="700" font-size="52" fill="${accent}">${site.google.rating!.toFixed(1)}</text>
  ${stars(PAD + 78, ratingY - 26, 1.25)}
  <text x="${PAD + 78 + 5 * 26 * 1.25 + 14}" y="${ratingY - 4}" font-family="DM Sans" font-weight="500" font-size="27" fill="${text}">${esc(site.google.reviewsText)}</text>`
    : `<text x="${PAD}" y="${ratingY}" font-family="DM Sans" font-weight="700" font-size="34" fill="${text}">${esc(site.google.reviewsText)}</text>`;

  // The eyebrow already carries the town, so the last line is the street and the
  // number. It is trimmed rather than allowed to run past the panel.
  const room = Math.floor(column / (0.5 * 24)) - site.phone.display.length - 5;
  const street = site.address.street.length > room ? `${site.address.street.slice(0, Math.max(10, room - 1))}…` : site.address.street;
  const address = `${street}  ·  ${site.phone.display}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="seam" x1="0" x2="1"><stop offset="0" stop-color="${ground}" stop-opacity="1"/><stop offset="1" stop-color="${ground}" stop-opacity="0"/></linearGradient>
    <linearGradient id="glow" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${accent}" stop-opacity="0.16"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></linearGradient>
  </defs>
  <rect x="0" y="0" width="${PANEL}" height="630" fill="${ground}"/>
  ${hasHero ? `<rect x="${PANEL}" y="0" width="72" height="630" fill="url(#seam)"/>` : `<rect x="0" y="0" width="1200" height="630" fill="url(#glow)"/>`}
  <rect x="0" y="0" width="14" height="630" fill="${accent}"/>
  <text x="${PAD}" y="104" font-family="Geist Mono" font-weight="500" font-size="23" letter-spacing="4" fill="${accent}">${esc(eyebrow)}</text>
  <text x="${PAD - Math.round(size * 0.04)}" y="${firstBaseline}" font-family="${type.display}" font-weight="800" font-size="${size}" fill="${text}">${esc(line1)}</text>
  ${line2 ? `<text x="${PAD - Math.round(size * 0.04)}" y="${secondBaseline}" font-family="${type.display}" font-weight="800" font-size="${size}"${type.italicAccent ? ' font-style="italic"' : ''} fill="${accent}">${esc(line2)}</text>` : ''}
  <rect x="${PAD}" y="${blockBottom + 18}" width="64" height="4" fill="${accent}"/>
  ${ratingBlock}
  <text x="${PAD}" y="574" font-family="DM Sans" font-weight="500" font-size="24" fill="${muted}">${esc(address)}</text>
</svg>`;

  const base = hasHero
    ? sharp(heroFile!).rotate().resize(500, 630, { fit: 'cover', position: 'centre' }).modulate({ brightness: 0.96, saturation: 1.02 }).extend({ left: 700, background: ground })
    : sharp({ create: { width: 1200, height: 630, channels: 3, background: ground } });
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
