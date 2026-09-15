/**
 * The photographs a page can show, from two places:
 *
 *   public/photos/         the listing photos, fetched by scripts/fetch-photos.mjs
 *   public/shops/<slug>/   a set the shop's own owner sent us, prepared by
 *                          scripts/shop-photos.mjs
 *
 * Both are served as they are, straight from public/, so a build never resizes
 * or copies them; only their dimensions are read here, for width and height
 * attributes so nothing shifts while a photo loads. A path with no file behind
 * it is simply not shown. Author attributions come from
 * src/data/photo-credits.json, keyed by path — an owner's own photographs have
 * no entry there and are credited to the shop instead.
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

const sizes = new Map<string, PhotoSize>();

/** Read every image in one public directory into the size map, keyed by its served path. */
async function scan(publicDir: string) {
  const dir = fileURLToPath(new URL(`public${publicDir}`, root));
  if (!existsSync(dir)) return;
  for (const file of readdirSync(dir)) {
    if (!/\.(jpe?g|png|webp|avif)$/i.test(file)) continue;
    try {
      const m = await imageMetadata(new Uint8Array(readFileSync(dir + file)), file);
      sizes.set(`${publicDir}${file}`, { width: m.width, height: m.height });
    } catch {
      /* not a readable image: left out */
    }
  }
}

await scan('/photos/');
// One directory per shop that sent us its own pictures.
const shopsDir = fileURLToPath(new URL('public/shops/', root));
if (existsSync(shopsDir)) {
  for (const slug of readdirSync(shopsDir, { withFileTypes: true })) {
    if (slug.isDirectory()) await scan(`/shops/${slug.name}/`);
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
