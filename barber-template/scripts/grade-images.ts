/**
 * Grade every picked photo and write the site's images.
 *
 *   npm run images:grade                    every picked slot
 *   npm run images:grade -- --slot hero     only these slots (credits are still rebuilt for all)
 *   npm run images:grade -- --force         regrade even when nothing changed
 *
 * Reads image-picks.json. For each pick it fetches the full-resolution
 * original once (cached in .candidates/<slot>/original-<id>.jpg, fetched by
 * id if the candidates folder is gone), runs scripts/lib/grade.ts at every
 * width in the manifest, and encodes AVIF + WebP under the slot's budget.
 *
 * Writes:
 *   public/img/<slot>-<width>.avif|webp     committed
 *   public/img/og.jpg                       committed
 *   src/config/credits.json                 committed, photo provenance, not rendered
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  FORMATS,
  derivedFile,
  derivedSlots,
  getSearchedSlot,
  outputFile,
  outputHeight,
  searchedSlots,
  type DerivedSlot,
  type SearchedSlot,
} from '../src/config/images.ts';
import { encodeUnderBudget } from './lib/budget.ts';
import { readSlotCredits } from './lib/candidates.ts';
import { requireEnv } from './lib/env.ts';
import { LOOK, grade } from './lib/grade.ts';
import { CREDITS_FILE, PICKS_FILE, PUBLIC_IMG_DIR, STAMPS_FILE, kb, slotDir } from './lib/paths.ts';
import { LICENCE, PexelsClient, download, toCredit, type Credit } from './lib/pexels.ts';
import { readPicks, resolvePick, type Picks, type ResolvedPick } from './lib/picks.ts';

const { values: args } = parseArgs({
  options: {
    slot: { type: 'string' },
    force: { type: 'boolean', default: false },
    picks: { type: 'string', default: PICKS_FILE },
    out: { type: 'string', default: PUBLIC_IMG_DIR },
    credits: { type: 'string', default: CREDITS_FILE },
  },
});

const outDir = resolve(args.out);
const picks = readPicks(resolve(args.picks));
const targets: SearchedSlot[] = args.slot ? args.slot.split(',').map((id) => getSearchedSlot(id.trim())) : [...searchedSlots];

/** The API is only contacted when a photo's metadata or original is not cached. */
let client: PexelsClient | null = null;
function api(): PexelsClient {
  client ??= new PexelsClient(requireEnv('PEXELS_API_KEY'));
  return client;
}

async function loadCredit(pick: ResolvedPick): Promise<Credit> {
  const metaFile = join(slotDir(pick.sourceSlot), `original-${pick.id}.json`);
  if (existsSync(metaFile)) return JSON.parse(readFileSync(metaFile, 'utf8')) as Credit;

  const candidate = readSlotCredits(pick.sourceSlot)?.candidates.find((c) => c.id === pick.id);
  let credit: Credit;
  if (candidate) {
    const { rank: _r, page: _p, file: _f, ...rest } = candidate;
    credit = rest;
  } else {
    credit = toCredit(await api().photo(pick.id));
  }
  mkdirSync(slotDir(pick.sourceSlot), { recursive: true });
  writeFileSync(metaFile, JSON.stringify(credit, null, 2) + '\n');
  return credit;
}

async function ensureOriginal(pick: ResolvedPick, credit: Credit): Promise<string> {
  const file = join(slotDir(pick.sourceSlot), `original-${pick.id}.jpg`);
  if (!existsSync(file)) {
    console.log(`  downloading original ${pick.id} (${credit.width}x${credit.height}) by ${credit.photographer}`);
    const bytes = await download(credit.original, file);
    console.log(`  ${kb(bytes)}`);
  }
  return file;
}

type Stamps = Record<string, string>;
function readStamps(): Stamps {
  return existsSync(STAMPS_FILE) ? (JSON.parse(readFileSync(STAMPS_FILE, 'utf8')) as Stamps) : {};
}
function stampFor(slot: SearchedSlot | DerivedSlot, pick: ResolvedPick): string {
  return createHash('sha1').update(JSON.stringify({ slot, pick, LOOK })).digest('hex').slice(0, 12);
}

const outputsFor = (slot: SearchedSlot | DerivedSlot): string[] =>
  slot.kind === 'searched' ? slot.widths.flatMap((w) => FORMATS.map((f) => outputFile(slot.id, w, f))) : [derivedFile(slot)];

let largest = { name: '', bytes: 0 };
function track(name: string, bytes: number): void {
  if (bytes > largest.bytes) largest = { name, bytes };
}

async function gradeSearched(slot: SearchedSlot, pick: ResolvedPick, source: string): Promise<void> {
  for (const width of slot.widths) {
    const height = outputHeight(slot, width);
    const frame = await grade(source, { width, height, focal: pick.focal }, { graded: pick.graded });
    const parts: string[] = [];
    for (const format of FORMATS) {
      const name = outputFile(slot.id, width, format);
      const enc = await encodeUnderBudget(frame, format, slot.budgetKB * 1024, name);
      writeFileSync(join(outDir, name), enc.buffer);
      track(name, enc.bytes);
      parts.push(`${format} ${kb(enc.bytes)} q${enc.quality}`);
    }
    console.log(`  ${width}x${height}${pick.graded ? '' : ' (ungraded)'}  ${parts.join('   ')}`);
  }
}

async function gradeDerived(slot: DerivedSlot, pick: ResolvedPick, source: string): Promise<void> {
  const frame = await grade(source, { width: slot.width, height: slot.height, focal: pick.focal });
  const name = derivedFile(slot);
  const enc = await encodeUnderBudget(frame, 'jpeg', slot.budgetKB * 1024, name);
  writeFileSync(join(outDir, name), enc.buffer);
  track(name, enc.bytes);
  console.log(`  ${slot.width}x${slot.height}  jpeg ${kb(enc.bytes)} q${enc.quality}`);
}

function writeCredits(all: Picks, creditsBySlot: Map<string, Credit>): void {
  const photos = new Map<number, { id: number; photographer: string; photographerUrl: string; photoUrl: string; slots: string[] }>();
  const add = (slotId: string, credit: Credit) => {
    const entry = photos.get(credit.id) ?? {
      id: credit.id,
      photographer: credit.photographer,
      photographerUrl: credit.photographerUrl,
      photoUrl: credit.photoUrl,
      slots: [],
    };
    entry.slots.push(slotId);
    photos.set(credit.id, entry);
  };
  for (const slot of searchedSlots) {
    const credit = creditsBySlot.get(slot.id);
    if (credit) add(slot.id, credit);
  }
  for (const slot of derivedSlots) {
    const credit = creditsBySlot.get(slot.from);
    if (credit && resolvePick(all, slot.from)) add(slot.id, credit);
  }
  const file = resolve(args.credits);
  mkdirSync(resolve(file, '..'), { recursive: true });
  writeFileSync(file, JSON.stringify({ generatedAt: new Date().toISOString(), licence: LICENCE, photos: [...photos.values()] }, null, 2) + '\n');
  console.log(`\nCredits for ${photos.size} photo(s) written to ${file}`);
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const stamps = readStamps();
  const creditsBySlot = new Map<string, Credit>();
  const unpicked: string[] = [];
  const failed: string[] = [];
  let graded = 0;
  let unchanged = 0;

  // Metadata for every pick, whether or not it is being graded this run, so credits.json is complete.
  for (const slot of searchedSlots) {
    try {
      const pick = resolvePick(picks, slot.id);
      if (!pick) {
        unpicked.push(slot.id);
        continue;
      }
      creditsBySlot.set(slot.id, await loadCredit(pick));
    } catch (err) {
      failed.push(slot.id);
      console.error(`${slot.id}: ${(err as Error).message}`);
    }
  }

  const work: Array<SearchedSlot | DerivedSlot> = [...targets, ...derivedSlots.filter((d) => !args.slot || targets.some((t) => t.id === d.from))];
  for (const slot of work) {
    const sourceSlotId = slot.kind === 'searched' ? slot.id : slot.from;
    if (unpicked.includes(sourceSlotId) || failed.includes(sourceSlotId)) continue;
    const pick = resolvePick(picks, sourceSlotId)!;
    const stamp = stampFor(slot, pick);
    if (!args.force && stamps[slot.id] === stamp && outputsFor(slot).every((f) => existsSync(join(outDir, f)))) {
      unchanged++;
      continue;
    }
    console.log(`\n${slot.id}${slot.kind === 'derived' ? ` (from ${slot.from})` : ''}`);
    try {
      const credit = creditsBySlot.get(sourceSlotId)!;
      const source = await ensureOriginal(pick, credit);
      if (slot.kind === 'searched') await gradeSearched(slot, pick, source);
      else await gradeDerived(slot, pick, source);
      stamps[slot.id] = stamp;
      graded++;
    } catch (err) {
      failed.push(slot.id);
      delete stamps[slot.id];
      console.error(`  FAILED: ${(err as Error).message}`);
    }
  }

  mkdirSync(resolve(STAMPS_FILE, '..'), { recursive: true });
  writeFileSync(STAMPS_FILE, JSON.stringify(stamps, null, 2) + '\n');
  writeCredits(picks, creditsBySlot);

  console.log(`\n${graded} slot(s) graded, ${unchanged} unchanged, ${unpicked.length} not picked, ${failed.length} failed.`);
  if (largest.bytes) console.log(`Largest file this run: ${largest.name} at ${kb(largest.bytes)}.`);
  if (unpicked.length) console.log(`Not picked: ${unpicked.join(', ')}`);
  if (failed.length) {
    console.error(`Failed: ${failed.join(', ')}`);
    process.exitCode = 1;
  }
}

await main();
