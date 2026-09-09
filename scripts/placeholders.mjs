// Generates an atmospheric, text-free hero backdrop for a client that hasn't sent photos yet.
// Usage: node scripts/placeholders.mjs <slug> [--force]
// Not a stock photo: a generated dark panel with grain and a soft brass light. Replace with a
// real shot (clients/<slug>/photos/hero.jpg) as soon as you have one; nothing else changes.
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const slug = process.argv[2];
if (!slug) throw new Error('usage: node scripts/placeholders.mjs <slug>');
const dir = resolve(`clients/${slug}/photos`);
mkdirSync(dir, { recursive: true });
const out = resolve(dir, 'hero.jpg');
if (existsSync(out) && !process.argv.includes('--force')) {
  console.log('skip hero.jpg (exists; pass --force to overwrite)');
  process.exit(0);
}

const w = 2000, h = 1333;
const px = w * h;
const noise = Buffer.alloc(px);
for (let i = 0; i < px; i++) noise[i] = 14 + Math.random() * 20;
const base = sharp(noise, { raw: { width: w, height: h, channels: 1 } })
  .blur(0.7)
  .toColourspace('srgb')
  .tint({ r: 205, g: 178, b: 128 });

// Soft brass key light top-right, deep falloff bottom-left, faint diagonal weave.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <radialGradient id="key" cx="78%" cy="18%" r="70%">
      <stop offset="0" stop-color="#e7c27a" stop-opacity="0.26"/>
      <stop offset="0.45" stop-color="#b98a3a" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="fall" cx="20%" cy="95%" r="90%">
      <stop offset="0" stop-color="#000" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="top" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0.35"/>
      <stop offset="0.5" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
    <pattern id="weave" width="46" height="46" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
      <rect width="46" height="23" fill="#f0c96a" fill-opacity="0.012"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#weave)"/>
  <rect width="100%" height="100%" fill="url(#key)"/>
  <rect width="100%" height="100%" fill="url(#fall)"/>
  <rect width="100%" height="100%" fill="url(#top)"/>
</svg>`;
await base
  .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile(out);
console.log(`wrote clients/${slug}/photos/hero.jpg`);
