/**
 * Build-time helpers for graded images in public/img. URLs carry a content
 * hash as ?v= so public/_headers can mark them immutable and a swapped photo
 * still busts the cache.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { root } from 'astro:config/server';
import { IMG_PUBLIC_PATH, getSearchedSlot, outputFile, outputHeight, type Format, type SearchedSlot } from '../config/images.ts';

// Resolved from the project root, not import.meta.url: Astro bundles this
// module into dist/.prerender at build time, where a relative path would lie.
const IMG_DIR = fileURLToPath(new URL('public/img/', root));
const hashes = new Map<string, string>();

export function versioned(fileName: string): string {
  let hash = hashes.get(fileName);
  if (!hash) {
    hash = createHash('sha1').update(readFileSync(IMG_DIR + fileName)).digest('hex').slice(0, 8);
    hashes.set(fileName, hash);
  }
  return `${IMG_PUBLIC_PATH}/${fileName}?v=${hash}`;
}

export function srcset(slot: SearchedSlot, format: Format): string {
  return slot.widths.map((w) => `${versioned(outputFile(slot.id, w, format))} ${w}w`).join(', ');
}

/** Middle width as the <img src> fallback; WebP is supported everywhere that matters. */
export function fallbackSrc(slot: SearchedSlot): string {
  const w = slot.widths[Math.floor((slot.widths.length - 1) / 2)]!;
  return versioned(outputFile(slot.id, w, 'webp'));
}

export interface Preload {
  imagesrcset: string;
  imagesizes: string;
  media?: string;
}

/** Preload hints for an above-the-fold slot, AVIF only (browsers that lack AVIF skip a type-mismatched preload). */
export function preloadFor(slotId: string, sizes?: string, media?: string): Preload {
  const slot = getSearchedSlot(slotId);
  return { imagesrcset: srcset(slot, 'avif'), imagesizes: sizes ?? slot.sizes, media };
}

export { getSearchedSlot, outputHeight };
