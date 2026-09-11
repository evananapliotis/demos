// node scripts/lighthouse.mjs [url]   → Lighthouse mobile run against dist/ (or a URL); JSON + HTML in reports/.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromePath } from './_chrome.mjs';
import { serveDist } from './serve.mjs';

const arg = process.argv[2];
mkdirSync('reports', { recursive: true });
const local = arg ? null : await serveDist();
const url = arg || local.url;
const out = 'reports/lighthouse-mobile';
// Spawned asynchronously so the in-process static server keeps answering while Lighthouse runs.
const code = await new Promise((resolve) => {
  const child = spawn(
    'node',
    ['node_modules/lighthouse/cli/index.js', url, '--output=json', '--output=html', `--output-path=${out}`, '--only-categories=performance,accessibility,best-practices,seo', '--form-factor=mobile', '--screenEmulation.mobile', '--quiet', '--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --proxy-server=direct:// --proxy-bypass-list=*'],
    { stdio: 'inherit', env: { ...process.env, CHROME_PATH: chromePath() } },
  );
  child.on('exit', (c) => resolve(c ?? 1));
});
local?.server.close();
if (code !== 0) process.exit(code);
const json = JSON.parse(readFileSync(`${out}.report.json`, 'utf8'));
const scores = Object.fromEntries(Object.entries(json.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
console.log('\nLighthouse (mobile):', scores);
const m = json.audits;
console.log(`LCP ${m['largest-contentful-paint']?.displayValue}  CLS ${m['cumulative-layout-shift']?.displayValue}  TBT ${m['total-blocking-time']?.displayValue}  FCP ${m['first-contentful-paint']?.displayValue}  SI ${m['speed-index']?.displayValue}`);
const failing = Object.entries(scores).filter(([, s]) => s < 90);
for (const [k] of Object.keys(scores).map((k) => [k])) {
  const low = json.categories[k].auditRefs.map((x) => json.audits[x.id]).filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode === 'binary');
  if (low.length) console.log(`[${k}] failed audits: ${low.map((a) => a.id).join(', ')}`);
}
if (failing.length) process.exit(2);
