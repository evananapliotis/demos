/**
 * "Open now · closes 6pm" / "Closed · opens 9am tomorrow" from the week table on the
 * shop's clock (Europe/London). Paints every [data-open-status] and [data-status-dot] on the page.
 */
import { shopClock } from './clock.ts';

/** A day's opening spans, null or empty on a closed day. Two spans on a split day. */
type Day = { open: string; close: string }[] | null;
const NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h! * 60 + m!;
};
const fmt = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const s = h! >= 12 ? 'pm' : 'am';
  const hh = h! % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, '0')}${s}` : `${hh}${s}`;
};

export function openStatus(week: Record<string, Day>): { open: boolean; text: string } {
  const { day: d, minutes: mins } = shopClock();
  const spans = (n: number) => (week[NAMES[n]!] ?? []).slice().sort((a, b) => toMin(a.open) - toMin(b.open));

  // Open right now, in whichever of today's spans we are standing in.
  const now = spans(d).find((s) => mins >= toMin(s.open) && mins < toMin(s.close));
  if (now) return { open: true, text: `Open now · closes ${fmt(now.close)}` };

  // Otherwise the next opening: a later span today (the far side of a lunch
  // close) before any span on a later day.
  for (let i = 0; i < 7; i++) {
    const nd = (d + i) % 7;
    const next = spans(nd).find((s) => i > 0 || mins < toMin(s.open));
    if (!next) continue;
    return { open: false, text: `Closed · opens ${fmt(next.open)} ${i === 0 ? 'today' : i === 1 ? 'tomorrow' : SHORT[nd]}` };
  }
  return { open: false, text: '' };
}

export function paintOpenStatus() {
  const targets = [...document.querySelectorAll<HTMLElement>('[data-open-status]')];
  const src = targets.find((t) => t.dataset.week);
  if (!src?.dataset.week) return;
  const { open, text } = openStatus(JSON.parse(src.dataset.week) as Record<string, Day>);
  if (!text) return;
  for (const t of targets) t.textContent = text;
  for (const dot of document.querySelectorAll<HTMLElement>('[data-status-dot]')) dot.dataset.state = open ? 'open' : 'closed';
}
