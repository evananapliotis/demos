/**
 * Runs as `prebuild`. The build stops here when:
 *   - src/config/site.ts fails its schema,
 *   - an image the config references is missing any width or format in public/img,
 *   - any file in public/img is over its slot's byte budget,
 *   - src/config/credits.json is missing,
 *   - a listing has no palette, or a palette is below WCAG AA.
 *
 *   npm run check
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { FORMATS, derivedFile, derivedSlots, getSlot, outputFile, searchedSlots, slotIds, slots } from '../src/config/images.ts';
import rawPalettes from '../src/data/palettes.json' with { type: 'json' };
import { auditPalettes, flaggedSlugs } from '../src/lib/shop-palette.ts';

const paletteFile = rawPalettes as unknown as { shops: Record<string, unknown> };
import { CREDITS_FILE, PUBLIC_IMG_DIR, kb } from './lib/paths.ts';

const { values: args } = parseArgs({
  options: {
    dir: { type: 'string', default: PUBLIC_IMG_DIR },
    credits: { type: 'string', default: CREDITS_FILE },
  },
});
const dir = resolve(args.dir);

const problems: string[] = [];
const warnings: string[] = [];

// 1. Config. Importing it runs the schema.
const { site } = await import('../src/config/site.ts');
console.log(`Config OK: ${site.business.name}`);

// 2. Every slot the config references.
const referenced = new Set<string>();
(function walk(value: unknown): void {
  if (Array.isArray(value)) return value.forEach(walk);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.slot === 'string' && typeof obj.alt === 'string') referenced.add(obj.slot);
    Object.values(obj).forEach(walk);
  }
})(site);
referenced.add(site.seo.ogImage);

const budgetFor = (slotId: string) => getSlot(slotId).budgetKB * 1024;
const checked = new Set<string>();

function checkFile(name: string, slotId: string): void {
  checked.add(name);
  const file = join(dir, name);
  if (!existsSync(file)) {
    problems.push(`missing ${name} (slot "${slotId}"). Pick it in image-picks.json and run npm run images:grade`);
    return;
  }
  const size = statSync(file).size;
  if (size > budgetFor(slotId)) problems.push(`${name} is ${kb(size)}, over the ${getSlot(slotId).budgetKB}KB budget for "${slotId}"`);
}

for (const slotId of referenced) {
  const slot = getSlot(slotId);
  if (slot.kind === 'searched') {
    for (const width of slot.widths) for (const format of FORMATS) checkFile(outputFile(slot.id, width, format), slot.id);
  } else {
    checkFile(derivedFile(slot), slot.id);
  }
}

// 3. Everything else in the directory, so a hand-dropped file cannot blow the budget.
const known = new Set([
  ...searchedSlots.flatMap((s) => s.widths.flatMap((w) => FORMATS.map((f) => outputFile(s.id, w, f)))),
  ...derivedSlots.map(derivedFile),
]);
if (existsSync(dir)) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || checked.has(name)) continue;
    const match = /^(.+?)-(\d+)\.(avif|webp)$/.exec(name) ?? /^(.+?)\.jpg$/.exec(name);
    const slotId = match?.[1];
    if (!known.has(name) || !slotId || !slotIds.includes(slotId)) {
      warnings.push(`unexpected file in public/img: ${name}`);
      continue;
    }
    const size = statSync(join(dir, name)).size;
    if (size > budgetFor(slotId)) problems.push(`${name} is ${kb(size)}, over the ${getSlot(slotId).budgetKB}KB budget`);
  }
}

// 4. Manifest slots nothing references. Informational.
for (const slot of slots) if (!referenced.has(slot.id)) warnings.push(`slot "${slot.id}" is in the manifest but not used by site.ts`);

// 5. Credits, the record of where every photo came from. Not rendered.
if (!existsSync(resolve(args.credits))) problems.push(`${resolve(args.credits)} is missing. Run npm run images:grade`);

// 6. The per-shop palettes. Every listing needs one, and every one has to clear
//    WCAG AA on every pair the stylesheet puts together, because these colours
//    are derived from photographs rather than chosen by hand. A palette that
//    fell back to its ground's own accent is reported but does not fail the
//    build: the page is correct, the photo just had nothing usable in it.
{
  const shops: { slug: string }[] = JSON.parse(readFileSync(resolve('src/data/barbers.json'), 'utf8'));
  const missing = shops.filter((s) => !paletteFile.shops[s.slug]).map((s) => s.slug);
  if (missing.length) problems.push(`${missing.length} listing(s) have no palette (${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}). Run npm run palettes`);
  const failures = auditPalettes();
  if (failures.length) {
    problems.push(`${failures.length} palette pair(s) are below WCAG AA and must not ship:`);
    for (const f of failures.slice(0, 8)) problems.push(`    ${f.slug}: ${f.pair} is ${f.ratio.toFixed(2)}:1, needs ${f.needs}`);
  }
  if (flaggedSlugs.length) {
    warnings.push(`${flaggedSlugs.length} shop(s) took their ground's own accent because their photo had no usable colour: ${flaggedSlugs.slice(0, 6).join(', ')}${flaggedSlugs.length > 6 ? `, +${flaggedSlugs.length - 6} more` : ''} (all listed in src/data/palettes.json "flagged")`);
  }
}

for (const w of warnings) console.warn(`warning: ${w}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`Images OK: ${referenced.size} slot(s) referenced, every variant present and under budget.`);
