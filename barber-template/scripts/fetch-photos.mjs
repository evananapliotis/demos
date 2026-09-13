/**
 * Fetch up to eight Google Places photos for every listing in
 * src/data/barbers.json, as 1400px JPEGs.
 *
 *   npm run photos                    every listing
 *   npm run photos -- --slug a,b      only these slugs
 *   npm run photos -- --force         re-download files that already exist
 *
 * Per listing: Places API (New) Text Search for the shop name, biased to a
 * 500m circle around the listing's lat/lng, takes the top result's place id;
 * Place Details with a `photos` field mask; then the Place Photo endpoint for
 * the first eight photos. Each download is resized to at most 1400px on its
 * long edge and saved as a JPEG at quality 80, at
 * public/photos/<slug>-1.jpg … <slug>-8.jpg, so the repo stays small and the
 * pages can serve the files as they are.
 *
 * Existing files are kept: a listing with all eight on disk makes no API
 * calls at all, and one with fewer only re-checks the place and downloads
 * what is missing. Each entry gets `photos`, the root-absolute paths of its
 * files (what an <img src> on the site needs). Author attributions, which
 * Google's terms require alongside a displayed photo, go to
 * src/data/photo-credits.json keyed by that path.
 *
 * Needs GOOGLE_PLACES_KEY in .env (this directory or the repo root, see
 * .env.example) with "Places API (New)" enabled on the key.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { config as loadDotenv } from 'dotenv';
import sharp from 'sharp';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const DATA_FILE = resolve(PROJECT_ROOT, 'src', 'data', 'barbers.json');
const CREDITS_FILE = resolve(PROJECT_ROOT, 'src', 'data', 'photo-credits.json');
const PHOTOS_DIR = resolve(PROJECT_ROOT, 'public', 'photos');
const PUBLIC_PATH = '/photos';
const MAX_PHOTOS = 8;
/** Longest edge of a saved photo, and the JPEG quality it is saved at. */
const MAX_EDGE_PX = 1400;
const JPEG_QUALITY = 80;
const BIAS_RADIUS_M = 500;
const API = 'https://places.googleapis.com/v1';

// The project's own .env first, then the repo root's. Values already in the environment win.
for (const dir of [PROJECT_ROOT, resolve(PROJECT_ROOT, '..')]) {
  const file = resolve(dir, '.env');
  if (existsSync(file)) loadDotenv({ path: file, quiet: true });
}
const KEY = process.env.GOOGLE_PLACES_KEY?.trim();
if (!KEY) {
  console.error('GOOGLE_PLACES_KEY is not set. Copy .env.example to .env and add your key.');
  process.exit(1);
}

const { values: args } = parseArgs({
  options: {
    slug: { type: 'string' },
    force: { type: 'boolean', default: false },
  },
});
const only = args.slug ? new Set(args.slug.split(',').map((s) => s.trim()).filter(Boolean)) : null;

const kb = (bytes) => `${(bytes / 1024).toFixed(1)}KB`;

function errorMessage(text) {
  try {
    return JSON.parse(text).error?.message ?? text;
  } catch {
    return text.slice(0, 300);
  }
}

async function api(path, { method = 'GET', body, fieldMask }) {
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
  if (!res.ok) throw new Error(`${method} ${path} -> HTTP ${res.status}: ${errorMessage(text)}`);
  return text ? JSON.parse(text) : {};
}

/** Top Text Search hit for the shop name near its coordinates, or null. */
async function findPlace(shop) {
  const data = await api('places:searchText', {
    method: 'POST',
    fieldMask: 'places.id,places.displayName,places.formattedAddress',
    body: {
      textQuery: shop.name,
      languageCode: 'en',
      locationBias: {
        circle: { center: { latitude: shop.lat, longitude: shop.lng }, radius: BIAS_RADIUS_M },
      },
    },
  });
  const top = data.places?.[0];
  if (!top?.id) return null;
  return { id: top.id, name: top.displayName?.text ?? '', address: top.formattedAddress ?? '' };
}

async function listPhotos(placeId) {
  const data = await api(`places/${placeId}`, { fieldMask: 'photos' });
  return data.photos ?? [];
}

/**
 * The photo endpoint answers with a redirect to the image; fetch follows it.
 * The image is asked for at the saved size, then resized (never enlarged)
 * and re-encoded so every file on disk follows the same rule.
 */
async function downloadPhoto(photoName, file) {
  const res = await fetch(`${API}/${photoName}/media?maxWidthPx=${MAX_EDGE_PX}&maxHeightPx=${MAX_EDGE_PX}&key=${encodeURIComponent(KEY)}`);
  if (!res.ok) throw new Error(`GET ${photoName}/media -> HTTP ${res.status}: ${errorMessage(await res.text())}`);
  const type = res.headers.get('content-type') ?? '';
  if (!type.startsWith('image/')) throw new Error(`GET ${photoName}/media returned ${type || 'no content-type'}, not an image`);
  const info = await sharp(Buffer.from(await res.arrayBuffer()))
    .rotate()
    .resize({ width: MAX_EDGE_PX, height: MAX_EDGE_PX, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(file);
  return { width: info.width, height: info.height, size: info.size };
}

const shops = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
const credits = existsSync(CREDITS_FILE) ? JSON.parse(readFileSync(CREDITS_FILE, 'utf8')) : {};
mkdirSync(PHOTOS_DIR, { recursive: true });
const problems = [];

for (const shop of shops) {
  if (only && !only.has(shop.slug)) continue;
  const fileFor = (n) => resolve(PHOTOS_DIR, `${shop.slug}-${n}.jpg`);
  const pathFor = (n) => `${PUBLIC_PATH}/${shop.slug}-${n}.jpg`;
  const onDisk = () => {
    const found = [];
    for (let n = 1; n <= MAX_PHOTOS; n++) if (existsSync(fileFor(n))) found.push(pathFor(n));
    return found;
  };

  if (!args.force && onDisk().length === MAX_PHOTOS) {
    shop.photos = onDisk();
    console.log(`${shop.slug}: all ${MAX_PHOTOS} photos on disk, skipped`);
    continue;
  }

  try {
    const place = await findPlace(shop);
    if (!place) {
      shop.photos = onDisk();
      console.warn(`${shop.slug}: no Places result for "${shop.name}" near ${shop.lat},${shop.lng}`);
      problems.push(`${shop.slug}: no Places result`);
      continue;
    }
    console.log(`${shop.slug}: matched "${place.name}", ${place.address} (${place.id})`);

    const photos = (await listPhotos(place.id)).slice(0, MAX_PHOTOS);
    if (photos.length === 0) console.warn(`  place has no photos`);
    const paths = [];
    for (const [i, photo] of photos.entries()) {
      const n = i + 1;
      const file = fileFor(n);
      if (!args.force && existsSync(file)) {
        console.log(`  ${basename(file)} exists, skipped`);
      } else {
        const saved = await downloadPhoto(photo.name, file);
        console.log(`  ${basename(file)} ${saved.width}x${saved.height} ${kb(saved.size)} (source ${photo.widthPx}x${photo.heightPx})`);
      }
      paths.push(pathFor(n));
      credits[pathFor(n)] = {
        place: place.name,
        placeId: place.id,
        authors: (photo.authorAttributions ?? []).map((a) => ({ name: a.displayName ?? '', uri: a.uri ?? '' })),
      };
    }
    shop.photos = paths;
  } catch (err) {
    shop.photos = onDisk();
    console.error(`${shop.slug}: ${err.message}`);
    problems.push(`${shop.slug}: ${err.message}`);
  }
}

writeFileSync(DATA_FILE, `${JSON.stringify(shops, null, 2)}\n`);
writeFileSync(CREDITS_FILE, `${JSON.stringify(credits, null, 2)}\n`);
console.log(`\nPaths written to ${relative(PROJECT_ROOT, DATA_FILE)}, attributions to ${relative(PROJECT_ROOT, CREDITS_FILE)}.`);

if (problems.length) {
  console.error(`\n${problems.length} listing(s) had problems:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
