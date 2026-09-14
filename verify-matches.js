#!/usr/bin/env node
/**
 * Compare every entry in barber-template/src/data/barbers.json with the row of
 * the same Demo slug in barbers-fresh-clean.csv and flag address mismatches.
 *
 *   node verify-matches.js
 *
 * Read-only. For each pair it compares:
 *   town               entry.city against the last comma-separated part of
 *                      the CSV Address (the CSV holds Google's short address,
 *                      "26 New St, Worcester"), case- and punctuation-insensitive
 *   postcode district  the outward code of entry.postcode ("WR1" of "WR1 2DP")
 *                      against the one in the CSV Address, when the CSV has a
 *                      postcode at all; the short address usually has none, and
 *                      those pairs are reported as not checkable, not as mismatches
 * Entries with no CSV row (the original 150, which were never in the fresh
 * list) are counted and skipped.
 */
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const ROOT = __dirname;
const JSON_FILE = resolve(ROOT, 'barber-template', 'src', 'data', 'barbers.json');
const CSV_FILE = resolve(ROOT, 'barbers-fresh-clean.csv');

const POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const norm = (s) =>
  String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** "WR1 2DP" -> "WR1"; null when there is no postcode in the text. */
function district(text) {
  const m = POSTCODE.exec(text ?? '');
  return m ? m[1].toUpperCase() : null;
}

/** The town in a short address: the last comma-separated part, minus any postcode. */
function townOf(address) {
  const parts = String(address ?? '')
    .split(',')
    .map((p) => p.replace(POSTCODE, '').trim())
    .filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

const entries = JSON.parse(readFileSync(JSON_FILE, 'utf8'));
const [header, ...rows] = parseCsv(readFileSync(CSV_FILE, 'utf8'));
const col = (name) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
const c = { demo: col('Demo'), address: col('Address'), name: col('Name') };
if (Object.values(c).some((i) => i < 0)) throw new Error(`${CSV_FILE} needs Name, Address and Demo columns`);

const bySlug = new Map();
for (const row of rows) {
  const slug = (row[c.demo] ?? '').trim().split('/').pop();
  if (slug) bySlug.set(slug, { name: row[c.name], address: row[c.address] });
}

let compared = 0;
let noRow = 0;
let districtUnchecked = 0;
const mismatches = [];
for (const e of entries) {
  const csv = bySlug.get(e.slug);
  if (!csv) {
    noRow++;
    continue;
  }
  compared++;
  const problems = [];
  const jsonTown = e.city ?? '';
  const csvTown = townOf(csv.address);
  if (norm(jsonTown) !== norm(csvTown)) problems.push(`town: json "${jsonTown}" vs csv "${csvTown}"`);
  const jsonDistrict = district(e.postcode) ?? district(e.address);
  const csvDistrict = district(csv.address);
  if (!csvDistrict) districtUnchecked++;
  else if (jsonDistrict !== csvDistrict) problems.push(`postcode district: json "${jsonDistrict ?? '-'}" vs csv "${csvDistrict}"`);
  if (problems.length) mismatches.push({ slug: e.slug, jsonAddress: e.address, csvAddress: csv.address, problems });
}

console.log(`Entries in barbers.json: ${entries.length}`);
console.log(`With a matching CSV row: ${compared}; without (skipped): ${noRow}`);
console.log(`Postcode district not checkable (no postcode in CSV address): ${districtUnchecked} of ${compared}`);
console.log(`Mismatches: ${mismatches.length}`);
for (const m of mismatches) {
  console.log(`\n${m.slug}`);
  console.log(`  json: ${m.jsonAddress}`);
  console.log(`  csv:  ${m.csvAddress}`);
  for (const p of m.problems) console.log(`  ${p}`);
}
process.exitCode = mismatches.length ? 1 : 0;
