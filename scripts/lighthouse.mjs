// npm run lighthouse -- <url>   → mobile Lighthouse run, JSON + HTML in reports/, scores printed.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromePath } from './_chrome.mjs';

const url = process.argv[2];
if (!url) { console.error('Usage: npm run lighthouse -- <url>'); process.exit(1); }
mkdirSync('reports', { recursive: true });
const out = 'reports/lighthouse-mobile';
const r = spawnSync(
  'npx',
  ['lighthouse', url, '--output=json', '--output=html', `--output-path=${out}`, '--only-categories=performance,accessibility,best-practices,seo', '--form-factor=mobile', '--screenEmulation.mobile', '--quiet', '--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage'],
  { stdio: 'inherit', env: { ...process.env, CHROME_PATH: chromePath() } },
);
if (r.status !== 0) process.exit(r.status ?? 1);
const json = JSON.parse(readFileSync(`${out}.report.json`, 'utf8'));
const scores = Object.fromEntries(Object.entries(json.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
console.log('\nLighthouse (mobile):', scores);
const failing = Object.entries(scores).filter(([, s]) => s < 90);
if (failing.length) {
  console.log('\nBelow 90 →', failing.map(([k]) => k).join(', '));
  for (const [k] of failing) {
    const cat = json.categories[k];
    const audits = cat.auditRefs.map((a) => json.audits[a.id]).filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative');
    console.log(`\n[${k}]`);
    for (const a of audits) console.log(` - ${a.id}: ${a.title} (${a.displayValue ?? ''})`);
  }
  process.exit(2);
}
