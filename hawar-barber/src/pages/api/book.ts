export const prerender = false;
/**
 * POST /api/book — JSON { service, date, time, name, phone, email?, website (honeypot) }.
 * Validates, then writes the booking and its occupancy cells in one atomic batch per chair;
 * a clash on every chair is 409 with the times still free, so the form can offer them.
 */
import type { APIRoute } from 'astro';
import { site } from '@config';
import { clientIp, json, readInput } from '@/lib/api';
import { availableStarts, cellsFor, cfg, validateBooking, makeToken } from '@/lib/booking';
import { activeBookingsForPhone, allowAttempt, insertBooking, ipKey, occupied, type NewBooking } from '@/lib/db';
import { notifyNewBooking } from '@/lib/notify';
import { zonedToUtc } from '@/lib/time';

const LIMIT = { perIp: 12, perIpMinutes: 15, global: 120, globalMinutes: 60 };

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;
  if (!site.booking.enabled) return json(404, { error: 'disabled' });
  if (!env?.DB) return json(503, { error: 'not_configured' });
  const input = await readInput(request);
  if (!input) return json(400, { error: 'bad_request' });

  const now = new Date();
  const v = validateBooking(input, now);
  if (!v.ok) return json(v.status, { error: 'invalid', errors: v.errors });
  const { value, service, start } = v;

  const ip = ipKey(clientIp(request));
  if (!(await allowAttempt(env.DB, `book:${ip}`, LIMIT.perIp, LIMIT.perIpMinutes)) || !(await allowAttempt(env.DB, 'book:all', LIMIT.global, LIMIT.globalMinutes))) {
    return json(429, { error: 'too_many' });
  }
  if ((await activeBookingsForPhone(env.DB, value.phone)) >= cfg.maxActivePerPhone) {
    return json(409, { error: 'phone_limit', message: `That number already has ${cfg.maxActivePerPhone} upcoming bookings. Cancel one first, or call the shop.` });
  }

  const cells = cellsFor(start, service.minutes);
  const end = new Date(start.getTime() + service.minutes * 60000);
  const id = crypto.randomUUID();
  const token = makeToken();
  const base: Omit<NewBooking, 'chair'> = {
    id, token, service_id: service.id, service_name: service.name, minutes: service.minutes,
    start_utc: start.toISOString(), end_utc: end.toISOString(), local_date: value.date, local_time: value.time,
    name: value.name, phone: value.phone, email: value.email, ip_key: ip,
  };
  // Try each chair in turn; the batch fails atomically when any cell is already taken.
  let chair = 0;
  for (let c = 1; c <= cfg.chairs; c++) {
    if ((await insertBooking(env.DB, { ...base, chair: c }, cells)) === 'ok') {
      chair = c;
      break;
    }
  }
  if (!chair) {
    const dayStart = zonedToUtc(value.date, '00:00');
    const occ = await occupied(env.DB, cellsFor(dayStart, 5)[0], cellsFor(dayStart, 5)[0] + 1440);
    return json(409, { error: 'taken', message: 'Someone took that time a moment ago. Pick another.', slots: availableStarts(value.date, service.minutes, occ, now) });
  }

  const row = { ...base, chair, status: 'confirmed' as const, created_at: now.toISOString(), cancelled_at: null, cancelled_by: null };
  const emails = notifyNewBooking(env, row).catch((e) => console.error('notify failed', e));
  locals.runtime?.ctx?.waitUntil ? locals.runtime.ctx.waitUntil(emails) : await emails;

  return json(201, {
    ok: true,
    booking: { id, token, service: service.name, minutes: service.minutes, date: value.date, time: value.time, name: value.name, phone: value.phone, email: value.email, cancelUrl: `/cancel/${token}`, startUtc: start.toISOString(), endUtc: end.toISOString() },
  });
};

export const GET: APIRoute = () => new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
