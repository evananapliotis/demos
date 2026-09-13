/**
 * Booking rules for /demo/<slug>/book. Pure functions over a listing's week
 * table: no DOM, no network. The demo has no database, so "taken" times are
 * a stable pattern seeded by the shop, enough to make the calendar look
 * lived-in, and a booking is confirmed on screen only.
 */
import { addDays, dayName, fmtDay, fromMin, londonParts, toMin, zonedToUtc } from './time.ts';

export interface Service {
  id: string;
  name: string;
  minutes: number;
}
export interface Range {
  open: string;
  close: string;
}
export type Week = Record<string, Range | null>;
export interface BookingRules {
  /** Start times are offered every this many minutes. */
  slotMinutes: number;
  /** Nothing can be booked closer than this to now. */
  minNoticeMinutes: number;
  /** How far ahead the calendar goes. */
  horizonDays: number;
  /** Share of start times shown as already taken. */
  busyFraction: number;
}

/** The services every demo shop offers, with how long each takes. */
export const SERVICES: Service[] = [
  { id: 'haircut', name: 'Haircut', minutes: 30 },
  { id: 'skin-fade', name: 'Skin fade', minutes: 45 },
  { id: 'beard-trim', name: 'Beard trim', minutes: 20 },
  { id: 'haircut-beard', name: 'Haircut & beard', minutes: 50 },
  { id: 'kids-cut', name: 'Kids cut', minutes: 20 },
  { id: 'hot-towel-shave', name: 'Hot towel shave', minutes: 30 },
];
export const RULES: BookingRules = { slotMinutes: 15, minNoticeMinutes: 60, horizonDays: 21, busyFraction: 0.3 };
export const EXAMPLE_PHONE = '07700 900123'; // Ofcom drama range: never a real subscriber

/** Opening hours on a date, or null when the shop is closed that day. */
export function hoursFor(week: Week | null, date: string): Range | null {
  return week ? (week[dayName(date)] ?? null) : null;
}

/** Start times a service could begin at on a date: every slot step from opening, while it still ends by closing. */
export function candidateStarts(week: Week | null, date: string, minutes: number, rules: BookingRules = RULES): string[] {
  const h = hoursFor(week, date);
  if (!h) return [];
  const out: string[] = [];
  const close = toMin(h.close);
  for (let m = toMin(h.open); m + minutes <= close; m += rules.slotMinutes) out.push(fromMin(m));
  return out;
}

/** The window customers can book in. */
export function bookingWindow(rules: BookingRules = RULES, now: Date = new Date()) {
  const today = londonParts(now).date;
  return { today, last: addDays(today, rules.horizonDays), earliest: new Date(now.getTime() + rules.minNoticeMinutes * 60000) };
}

/** Every date in the booking window, closed or not. */
export function windowDates(rules: BookingRules = RULES, now: Date = new Date()): string[] {
  const { today, last } = bookingWindow(rules, now);
  const out: string[] = [];
  for (let d = today; d <= last; d = addDays(d, 1)) out.push(d);
  return out;
}

/** A stable "already booked" pattern per shop, so the same day always shows the same gaps. */
export function isTaken(seed: string, date: string, time: string, fraction: number): boolean {
  const s = `${seed}|${date}|${time}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1000) / 1000 < fraction;
}

/** Start times still available on a date for a service. */
export function availableStarts(week: Week | null, date: string, minutes: number, seed: string, rules: BookingRules = RULES, now: Date = new Date()): string[] {
  const { earliest } = bookingWindow(rules, now);
  return candidateStarts(week, date, minutes, rules).filter((t) => zonedToUtc(date, t) >= earliest && !isTaken(seed, date, t, rules.busyFraction));
}

export interface Day {
  date: string;
  label: string;
  closed: boolean;
  hours: Range | null;
  slots: string[];
}

/** What /api/availability returned on the live site: every day in the window with the start times still free. */
export function availability(week: Week | null, service: Service, seed: string, rules: BookingRules = RULES, now: Date = new Date()): { today: string; days: Day[] } {
  const days = windowDates(rules, now).map((date) => {
    const h = hoursFor(week, date);
    return { date, label: fmtDay(date), closed: !h, hours: h, slots: h ? availableStarts(week, date, service.minutes, seed, rules, now) : [] };
  });
  return { today: bookingWindow(rules, now).today, days };
}

// ---- details ----

/** UK numbers only ("07…", "+44 7…", "+44 (0)7…", "0044…", "44…"). Returns +44… or null. */
export function normalisePhone(raw: string): string | null {
  let s = raw.replace(/[\s().-]/g, '');
  if (s.startsWith('0044')) s = `+44${s.slice(4)}`;
  else if (s.startsWith('44') && (s.length === 11 || s.length === 12)) s = `+${s}`;
  else if (s.startsWith('0')) s = `+44${s.slice(1)}`;
  s = s.replace(/^\+440/, '+44');
  return /^\+44[1-9]\d{8,9}$/.test(s) ? s : null;
}

/** Control, bidi-override, zero-width and separator characters: none belong in a name. */
const INVISIBLE = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;
export const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim().slice(0, max + 1) : '');
const EMAIL = /^[^\s@<>"'(),;]+@[^\s@<>"'(),;]+\.[^\s@<>"'(),;]{2,}$/;

export interface Details {
  name: string;
  phone: string;
  email: string | null;
}
export type DetailsCheck = { ok: true; value: Details } | { ok: false; errors: Record<string, string> };

/** The same checks the live site's API made on name, phone and email. */
export function validateDetails(input: { name: unknown; phone: unknown; email: unknown }): DetailsCheck {
  const errors: Record<string, string> = {};
  const name = clean(input.name, 80);
  const phone = normalisePhone(clean(input.phone, 40));
  const email = clean(input.email, 120).toLowerCase();
  if (name.length < 2) errors.name = 'Enter your name.';
  else if (name.length > 80) errors.name = 'That name is too long.';
  if (!phone) errors.phone = `Enter a UK phone number, like ${EXAMPLE_PHONE}.`;
  if (email && (!EMAIL.test(email) || email.length > 120)) errors.email = 'That email address does not look right.';
  if (Object.keys(errors).length || !phone) return { ok: false, errors };
  return { ok: true, value: { name, phone, email: email || null } };
}
