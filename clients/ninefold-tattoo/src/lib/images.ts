import type { ImageMetadata } from 'astro';

/**
 * Photographs are resolved by slot name from src/images/<slot>.jpg (the files
 * scripts/fetch-images.mjs downloads). While the real photographs are missing,
 * gitignored stand-ins in src/images/_dev/ let the layout be reviewed; the build
 * script refuses to zip a site that still uses any of them.
 */
const real = import.meta.glob<ImageMetadata>('../images/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const derived = import.meta.glob<ImageMetadata>('../images/derived/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const standIns = import.meta.glob<ImageMetadata>('../images/_dev/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });

const byName = (map: Record<string, ImageMetadata>, name: string) =>
  Object.entries(map).find(([k]) => k.split('/').pop()!.replace(/\.[^.]+$/, '') === name)?.[1];

export const usedStandIns = new Set<string>();

export function photo(slot: string): ImageMetadata {
  const hit = byName(real, slot) ?? byName(derived, slot);
  if (hit) return hit;
  const dev = byName(standIns, slot);
  if (dev) {
    usedStandIns.add(slot);
    return dev;
  }
  throw new Error(`No photograph for slot "${slot}". Run \`pnpm images\` (see README) to download it into src/images/.`);
}

export function hasPhoto(slot: string): boolean {
  return Boolean(byName(real, slot) ?? byName(derived, slot) ?? byName(standIns, slot));
}
