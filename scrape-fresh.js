#!/usr/bin/env node
/**
 * Find UK barber shops with no real website that are not already in our lists.
 *
 *   node scrape-fresh.js                    run: 74 towns, stop at 1000 kept rows
 *   node scrape-fresh.js --limit 200        stop sooner
 *   node scrape-fresh.js --towns Wigan,Bury only these towns
 *   node scrape-fresh.js --max-searches 300 hard cap on Text Search calls (default 500)
 *   node scrape-fresh.js --dry-run          load the existing lists, print the plan, no API calls
 *   node scrape-fresh.js --fresh            ignore the progress file and the rows already in
 *                                          barbers-fresh.*, start with an empty list
 *
 * Pipeline, per town:
 *   1. Places API (New) Text Search "barber shop in {town}", every page (max
 *      60 places, 20 per call). One call carries every field we need:
 *      displayName, nationalPhoneNumber, websiteUri, rating, userRatingCount,
 *      shortFormattedAddress, plus formattedAddress (postcode) and location
 *      (lat/lng), which barbers.json and `npm run photos` need. rating and
 *      userRatingCount put the call in the Text Search Enterprise SKU; the
 *      address and location fields are Essentials-tier and add nothing. No
 *      Place Details calls at all, so 20 places cost one call, not twenty.
 *      No photos, no reviews, no opening hours.
 *   2. Keep / drop rules below. Dedupe on normalised phone against every
 *      barbers*.json and barbers*.csv in the repo, and within the run.
 *
 * Outputs (repo root), rewritten after every town so a crash loses nothing.
 * Rows already in them are kept and only new shops are added, so re-running
 * grows the list; their numbers count as "already have" like the other lists.
 *   barbers-fresh.csv             Name, Phone, Address, Rating, Reviews, Tier, Lead Source, Website, Demo, Segment
 *   barbers-fresh.json            same shape as barber-template/src/data/barbers.json
 *   .scrape-fresh-progress.json   towns done and place ids already judged, with the
 *                                 filter band they were judged on. A re-run with the
 *                                 same band resumes and repeats no paid call; a run
 *                                 with a different band searches every town again
 *                                 (kept rows are never re-judged, only added to).
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

const PLACE_FIELDS = [
  'id',
  'displayName',
  'nationalPhoneNumber',
  'websiteUri',
  'rating',
  'userRatingCount',
  'shortFormattedAddress',
  'formattedAddress',
  'location',
];
const SEARCH_MASK = [...PLACE_FIELDS.map((f) => `places.${f}`), 'nextPageToken'].join(',');

const RATING_MIN = 3.5;
const RATING_MAX = Infinity;
const REVIEWS_MIN = 20;
const REVIEWS_MAX = 150;
/** Saved in the progress file: progress only carries over between runs that filter the same way. */
const FILTERS = `rating ${RATING_MIN}-${Number.isFinite(RATING_MAX) ? RATING_MAX : "up"}, reviews ${REVIEWS_MIN}-${REVIEWS_MAX}`;
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
    limit: { type: 'string', default: '1000' },
    'max-searches': { type: 'string', default: '500' },
    towns: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    fresh: { type: 'boolean', default: false },
  },
});
const LIMIT = Number(args.limit);
const MAX_SEARCHES = Number(args['max-searches']);
if (!Number.isInteger(LIMIT) || LIMIT < 1) throw new Error('--limit must be a positive integer');
if (!Number.isInteger(MAX_SEARCHES) || MAX_SEARCHES < 1) throw new Error('--max-searches must be a positive integer');
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

/** "+44 20 8675 7999" -> "020 8675 7999", the way Google's nationalPhoneNumber writes it. */
function nationalPhone(phone) {
  return phone.trim().replace(/^\+44\s*\(?0?\)?\s*/, '0');
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

/**
 * The rows a previous run wrote, rebuilt from barbers-fresh.json (which has
 * everything the JSON output needs) and barbers-fresh.csv (address as shown,
 * town, segment). Missing CSV: those three are derived from the JSON row.
 */
function loadPriorLeads() {
  if (!existsSync(OUT_JSON)) return [];
  const rows = JSON.parse(readFileSync(OUT_JSON, 'utf8'));
  const csv = new Map();
  if (existsSync(OUT_CSV)) {
    const [header = [], ...lines] = parseCsv(readFileSync(OUT_CSV, 'utf8'));
    const col = (name) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
    const c = { demo: col('Demo'), address: col('Address'), source: col('Lead Source'), segment: col('Segment'), phone: col('Phone') };
    if (Object.values(c).every((i) => i >= 0))
      for (const line of lines) {
        const slug = (line[c.demo] ?? '').split('/').pop().trim();
        if (slug) csv.set(slug, { phone: line[c.phone], address: line[c.address], segment: line[c.segment], source: line[c.source] });
      }
  }
  return rows.map((r) => {
    const line = csv.get(r.slug);
    const site = websiteKind(r.website);
    const parts = (line?.source ?? '').split('|').map((p) => p.trim());
    const phone = line?.phone || nationalPhone(r.phone);
    return {
      placeId: r.place_id ?? null,
      slug: r.slug,
      name: r.name,
      phone,
      phoneKey: normalisePhone(phone),
      shortAddress: line?.address || `${r.street}, ${r.city}`,
      street: r.street,
      city: r.city,
      postcode: r.postcode,
      rating: r.rating,
      reviews: r.reviews,
      website: r.website ?? '',
      segment: line?.segment || site.segment || 'A',
      sourceLabel: parts[2]?.split(',')[0] || site.label || 'no website',
      town: parts[3] || r.city,
      lat: r.lat,
      lng: r.lng,
    };
  });
}

/* ---------- Places API ---------- */

const counts = { textSearch: 0 };

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

/** Every place Text Search returns for the town, all pages, with the fields we need. Stops at the call cap. */
async function searchTown(town) {
  const places = [];
  let pageToken;
  let pages = 0;
  do {
    if (counts.textSearch >= MAX_SEARCHES) break;
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
    for (const p of data.places ?? []) if (p.id) places.push(p);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return { places, pages, complete: !pageToken };
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
 * A lead, or a drop reason. `state` carries the existing phone set and the
 * phones and slugs used so far in this run.
 */
function judge(place, town, state) {
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
      placeId: place.id,
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
    `${JSON.stringify({ filters: FILTERS, townsDone: state.townsDone, seenIds: [...state.seenIds], counts: state.counts, drops: state.drops }, null, 2)}\n`,
  );
}

function totals(state) {
  const c = state.counts;
  return `towns ${state.townsDone.length}/${towns.length}, places ${c.places}, text searches ${c.textSearch}, kept ${state.leads.length}`;
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
    counts: { places: 0, textSearch: 0 },
    drops: {},
  };

  if (!args.fresh) {
    state.leads = loadPriorLeads();
    for (const l of state.leads) {
      if (l.phoneKey) state.runPhones.add(l.phoneKey);
      state.slugs.add(l.slug);
      if (l.placeId) state.seenIds.add(l.placeId);
    }
    if (state.leads.length) console.log(`Keeping the ${state.leads.length} rows already in ${basename(OUT_JSON)}; only new shops will be added.`);
    if (existsSync(PROGRESS)) {
      const saved = JSON.parse(readFileSync(PROGRESS, 'utf8'));
      state.counts = { places: 0, textSearch: 0, ...saved.counts };
      if (saved.filters === FILTERS) {
        state.townsDone = saved.townsDone ?? [];
        for (const id of saved.seenIds ?? []) state.seenIds.add(id);
        state.drops = saved.drops ?? {};
        console.log(`Resuming from ${basename(PROGRESS)}: ${state.townsDone.length} towns already done (pass --fresh to start over)`);
      } else {
        console.log(`${basename(PROGRESS)} was written with a different filter band (${saved.filters ?? 'unknown'}); now ${FILTERS}. Searching every town again, skipping only the shops already kept.`);
      }
    }
    console.log('');
  }
  counts.textSearch = state.counts.textSearch;
  const priorCount = state.leads.length;

  const todo = towns.filter((t) => !state.townsDone.includes(t));
  console.log(`Target ${LIMIT} rows, ${todo.length} towns to search, Text Search cap ${MAX_SEARCHES} calls (--max-searches). Filters: ${FILTERS}.`);
  console.log(`Text Search field mask: ${SEARCH_MASK}\n`);

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
      if (counts.textSearch >= MAX_SEARCHES) break;
      const { places, pages, complete } = await searchTown(town);
      state.counts.places += places.length;
      // The same shop turns up in neighbouring towns' searches; judge it once.
      const fresh = places.filter((p) => !state.seenIds.has(p.id));

      let kept = 0;
      let judged = 0;
      for (const place of fresh) {
        if (state.leads.length >= LIMIT) break;
        state.seenIds.add(place.id);
        judged++;
        const verdict = judge(place, town, state);
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
      // A town is done only when every page was fetched and every place judged; a resumed run searches it again otherwise.
      if (complete && judged === fresh.length) state.townsDone.push(town);
      writeOutputs(state);
      console.log(
        `${town.padEnd(18)} ${pages} page(s), ${String(places.length).padStart(2)} places, ${String(fresh.length).padStart(2)} new, ${String(kept).padStart(2)} kept  | ${totals(state)}`,
      );
      if (state.leads.length >= LIMIT) {
        stop = `${LIMIT} rows kept`;
        break;
      }
      if (counts.textSearch >= MAX_SEARCHES) {
        stop = `Text Search cap of ${MAX_SEARCHES} calls reached`;
        break;
      }
    }
  } catch (err) {
    state.counts.textSearch = counts.textSearch;
    writeOutputs(state);
    console.error(`\nStopped on an API error (progress saved, re-run to resume): ${err.message}`);
    process.exitCode = 1;
  }

  console.log(`\n${stop ?? 'Every town searched'}.`);
  console.log(`Totals: ${totals(state)}`);
  console.log(`API calls this and any resumed run: Text Search (Enterprise SKU) ${state.counts.textSearch}, Place Details 0`);
  const drops = Object.entries(state.drops).sort((a, b) => b[1] - a[1]);
  if (drops.length) console.log(`Dropped: ${drops.map(([k, v]) => `${k} ${v}`).join(', ')}`);
  const seg = { A: 0, B: 0, C: 0 };
  for (const l of state.leads) seg[l.segment]++;
  console.log(`Segments: A ${seg.A}, B ${seg.B}, C ${seg.C}`);
  console.log(`Wrote ${relative(ROOT, OUT_CSV)} and ${relative(ROOT, OUT_JSON)} (${state.leads.length} rows, ${state.leads.length - priorCount} added this run). Photos not fetched.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
