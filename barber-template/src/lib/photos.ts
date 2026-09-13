/**
 * The listing photos in public/photos, fetched by scripts/fetch-photos.mjs.
 * They live in public/ so the script can write them without touching code,
 * and are imported here so astro:assets can resize them and emit WebP with a
 * responsive srcset. A path with no file behind it is simply not shown.
 * Author attributions come from src/data/photo-credits.json, keyed by path.
 */
import type { ImageMetadata } from 'astro';
import rawCredits from '../data/photo-credits.json';

const files = import.meta.glob<{ default: ImageMetadata }>('/public/photos/*.{jpg,jpeg,png,webp,avif}', { eager: true });

const byPath = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(files)) byPath.set(path.replace(/^\/public/, ''), mod.default);

/** Metadata for a root-absolute path such as "/photos/<slug>-1.jpg", or null when the file is missing. */
export function photoFor(publicPath: string): ImageMetadata | null {
  return byPath.get(publicPath) ?? null;
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
