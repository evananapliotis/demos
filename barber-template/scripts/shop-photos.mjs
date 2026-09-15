/**
 * Prepare an owner-supplied photo set: public/shops/<slug>/<slug>-<n>.webp.
 *
 * Owners send whatever their phone or their designer named the files, so the
 * names are normalised here — a space or a bracket in a filename survives into
 * the URL and breaks it. The pictures are desaturated in the same pass, because
 * a page built in black and white wants one set of photographs rather than
 * eleven unrelated ones.
 *
 * Flat desaturation: each photograph keeps its own tonal range, so a bright
 * shopfront still reads brighter than a dim interior. Nothing is normalised and
 * no curve is applied, so what the shop sent is what the page shows, minus the
 * colour.
 *
 *   node scripts/shop-photos.mjs <slug> <file>...
 */
import { mkdirSync, unlinkSync } from 'node:fs';
import { basename } from 'node:path';
import sharp from 'sharp';

const [slug, ...files] = process.argv.slice(2);
if (!slug || !files.length) {
  console.error('usage: node scripts/shop-photos.mjs <slug> <file>...');
  process.exit(1);
}
const dir = `public/shops/${slug}`;
mkdirSync(dir, { recursive: true });

let n = 0;
for (const file of files) {
  const out = `${dir}/${slug.replace(/-and-co$/, '')}-${++n}.webp`;
  const meta = await sharp(file).grayscale().webp({ quality: 90 }).toFile(out);
  console.log(`${basename(file).padEnd(16)} -> ${out.padEnd(44)} ${meta.width}x${meta.height}  ${Math.round(meta.size / 1024)}KB`);
  unlinkSync(file);
}
console.log(`\n${n} file(s) written to ${dir}/`);
