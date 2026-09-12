/**
 * Booking rules shared by the form (browser) and the API (Cloudflare Worker).
 * Pure functions, no DOM, no database. Everything comes from site.config.ts.
 */
import { site, type Day } from '@config';

export const DAY_KEYS: Day[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
export const STATUSES = ['pending', 'confirmed', 'declined', 'done'] as const;
export type Status = (typeof STATUSES)[number];

export interface BookingValues {
  name: string;
  phone: string; // normalised, +44…
  day: string; // YYYY-MM-DD
  time: string; // HH:MM
  service: string;
  notes: string;
}

/** Today's date in the shop's timezone, as YYYY-MM-DD. */
export function londonToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
/** Minutes since midnight in the shop's timezone. */
export function londonNowMinutes(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return get('hour') * 60 + get('minute');
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function dayKey(iso: string): Day {
  return DAY_KEYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];
}

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Opening range for a date: from the weekly table when known, otherwise only the verified closing time. */
export function rangeFor(iso: string): { open: string | null; close: string; closed: boolean } {
  const week = site.hours.week;
  if (week) {
    const h = week[dayKey(iso)];
    return h ? { open: h.open, close: h.close, closed: false } : { open: null, close: site.hours.closes, closed: true };
  }
  return { open: null, close: site.hours.closes, closed: false };
}

/** Latest time a request may ask for on a date. A close of 00:00 means midnight. */
export function latestTime(iso: string): string {
  const closeMin = toMin(rangeFor(iso).close) || 24 * 60;
  return fromMin(Math.max(0, closeMin - site.booking.lastSlotBeforeClose));
}

/** Selectable slots for a date: [] when closed (or no usable slot), null when the opening time is not published (free time entry instead). */
export function slotsFor(iso: string): string[] | null {
  const r = rangeFor(iso);
  if (r.closed || !r.open) return r.closed ? [] : null;
  const out: string[] = [];
  for (let m = toMin(r.open); m <= toMin(latestTime(iso)); m += site.booking.slotMinutes) out.push(fromMin(m));
  return out;
}

/** UK numbers only ("07…", "+44 7…", "+44 (0)7…", "0044…", "44…"). Returns +44… or null. */
export function normalisePhone(raw: string): string | null {
  let s = raw.replace(/[\s().-]/g, '');
  if (s.startsWith('0044')) s = `+44${s.slice(4)}`;
  else if (s.startsWith('44') && (s.length === 11 || s.length === 12)) s = `+${s}`;
  else if (s.startsWith('0')) s = `+44${s.slice(1)}`;
  s = s.replace(/^\+440/, '+44'); // "+44 (0)7…"
  return /^\+44[1-9]\d{8,9}$/.test(s) ? s : null;
}

/** "+447918899141" → "07918 899141" */
export function displayPhone(e164: string): string {
  const n = e164.startsWith('+44') ? `0${e164.slice(3)}` : e164;
  return n.length === 11 ? `${n.slice(0, 5)} ${n.slice(5)}` : n;
}

export function fmtDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}
export function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hh}:${String(m).padStart(2, '0')}${suffix}` : `${hh}${suffix}`;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max + 1) : '');
/** Free text: keep line breaks, drop control and invisible-formatting characters (they can forge lines in the email). */
const text = (v: unknown, max: number) =>
  typeof v === 'string'
    ? v
        .replace(/\r\n?/g, '\n')
        .replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, max + 1)
    : '';
export const EXAMPLE_PHONE = '07700 900123'; // Ofcom drama range: never a real subscriber

export type Validation = { ok: true; value: BookingValues } | { ok: false; errors: Record<string, string> };

export function validateBooking(input: Record<string, unknown>, today: string, nowMinutes?: number): Validation {
  const errors: Record<string, string> = {};
  const name = str(input.name, 80);
  const phoneRaw = str(input.phone, 40);
  const day = str(input.day, 10);
  const time = str(input.time, 5);
  const service = str(input.service, 120);
  const notes = text(input.notes, 300);
  const website = str(input.website, 10); // honeypot: humans never see it

  if (website) return { ok: false, errors: { website: 'Spam check failed.' } };
  if (name.length < 2) errors.name = 'Enter your name.';
  else if (name.length > 80) errors.name = 'That name is too long.';
  const phone = normalisePhone(phoneRaw);
  if (!phone) errors.phone = `Enter a UK phone number, like ${EXAMPLE_PHONE}.`;
  if (!isIsoDate(day)) errors.day = 'Pick a day.';
  else if (day < today) errors.day = 'That day has passed.';
  else if (day > addDays(today, site.booking.daysAhead)) errors.day = `Pick a day within the next ${site.booking.daysAhead} days.`;
  else if (rangeFor(day).closed || slotsFor(day)?.length === 0) errors.day = 'The shop is closed that day.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) errors.time = 'Pick a time.';
  else if (!errors.day) {
    const r = rangeFor(day);
    const slots = slotsFor(day);
    if (slots && !slots.includes(time)) errors.time = `Pick a time between ${fmtTime(r.open!)} and ${fmtTime(latestTime(day))}.`;
    else if (toMin(time) > toMin(latestTime(day))) errors.time = `The shop closes at ${fmtTime(r.close)}. Pick a time no later than ${fmtTime(latestTime(day))}.`;
    else if (day === today && nowMinutes !== undefined && toMin(time) <= nowMinutes) errors.time = 'That time has already passed today. Pick a later one.';
  }
  if (site.services.length && service && !site.services.some((s) => s.name === service)) errors.service = 'Pick one of the listed services.';
  if (service.length > 120) errors.service = 'Keep that under 120 characters.';
  if (notes.length > 300) errors.notes = 'Keep notes under 300 characters.';

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, phone: phone!, day, time, service, notes } };
}

/** Text-message fallback when online booking is not switched on. */
export function smsBody(v: Partial<BookingValues>): string {
  let msg = "Hi, I'd like to book";
  if (v.day) msg += ` on ${fmtDay(v.day)}${v.time ? ` at ${fmtTime(v.time)}` : ''}`;
  msg += '.';
  if (v.name) msg += ` My name is ${v.name}.`;
  if (v.service) msg += ` It's for: ${v.service}.`;
  if (v.notes) msg += ` ${v.notes}`;
  return msg;
}
