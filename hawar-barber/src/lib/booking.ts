/**
 * Booking rules, shared by the API and the browser. Pure functions over site.config.ts; no database, no DOM.
 */
import { site, type Service } from '@config';
import { addDays, dayName, fromMin, isIsoDate, londonParts, toMin, zonedToUtc } from './time';

export const cfg = site.booking;
export const services: Service[] = site.services;
export const serviceById = (id: string): Service | undefined => services.find((s) => s.id === id);

/** Opening hours on a date, or null when the shop is closed that day. */
export function hoursFor(date: string) {
  const week = site.hours.week;
  return week ? (week[dayName(date)] ?? null) : null;
}

/** Start times a service could begin at on a date: every slot step from opening, while it still ends by closing. */
export function candidateStarts(date: string, minutes: number): string[] {
  const h = hoursFor(date);
  if (!h) return [];
  const out: string[] = [];
  const close = toMin(h.close);
  for (let m = toMin(h.open); m + minutes <= close; m += cfg.slotMinutes) out.push(fromMin(m));
  return out;
}

/** The occupancy cells (UTC minutes since the epoch, one per cellMinutes) a booking of `minutes` from `start` takes. */
export function cellsFor(start: Date, minutes: number): number[] {
  const first = Math.floor(start.getTime() / 60000);
  const out: number[] = [];
  for (let m = 0; m < minutes; m += cfg.cellMinutes) out.push(first + m);
  return out;
}

/** chair → occupied cells */
export type Occupied = Map<number, Set<number>>;

/** The lowest-numbered chair with every cell free, or null. */
export function freeChair(occ: Occupied, cells: number[]): number | null {
  for (let c = 1; c <= cfg.chairs; c++) {
    const taken = occ.get(c);
    if (!taken || !cells.some((x) => taken.has(x))) return c;
  }
  return null;
}

/** The window customers can book in. */
export function bookingWindow(now: Date = new Date()) {
  const today = londonParts(now).date;
  return { today, last: addDays(today, cfg.horizonDays), earliest: new Date(now.getTime() + cfg.minNoticeMinutes * 60000) };
}

/** Start times still available on a date for a service, given what is occupied. */
export function availableStarts(date: string, minutes: number, occ: Occupied, now: Date = new Date()): string[] {
  const { earliest } = bookingWindow(now);
  return candidateStarts(date, minutes).filter((t) => {
    const start = zonedToUtc(date, t);
    return start >= earliest && freeChair(occ, cellsFor(start, minutes)) !== null;
  });
}

/** Every date in the booking window, closed or not. */
export function windowDates(now: Date = new Date()): string[] {
  const { today, last } = bookingWindow(now);
  const out: string[] = [];
  for (let d = today; d <= last; d = addDays(d, 1)) out.push(d);
  return out;
}

// ---- phone ----
/** UK numbers only ("07…", "+44 7…", "+44 (0)7…", "0044…", "44…"). Returns +44… or null. */
export function normalisePhone(raw: string): string | null {
  let s = raw.replace(/[\s().-]/g, '');
  if (s.startsWith('0044')) s = `+44${s.slice(4)}`;
  else if (s.startsWith('44') && (s.length === 11 || s.length === 12)) s = `+${s}`;
  else if (s.startsWith('0')) s = `+44${s.slice(1)}`;
  s = s.replace(/^\+440/, '+44');
  return /^\+44[1-9]\d{8,9}$/.test(s) ? s : null;
}
/** "+447918899141" → "07918 899141" */
export function displayPhone(e164: string): string {
  const n = e164.startsWith('+44') ? `0${e164.slice(3)}` : e164;
  return n.length === 11 ? `${n.slice(0, 5)} ${n.slice(5)}` : n;
}
export const EXAMPLE_PHONE = '07700 900123'; // Ofcom drama range: never a real subscriber

// ---- input cleaning ----
/** Control, bidi-override, zero-width and separator characters: none belong in a name. */
const INVISIBLE = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;
export const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim().slice(0, max + 1) : '');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface BookingInput { serviceId: string; date: string; time: string; name: string; phone: string; email: string | null }
export type Validation = { ok: true; value: BookingInput; service: Service; start: Date } | { ok: false; status: number; errors: Record<string, string> };

/** Validates a booking request against the config and the calendar. Occupancy is checked separately, in the database. */
export function validateBooking(input: Record<string, unknown>, now: Date = new Date()): Validation {
  const errors: Record<string, string> = {};
  if (clean(input.website, 10)) return { ok: false, status: 400, errors: { website: 'Spam check failed.' } };
  const serviceId = clean(input.service, 40);
  const date = clean(input.date, 10);
  const time = clean(input.time, 5);
  const name = clean(input.name, 80);
  const phone = normalisePhone(clean(input.phone, 40));
  const emailRaw = clean(input.email, 120).toLowerCase();

  const service = serviceById(serviceId);
  if (!service) errors.service = 'Pick a service.';
  if (name.length < 2) errors.name = 'Enter your name.';
  else if (name.length > 80) errors.name = 'That name is too long.';
  if (!phone) errors.phone = `Enter a UK phone number, like ${EXAMPLE_PHONE}.`;
  if (emailRaw && (!EMAIL.test(emailRaw) || emailRaw.length > 120)) errors.email = 'That email address does not look right.';

  const { today, last, earliest } = bookingWindow(now);
  let start: Date | null = null;
  if (!isIsoDate(date)) errors.date = 'Pick a day.';
  else if (date < today) errors.date = 'That day has passed.';
  else if (date > last) errors.date = `Pick a day within the next ${cfg.horizonDays} days.`;
  else if (!hoursFor(date)) errors.date = 'The shop is closed that day.';
  if (!errors.date && service) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !candidateStarts(date, service.minutes).includes(time)) errors.time = 'Pick one of the times offered.';
    else {
      start = zonedToUtc(date, time);
      if (start < earliest) errors.time = 'That time is too soon. Pick a later one.';
    }
  }
  if (Object.keys(errors).length || !service || !start || !phone) return { ok: false, status: 400, errors };
  return { ok: true, value: { serviceId, date, time, name, phone, email: emailRaw || null }, service, start };
}

/** 32 URL-safe random characters for cancel links. */
export function makeToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
