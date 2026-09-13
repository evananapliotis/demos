/**
 * Listings behind /demo/[slug].
 *
 * src/data/barbers-5.json is an Outscraper export of Google Business
 * listings, one object per shop, plus the `photos` paths that
 * scripts/fetch-photos.mjs writes. Every entry is validated here so a bad or
 * missing field fails the build naming the entry and the key, in the same
 * spirit as site.schema.ts. Fields the export may lack (about,
 * reviews_per_score) are optional and the page leaves out what depends on
 * them. The helpers below turn the export's hours strings into a week table.
 */
import { z } from 'zod';
import { DAYS, type Day } from '../config/site.schema.ts';
import raw from '../data/barbers-5.json';

/** Day labels as the export spells them, Monday first. Index-aligned with DAYS. */
export const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type DayLabel = (typeof DAY_LABELS)[number];

const text = z.string().trim().min(1, 'must not be empty');
/** Present in most listings, null or empty in a few. Normalised to null. */
const optionalText = z
  .string()
  .nullish()
  .transform((v) => v?.trim() || null);
const optionalUrl = z.url().nullish();
/** Outscraper sometimes ships nested objects as JSON strings; read either form. */
const jsonish = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => {
    if (typeof v !== 'string') return v;
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }, schema);

export const ShopSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be a lowercase slug'),
    name: text,
    phone: text,
    address: text,
    street: optionalText,
    city: text,
    postcode: text,
    rating: z.number().min(0).max(5).nullish(),
    reviews: z.number().int().nonnegative(),
    /** Day label -> one or more ranges such as "9am-8pm", "12-8pm", "Closed". Null when the listing has none. */
    hours: jsonish(z.record(z.string(), z.array(z.string())).nullish()),
    photo: optionalUrl,
    street_view: optionalUrl,
    reviews_link: optionalUrl,
    subtypes: optionalText,
    lat: z.number(),
    lng: z.number(),
    /** Root-absolute paths written by scripts/fetch-photos.mjs, e.g. "/photos/<slug>-1.jpg". */
    photos: z.array(z.string()).default([]),
    /** Outscraper "about": category -> attribute -> true/false, e.g. Accessibility -> "Wheelchair-accessible entrance" -> true. */
    about: jsonish(z.record(z.string(), z.record(z.string(), z.unknown())).nullish()),
    /** Outscraper "reviews_per_score": { "1": n, ... "5": n }. Some exports flatten it into reviews_per_score_1..5 instead. */
    reviews_per_score: jsonish(z.record(z.string(), z.coerce.number()).nullish()),
    reviews_per_score_1: z.coerce.number().nullish(),
    reviews_per_score_2: z.coerce.number().nullish(),
    reviews_per_score_3: z.coerce.number().nullish(),
    reviews_per_score_4: z.coerce.number().nullish(),
    reviews_per_score_5: z.coerce.number().nullish(),
  })
  .refine((s) => s.photo || s.street_view || s.photos.length, { message: 'needs a photo, a street_view image or photos[]', path: ['photos'] });

export type Shop = z.output<typeof ShopSchema>;

function parseShops(input: unknown): Shop[] {
  const result = z.array(ShopSchema).min(1).safeParse(input);
  if (!result.success) throw new Error(`src/data/barbers-5.json is invalid:\n\n${z.prettifyError(result.error)}\n`);
  const slugs = result.data.map((s) => s.slug);
  const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (dupes.length) throw new Error(`src/data/barbers-5.json has duplicate slugs: ${[...new Set(dupes)].join(', ')}`);
  return result.data;
}

/** Every listing, in file order. One page each. */
export const shops: Shop[] = parseShops(raw);

/* ---------- opening hours ---------- */

type Meridiem = 'am' | 'pm';
interface Clock {
  hour: number;
  minute: number;
  meridiem: Meridiem | null;
}

function parseClock(token: string): Clock | null {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(token.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2] ?? '0');
  if (hour > 24 || minute > 59) return null;
  return { hour, minute, meridiem: (m[3]?.toLowerCase() as Meridiem | undefined) ?? null };
}

/** Minutes since midnight. Without a meridiem the hour is read as a 24h clock. */
function minutesOf(c: Clock, meridiem: Meridiem | null): number {
  const hour = meridiem ? (c.hour % 12) + (meridiem === 'pm' ? 12 : 0) : c.hour;
  return hour * 60 + c.minute;
}

export type ParsedRange = 'closed' | { open: number; close: number };

/**
 * One range as the export writes it: "9am-8pm", "9:30am-7pm", "12-8pm",
 * "1:30-5:30pm", "Open 24 hours", "Closed". Times are minutes since midnight.
 * Null when the string is none of these shapes.
 */
export function parseRange(range: string): ParsedRange | null {
  const s = range.trim();
  if (/^closed$/i.test(s)) return 'closed';
  if (/^open 24 hours$/i.test(s)) return { open: 0, close: 24 * 60 - 1 };
  const parts = s.split('-');
  if (parts.length !== 2) return null;
  const from = parseClock(parts[0]!);
  const to = parseClock(parts[1]!);
  if (!from || !to) return null;
  const close = minutesOf(to, to.meridiem);
  // "12-8pm" carries one meridiem for both ends. Borrow it, and flip it when
  // that reads as open after close ("9-5pm" is 9am, not 9pm).
  let openMeridiem = from.meridiem ?? to.meridiem;
  let open = minutesOf(from, openMeridiem);
  if (!from.meridiem && to.meridiem && open >= close) {
    openMeridiem = to.meridiem === 'pm' ? 'am' : 'pm';
    open = minutesOf(from, openMeridiem);
  }
  return { open, close };
}

/** "9am-8pm" -> "9am – 8pm". Anything that is not two dash-joined tokens (Closed, Open 24 hours) is left alone. */
export function formatRange(range: string): string {
  return range.trim().replace(/^(\S+)-(\S+)$/, '$1 – $2');
}

export interface HoursRow {
  day: Day;
  label: DayLabel;
  text: string;
  closed: boolean;
}

/** The listing's hours as a Monday-to-Sunday list, or null when the listing has none. */
export function hoursList(hours: Shop['hours']): HoursRow[] | null {
  if (!hours || Object.keys(hours).length === 0) return null;
  return DAY_LABELS.map((label, i) => {
    const ranges = (hours[label] ?? []).map((r) => r.trim()).filter(Boolean);
    const closed = ranges.length === 0 || ranges.every((r) => parseRange(r) === 'closed');
    return { day: DAYS[i]!, label, text: closed ? 'Closed' : ranges.map(formatRange).join(', '), closed };
  });
}

export interface HoursRange {
  open: string;
  close: string;
}
/** One span per day in HH:MM, null on a closed day. */
export type Week = Record<Day, HoursRange | null>;

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * The listing's hours as a week table (HH:MM, one span per day). A split day
 * ("9am-1pm", "2-6pm") becomes its outer span; a close past midnight stops at
 * 23:59. Null when no day parses as open.
 */
export function toSchedule(hours: Shop['hours']): Week | null {
  if (!hours) return null;
  const week = {} as Week;
  let openDays = 0;
  DAYS.forEach((day, i) => {
    const spans = (hours[DAY_LABELS[i]!] ?? [])
      .map(parseRange)
      .filter((r): r is Exclude<ParsedRange, 'closed'> => r !== null && r !== 'closed');
    if (spans.length === 0) {
      week[day] = null;
      return;
    }
    const open = Math.min(...spans.map((s) => s.open));
    let close = Math.max(...spans.map((s) => s.close));
    if (close <= open) close = 24 * 60 - 1;
    week[day] = { open: hhmm(open), close: hhmm(close) };
    openDays++;
  });
  return openDays ? week : null;
}

/* ---------- small derivations ---------- */

/** "+44 20 8675 7999" -> "tel:+442086757999". */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** "+44 20 8675 7999" -> "020 8675 7999", the way the number is written on the door. Other formats pass through. */
export function phoneDisplay(phone: string): string {
  return phone.trim().replace(/^\+44\s*\(?0?\)?\s*/, '0');
}

/** First listed category, e.g. "Barber shop". */
export function kindOf(shop: Shop): string {
  return shop.subtypes?.split(',')[0]?.trim() || 'Barber shop';
}

/** Every attribute the listing marks true, across all "about" categories: "Wheelchair-accessible entrance", "Toilets", ... */
export function trueAttributes(about: Shop['about']): string[] {
  if (!about) return [];
  const out: string[] = [];
  for (const group of Object.values(about)) for (const [name, value] of Object.entries(group)) if (value === true) out.push(name);
  return out;
}

/** Review counts per star, 1..5, from either export shape. Null when the export has neither. */
export function reviewsPerScore(shop: Shop): Record<'1' | '2' | '3' | '4' | '5', number> | null {
  const flat = [shop.reviews_per_score_1, shop.reviews_per_score_2, shop.reviews_per_score_3, shop.reviews_per_score_4, shop.reviews_per_score_5];
  const source = shop.reviews_per_score ?? (flat.some((n) => n != null) ? Object.fromEntries(flat.map((n, i) => [String(i + 1), n ?? 0])) : null);
  if (!source) return null;
  const counts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  for (const key of Object.keys(counts) as (keyof typeof counts)[]) counts[key] = Math.max(0, Math.round(Number(source[key] ?? 0) || 0));
  return counts;
}
