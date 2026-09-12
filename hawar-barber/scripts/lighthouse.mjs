// node scripts/lighthouse.mjs <url>  → mobile Lighthouse (simulated 4G, 4x CPU), JSON + HTML in reports/
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromePath } from './_chrome.mjs';

const url = process.argv[2];
if (!url) { console.error('Usage: node scripts/lighthouse.mjs <url> [report-name]'); process.exit(1); }
mkdirSync('reports', { recursive: true });
const out = `reports/${process.argv[3] ?? 'lighthouse-mobile'}`;
const r = spawnSync(
  'npx',
  ['lighthouse', url, '--output=json', '--output=html', `--output-path=${out}`, '--only-categories=performance,accessibility,best-practices,seo', '--form-factor=mobile', '--screenEmulation.mobile', '--throttling-method=simulate', '--quiet', '--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage'],
  { stdio: 'inherit', env: { ...process.env, CHROME_PATH: chromePath() } },
);
if (r.status !== 0) process.exit(r.status ?? 1);
const json = JSON.parse(readFileSync(`${out}.report.json`, 'utf8'));
const scores = Object.fromEntries(Object.entries(json.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
const a = json.audits;
const ms = (id) => `${Math.round(a[id]?.numericValue ?? 0)}ms`;
console.log('\nLighthouse (mobile):', scores);
console.log(`FCP ${ms('first-contentful-paint')} · LCP ${ms('largest-contentful-paint')} · TBT ${ms('total-blocking-time')} · SI ${ms('speed-index')} · TTI ${ms('interactive')} · CLS ${(a['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)}`);
const weight = a['total-byte-weight']?.numericValue;
if (weight) console.log(`Total byte weight (transfer): ${(weight / 1024).toFixed(0)} KB`);
for (const [k, s] of Object.entries(scores)) {
  if (s >= 90) continue;
  const audits = json.categories[k].auditRefs.map((x) => a[x.id]).filter((x) => x.score !== null && x.score < 0.9 && x.scoreDisplayMode !== 'informative');
  console.log(`\n[${k}] below 90:`);
  for (const x of audits) console.log(` - ${x.id}: ${x.title} (${x.displayValue ?? ''})`);
}
