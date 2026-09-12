/** Optional email on each new request, through Resend. Skipped unless RESEND_API_KEY and BOOKINGS_EMAIL are set. */
import type { Env } from './db';
import type { BookingValues } from './booking';
import { displayPhone, fmtDay, fmtTime } from './booking';
import { site } from '@config';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export async function notify(env: Env, b: BookingValues & { id: string }) {
  const key = env.RESEND_API_KEY?.trim();
  const to = env.BOOKINGS_EMAIL?.trim();
  if (!key || !to) return false;
  const when = `${fmtDay(b.day)} at ${fmtTime(b.time)}`;
  const phone = displayPhone(b.phone);
  // Customer-written text is quoted line by line so it can never look like one of our own lines.
  const quoted = (t: string) => t.split('\n').map((l) => `> ${l}`).join('\n');
  const lines = [
    `Name: ${b.name}`,
    `Phone: ${phone}`,
    `When: ${when}`,
    b.service ? `For: ${b.service}` : '',
    b.notes ? `Notes:\n${quoted(b.notes)}` : '',
    '',
    `Confirm or decline: ${site.url}/admin`,
  ].filter(Boolean);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.BOOKINGS_FROM?.trim() || `${site.name} <onboarding@resend.dev>`,
      to: [to],
      subject: `Booking request: ${b.name}, ${when}`,
      text: lines.join('\n'),
      html: `<p>${lines.map((l) => esc(l).replace(/\n/g, '<br>')).join('<br>')}</p>`,
    }),
  });
  if (!res.ok) console.error('notify failed', res.status, await res.text().catch(() => ''));
  return res.ok;
}
