/**
 * Real photos only. Files live in public/images/ (so they can be dropped in without touching code)
 * and are imported here so astro:assets can resize them and emit WebP with a responsive srcset.
 * A missing file is not an error: the section that would show it is left out.
 */
import type { ImageMetadata } from 'astro';
import { site } from '@config';

const files = import.meta.glob<{ default: ImageMetadata }>('/public/images/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}', {
  eager: true,
});

const byName = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(files)) byName.set(path.split('/').pop()!, mod.default);

export function photo(name: string): ImageMetadata | null {
  return byName.get(name) ?? null;
}
export function altFor(name: string) {
  return site.images.alt[name] ?? site.images.galleryAlt;
}

export const heroImage = photo(site.images.hero);
export const shopfrontImage = photo(site.images.shopfront);

const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
export const galleryImages = [...byName.keys()]
  .filter((n) => n.startsWith(site.images.galleryPrefix))
  .sort(natural)
  .map((n) => ({ file: n, image: byName.get(n)!, alt: altFor(n) }));

export const photoCount = byName.size;
