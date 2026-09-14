#!/usr/bin/env node
/**
 * Find UK barber shops with no real website that are not already in our lists.
 *
 *   node scrape-fresh.js                    run: ~70 towns, stop at 500 kept rows
 *   node scrape-fresh.js --limit 200        stop sooner
 *   node scrape-fresh.js --towns Wigan,Bury only these towns
 *   node scrape-fresh.js --max-details 3000 hard cap on Place Details calls (default 6000)
 *   node scrape-fresh.js --dry-run          load the existing lists, print the plan, no API calls
 *   node scrape-fresh.js --fresh            ignore .scrape-fresh-progress.json and start over
 *
 * Pipeline, per town:
 *   1. Places API (New) Text Search "barber shop in {town}", field mask
 *      `places.id,nextPageToken` (the ID-only SKU), every page (max 60 places).
 *   2. Place Details per new place id. Field mask: displayName,
 *      nationalPhoneNumber, websiteUri, rating, userRatingCount,
 *      shortFormattedAddress, plus formattedAddress (postcode) and location
 *      (lat/lng), which barbers.json and `npm run photos` need. Those two are
 *      Essentials-tier fields, so they do not change the call's SKU: the call
 *      is billed at the Enterprise tier because of rating/userRatingCount
 *      either way. No photos, no reviews, no opening hours.
 *   3. Keep / drop rules below. Dedupe on normalised phone against every
 *      barbers*.json and barbers*.csv in the repo, and within the run.
 *
 * Outputs (repo root), rewritten after every town so a crash loses nothing:
 *   barbers-fresh.csv             Name, Phone, Address, Rating, Reviews, Tier, Lead Source, Website, Demo, Segment
 *   barbers-fresh.json            same shape as barber-template/src/data/barbers.json
 *   .scrape-fresh-progress.json   towns done, place ids already checked, kept rows;
 *                                 a re-run resumes from it and repeats no paid call
 *
 * Needs GOOGLE_PLACES_KEY in .env (repo root or barber-template/, see
 * barber-template/.env.example) with "Places API (New)" enabled on the key.
 */
const { existsSync, readFileSync, readdirSync, writeFileSync } = require('node:fs');
const { basename, join, relative, resolve } = require('node:path');
const { parseArgs } = require('node:util');

const ROOT = __dirname;
const OUT_CSV = resolve(ROOT, 'barbers-fresh.csv');
const OUT_JSON = resolve(ROOT, 'barbers-fresh.json');
const PROGRESS = resolve(ROOT, '.scrape-fresh-progress.json');
const API = 'https://places.googleapis.com/v1';
const DEMO_HOST = 'mybarbersite.co.uk';

const SEARCH_MASK = 'places.id,nextPageToken';
const DETAILS_MASK = [
  'displayName',
  'nationalPhoneNumber',
  'websiteUri',
  'rating',
  'userRatingCount',
  'shortFormattedAddress',
  'formattedAddress',
  'location',
].join(',');

const RATING_MIN = 3.5;
const RATING_MAX = 4.7;
const REVIEWS_MIN = 20;
const REVIEWS_MAX = 150;
const BOOKING_SITES = ['fresha', 'booksy', 'treatwell', 'nearcut', 'setmore', 'vagaro', 'squareup', 'square.site', 'phorest', 'ovatu', 'timely', 'acuity', 'simplybook'];
/** Substring match, case-insensitive. "pet" is whole-word so Peter's Barbers survives. */
const BAD_NAME = /nail|beauty|salon|unisex|hairdress|\bpets?\b|stylist/i;
const SEGMENTS = [
  { letter: 'B', hosts: ['facebook'], label: 'facebook only' },
  { letter: 'C', hosts: ['instagram'], label: 'instagram only' },
  { letter: 'C', hosts: ['tiktok'], label: 'tiktok only' },
  { letter: 'C', hosts: ['linktr'], label: 'linktree only' },
];

/** Mid-size towns, Midlands and North first. No London, none of the big cities. */
const TOWNS = [
  // West Midlands
  'Coventry', 'Wolverhampton', 'Walsall', 'Dudley', 'West Bromwich', 'Solihull', 'Stoke-on-Trent', 'Stafford', 'Telford', 'Shrewsbury',
  'Worcester', 'Kidderminster', 'Redditch', 'Nuneaton', 'Rugby', 'Tamworth', 'Cannock', 'Hereford', 'Burton upon Trent',
  // East Midlands
  'Leicester', 'Loughborough', 'Nottingham', 'Mansfield', 'Derby', 'Chesterfield', 'Northampton', 'Kettering', 'Corby', 'Lincoln', 'Grantham',
  // North West
  'Bolton', 'Wigan', 'Oldham', 'Rochdale', 'Stockport', 'Bury', 'Warrington', 'St Helens', 'Preston', 'Blackburn',
  'Burnley', 'Blackpool', 'Lancaster', 'Chester', 'Crewe', 'Carlisle',
  // Yorkshire and Humber
  'Huddersfield', 'Halifax', 'Wakefield', 'Barnsley', 'Doncaster', 'Rotherham', 'Bradford', 'York', 'Harrogate', 'Hull', 'Grimsby', 'Scunthorpe',
  // North East
  'Middlesbrough', 'Darlington', 'Sunderland', 'Gateshead', 'Durham', 'Hartlepool',
  // Elsewhere
  'Swindon', 'Gloucester', 'Cheltenham', 'Peterborough', 'Ipswich', 'Norwich', 'Milton Keynes', 'Southend-on-Sea', 'Plymouth', 'Cardiff',
];

/* ---------- args and env ---------- */

const { values: args } = parseArgs({
  options: {
    limit: { type: 'string', default: '500' },
    'max-details': { type: 'string', default: '6000' },
    towns: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    fresh: { type: 'boolean', default: false },
  },
});
const LIMIT = Number(args.limit);
const MAX_DETAILS = Number(args['max-details']);
if (!Number.isInteger(LIMIT) || LIMIT < 1) throw new Error('--limit must be a positive integer');
if (!Number.isInteger(MAX_DETAILS) || MAX_DETAILS < 1) throw new Error('--max-details must be a positive integer');
const towns = args.towns ? args.towns.split(',').map((t) => t.trim()).filter(Boolean) : TOWNS;

// Tiny .env reader so the root needs no node_modules. Values already in the environment win.
for (const dir of [ROOT, resolve(ROOT, 'barber-template')]) {
  const file = resolve(dir, '.env');
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || m[1] in process.env) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const KEY = process.env.GOOGLE_PLACES_KEY?.trim();

/* ---------- helpers ---------- */

/** "+44 20 8675 7999", "020 8675 7999", "(0)20-8675-7999" -> "02086757999". Null when it is not a phone number. */
function normalisePhone(raw) {
  if (raw == null) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('0044')) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith('44') && digits.length >= 12) digits = `0${digits.slice(2)}`;
  return digits.length >= 10 ? digits : null;
}

/** "020 8675 7999" -> "+44 20 8675 7999", the format barbers.json uses. */
function internationalPhone(national) {
  const s = national.trim();
  if (s.startsWith('+')) return s;
  return `+44 ${s.replace(/^0/, '')}`;
}

function slugify(text) {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const UK_POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;
function postcodeOf(address) {
  const m = UK_POSTCODE.exec(address ?? '');
  return m ? `${m[1]} ${m[2]}`.toUpperCase() : null;
}

function csvCell(value) {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Split a simple CSV (quoted fields, doubled quotes) into rows of cells. */
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
  return rows;
}

/* ---------- existing lists ---------- */

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.astro', '.candidates', '.wrangler', 'public']);
const OUTPUTS = new Set([OUT_CSV, OUT_JSON, PROGRESS]);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(full);
    } else if (/^barbers.*\.(json|csv)$/i.test(entry.name) && !OUTPUTS.has(full)) yield full;
  }
}

function* phonesInJson(value) {
  if (Array.isArray(value)) for (const v of value) yield* phonesInJson(v);
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) {
      if (/phone/i.test(k) && typeof v === 'string') yield v;
      else yield* phonesInJson(v);
    }
}

/** Every phone number and slug in every barbers*.json / barbers*.csv under the repo. */
function loadExisting() {
  const phones = new Set();
  const slugs = new Set();
  const files = [];
  for (const file of walk(ROOT)) {
    const text = readFileSync(file, 'utf8');
    let found = 0;
    if (file.toLowerCase().endsWith('.json')) {
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.warn(`  skipping ${relative(ROOT, file)}: ${err.message}`);
        continue;
      }
      for (const p of phonesInJson(data)) {
        const n = normalisePhone(p);
        if (n) {
          phones.add(n);
          found++;
        }
      }
      for (const row of Array.isArray(data) ? data : []) if (typeof row?.slug === 'string') slugs.add(row.slug);
    } else {
      const rows = parseCsv(text);
      const header = rows[0] ?? [];
      const cols = header.map((h, i) => (/phone/i.test(h) ? i : -1)).filter((i) => i >= 0);
      for (const row of rows.slice(1))
        for (const i of cols) {
          const n = normalisePhone(row[i]);
          if (n) {
            phones.add(n);
            found++;
          }
        }
      const demo = header.findIndex((h) => /^demo$/i.test(h.trim()));
      if (demo >= 0) for (const row of rows.slice(1)) slugs.add((row[demo] ?? '').split('/').pop().trim());
    }
    files.push({ file: relative(ROOT, file), found });
  }
  return { phones, slugs, files };
}

/* ---------- Places API ---------- */

const counts = { textSearch: 0, details: 0 };

function errorMessage(text) {
  try {
    return JSON.parse(text).error?.message ?? text;
  } catch {
    return text.slice(0, 300);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, { method = 'GET', body, fieldMask }) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}/${path}`, {
      method,
      headers: {
        'X-Goog-Api-Key': KEY,
        'X-Goog-FieldMask': fieldMask,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (res.ok) return text ? JSON.parse(text) : {};
    const retry = res.status === 429 || res.status >= 500;
    if (retry && attempt < 4) {
      const wait = 1500 * 2 ** attempt;
      console.warn(`  ${method} ${path.split('?')[0]} -> HTTP ${res.status}, retrying in ${wait}ms`);
      await sleep(wait);
      continue;
    }
    throw new Error(`${method} ${path} -> HTTP ${res.status}: ${errorMessage(text)}`);
  }
}

/** Every place id Text Search returns for the town, all pages. */
async function searchTown(town) {
  const ids = [];
  let pageToken;
  let pages = 0;
  do {
    counts.textSearch++;
    const data = await api('places:searchText', {
      method: 'POST',
      fieldMask: SEARCH_MASK,
      body: {
        textQuery: `barber shop in ${town}`,
        regionCode: 'GB',
        languageCode: 'en-GB',
        pageSize: 20,
        ...(pageToken ? { pageToken } : {}),
      },
    });
    pages++;
    for (const p of data.places ?? []) if (p.id) ids.push(p.id);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return { ids, pages };
}

async function details(id) {
  counts.details++;
  return api(`places/${id}`, { fieldMask: DETAILS_MASK });
}

/** Run `fn` over `items` with at most `n` in flight; results in input order. */
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

/* ---------- keep / drop ---------- */

function websiteKind(uri) {
  const u = (uri ?? '').trim().toLowerCase();
  if (!u) return { kind: 'none', segment: 'A', label: 'no website' };
  if (BOOKING_SITES.some((s) => u.includes(s))) return { kind: 'booking' };
  const seg = SEGMENTS.find((s) => s.hosts.some((h) => u.includes(h)));
  if (seg) return { kind: 'social', segment: seg.letter, label: seg.label };
  return { kind: 'website' };
}

/**
 * A lead, or a drop reason. `id` is the place id (the response has none, it is
 * not in the mask). `state` carries the existing phone set and the
 * phones and slugs used so far in this run.
 */
function judge(id, place, town, state) {
  const name = place.displayName?.text?.trim() ?? '';
  const phone = place.nationalPhoneNumber?.trim();
  const rating = place.rating;
  const reviews = place.userRatingCount;
  if (!phone) return { drop: 'no phone' };
  if (!name || BAD_NAME.test(name)) return { drop: 'name' };
  if (typeof rating !== 'number' || rating < RATING_MIN || rating > RATING_MAX) return { drop: 'rating' };
  if (!Number.isInteger(reviews) || reviews < REVIEWS_MIN || reviews > REVIEWS_MAX) return { drop: 'reviews' };
  const site = websiteKind(place.websiteUri);
  if (site.kind === 'booking') return { drop: 'booking site' };
  if (site.kind === 'website') return { drop: 'real website' };
  const key = normalisePhone(phone);
  if (!key) return { drop: 'no phone' };
  if (state.existingPhones.has(key)) return { drop: 'already in our lists' };
  if (state.runPhones.has(key)) return { drop: 'duplicate in run' };
  const postcode = postcodeOf(place.formattedAddress);
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  if (!postcode || typeof lat !== 'number' || typeof lng !== 'number') return { drop: 'no postcode or location' };

  const short = (place.shortFormattedAddress ?? '').trim();
  const parts = short.split(',').map((s) => s.trim()).filter(Boolean);
  const city = parts.length > 1 ? parts[parts.length - 1] : town;
  const street = (parts.length > 1 ? parts.slice(0, -1) : parts).join(', ') || short || town;

  const base = slugify(name) || 'barber';
  let slug = base;
  if (state.slugs.has(slug)) slug = `${base}-${slugify(city)}`;
  for (let n = 2; state.slugs.has(slug); n++) slug = `${base}-${slugify(city)}-${n}`;

  return {
    lead: {
      placeId: id,
      slug,
      name,
      phone,
      phoneKey: key,
      shortAddress: short,
      street,
      city,
      postcode,
      rating,
      reviews,
      website: (place.websiteUri ?? '').trim(),
      segment: site.segment,
      sourceLabel: site.label,
      town,
      lat,
      lng,
    },
  };
}

/* ---------- outputs ---------- */

const CSV_HEADER = ['Name', 'Phone', 'Address', 'Rating', 'Reviews', 'Tier', 'Lead Source', 'Website', 'Demo', 'Segment'];

function csvRow(lead) {
  const source = `${DEMO_HOST}/${lead.slug} | barber | ${lead.sourceLabel}, ${lead.reviews} reviews at ${lead.rating} | ${lead.town}`;
  return [lead.name, lead.phone, lead.shortAddress, lead.rating, lead.reviews, 1, source, lead.website, `${DEMO_HOST}/${lead.slug}`, lead.segment];
}

/** One entry in the shape of barber-template/src/data/barbers.json. */
function jsonRow(lead) {
  return {
    slug: lead.slug,
    name: lead.name,
    phone: internationalPhone(lead.phone),
    address: `${lead.street}, ${lead.city} ${lead.postcode}`,
    street: lead.street,
    city: lead.city,
    postcode: lead.postcode,
    rating: lead.rating,
    reviews: lead.reviews,
    hours: null,
    photo: null,
    logo: null,
    street_view: null,
    photos_count: null,
    booking_link: null,
    website: lead.website || null,
    description: null,
    reviews_link: `https://search.google.com/local/reviews?placeid=${lead.placeId}&q=*&authuser=0&hl=en&gl=GB`,
    lat: lead.lat,
    lng: lead.lng,
    tier: 1,
    subtypes: 'Barber shop',
    about: null,
    reviews_per_score: null,
    place_id: lead.placeId,
    photos: [],
  };
}

function writeOutputs(state) {
  const csv = [CSV_HEADER, ...state.leads.map(csvRow)].map((r) => r.map(csvCell).join(',')).join('\n');
  writeFileSync(OUT_CSV, `${csv}\n`);
  writeFileSync(OUT_JSON, `${JSON.stringify(state.leads.map(jsonRow), null, 2)}\n`);
  writeFileSync(
    PROGRESS,
    `${JSON.stringify({ townsDone: state.townsDone, seenIds: [...state.seenIds], counts: state.counts, drops: state.drops, leads: state.leads }, null, 2)}\n`,
  );
}

function totals(state) {
  const c = state.counts;
  return `towns ${state.townsDone.length}/${towns.length}, places ${c.places}, text searches ${c.textSearch}, details ${c.details}, kept ${state.leads.length}`;
}

/* ---------- main ---------- */

async function main() {
  console.log('Loading existing lists...');
  const existing = loadExisting();
  for (const f of existing.files) console.log(`  ${f.file}: ${f.found} phone numbers`);
  console.log(`  ${existing.phones.size} distinct numbers to exclude, ${existing.slugs.size} slugs taken\n`);

  const state = {
    existingPhones: existing.phones,
    runPhones: new Set(),
    slugs: new Set(existing.slugs),
    seenIds: new Set(),
    townsDone: [],
    leads: [],
    counts: { places: 0, textSearch: 0, details: 0 },
    drops: {},
  };

  if (!args.fresh && existsSync(PROGRESS)) {
    const saved = JSON.parse(readFileSync(PROGRESS, 'utf8'));
    state.townsDone = saved.townsDone ?? [];
    state.seenIds = new Set(saved.seenIds ?? []);
    state.leads = saved.leads ?? [];
    state.counts = { places: 0, textSearch: 0, details: 0, ...saved.counts };
    state.drops = saved.drops ?? {};
    for (const l of state.leads) {
      state.runPhones.add(l.phoneKey);
      state.slugs.add(l.slug);
    }
    console.log(`Resuming from ${basename(PROGRESS)}: ${totals(state)} (pass --fresh to start over)\n`);
  }
  counts.textSearch = state.counts.textSearch;
  counts.details = state.counts.details;

  const todo = towns.filter((t) => !state.townsDone.includes(t));
  console.log(`Target ${LIMIT} rows, ${todo.length} towns to search, Details cap ${MAX_DETAILS} calls (--max-details).`);
  console.log(`Details field mask: ${DETAILS_MASK}\n`);

  if (args['dry-run']) {
    console.log(`Dry run. Towns: ${todo.join(', ')}`);
    return;
  }
  if (!KEY) {
    console.error('GOOGLE_PLACES_KEY is not set. Copy barber-template/.env.example to .env and add your key.');
    process.exit(1);
  }

  let stop = null;
  try {
    for (const town of todo) {
      if (state.leads.length >= LIMIT) break;
      if (counts.details >= MAX_DETAILS) break;
      const { ids, pages } = await searchTown(town);
      state.counts.places += ids.length;
      const fresh = ids.filter((id) => !state.seenIds.has(id));
      // Details are the paid step: never fetch more than could still be kept or than the cap allows.
      const room = Math.min(LIMIT - state.leads.length, MAX_DETAILS - counts.details);
      const toCheck = fresh.slice(0, Math.max(0, room));

      const results = await pool(toCheck, 4, async (id) => {
        try {
          return await details(id);
        } catch (err) {
          if (!/HTTP 404/.test(err.message)) throw err;
          console.warn(`  ${id}: ${err.message}`);
          return null;
        }
      });

      let kept = 0;
      for (const [i, place] of results.entries()) {
        state.seenIds.add(toCheck[i]);
        if (!place) continue;
        const verdict = judge(toCheck[i], place, town, state);
        if (verdict.drop) {
          state.drops[verdict.drop] = (state.drops[verdict.drop] ?? 0) + 1;
          continue;
        }
        state.leads.push(verdict.lead);
        state.runPhones.add(verdict.lead.phoneKey);
        state.slugs.add(verdict.lead.slug);
        kept++;
      }

      state.counts.textSearch = counts.textSearch;
      state.counts.details = counts.details;
      // A town is done only when every new id in it was checked; the rest stay unseen for a resumed run.
      if (toCheck.length === fresh.length) state.townsDone.push(town);
      writeOutputs(state);
      console.log(
        `${town.padEnd(18)} ${pages} page(s), ${String(ids.length).padStart(2)} places, ${String(fresh.length).padStart(2)} new, ${String(toCheck.length).padStart(2)} details, ${String(kept).padStart(2)} kept  | ${totals(state)}`,
      );
      if (state.leads.length >= LIMIT) {
        stop = `${LIMIT} rows kept`;
        break;
      }
      if (counts.details >= MAX_DETAILS) {
        stop = `Details cap of ${MAX_DETAILS} reached`;
        break;
      }
    }
  } catch (err) {
    state.counts.textSearch = counts.textSearch;
    state.counts.details = counts.details;
    writeOutputs(state);
    console.error(`\nStopped on an API error (progress saved, re-run to resume): ${err.message}`);
    process.exitCode = 1;
  }

  console.log(`\n${stop ?? 'Every town searched'}.`);
  console.log(`Totals: ${totals(state)}`);
  console.log(`API calls this and any resumed run: Text Search (ID-only SKU) ${state.counts.textSearch}, Place Details (Enterprise SKU) ${state.counts.details}`);
  const drops = Object.entries(state.drops).sort((a, b) => b[1] - a[1]);
  if (drops.length) console.log(`Dropped: ${drops.map(([k, v]) => `${k} ${v}`).join(', ')}`);
  const seg = { A: 0, B: 0, C: 0 };
  for (const l of state.leads) seg[l.segment]++;
  console.log(`Segments: A ${seg.A}, B ${seg.B}, C ${seg.C}`);
  console.log(`Wrote ${relative(ROOT, OUT_CSV)} and ${relative(ROOT, OUT_JSON)} (${state.leads.length} rows). Photos not fetched.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
