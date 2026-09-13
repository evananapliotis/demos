/**
 * The listing photos in public/photos, fetched by scripts/fetch-photos.mjs
 * as 1400px JPEGs. They are served as they are, straight from public/, so a
 * build never resizes or copies them; only their dimensions are read here,
 * for width and height attributes so nothing shifts while a photo loads. A
 * path with no file behind it is simply not shown. Author attributions come
 * from src/data/photo-credits.json, keyed by path.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { imageMetadata } from 'astro/assets/utils';
import { root } from 'astro:config/server';
import rawCredits from '../data/photo-credits.json';

export interface PhotoSize {
  width: number;
  height: number;
}

const dir = fileURLToPath(new URL('public/photos/', root));
const sizes = new Map<string, PhotoSize>();
if (existsSync(dir)) {
  for (const file of readdirSync(dir)) {
    if (!/\.(jpe?g|png|webp|avif)$/i.test(file)) continue;
    try {
      const m = await imageMetadata(new Uint8Array(readFileSync(dir + file)), file);
      sizes.set(`/photos/${file}`, { width: m.width, height: m.height });
    } catch {
      /* not a readable image: left out */
    }
  }
}

/** Dimensions for a root-absolute path such as "/photos/<slug>-1.jpg", or null when the file is missing. */
export function photoFor(publicPath: string): PhotoSize | null {
  return sizes.get(publicPath) ?? null;
}

export interface PhotoAuthor {
  name: string;
  uri: string;
}
export interface PhotoCredit {
  place: string;
  placeId: string;
  authors: PhotoAuthor[];
}

const credits = rawCredits as Record<string, PhotoCredit>;

export function creditFor(publicPath: string): PhotoCredit | null {
  return credits[publicPath] ?? null;
}
