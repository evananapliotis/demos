/**
 * The shop's clock. Weekday (0 = Sunday) and minutes since midnight in Europe/London, whatever
 * time zone the visitor's device is set to, so "Open now" and the "Today" row follow the shop's day.
 */
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function shopClock(now = new Date()): { day: number; minutes: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'long', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const day = DAYS.indexOf(get('weekday').toLowerCase());
    const h = Number(get('hour'));
    const m = Number(get('minute'));
    if (day >= 0 && Number.isFinite(h) && Number.isFinite(m)) return { day, minutes: (h % 24) * 60 + m };
  } catch {
    /* fall through to the device clock */
  }
  return { day: now.getDay(), minutes: now.getHours() * 60 + now.getMinutes() };
}
