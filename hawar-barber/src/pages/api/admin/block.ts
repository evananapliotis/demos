export const prerender = false;
/** POST /api/admin/block — form { date, from, to, note }. Blocks every chair for that time; refuses if a booking sits inside it. */
import type { APIRoute } from 'astro';
import { readInput, seeOther, json, isFormPost } from '@/lib/api';
import { cellsFor, cfg, clean } from '@/lib/booking';
import { bookingsOverlapping, insertBlock } from '@/lib/db';
import { isIsoDate, toMin, zonedToUtc, fmtTime } from '@/lib/time';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;
  if (!env?.DB) return json(503, { error: 'not_configured' });
  const form = isFormPost(request);
  const input = await readInput(request);
  const date = clean(input?.date, 10);
  const from = clean(input?.from, 5);
  const to = clean(input?.to, 5);
  const note = clean(input?.note, 80);
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!isIsoDate(date) || !hhmm.test(from) || !hhmm.test(to) || toMin(to) <= toMin(from) || toMin(from) % cfg.cellMinutes || toMin(to) % cfg.cellMinutes) {
    return form ? seeOther('/admin?err=badblock') : json(400, { error: 'bad_request' });
  }
  const start = zonedToUtc(date, from);
  const end = zonedToUtc(date, to);
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const cells = cellsFor(start, minutes);
  const byChair = new Map<number, number[]>();
  for (let c = 1; c <= cfg.chairs; c++) byChair.set(c, cells);
  const id = crypto.randomUUID();
  const result = await insertBlock(env.DB, { id, start_utc: start.toISOString(), end_utc: end.toISOString(), local_date: date, local_from: from, local_to: to, note }, byChair);
  if (result === 'taken') {
    const clashes = await bookingsOverlapping(env.DB, cells[0], cells[cells.length - 1] + 1);
    const who = clashes.map((b) => `${fmtTime(b.local_time)} ${b.name}`).join(', ');
    return form ? seeOther(`/admin?err=clash&who=${encodeURIComponent(who)}`) : json(409, { error: 'clash', bookings: clashes.map((b) => ({ id: b.id, time: b.local_time, name: b.name })) });
  }
  return form ? seeOther('/admin?msg=blocked') : json(201, { ok: true, id });
};
