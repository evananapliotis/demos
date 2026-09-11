#!/usr/bin/env node
// Downloads the shot list in scripts/slots.mjs from Unsplash (Pexels as fallback) into
// src/images/<slot>.jpg, verifies each file is a real JPEG with a long edge of at least
// 1600px, then writes src/images/sources.json and CREDITS.md.
//
//   pnpm images                 # fill every missing slot
//   pnpm images -- hero healed  # only these slots
//   pnpm images -- --force      # re-download everything
//
// Uses curl for every request so the system proxy and CA bundle are honoured. No API key:
// the Unsplash site's own search endpoint is used. Set UNSPLASH_BASE / PEXELS_BASE to point
// at a mock server for testing.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SLOTS, IMAGES_DIR, CREDITS_PATH } from './slots.mjs';

const UNSPLASH = (process.env.UNSPLASH_BASE || 'https://unsplash.com').replace(/\/$/, '');
const PEXELS = (process.env.PEXELS_BASE || 'https://www.pexels.com').replace(/\/$/, '');
const PEXELS_IMG = (process.env.PEXELS_IMG_BASE || 'https://images.pexels.com').replace(/\/$/, '');
const MIN_EDGE = 1600;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));
const outDir = fileURLToPath(IMAGES_DIR);
mkdirSync(outDir, { recursive: true });
const sourcesPath = `${outDir}sources.json`;
const sources = existsSync(sourcesPath) ? JSON.parse(readFileSync(sourcesPath, 'utf8')) : [];
const usedIds = new Set(sources.map((s) => `${s.source}:${s.id}`));

function curl(url, extra = []) {
  return execFileSync('curl', ['-sS', '-L', '--fail', '--max-time', '90', '-A', UA, ...extra, url], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
}
function getJson(url) { return JSON.parse(curl(url, ['-H', 'Accept: application/json']).toString('utf8')); }
function getText(url) { return curl(url).toString('utf8'); }
function download(url, file) { execFileSync('curl', ['-sS', '-L', '--fail', '--max-time', '180', '-A', UA, '-o', file, url], { stdio: 'inherit' }); }

async function verify(file) {
  try {
    const m = await sharp(file).metadata();
    const ok = m.format === 'jpeg' && Math.max(m.width, m.height) >= MIN_EDGE;
    return ok ? { width: m.width, height: m.height } : null;
  } catch { return null; }
}

function score(def, text) {
  const t = text.toLowerCase();
  let s = 0;
  for (const k of def.keywords) if (t.includes(k)) s += 3;
  for (const k of def.avoid) if (t.includes(k)) s -= 6;
  if (!t.includes('tattoo') && !t.includes('ink')) s -= 4;
  return s;
}

async function fromUnsplash(def, file) {
  for (const q of def.queries) {
    let data;
    try {
      data = getJson(`${UNSPLASH}/napi/search/photos?query=${encodeURIComponent(q)}&per_page=30&orientation=${def.orientation}`);
    } catch (e) {
      console.log(`    unsplash search failed for "${q}": ${e.message.split('\n')[0]}`);
      continue;
    }
    const candidates = (data.results || [])
      .filter((r) => !r.premium && !r.plus && r.urls?.raw && !usedIds.has(`Unsplash:${r.id}`))
      .filter((r) => Math.max(r.width || 0, r.height || 0) >= MIN_EDGE)
      .map((r) => ({ r, s: score(def, `${r.description || ''} ${r.alt_description || ''} ${(r.tags || []).map((t) => t.title).join(' ')}`) + Math.min(2, Math.floor((r.width || 0) / 2000)) }))
      .filter((c) => c.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5);
    for (const { r, s } of candidates) {
      const url = `${r.urls.raw}${r.urls.raw.includes('?') ? '&' : '?'}w=2400&q=88&fm=jpg&fit=max`;
      try {
        download(url, file);
      } catch (e) {
        console.log(`    download failed (${r.id}): ${e.message.split('\n')[0]}`);
        continue;
      }
      const dims = await verify(file);
      if (!dims) { console.log(`    rejected ${r.id}: not a JPEG ≥ ${MIN_EDGE}px`); try { unlinkSync(file); } catch {} continue; }
      usedIds.add(`Unsplash:${r.id}`);
      return {
        source: 'Unsplash', id: r.id, page_url: r.links?.html || `https://unsplash.com/photos/${r.id}`,
        photographer: r.user?.name || 'Unknown', photographer_url: r.user?.links?.html || (r.user?.username ? `https://unsplash.com/@${r.user.username}` : ''),
        alt: r.alt_description || r.description || '', width: dims.width, height: dims.height, license: 'Unsplash License', query: q, score: s,
      };
    }
  }
  return null;
}

async function fromPexels(def, file) {
  for (const q of def.queries) {
    let html;
    try { html = getText(`${PEXELS}/search/${encodeURIComponent(q)}/`); } catch (e) { console.log(`    pexels search failed for "${q}": ${e.message.split('\n')[0]}`); continue; }
    const ids = [...new Set([...html.matchAll(/images\.pexels\.com\/photos\/(\d+)\//g)].map((m) => m[1]))].filter((id) => !usedIds.has(`Pexels:${id}`)).slice(0, 6);
    for (const id of ids) {
      const url = `${PEXELS_IMG}/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=2400`;
      try { download(url, file); } catch (e) { console.log(`    download failed (${id}): ${e.message.split('\n')[0]}`); continue; }
      const dims = await verify(file);
      if (!dims) { try { unlinkSync(file); } catch {} continue; }
      let photographer = 'See photo page', alt = '';
      try {
        const page = getText(`${PEXELS}/photo/${id}/`);
        photographer = page.match(/"name":"([^"]{2,80})"/)?.[1] || page.match(/Photo by ([^<·]+?) on Pexels/i)?.[1]?.trim() || photographer;
        alt = page.match(/<title>([^<]+)<\/title>/)?.[1]?.replace(/\s*·.*$/, '').trim() || '';
      } catch {}
      usedIds.add(`Pexels:${id}`);
      return { source: 'Pexels', id, page_url: `https://www.pexels.com/photo/${id}/`, photographer, photographer_url: '', alt, width: dims.width, height: dims.height, license: 'Pexels License', query: q, score: 0 };
    }
  }
  return null;
}

function writeCredits(list) {
  const rows = list
    .slice()
    .sort((a, b) => a.slot.localeCompare(b.slot))
    .map((s) => `| \`${s.slot}\` | [${s.photographer}](${s.photographer_url || s.page_url}) | [${s.source} · ${s.id}](${s.page_url}) | ${s.width}×${s.height} | ${s.license} |`)
    .join('\n');
  const md = `# Image credits

Every photograph on the Ninefold Tattoo sample site is royalty-free stock, downloaded by
\`scripts/fetch-images.mjs\` and used under the licence named in each row. Ninefold Tattoo is a
fictional studio; the artists named in the captions did not make the tattoos in these photographs.

| Slot | Photographer | Source | Original size | Licence |
| :-- | :-- | :-- | :-- | :-- |
${rows}

The fresh/healed comparison (\`pair-fresh\`, \`pair-healed\`) is derived from the \`healed\` photograph by
\`scripts/prepare-images.mjs\`: the same image graded twice, so the slider shows one piece rather than two.

Typefaces: [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) and
[Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans), SIL Open Font License, self-hosted.
`;
  writeFileSync(fileURLToPath(CREDITS_PATH), md);
}

const todo = SLOTS.filter((d) => !only.length || only.includes(d.slot));
let done = 0, failed = [];
for (const def of todo) {
  const file = `${outDir}${def.slot}.jpg`;
  const have = existsSync(file) && (await verify(file));
  if (have && !force && sources.some((s) => s.slot === def.slot)) { console.log(`✓ ${def.slot} (already present)`); done++; continue; }
  console.log(`→ ${def.slot}`);
  let hit = await fromUnsplash(def, file);
  if (!hit) hit = await fromPexels(def, file);
  if (!hit) { failed.push(def.slot); console.log(`  ✗ nothing usable found for ${def.slot}`); continue; }
  const entry = { slot: def.slot, file: `src/images/${def.slot}.jpg`, ...hit };
  const i = sources.findIndex((s) => s.slot === def.slot);
  if (i >= 0) sources[i] = entry; else sources.push(entry);
  writeFileSync(sourcesPath, JSON.stringify(sources, null, 2) + '\n');
  console.log(`  ✓ ${hit.source} ${hit.id} by ${hit.photographer} (${hit.width}×${hit.height}, ${(statSync(file).size / 1024).toFixed(0)} KB)`);
  done++;
}
writeCredits(sources);
console.log(`\n${done}/${todo.length} slots filled${failed.length ? `; missing: ${failed.join(', ')}` : ''}. Credits written to CREDITS.md.`);
if (failed.length) process.exit(2);
