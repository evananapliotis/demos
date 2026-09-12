/**
 * Europe/London clock helpers shared by the Worker and the browser. No config imports, so plain node can test it.
 * Dates are ISO "YYYY-MM-DD" London calendar dates; times are "HH:MM" London wall-clock; instants are Date (UTC).
 */
export const TZ = 'Europe/London';
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
export type DayName = (typeof DAY_NAMES)[number];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const pad = (n: number) => String(n).padStart(2, '0');
export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const fromMin = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short',
});
export interface LondonParts { y: number; m: number; d: number; h: number; mi: number; s: number; wd: number; date: string; hhmm: string }
/** The London wall clock at an instant. */
export function londonParts(at: Date): LondonParts {
  const p = partsFmt.formatToParts(at);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  const y = +get('year'), m = +get('month'), d = +get('day'), h = +get('hour') % 24, mi = +get('minute'), s = +get('second');
  return { y, m, d, h, mi, s, wd: WD.indexOf(get('weekday')), date: `${y}-${pad(m)}-${pad(d)}`, hhmm: `${pad(h)}:${pad(mi)}` };
}
/** London's offset from UTC, in minutes, at an instant (0 in winter, 60 in summer). */
export function offsetAt(at: Date): number {
  const p = londonParts(at);
  return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - at.getTime()) / 60000);
}
/** The instant of a London wall-clock time on a date. Correct on both sides of the clock changes. */
export function zonedToUtc(date: string, hhmm: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let t = guess - offsetAt(new Date(guess)) * 60000;
  const off2 = offsetAt(new Date(t));
  if (guess - off2 * 60000 !== t) t = guess - off2 * 60000;
  return new Date(t);
}
export function todayLondon(now: Date = new Date()): string {
  return londonParts(now).date;
}
export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function dayName(iso: string): DayName {
  return DAY_NAMES[new Date(`${iso}T00:00:00Z`).getUTCDay()];
}
/** "Sat 12 Sep" */
export function fmtDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}
/** "Saturday 12 September" */
export function fmtDayLong(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}
/** "9am", "6:15pm" */
export function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hh}:${pad(m)}${suffix}` : `${hh}${suffix}`;
}
/** "Sat 12 Sep, 7:05pm" in London time. */
export function fmtInstant(at: Date): string {
  const p = londonParts(at);
  return `${fmtDay(p.date)}, ${fmtTime(p.hhmm)}`;
}
