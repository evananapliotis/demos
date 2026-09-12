// node scripts/sizes.mjs → gzip size of every built asset + the weight of the HTML's own critical path.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const dir = 'dist/_astro';
const rows = readdirSync(dir).map((f) => {
  const buf = readFileSync(join(dir, f));
  return { f, raw: buf.length, gz: gzipSync(buf, { level: 9 }).length };
});
rows.sort((x, y) => y.gz - x.gz);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log('asset'.padEnd(64), 'raw'.padStart(10), 'gzip'.padStart(10));
for (const r of rows) console.log(r.f.padEnd(64), kb(r.raw).padStart(10), kb(r.gz).padStart(10));
const html = readFileSync('dist/index.html');
console.log('\nindex.html'.padEnd(64), kb(html.length).padStart(10), kb(gzipSync(html).length).padStart(10));
const pole = rows.find((r) => /^pole\..*\.js$/.test(r.f));
if (pole) console.log(`\n3D chunk (three.js included): ${kb(pole.gz)} gzipped  ${pole.gz <= 150 * 1024 ? 'OK ≤150KB' : 'OVER 150KB'}`);
