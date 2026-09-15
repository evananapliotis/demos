/**
 * Audit the websites barbers already have, and score how badly they need a new one.
 *
 *   node scripts/audit-sites.js --input <file> [--out <dir>] [--limit n] [--delay ms]
 *
 * `--input` is any JSON array or CSV with columns for name, phone, address and
 * website; the field names are matched loosely, so an export from any of the
 * lists in this repo works without editing. Rows with no website are skipped.
 *
 * Politeness is the point of the design: one request at a time, never
 * concurrent; a 10 second timeout; one retry and no more; and any failure skips
 * that shop rather than stopping the run. Every skip is logged with its reason.
 *
 * Progress is appended to results.ndjson after every single shop, so a crash or
 * a kill loses at most the shop in flight. Re-running resumes: URLs already in
 * results.ndjson are not fetched again.
 *
 * It writes nothing outside --out, fetches nothing but the homepages it is
 * given, and builds no pages.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

/* ---------- arguments ---------- */

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1]?.startsWith('--') || i + 1 >= process.argv.length ? true : process.argv[++i];
}
if (!args.input) {
  console.error('usage: node scripts/audit-sites.js --input <file.json|file.csv> [--out <dir>] [--limit n] [--delay ms]');
  process.exit(2);
}
const INPUT = resolve(process.cwd(), String(args.input));
const OUT = resolve(process.cwd(), String(args.out ?? resolve(ROOT, 'audit')));
const LIMIT = args.limit ? Number(args.limit) : Infinity;
const DELAY = args.delay ? Number(args.delay) : 1000;
const TIMEOUT = 10_000;

mkdirSync(OUT, { recursive: true });
const RESULTS = resolve(OUT, 'results.ndjson');
const SKIPS = resolve(OUT, 'skips.log');

/* ---------- input ---------- */

/** Split one CSV line, honouring quotes and doubled quotes inside them. */
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** Field names vary between the lists in this repo; match them loosely. */
const pick = (row, ...names) => {
  for (const n of names) {
    for (const k of Object.keys(row)) {
      if (k.toLowerCase().replace(/[^a-z]/g, '') === n) {
        const v = row[k];
        if (v != null && String(v).trim()) return String(v).trim();
      }
    }
  }
  return '';
};

function readInput(file) {
  const text = readFileSync(file, 'utf8');
  let rows;
  if (file.endsWith('.csv')) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const header = splitCsvLine(lines[0]);
    rows = lines.slice(1).map((l) => Object.fromEntries(splitCsvLine(l).map((v, i) => [header[i] ?? `col${i}`, v])));
  } else {
    const parsed = JSON.parse(text);
    rows = Array.isArray(parsed) ? parsed : parsed.shops ?? parsed.listings ?? parsed.rows ?? [];
  }
  return rows.map((r) => ({
    name: pick(r, 'name', 'displayname', 'shopname'),
    phone: pick(r, 'phone', 'nationalphonenumber', 'telephone'),
    address: pick(r, 'address', 'shortaddress', 'formattedaddress', 'street'),
    postcode: pick(r, 'postcode', 'postalcode', 'zip'),
    url: pick(r, 'website', 'websiteuri', 'url', 'site'),
    reviews: Number(pick(r, 'reviews', 'userratingcount', 'reviewcount') || 0),
    rating: Number(pick(r, 'rating') || 0),
  }));
}

/* ---------- checks ---------- */

const SOCIAL = ['facebook.com', 'instagram.com', 'linktr.ee'];
const FREE = ['wixsite.com', 'weebly.com', 'business.site', 'godaddysites.com'];

/** UK numbers to a comparable form, so 07424 376509 and +44 7424 376509 match. */
function normalisePhone(raw) {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, '');
  if (d.startsWith('44')) d = `0${d.slice(2)}`;
  if (d.length === 10 && d.startsWith('7')) d = `0${d}`;
  return d.length >= 10 ? d.slice(-10) : null;
}

/** Every plausible UK phone number in the page text. */
function phonesIn(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const found = new Set();
  for (const m of text.matchAll(/(?:\+44\s?|\b0)(?:\d[\d\s().-]{8,13}\d)/g)) {
    const n = normalisePhone(m[0]);
    if (n) found.add(n);
  }
  return [...found];
}

/** The most recent four-digit year that reads as a copyright line. */
function copyrightYear(html) {
  const text = html.replace(/<[^>]+>/g, ' ');
  let latest = null;
  for (const m of text.matchAll(/(?:©|&copy;|copyright)[^0-9]{0,30}((?:19|20)\d{2})(?:\s*[-–]\s*((?:19|20)\d{2}))?/gi)) {
    const y = Number(m[2] ?? m[1]);
    if (!latest || y > latest) latest = y;
  }
  return latest;
}

const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, '').replace(/^m\./, ''); } catch { return null; } };

/** The score, the flags that fired, and the sentence you would say on the phone. */
function assess({ url, status, ms, html, listingPhone }) {
  const found = [];
  const host = hostOf(url) ?? '';
  const add = (flag, points, line) => found.push({ flag, points, line });

  const socialOnly = SOCIAL.some((s) => host === s || host.endsWith(`.${s}`));
  const freeSub = FREE.some((s) => host.endsWith(s));

  if (status !== 200) add('non-200', 3, `your website doesn't load — it returns a ${status || 'connection error'}`);
  else if (ms > 5000) add('slow', 3, `your website takes ${(ms / 1000).toFixed(1)} seconds to open — most people give up before that`);

  if (socialOnly) add('social-only', 3, `your "website" is a ${host.split('.')[0]} page, so you can't be found on Google properly`);
  if (freeSub) add('free-subdomain', 2, `your web address is a free ${host} one rather than your own name`);
  if (!/^https:/i.test(url)) add('not-https', 2, `your site isn't secure — phones show visitors a "not secure" warning`);

  if (html != null) {
    if (!/<meta[^>]+name=["']?viewport["']?/i.test(html)) add('no-viewport', 3, `your site doesn't resize on a phone`);

    const year = copyrightYear(html);
    if (year != null && year <= 2019) add('stale-copyright', 1, `your site still says ${year} at the bottom`);

    const listing = normalisePhone(listingPhone);
    const onPage = phonesIn(html);
    if (listing && onPage.length && !onPage.includes(listing)) {
      add('phone-mismatch', 3, `the number on your site isn't the one on Google`);
    }
  }

  // The sentence you lead with is the worst thing wrong, not whichever check
  // happened to run first.
  const worstFirst = [...found].sort((a, b) => b.points - a.points);
  return {
    score: found.reduce((n, f) => n + f.points, 0),
    flags: found.map((f) => f.flag),
    line: worstFirst[0]?.line ?? 'nothing obviously wrong — worth a look by eye',
    allLines: worstFirst.map((f) => f.line),
  };
}

/* ---------- fetching ---------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One homepage. One retry at most. Never throws: a failure is a skip. */
async function fetchOnce(url) {
  const started = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; site-audit/1.0; one request per site)', accept: 'text/html,*/*' },
    });
    const html = await res.text();
    return { ok: true, status: res.status, ms: Date.now() - started, html, finalUrl: res.url || url };
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - started, error: err?.name === 'AbortError' ? `timeout after ${TIMEOUT / 1000}s` : String(err?.message ?? err) };
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- run ---------- */

const rows = readInput(INPUT);
const withSite = rows.filter((r) => r.url);
const done = new Set();
if (existsSync(RESULTS)) {
  for (const line of readFileSync(RESULTS, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { done.add(JSON.parse(line).url); } catch { /* a half-written line from a kill */ }
  }
}

const skip = (row, reason) => {
  appendFileSync(SKIPS, `${new Date().toISOString()}\t${row.name}\t${row.url}\t${reason}\n`);
  console.log(`  skip  ${row.name} — ${reason}`);
};

console.log(`${rows.length} rows, ${withSite.length} with a website, ${done.size} already done.`);
let n = 0;
for (const row of withSite) {
  if (n >= LIMIT) break;
  if (done.has(row.url)) continue;
  if (!hostOf(row.url)) { skip(row, 'unparseable url'); continue; }
  n++;

  let res = await fetchOnce(row.url);
  if (!res.ok) {
    await sleep(DELAY);
    res = await fetchOnce(row.url); // the one retry
  }
  if (!res.ok) { skip(row, res.error); await sleep(DELAY); continue; }

  const verdict = assess({ url: row.url, status: res.status, ms: res.ms, html: res.html, listingPhone: row.phone });
  appendFileSync(RESULTS, `${JSON.stringify({ ...row, status: res.status, ms: res.ms, ...verdict })}\n`);
  console.log(`  ${String(verdict.score).padStart(2)}  ${row.name} — ${verdict.flags.join(', ') || 'clean'}`);
  await sleep(DELAY);
}

/* ---------- output ---------- */

// If every shop was skipped — or there were none to begin with — there is no
// results file. That is a valid outcome and still gets a summary.
const results = existsSync(RESULTS)
  ? readFileSync(RESULTS, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
  : [];
// Busy shops with bad sites first: a bad site matters more where more people look.
const ranked = results
  .map((r) => ({ ...r, weight: r.score * Math.log(Math.max(r.reviews, 1) + 1) }))
  .sort((a, b) => b.weight - a.weight);

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csv = [
  ['name', 'address', 'postcode', 'phone', 'url', 'reviews', 'score', 'weight', 'flags', 'what to say'].join(','),
  ...ranked.map((r) => [r.name, r.address, r.postcode, r.phone, r.url, r.reviews, r.score, r.weight.toFixed(2), r.flags.join(' '), r.line].map(csvCell).join(',')),
].join('\n');
writeFileSync(resolve(OUT, 'audit.csv'), `${csv}\n`);

const skips = existsSync(SKIPS) ? readFileSync(SKIPS, 'utf8').split('\n').filter((l) => l.trim()) : [];
const skipReasons = {};
for (const line of skips) {
  const reason = line.split('\t')[3] ?? 'unknown';
  const key = reason.replace(/\d+/g, 'N').slice(0, 60);
  skipReasons[key] = (skipReasons[key] ?? 0) + 1;
}
const dist = {};
for (const r of ranked) dist[r.score] = (dist[r.score] ?? 0) + 1;
const flagCounts = {};
for (const r of ranked) for (const f of r.flags) flagCounts[f] = (flagCounts[f] ?? 0) + 1;

const md = [
  '# Site audit',
  '',
  `Input: \`${INPUT}\``,
  `Run: ${new Date().toISOString()}`,
  '',
  '## Coverage',
  '',
  `| | |`,
  `|---|---|`,
  `| Rows in the input | ${rows.length} |`,
  `| With a website | ${withSite.length} |`,
  `| Audited | ${ranked.length} |`,
  `| Skipped | ${skips.length} |`,
  '',
  skips.length ? '### Why they were skipped\n\n| Reason | Count |\n|---|---|\n' + Object.entries(skipReasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`).join('\n') : '_No shops were skipped._',
  '',
  '## Score distribution',
  '',
  '| Score | Shops |',
  '|---|---|',
  ...Object.keys(dist).map(Number).sort((a, b) => b - a).map((s) => `| ${s} | ${dist[s]} |`),
  '',
  '## Which flags fired',
  '',
  '| Flag | Shops |',
  '|---|---|',
  ...Object.entries(flagCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`),
  '',
  '## Top 20',
  '',
  'Ranked by score x ln(reviews): a bad site matters more where more people are looking at it.',
  '',
  '| # | Shop | Reviews | Score | Flags | What to say |',
  '|---|---|---|---|---|---|',
  ...ranked.slice(0, 20).map((r, i) => `| ${i + 1} | ${r.name} | ${r.reviews} | ${r.score} | ${r.flags.join(', ')} | ${r.line} |`),
  '',
].join('\n');
writeFileSync(resolve(OUT, 'SUMMARY.md'), `${md}\n`);

console.log(`\nAudited ${ranked.length}, skipped ${skips.length}. Written to ${OUT}/audit.csv and ${OUT}/SUMMARY.md`);
