// Generates dark, clearly-labelled placeholder photos for a client that has none yet.
// Usage: node scripts/placeholders.mjs <slug>
// These are NOT stock photos: flat generated panels. Replace with real shots before launch.
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const slug = process.argv[2];
if (!slug) throw new Error('usage: node scripts/placeholders.mjs <slug>');
const dir = resolve(`clients/${slug}/photos`);
mkdirSync(dir, { recursive: true });

const specs = [
  { file: 'hero.jpg', w: 2000, h: 1333, label: 'HERO PHOTO' },
  { file: 'gallery-01.jpg', w: 1200, h: 1500, label: 'GALLERY 01' },
  { file: 'gallery-02.jpg', w: 1200, h: 1200, label: 'GALLERY 02' },
  { file: 'gallery-03.jpg', w: 1200, h: 1500, label: 'GALLERY 03' },
  { file: 'gallery-04.jpg', w: 1200, h: 900, label: 'GALLERY 04' },
  { file: 'gallery-05.jpg', w: 1200, h: 1200, label: 'GALLERY 05' },
];

for (const s of specs) {
  const out = resolve(dir, s.file);
  if (existsSync(out) && !process.argv.includes('--force')) {
    console.log(`skip ${s.file} (exists)`);
    continue;
  }
  // grain
  const px = s.w * s.h;
  const noise = Buffer.alloc(px);
  for (let i = 0; i < px; i++) noise[i] = 18 + Math.random() * 22;
  const base = sharp(noise, { raw: { width: s.w, height: s.h, channels: 1 } })
    .blur(0.6)
    .toColourspace('srgb')
    .tint({ r: 214, g: 190, b: 140 });

  const fs = Math.round(s.w * 0.022);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="${s.h}">
    <defs>
      <radialGradient id="v" cx="50%" cy="45%" r="75%">
        <stop offset="0" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.55"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#v)"/>
    <rect x="${s.w * 0.06}" y="${s.h * 0.08}" width="${s.w * 0.88}" height="${s.h * 0.84}" fill="none" stroke="#d3a94c" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="10 10"/>
    <text x="${s.w * 0.08}" y="${s.h * 0.88}" font-family="Helvetica, Arial, sans-serif" font-size="${fs}" font-weight="700" letter-spacing="${fs * 0.25}" fill="#d3a94c" fill-opacity="0.9">${s.label} · REPLACE WITH SHOP PHOTO</text>
  </svg>`;
  await base
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out);
  console.log(`wrote ${s.file}`);
}
