/**
 * Fills public/img with generated placeholder art so the site can build and
 * deploy before any photo has been picked. Each placeholder passes through
 * the real grade, so the site's tone is right even without photos.
 * `npm run images:grade` overwrites these slot by slot as picks are made.
 *
 *   npm run images:placeholders
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { FORMATS, derivedFile, derivedSlots, outputFile, outputHeight, searchedSlots, type SearchedSlot } from '../src/config/images.ts';
import { encodeUnderBudget } from './lib/budget.ts';
import { grade } from './lib/grade.ts';
import { CREDITS_FILE, PUBLIC_IMG_DIR, kb } from './lib/paths.ts';
import { LICENCE } from './lib/pexels.ts';

function placeholderSvg(index: number, slot: SearchedSlot, w: number, h: number): string {
  const hue = 22 + ((index * 5) % 14);
  const angle = (index * 47) % 360;
  const a = `hsl(${hue} 32% ${20 + (index % 3) * 3}%)`;
  const b = `hsl(${hue + 8} 45% ${9 + (index % 4) * 2}%)`;
  const hx = 30 + ((index * 23) % 40);
  const hy = 25 + ((index * 31) % 40);
  const isPortrait = h > w;
  const figure = isPortrait
    ? `<ellipse cx="${w * 0.5}" cy="${h * 0.42}" rx="${w * 0.22}" ry="${w * 0.28}" fill="hsl(${hue} 30% 12%)" opacity="0.55"/>
       <ellipse cx="${w * 0.5}" cy="${h * 0.95}" rx="${w * 0.42}" ry="${h * 0.3}" fill="hsl(${hue} 30% 10%)" opacity="0.6"/>`
    : `<rect x="${w * 0.08}" y="${h * 0.62}" width="${w * 0.84}" height="${h * 0.04}" fill="hsl(${hue + 10} 40% 40%)" opacity="0.25"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="bg" gradientTransform="rotate(${angle} 0.5 0.5)"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <radialGradient id="glow" cx="${hx}%" cy="${hy}%" r="60%"><stop offset="0" stop-color="hsl(${hue + 6} 60% 55%)" stop-opacity="0.35"/><stop offset="1" stop-color="hsl(${hue} 60% 55%)" stop-opacity="0"/></radialGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.16"/></feComponentTransfer>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
  ${figure}
  <rect width="100%" height="100%" filter="url(#grain)"/>
  <text x="${w * 0.04}" y="${h * 0.95}" font-family="sans-serif" font-size="${Math.round(Math.min(w, h) * 0.03)}" fill="#f1e9dc" fill-opacity="0.35" letter-spacing="2">${slot.id.toUpperCase()} &#183; PLACEHOLDER</text>
</svg>`;
}

mkdirSync(PUBLIC_IMG_DIR, { recursive: true });
let largest = { name: '', bytes: 0 };
const sources = new Map<string, Buffer>();

for (const [index, slot] of searchedSlots.entries()) {
  const maxWidth = slot.widths[slot.widths.length - 1]!;
  const source = await sharp(Buffer.from(placeholderSvg(index, slot, maxWidth, outputHeight(slot, maxWidth)))).png().toBuffer();
  sources.set(slot.id, source);
  const parts: string[] = [];
  for (const width of slot.widths) {
    const frame = await grade(source, { width, height: outputHeight(slot, width), focal: 'centre' });
    for (const format of FORMATS) {
      const name = outputFile(slot.id, width, format);
      const enc = await encodeUnderBudget(frame, format, slot.budgetKB * 1024, name);
      writeFileSync(join(PUBLIC_IMG_DIR, name), enc.buffer);
      if (enc.bytes > largest.bytes) largest = { name, bytes: enc.bytes };
      parts.push(`${width}.${format} ${kb(enc.bytes)}`);
    }
  }
  console.log(`${slot.id}: ${parts.join('  ')}`);
}

for (const slot of derivedSlots) {
  const frame = await grade(sources.get(slot.from)!, { width: slot.width, height: slot.height, focal: 'centre' });
  const name = derivedFile(slot);
  const enc = await encodeUnderBudget(frame, 'jpeg', slot.budgetKB * 1024, name);
  writeFileSync(join(PUBLIC_IMG_DIR, name), enc.buffer);
  console.log(`${slot.id}: ${kb(enc.bytes)}`);
}

writeFileSync(CREDITS_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), licence: LICENCE, photos: [] }, null, 2) + '\n');
console.log(`\nPlaceholders written. Largest file: ${largest.name} at ${kb(largest.bytes)}. Credits: none (placeholders).`);
