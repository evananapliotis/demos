/**
 * Derives one palette per listing from that shop's own primary photo and writes
 * them to src/data/palettes.json, which is committed and is the only thing the
 * build reads. No image is decoded during a build.
 *
 *   npm run palettes                 every listing whose photo has changed
 *   npm run palettes -- --force      re-analyse everything
 *   npm run palettes -- --slug a,b   only these
 *
 * The photo decides the colour and nothing else: the ground is snapped to one
 * of five curated grounds (src/lib/palette.ts) and the accent takes the photo's
 * most saturated hue at a saturation and lightness we choose, so a muddy or
 * blown-out photo cannot produce an unreadable page. Every pair the stylesheet
 * puts together is checked against WCAG AA; a shop whose photo yields no
 * readable accent keeps its ground's own accent and is listed in `flagged` so
 * it surfaces instead of shipping quietly.
 *
 * Determinism: the same JPEG bytes give the same numbers, and the answers are
 * committed, so every build of a given commit produces identical pages.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { buildPalette, contrastAudit, GROUNDS, rgbToHsl, snapGround, type GroundId, type Palette } from '../src/lib/palette.ts';
import { hash } from '../src/lib/theme.ts';

const root = new URL('../', import.meta.url);
const shopsPath = fileURLToPath(new URL('src/data/barbers.json', root));
const outPath = fileURLToPath(new URL('src/data/palettes.json', root));

interface Shop {
  slug: string;
  name: string;
  photos?: string[];
}

/** What the build needs, plus enough to tell whether the photo has changed since. */
export interface PaletteEntry {
  /** The photo the palette came from, or null when the listing has none on disk. */
  photo: string | null;
  bytes: number;
  sha1: string;
  /** The photo's own colour, kept so a palette can be explained without re-reading the image. */
  photoHue: number | null;
  photoSaturation: number;
  photoLightness: number;
  /** The hue the accent was taken from — the photo's most saturated colour, not its average. */
  accentHue: number | null;
  ground: GroundId;
  /** True when the photo itself chose the ground rather than the slug spreading it. */
  groundFromPhoto: boolean;
  groundReason: string;
  accent: string;
  accentHover: string;
  onAccent: string;
  minContrast: number;
  accentFallback: boolean;
  notes: string[];
}

export interface PaletteFile {
  version: number;
  /** Slugs whose palette fell back, so they can be looked at rather than shipping quietly. */
  flagged: string[];
  shops: Record<string, PaletteEntry>;
}

const VERSION = 1;
/** The photo is read at this size: big enough to hold the room's colour, small enough to be quick. */
const SAMPLE = 80;
/** A pixel this grey carries no hue worth counting. */
const MIN_PIXEL_SATURATION = 0.15;
/** Nor does one this close to black or white. */
const PIXEL_LIGHTNESS = { min: 0.1, max: 0.92 };
/** An accent colour has to cover at least this share of the photo, so one bright speck cannot decide the palette. */
const MIN_ACCENT_SHARE = 0.005;

const arg = (name: string): string | undefined => {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  if (hit.includes('=')) return hit.slice(hit.indexOf('=') + 1);
  const next = process.argv[process.argv.indexOf(hit) + 1];
  return next && !next.startsWith('--') ? next : '';
};

const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

export interface PhotoColour {
  /** Chroma-weighted dominant hue, or null when the photo has no colour at all. */
  hue: number | null;
  saturation: number;
  lightness: number;
  /** The photo's most saturated colour that covers a real part of the frame. */
  accentHue: number | null;
  accentSaturation: number;
}

/**
 * The colour of one photo: how light it is, how colourful, which hue dominates,
 * and which hue is its strongest. Deterministic for given bytes.
 */
export async function readPhotoColour(file: string): Promise<PhotoColour> {
  const { data } = await sharp(file)
    .rotate()
    .resize(SAMPLE, SAMPLE, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const saturations: number[] = [];
  const lightnesses: number[] = [];
  /** 36 bins of 10°, weighted by saturation: which hue the room is. */
  const hueWeight = new Array<number>(36).fill(0);
  const hueSin = new Array<number>(36).fill(0);
  const hueCos = new Array<number>(36).fill(0);
  /** Coarser bins for the accent: hue 15°, saturation 0.2, so a colour has to actually recur. */
  const accentBins = new Map<number, { count: number; sin: number; cos: number; sat: number }>();
  let total = 0;

  for (let i = 0; i < data.length; i += 3) {
    const hsl = rgbToHsl({ r: data[i]!, g: data[i + 1]!, b: data[i + 2]! });
    saturations.push(hsl.s);
    lightnesses.push(hsl.l);
    total++;
    if (hsl.s < MIN_PIXEL_SATURATION || hsl.l < PIXEL_LIGHTNESS.min || hsl.l > PIXEL_LIGHTNESS.max) continue;
    const rad = (hsl.h * Math.PI) / 180;
    const bin = Math.min(35, Math.floor(hsl.h / 10));
    hueWeight[bin]! += hsl.s;
    hueSin[bin]! += Math.sin(rad) * hsl.s;
    hueCos[bin]! += Math.cos(rad) * hsl.s;
    const key = Math.min(23, Math.floor(hsl.h / 15)) * 10 + Math.min(4, Math.floor(hsl.s / 0.2));
    const acc = accentBins.get(key) ?? { count: 0, sin: 0, cos: 0, sat: 0 };
    acc.count++;
    acc.sin += Math.sin(rad);
    acc.cos += Math.cos(rad);
    acc.sat += hsl.s;
    accentBins.set(key, acc);
  }

  const saturation = median(saturations);
  const lightness = median(lightnesses);

  let bestBin = -1;
  for (let b = 0; b < 36; b++) if (hueWeight[b]! > (bestBin === -1 ? 0 : hueWeight[bestBin]!)) bestBin = b;
  const hue = bestBin === -1 ? null : (((Math.atan2(hueSin[bestBin]!, hueCos[bestBin]!) * 180) / Math.PI) + 360) % 360;

  // The accent is the most saturated colour that still covers a real share of
  // the frame: sqrt(count) keeps a large muted area from beating a small vivid
  // one outright, while the share floor rules out single bright pixels.
  let accentHue: number | null = null;
  let accentSaturation = 0;
  let bestScore = 0;
  for (const acc of accentBins.values()) {
    if (acc.count / total < MIN_ACCENT_SHARE) continue;
    const meanSat = acc.sat / acc.count;
    const score = meanSat * Math.sqrt(acc.count);
    if (score > bestScore) {
      bestScore = score;
      accentHue = (((Math.atan2(acc.sin, acc.cos) * 180) / Math.PI) + 360) % 360;
      accentSaturation = meanSat;
    }
  }

  return { hue, saturation, lightness, accentHue, accentSaturation };
}

/** The palette for one shop, given its photo's colour and its slug. */
export function paletteFor(slug: string, colour: PhotoColour | null): { ground: GroundId; fromPhoto: boolean; reason: string; palette: Palette } {
  const choice = snapGround(colour, hash(`${slug}:ground`));
  const accentSource = colour && colour.accentHue !== null ? { hue: colour.accentHue, saturation: colour.accentSaturation } : null;
  return { ...choice, palette: buildPalette(choice.ground, accentSource) };
}

async function main() {
  const shops: Shop[] = JSON.parse(readFileSync(shopsPath, 'utf8'));
  const force = arg('force') !== undefined;
  const only = arg('slug')?.split(',').map((s) => s.trim()).filter(Boolean);

  const previous: PaletteFile = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : { version: VERSION, flagged: [], shops: {} };
  const stale = previous.version !== VERSION;
  if (stale && existsSync(outPath)) console.log(`palettes.json is version ${previous.version}, this script writes ${VERSION}: re-analysing everything`);

  const out: Record<string, PaletteEntry> = {};
  const flagged: string[] = [];
  let analysed = 0;
  let reused = 0;

  for (const shop of shops) {
    if (only && !only.includes(shop.slug)) {
      const kept = previous.shops[shop.slug];
      if (kept) {
        out[shop.slug] = kept;
        if (kept.accentFallback) flagged.push(shop.slug);
      }
      continue;
    }
    const photo = (shop.photos ?? []).map((p) => ({ path: p, file: fileURLToPath(new URL(`public${p}`, root)) })).find((p) => existsSync(p.file));

    if (!photo) {
      const { ground, fromPhoto, reason, palette } = paletteFor(shop.slug, null);
      out[shop.slug] = {
        photo: null,
        bytes: 0,
        sha1: '',
        photoHue: null,
        photoSaturation: 0,
        photoLightness: 0,
        accentHue: null,
        ground,
        groundFromPhoto: fromPhoto,
        groundReason: reason,
        accent: palette.accent,
        accentHover: palette.accentHover,
        onAccent: palette.onAccent,
        minContrast: palette.minContrast,
        accentFallback: palette.accentFallback,
        notes: palette.notes,
      };
      flagged.push(shop.slug);
      continue;
    }

    const bytes = statSync(photo.file).size;
    const cached = previous.shops[shop.slug];
    // The photo is only re-read when it is new, has changed size, or the caller asked.
    if (!force && !stale && cached && cached.photo === photo.path && cached.bytes === bytes) {
      out[shop.slug] = cached;
      if (cached.accentFallback) flagged.push(shop.slug);
      reused++;
      continue;
    }

    const sha1 = createHash('sha1').update(readFileSync(photo.file)).digest('hex');
    const colour = await readPhotoColour(photo.file);
    const { ground, fromPhoto, reason, palette } = paletteFor(shop.slug, colour);
    out[shop.slug] = {
      photo: photo.path,
      bytes,
      sha1,
      photoHue: colour.hue === null ? null : Number(colour.hue.toFixed(1)),
      photoSaturation: Number(colour.saturation.toFixed(3)),
      photoLightness: Number(colour.lightness.toFixed(3)),
      accentHue: colour.accentHue === null ? null : Number(colour.accentHue.toFixed(1)),
      ground,
      groundFromPhoto: fromPhoto,
      groundReason: reason,
      accent: palette.accent,
      accentHover: palette.accentHover,
      onAccent: palette.onAccent,
      minContrast: Number(palette.minContrast.toFixed(2)),
      accentFallback: palette.accentFallback,
      notes: palette.notes,
    };
    if (palette.accentFallback) flagged.push(shop.slug);
    analysed++;
    if (analysed % 100 === 0) console.log(`  ${analysed} analysed…`);
  }

  const ordered: Record<string, PaletteEntry> = {};
  for (const slug of Object.keys(out).sort()) ordered[slug] = out[slug]!;
  const file: PaletteFile = { version: VERSION, flagged: [...new Set(flagged)].sort(), shops: ordered };
  writeFileSync(outPath, `${JSON.stringify(file, null, 1)}\n`);

  const counts: Record<string, number> = {};
  let worst = { slug: '', ratio: Infinity };
  for (const [slug, e] of Object.entries(ordered)) {
    counts[e.ground] = (counts[e.ground] ?? 0) + 1;
    if (e.minContrast < worst.ratio) worst = { slug, ratio: e.minContrast };
  }
  console.log(`\n${Object.keys(ordered).length} palettes: ${analysed} analysed, ${reused} reused from cache`);
  const fromPhoto = Object.values(ordered).filter((e) => e.groundFromPhoto).length;
  console.log(`grounds: ${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} ${n}`).join(', ')}`);
  console.log(`${fromPhoto} grounds chosen by the photo, ${Object.keys(ordered).length - fromPhoto} spread by slug because the photo had no clear colour`);
  console.log(`lowest contrast anywhere: ${worst.ratio.toFixed(2)}:1 (${worst.slug})`);
  if (file.flagged.length) {
    console.log(`\n${file.flagged.length} flagged (kept their ground's own accent):`);
    for (const slug of file.flagged.slice(0, 20)) console.log(`  ${slug}: ${ordered[slug]!.notes.join('; ')}`);
    if (file.flagged.length > 20) console.log(`  … and ${file.flagged.length - 20} more, all listed in palettes.json "flagged"`);
  }
  // Nothing may ship below AA. A fallback accent is a flag, not a failure; a
  // palette that still cannot clear AA is a bug in this script.
  const broken = Object.entries(ordered).filter(([, e]) => {
    const g = GROUNDS[e.ground];
    return contrastAudit({ ground: e.ground, scheme: g.scheme, ink: g.ink, ink2: g.ink2, ink3: g.ink3, cream: g.cream, cream2: g.cream2, accent: e.accent, accentHover: e.accentHover, onAccent: e.onAccent }).some((a) => a.ratio < a.needs);
  });
  if (broken.length) {
    console.error(`\n${broken.length} palettes are below AA and must not ship:`);
    for (const [slug, e] of broken.slice(0, 10)) console.error(`  ${slug} (${e.ground}, ${e.accent}, min ${e.minContrast}:1)`);
    process.exit(1);
  }
  console.log('every palette clears WCAG AA on every pair the stylesheet uses.');
}

await main();
