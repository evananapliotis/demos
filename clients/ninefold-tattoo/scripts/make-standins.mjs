#!/usr/bin/env node
// Dev only. Writes gitignored stand-in images to src/images/_dev/ so the layout can be
// reviewed before the photographs exist. build.mjs refuses to zip a site that uses them.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SLOTS, DERIVED, IMAGES_DIR } from './slots.mjs';

const dir = `${fileURLToPath(IMAGES_DIR)}_dev/`;
mkdirSync(dir, { recursive: true });
const all = [...SLOTS, ...DERIVED];
let i = 0;
for (const d of all) {
  const [aw, ah] = d.aspect;
  const long = 1800;
  const w = aw >= ah ? long : Math.round((long * aw) / ah);
  const h = aw >= ah ? Math.round((long * ah) / aw) : long;
  const tone = 14 + ((i * 7) % 16);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <radialGradient id="g" cx="${40 + (i % 3) * 15}%" cy="${35 + (i % 4) * 12}%" r="80%">
        <stop offset="0" stop-color="rgb(${tone + 22},${tone + 20},${tone + 18})"/>
        <stop offset="1" stop-color="rgb(${tone},${tone},${tone})"/>
      </radialGradient>
      <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.08 0"/></filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect width="100%" height="100%" filter="url(#n)"/>
    <text x="50%" y="50%" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(w / 34)}" fill="rgba(236,231,221,0.28)" letter-spacing="4">STAND-IN · ${d.slot.toUpperCase()}</text>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toFile(`${dir}${d.slot}.jpg`);
  i++;
}
console.log(`Wrote ${all.length} stand-ins to src/images/_dev/ (gitignored; never shipped).`);
