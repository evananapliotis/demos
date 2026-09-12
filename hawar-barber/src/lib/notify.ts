/** Optional email on each new request, through Resend. Silently skipped unless RESEND_API_KEY and BOOKINGS_EMAIL are set. */
import type { Env } from './db';
import type { BookingValues } from './booking';
import { displayPhone, fmtDay, fmtTime } from './booking';
import { site } from '@config';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export async function notify(env: Env, b: BookingValues & { id: string }) {
  if (!env.RESEND_API_KEY || !env.BOOKINGS_EMAIL) return false;
  const when = `${fmtDay(b.day)} at ${fmtTime(b.time)}`;
  const phone = displayPhone(b.phone);
  const lines = [
    `Name: ${b.name}`,
    `Phone: ${phone}`,
    `When: ${when}`,
    b.service ? `For: ${b.service}` : '',
    b.notes ? `Notes: ${b.notes}` : '',
    '',
    `Confirm or decline: ${site.url}/admin`,
  ].filter(Boolean);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.BOOKINGS_FROM ?? `${site.name} <onboarding@resend.dev>`,
      to: [env.BOOKINGS_EMAIL],
      subject: `Booking request: ${b.name}, ${when}`,
      text: lines.join('\n'),
      html: `<p>${lines.map(esc).join('<br>')}</p>`,
    }),
  });
  return res.ok;
}
