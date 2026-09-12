/**
 * Runs as `prebuild`. The build stops here when:
 *   - src/config/site.ts fails its schema,
 *   - an image the config references is missing any width or format in public/img,
 *   - any file in public/img is over its slot's byte budget,
 *   - src/config/credits.json is missing.
 *
 *   npm run check
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { FORMATS, derivedFile, derivedSlots, getSlot, outputFile, searchedSlots, slotIds, slots } from '../src/config/images.ts';
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

// 5. Credits, needed by the /credits page.
if (!existsSync(resolve(args.credits))) problems.push(`${resolve(args.credits)} is missing. Run npm run images:grade`);

for (const w of warnings) console.warn(`warning: ${w}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`Images OK: ${referenced.size} slot(s) referenced, every variant present and under budget.`);
