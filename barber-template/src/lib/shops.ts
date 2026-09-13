/**
 * Listings behind /demo/[slug].
 *
 * src/data/barbers-5.json is an export of Google Business listings, one
 * object per shop. Every entry is validated here so a bad or missing field
 * fails the build naming the entry and the key, in the same spirit as
 * site.schema.ts. The helpers below derive what the demo page needs from a
 * listing: the hours as a Monday-to-Sunday list, a booking schedule in HH:MM,
 * a tel: href, a brand mark.
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
    hours: z.record(z.string(), z.array(z.string())).nullish(),
    photo: optionalUrl,
    street_view: optionalUrl,
    reviews_link: optionalUrl,
    subtypes: optionalText,
    lat: z.number(),
    lng: z.number(),
  })
  .refine((s) => s.photo || s.street_view, { message: 'needs a photo or a street_view image', path: ['photo'] });

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
  day: DayLabel;
  text: string;
  closed: boolean;
}

/** The listing's hours as a Monday-to-Sunday list, or null when the listing has none. */
export function hoursList(hours: Shop['hours']): HoursRow[] | null {
  if (!hours || Object.keys(hours).length === 0) return null;
  return DAY_LABELS.map((day) => {
    const ranges = (hours[day] ?? []).map((r) => r.trim()).filter(Boolean);
    const closed = ranges.length === 0 || ranges.every((r) => parseRange(r) === 'closed');
    return { day, text: closed ? 'Closed' : ranges.map(formatRange).join(', '), closed };
  });
}

export type DayHours = 'closed' | { open: string; close: string };
export type Schedule = Record<Day, DayHours>;

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * The listing's hours in the shape the booking flow reads (HH:MM, one span
 * per day). A split day ("9am-1pm", "2-6pm") becomes its outer span; a close
 * past midnight stops at 23:59. Null when no day parses as open.
 */
export function toSchedule(hours: Shop['hours']): Schedule | null {
  if (!hours) return null;
  const schedule = {} as Schedule;
  let openDays = 0;
  DAYS.forEach((day, i) => {
    const spans = (hours[DAY_LABELS[i]!] ?? [])
      .map(parseRange)
      .filter((r): r is Exclude<ParsedRange, 'closed'> => r !== null && r !== 'closed');
    if (spans.length === 0) {
      schedule[day] = 'closed';
      return;
    }
    const open = Math.min(...spans.map((s) => s.open));
    let close = Math.max(...spans.map((s) => s.close));
    if (close <= open) close = 24 * 60 - 1;
    schedule[day] = { open: hhmm(open), close: hhmm(close) };
    openDays++;
  });
  return openDays ? schedule : null;
}

/** Mon-Sat 09:00-18:00. Used by the booking demo only when a listing has no usable hours, so its calendar is not empty. */
const DEFAULT_SCHEDULE: Schedule = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: { open: '09:00', close: '18:00' },
  sunday: 'closed',
};

export function bookingSchedule(hours: Shop['hours']): Schedule {
  return toSchedule(hours) ?? DEFAULT_SCHEDULE;
}

/* ---------- small derivations ---------- */

/** "+44 20 8675 7999" -> "tel:+442086757999". */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** Up to three initials for the brand mark: "Jacksons for Hair" -> "JFH", "N&J cutz" -> "NJC". */
export function initials(name: string): string {
  const letters = name
    .split(/[\s&|/+·-]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').charAt(0).toUpperCase())
    .filter((c) => /^[A-Z0-9]$/.test(c));
  return letters.slice(0, 3).join('') || name.charAt(0).toUpperCase() || 'B';
}

/** First listed category, e.g. "Barber shop". */
export function kindOf(shop: Shop): string {
  return shop.subtypes?.split(',')[0]?.trim() || 'Barber shop';
}

export function mapsUrl(shop: Shop): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.name}, ${shop.address}`)}`;
}
