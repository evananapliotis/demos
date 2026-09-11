#!/usr/bin/env node
// Derives the fresh/healed pair from src/images/healed.jpg so the comparison slider shows
// one piece twice: graded "fresh" (flushed, glossy, crisp) and "healed" (settled, matte).
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { IMAGES_DIR } from './slots.mjs';

const dir = fileURLToPath(IMAGES_DIR);
const src = `${dir}healed.jpg`;
if (!existsSync(src)) { console.error('src/images/healed.jpg is missing. Run `pnpm images` first.'); process.exit(1); }
mkdirSync(`${dir}derived`, { recursive: true });

const base = sharp(src).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true });

// Fresh: skin flushed towards red, a little more saturation and contrast, edges crisper.
await base.clone()
  .recomb([[1.07, 0.0, 0.0], [0.0, 0.985, 0.0], [0.0, 0.0, 0.955]])
  .modulate({ saturation: 1.1, brightness: 1.02 })
  .linear(1.07, -6)
  .sharpen({ sigma: 0.9 })
  .jpeg({ quality: 90, mozjpeg: true })
  .toFile(`${dir}derived/pair-fresh.jpg`);

// Healed: neutral skin, softer black, lines settled by a hair.
await base.clone()
  .recomb([[0.985, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.01]])
  .modulate({ saturation: 0.93 })
  .linear(0.95, 7)
  .blur(0.55)
  .jpeg({ quality: 90, mozjpeg: true })
  .toFile(`${dir}derived/pair-healed.jpg`);

console.log('Wrote src/images/derived/pair-fresh.jpg and pair-healed.jpg');
