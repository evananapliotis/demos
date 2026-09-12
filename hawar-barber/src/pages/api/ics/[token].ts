export const prerender = false;
/** GET /api/ics/<token> → an .ics file for the booking (Apple Calendar, Outlook). */
import type { APIRoute } from 'astro';
import { site } from '@config';
import { bookingByToken } from '@/lib/db';

const basic = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export const GET: APIRoute = async ({ params, locals }) => {
  const env = locals.runtime?.env;
  const token = params.token ?? '';
  const b = /^[A-Za-z0-9_-]{20,64}$/.test(token) && env?.DB ? await bookingByToken(env.DB, token) : null;
  if (!b || b.status !== 'confirmed') return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const host = new URL(site.url).host;
  const address = `${site.name}, ${site.address.street}, ${site.address.locality} ${site.address.postcode}`;
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${esc(site.name)}//Booking//EN`, 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${b.id}@${host}`, `DTSTAMP:${basic(new Date().toISOString())}`, `DTSTART:${basic(b.start_utc)}`, `DTEND:${basic(b.end_utc)}`,
    `SUMMARY:${esc(`${b.service_name} at ${site.name}`)}`, `LOCATION:${esc(address)}`,
    `DESCRIPTION:${esc(`${b.service_name} (${b.minutes} min). Need to cancel? ${site.url}/cancel/${b.token}`)}`, `URL:${site.url}/cancel/${b.token}`,
    'END:VEVENT', 'END:VCALENDAR', '',
  ];
  return new Response(lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="hawar-barber.ics"', 'Cache-Control': 'no-store' },
  });
};
