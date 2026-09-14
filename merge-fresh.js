#!/usr/bin/env node
/**
 * Append the rows of barbers-fresh.json to barber-template/src/data/barbers.json.
 *
 *   node merge-fresh.js            merge and report
 *   node merge-fresh.js --dry-run  report only, write nothing
 *
 * The existing entries are kept byte-identical: the file's text is cut before
 * its closing bracket and the new rows are spliced in after it, in the same
 * two-space format. A fresh row is skipped when its normalised phone number
 * is already in the file. A fresh slug that is already taken gets -2 (then
 * -3, ...) appended. Nothing else is touched.
 */
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const ROOT = __dirname;
const TARGET = resolve(ROOT, 'barber-template', 'src', 'data', 'barbers.json');
const FRESH = resolve(ROOT, 'barbers-fresh.json');
const dryRun = process.argv.includes('--dry-run');

function normalisePhone(raw) {
  if (raw == null) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('0044')) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith('44') && digits.length >= 12) digits = `0${digits.slice(2)}`;
  return digits.length >= 10 ? digits : null;
}

const originalText = readFileSync(TARGET, 'utf8');
const original = JSON.parse(originalText);
const fresh = JSON.parse(readFileSync(FRESH, 'utf8'));
if (!Array.isArray(original) || !Array.isArray(fresh)) throw new Error('both files must be JSON arrays');

const closing = originalText.lastIndexOf(']');
if (closing < 0 || originalText.slice(closing + 1).trim() !== '') throw new Error(`${TARGET} does not end with a JSON array bracket`);
const head = originalText.slice(0, closing).replace(/\s+$/, '');

const phones = new Set();
const slugs = new Set();
for (const row of original) {
  const p = normalisePhone(row.phone);
  if (p) phones.add(p);
  slugs.add(row.slug);
}
const originalSlugs = new Set(slugs);

const added = [];
const skipped = { 'phone already present': 0, 'no phone': 0 };
const renamed = [];
for (const row of fresh) {
  const p = normalisePhone(row.phone);
  if (!p) {
    skipped['no phone']++;
    continue;
  }
  if (phones.has(p)) {
    skipped['phone already present']++;
    continue;
  }
  let slug = row.slug;
  for (let n = 2; slugs.has(slug); n++) slug = `${row.slug}-${n}`;
  if (slug !== row.slug) renamed.push(`${row.slug} -> ${slug}`);
  phones.add(p);
  slugs.add(slug);
  added.push({ ...row, slug });
}

const body = added.map((row) => JSON.stringify(row, null, 2).replace(/^/gm, '  ')).join(',\n');
const merged = added.length ? `${head},\n${body}\n]\n` : originalText;

// Prove the result before writing it: parses, starts with the original bytes, keeps every original slug.
const parsed = JSON.parse(merged);
if (!merged.startsWith(head)) throw new Error('merged text does not start with the original text');
if (parsed.length !== original.length + added.length) throw new Error('row count mismatch');
for (let i = 0; i < original.length; i++) if (JSON.stringify(parsed[i]) !== JSON.stringify(original[i])) throw new Error(`original row ${i} changed`);
const missing = [...originalSlugs].filter((s) => !parsed.some((r) => r.slug === s));
if (missing.length) throw new Error(`original slugs missing: ${missing.join(', ')}`);
const allSlugs = parsed.map((r) => r.slug);
const dupes = allSlugs.filter((s, i) => allSlugs.indexOf(s) !== i);
if (dupes.length) throw new Error(`duplicate slugs: ${[...new Set(dupes)].join(', ')}`);

if (!dryRun) writeFileSync(TARGET, merged);

console.log(`${dryRun ? 'Dry run, nothing written.' : `Wrote ${TARGET}.`}`);
console.log(`Original rows: ${original.length} (unchanged, byte-identical)`);
console.log(`Fresh rows: ${fresh.length}, added ${added.length}, skipped ${Object.entries(skipped).map(([k, v]) => `${v} (${k})`).join(', ')}`);
console.log(`Slug collisions renamed: ${renamed.length}${renamed.length ? `\n  ${renamed.join('\n  ')}` : ''}`);
console.log(`Final count: ${parsed.length}`);
console.log(`All ${originalSlugs.size} original slugs present: ${missing.length === 0 ? 'yes' : 'NO'}`);
