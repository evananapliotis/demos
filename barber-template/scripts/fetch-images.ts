/**
 * Pull candidate photos from Pexels for every slot in the manifest.
 *
 *   npm run images:fetch                       every slot, 5 candidates each
 *   npm run images:fetch -- --slot hero,team-1 only these slots
 *   npm run images:fetch -- --page 2           the next 5 candidates
 *   npm run images:fetch -- --force            re-download files that exist
 *   npm run images:fetch -- --sheet-only       rebuild the contact sheet, no network
 *
 * Output, all gitignored:
 *   .candidates/<slot>/<rank>-<pexelsId>.jpg   about 1880px on the long edge
 *   .candidates/<slot>/credits.json            photographer, source URL, licence
 *   .candidates/contact-sheet.html             every candidate on one page, pick there
 *
 * Nothing is chosen automatically. Record picks in image-picks.json, then run
 * `npm run images:grade`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { getSearchedSlot, searchedSlots, type SearchedSlot } from '../src/config/images.ts';
import { readSlotCredits, writeSlotCredits, type Candidate, type SlotCredits } from './lib/candidates.ts';
import { writeContactSheet } from './lib/contact-sheet.ts';
import { requireEnv } from './lib/env.ts';
import { CANDIDATES_DIR, CONTACT_SHEET, PROJECT_ROOT, kb, slotDir } from './lib/paths.ts';
import { PexelsClient, download, toCredit } from './lib/pexels.ts';

const { values: args } = parseArgs({
  options: {
    slot: { type: 'string' },
    page: { type: 'string', default: '1' },
    'per-page': { type: 'string', default: '5' },
    force: { type: 'boolean', default: false },
    'sheet-only': { type: 'boolean', default: false },
  },
});

const page = Number(args.page);
const perPage = Number(args['per-page']);
if (!Number.isInteger(page) || page < 1) throw new Error('--page must be a positive integer');
if (!Number.isInteger(perPage) || perPage < 1 || perPage > 80) throw new Error('--per-page must be 1-80');

const targets: SearchedSlot[] = args.slot ? args.slot.split(',').map((id) => getSearchedSlot(id.trim())) : [...searchedSlots];

async function fetchSlot(client: PexelsClient, slot: SearchedSlot): Promise<{ downloaded: number; skipped: number }> {
  const result = await client.search({ query: slot.query, orientation: slot.orientation, perPage, page });
  if (result.photos.length === 0) {
    console.warn(`  ${slot.id}: no results for "${slot.query}" (${slot.orientation}). Change the query in src/config/images.ts.`);
    return { downloaded: 0, skipped: 0 };
  }

  const existing: SlotCredits = readSlotCredits(slot.id) ?? {
    slot: slot.id,
    query: slot.query,
    orientation: slot.orientation,
    fetchedAt: new Date().toISOString(),
    candidates: [],
  };
  existing.query = slot.query;
  existing.fetchedAt = new Date().toISOString();

  let downloaded = 0;
  let skipped = 0;
  const jobs = result.photos.map(async (photo, i) => {
    const rank = (page - 1) * perPage + i + 1;
    const file = `${rank}-${photo.id}.jpg`;
    const dest = join(slotDir(slot.id), file);
    const candidate: Candidate = { ...toCredit(photo), rank, page, file };
    existing.candidates = existing.candidates.filter((c) => c.id !== photo.id && c.rank !== rank);
    existing.candidates.push(candidate);
    if (existsSync(dest) && !args.force) {
      skipped++;
      return;
    }
    const bytes = await download(photo.src.large2x, dest);
    downloaded++;
    console.log(`  ${slot.id}/${file}  ${kb(bytes)}  ${photo.width}x${photo.height}  ${photo.photographer}`);
  });
  await Promise.all(jobs);
  writeSlotCredits(existing);
  return { downloaded, skipped };
}

async function main(): Promise<void> {
  if (args['sheet-only']) {
    writeContactSheet();
    console.log(`Contact sheet: ${CONTACT_SHEET}`);
    return;
  }

  const client = new PexelsClient(requireEnv('PEXELS_API_KEY'));
  console.log(`Fetching ${perPage} candidates (page ${page}) for ${targets.length} slot(s) into ${CANDIDATES_DIR}\n`);

  let failures = 0;
  let totalDownloaded = 0;
  for (const slot of targets) {
    console.log(`${slot.id}  "${slot.query}"  ${slot.orientation}`);
    try {
      const { downloaded, skipped } = await fetchSlot(client, slot);
      totalDownloaded += downloaded;
      if (skipped) console.log(`  ${skipped} already on disk (use --force to re-download)`);
    } catch (err) {
      failures++;
      console.error(`  FAILED: ${(err as Error).message}`);
      if ((err as Error).message.includes('rate limit')) break;
    }
  }

  writeContactSheet();

  console.log(`\nDownloaded ${totalDownloaded} file(s). API requests remaining this hour: ${client.remaining ?? 'unknown'}.`);
  console.log(`Open ${CONTACT_SHEET.replace(PROJECT_ROOT + '/', '')} to pick, then fill in image-picks.json and run npm run images:grade.`);
  if (failures) {
    console.error(`\n${failures} slot(s) failed.`);
    process.exitCode = 1;
  }
}

await main();
