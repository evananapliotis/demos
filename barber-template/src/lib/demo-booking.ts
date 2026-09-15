/**
 * Booking rules for /<slug>/book. Pure functions over a listing's week
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
/**
 * A day's opening spans, null on a closed day. A list because a day can be
 * split: Patel & Co shut from 12:30 to 2:30 on a Friday, and one outer span
 * would offer start times while the door is locked.
 */
export type Week = Record<string, Range[] | null>;
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

/**
 * The week the booking page falls back to when a listing publishes none.
 *
 * 958 of the 1107 listings carry no hours at all: the export they came from
 * took only Text Search fields. With no week every day renders closed and the
 * page says nothing is free for three weeks, which shows the shop a booking
 * system that does not work. A standard barbershop week stands in instead —
 * Monday to Saturday, nine to six, closed Sunday — so the demo demonstrates
 * the thing it is meant to sell.
 *
 * These are not the shop's hours and are not presented as them: the shop page's
 * Find us still says the hours are not published, and the booking page says the
 * times follow a standard week. A constant, so the page stays deterministic.
 */
export const DEMO_WEEK: Week = {
  monday: [{ open: '09:00', close: '18:00' }],
  tuesday: [{ open: '09:00', close: '18:00' }],
  wednesday: [{ open: '09:00', close: '18:00' }],
  thursday: [{ open: '09:00', close: '18:00' }],
  friday: [{ open: '09:00', close: '18:00' }],
  saturday: [{ open: '09:00', close: '18:00' }],
  sunday: null,
};
export const EXAMPLE_PHONE = '07700 900123'; // Ofcom drama range: never a real subscriber

/** Opening spans on a date, or null when the shop is closed that day. */
export function hoursFor(week: Week | null, date: string): Range[] | null {
  const spans = week ? (week[dayName(date)] ?? null) : null;
  return spans && spans.length ? spans : null;
}

/**
 * Start times a service could begin at on a date: every slot step from each
 * opening, while the appointment still ends by that span's closing.
 *
 * Per span, not across the day: a cut booked at 12:15 on a split Friday would
 * run past the half-twelve close and into the two hours the shop is shut, so
 * the last Friday morning start is the one that finishes by 12:30 and the
 * afternoon starts again at 2:30.
 */
export function candidateStarts(week: Week | null, date: string, minutes: number, rules: BookingRules = RULES): string[] {
  const spans = hoursFor(week, date);
  if (!spans) return [];
  const out: string[] = [];
  for (const span of spans) {
    const close = toMin(span.close);
    for (let m = toMin(span.open); m + minutes <= close; m += rules.slotMinutes) out.push(fromMin(m));
  }
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

/**
 * A stable "already booked" pattern per shop, so the same day always shows the
 * same gaps.
 *
 * FNV-1a rather than djb2. djb2 changes by a fixed multiple per appended
 * character, so with the date and time always the same shape the low bits
 * stayed a near-linear function of the seed: across 300 shops, 95 of them drew
 * a diary with nothing taken at all and a third drew one over half full. Every
 * time of day was taken at about the right rate — it was the spread between
 * shops that was wrong. FNV-1a avalanches, so each shop gets its own scatter of
 * gaps at the intended density.
 */
export function isTaken(seed: string, date: string, time: string, fraction: number): boolean {
  const s = `${seed}|${date}|${time}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 10000) / 10000 < fraction;
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
  /** Every span the shop is open that day; two on a split day. */
  hours: Range[] | null;
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
