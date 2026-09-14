#!/usr/bin/env node
/**
 * Drop from barbers-fresh.csv every row whose Demo slug is listed in
 * removed-photoless.txt (one slug per line, as remove-photoless.js writes it).
 *
 *   node filter-csv.js
 *
 * Writes barbers-fresh-clean.csv. Kept rows are copied as they are, byte for
 * byte, header included. Reports rows before and after.
 */
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const ROOT = __dirname;
const INPUT = resolve(ROOT, 'barbers-fresh.csv');
const REMOVED_LIST = resolve(ROOT, 'removed-photoless.txt');
const OUTPUT = resolve(ROOT, 'barbers-fresh-clean.csv');

/** Split CSV text into physical records (raw text) and their cells, honouring quoted fields. */
function records(text) {
  const out = [];
  let start = 0;
  let quoted = false;
  let cells = [];
  let cell = '';
  const push = (end, terminator) => {
    cells.push(cell);
    out.push({ raw: text.slice(start, end), cells, terminator });
    cells = [];
    cell = '';
  };
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
      cells.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      const end = i;
      if (c === '\r' && text[i + 1] === '\n') i++;
      push(end, text.slice(end, i + 1));
      start = i + 1;
    } else cell += c;
  }
  if (start < text.length) push(text.length, '');
  return out;
}

const removed = new Set(
  readFileSync(REMOVED_LIST, 'utf8')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean),
);

const text = readFileSync(INPUT, 'utf8');
const [header, ...rows] = records(text);
if (!header) throw new Error(`${INPUT} is empty`);
const demo = header.cells.findIndex((h) => h.trim().toLowerCase() === 'demo');
if (demo < 0) throw new Error(`${INPUT} has no Demo column`);

const slugOf = (row) => (row.cells[demo] ?? '').trim().split('/').pop();
const dataRows = rows.filter((r) => r.raw.trim() !== '');
const kept = dataRows.filter((r) => !removed.has(slugOf(r)));
const dropped = dataRows.length - kept.length;

const newline = header.terminator || '\n';
writeFileSync(OUTPUT, [header, ...kept].map((r) => r.raw).join(newline) + newline);

console.log(`Slugs to remove: ${removed.size}`);
console.log(`Rows before: ${dataRows.length}`);
console.log(`Rows removed: ${dropped}`);
console.log(`Rows after: ${kept.length}`);
console.log(`Wrote ${OUTPUT}`);
