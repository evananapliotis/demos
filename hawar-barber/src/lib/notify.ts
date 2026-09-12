/** Email through Resend. Skipped (with a log line) until RESEND_API_KEY and SHOP_EMAIL are set. */
import type { Env, BookingRow } from './db';
import { site } from '@config';
import { displayPhone } from './booking';
import { fmtDayLong, fmtTime } from './time';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

async function send(env: Env, to: string, subject: string, lines: string[]): Promise<boolean> {
  const key = env.RESEND_API_KEY?.trim();
  if (!key) {
    console.log('email skipped (no RESEND_API_KEY):', subject);
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM?.trim() || `${site.name} <onboarding@resend.dev>`,
      to: [to],
      subject,
      text: lines.join('\n'),
      html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5">${lines.map((l) => (l ? `<p style="margin:0 0 .5em">${esc(l)}</p>` : '<br>')).join('')}</div>`,
    }),
  });
  if (!res.ok) console.error('email failed', res.status, await res.text().catch(() => ''));
  return res.ok;
}

const when = (b: BookingRow) => `${fmtDayLong(b.local_date)} at ${fmtTime(b.local_time)}`;
/** One word of the name, letters only, for the greeting in mail that goes to the customer. */
const firstName = (name: string) => (name.split(' ')[0] ?? '').replace(/[^\p{L}\p{M}'-]/gu, '').slice(0, 20);
const endTime = (b: BookingRow) => {
  const [h, m] = b.local_time.split(':').map(Number);
  const e = h * 60 + m + b.minutes;
  return fmtTime(`${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`);
};

/** To the shop on every new booking, and to the customer when they gave an email. */
export async function notifyNewBooking(env: Env, b: BookingRow): Promise<void> {
  const cancelUrl = `${site.url}/cancel/${b.token}`;
  const shop = env.SHOP_EMAIL?.trim();
  if (shop) {
    await send(env, shop, `New booking: ${b.service_name}, ${when(b)}`, [
      `${b.name} has booked ${b.service_name} (${b.minutes} min).`,
      `When: ${when(b)} to ${endTime(b)}`,
      `Phone: ${displayPhone(b.phone)}`,
      b.email ? `Email: ${b.email}` : '',
      '',
      `Today's list: ${site.url}/admin`,
    ].filter((l, i, a) => l || (i > 0 && a[i - 1])));
  }
  if (b.email) {
    await send(env, b.email, `Booked: ${b.service_name} at ${site.name}, ${when(b)}`, [
      `Hi ${firstName(b.name) || 'there'}, you're booked in.`,
      `${b.service_name} (${b.minutes} min), ${when(b)}.`,
      `${site.name}, ${site.address.street}, ${site.address.locality} ${site.address.postcode}.`,
      '',
      `Need to cancel? ${cancelUrl}`,
      `Questions? Call ${site.phone.display}.`,
    ]);
  }
}

/** To the customer (when they gave an email) after the shop cancels from /admin. */
export async function notifyCancelledByShop(env: Env, b: BookingRow): Promise<void> {
  if (!b.email) return;
  await send(env, b.email, `Cancelled: your ${b.service_name} at ${site.name}, ${when(b)}`, [
    `Hi ${firstName(b.name) || 'there'}, sorry: the shop has had to cancel your ${b.service_name} on ${when(b)}.`,
    `Book another time: ${site.url}/book`,
    `Or call ${site.phone.display}.`,
  ]);
}

/** To the shop when a customer cancels through their link. */
export async function notifyCancelled(env: Env, b: BookingRow): Promise<void> {
  const shop = env.SHOP_EMAIL?.trim();
  if (!shop) return;
  await send(env, shop, `Cancelled: ${b.service_name}, ${when(b)}`, [
    `${b.name} has cancelled ${b.service_name} on ${when(b)}.`,
    `Phone: ${displayPhone(b.phone)}`,
    `The slot is open again.`,
  ]);
}
