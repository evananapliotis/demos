/**
 * "Open now · closes 6:15pm" / "Closed · opens 8:30am tomorrow" from the weekly hours in the config,
 * on the shop's clock (Europe/London). Paints every [data-open-status] and [data-status-dot] on the page.
 */
import { shopClock } from './clock';

type Range = { open: string; close: string } | null;
const NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmt = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const s = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, '0')}${s}` : `${hh}${s}`;
};

export function openStatus(week: Record<string, Range>): { open: boolean; text: string } {
  const { day: d, minutes: mins } = shopClock();
  const today = week[NAMES[d]];
  if (today && mins >= toMin(today.open) && mins < toMin(today.close)) return { open: true, text: `Open now · closes ${fmt(today.close)}` };
  for (let i = 0; i < 7; i++) {
    const nd = (d + i) % 7;
    const h = week[NAMES[nd]];
    if (!h || (i === 0 && mins >= toMin(h.open))) continue;
    return { open: false, text: `Closed · opens ${fmt(h.open)} ${i === 0 ? 'today' : i === 1 ? 'tomorrow' : SHORT[nd]}` };
  }
  return { open: false, text: '' };
}

export function paintOpenStatus() {
  const targets = [...document.querySelectorAll<HTMLElement>('[data-open-status]')];
  const src = targets.find((t) => t.dataset.week);
  if (!src?.dataset.week) return;
  const { open, text } = openStatus(JSON.parse(src.dataset.week) as Record<string, Range>);
  if (!text) return;
  for (const t of targets) t.textContent = text;
  for (const dot of document.querySelectorAll<HTMLElement>('[data-status-dot]')) dot.dataset.state = open ? 'open' : 'closed';
}
