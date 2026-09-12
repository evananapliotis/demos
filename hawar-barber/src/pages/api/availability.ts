export const prerender = false;
/** GET /api/availability?service=<id> → every day in the booking window with the start times still free for that service. */
import type { APIRoute } from 'astro';
import { json } from '@/lib/api';
import { availableStarts, cellsFor, cfg, hoursFor, serviceById, services, windowDates } from '@/lib/booking';
import { occupied } from '@/lib/db';
import { fmtDay, zonedToUtc, todayLondon } from '@/lib/time';

export const GET: APIRoute = async ({ url, locals }) => {
  const env = locals.runtime?.env;
  if (!env?.DB) return json(503, { error: 'not_configured' });
  const wanted = url.searchParams.get('service') ?? '';
  const service = serviceById(wanted);
  if (!service && wanted !== 'all') return json(400, { error: 'unknown_service' });
  const now = new Date();
  const dates = windowDates(now);
  // One occupancy query for the whole window.
  const first = zonedToUtc(dates[0], '00:00');
  const last = zonedToUtc(dates[dates.length - 1], '23:59');
  const occ = await occupied(env.DB, cellsFor(first, 5)[0], cellsFor(last, 5)[0] + 1);
  // ?service=all → the next free start for every service (for the services list and the hero line).
  if (!service) {
    const next: Record<string, { date: string; time: string; label: string } | null> = {};
    for (const s of services) {
      next[s.id] = null;
      for (const date of dates) {
        if (!hoursFor(date)) continue;
        const starts = availableStarts(date, s.minutes, occ, now);
        if (starts.length) {
          next[s.id] = { date, time: starts[0], label: fmtDay(date) };
          break;
        }
      }
    }
    return json(200, { today: todayLondon(now), next }, { 'Cache-Control': 'no-store' });
  }
  const days = dates.map((date) => {
    const h = hoursFor(date);
    return {
      date,
      label: fmtDay(date),
      closed: !h,
      hours: h ? { open: h.open, close: h.close } : null,
      slots: h ? availableStarts(date, service.minutes, occ, now) : [],
    };
  });
  return json(200, { service: { id: service.id, name: service.name, minutes: service.minutes }, today: todayLondon(now), slotMinutes: cfg.slotMinutes, days });
};
