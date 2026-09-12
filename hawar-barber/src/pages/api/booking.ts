export const prerender = false;
/**
 * POST /api/booking — accepts JSON (from the form's script) or a plain form post (no JavaScript).
 * Stores a booking request in D1 and, if configured, emails the shop. Never books anything by itself:
 * the shop confirms by text or phone.
 */
import type { APIRoute } from 'astro';
import { site } from '@config';
import { validateBooking, londonToday } from '@/lib/booking';
import { ensureSchema, insertBooking, countRecent } from '@/lib/db';
import { notify } from '@/lib/notify';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const htmlErrors = (errors: Record<string, string>, status = 400) =>
  new Response(
    `<!doctype html><html lang="en-GB"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Check the form</title>
<body style="font-family:system-ui,sans-serif;background:#0e0c0a;color:#f4eee4;padding:1.5rem;max-width:34rem;margin:auto;font-size:17px;line-height:1.5">
<h1 style="font-size:1.6rem">Please check the form</h1><ul>${Object.values(errors).map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
<p><a href="/book" style="color:#f2a93b;font-weight:700">Go back and try again</a></p></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const env = locals.runtime?.env ?? {};
  const type = request.headers.get('content-type') ?? '';
  const isForm = type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data');

  let input: Record<string, unknown> = {};
  try {
    input = isForm ? Object.fromEntries((await request.formData()).entries()) : ((await request.json()) as Record<string, unknown>);
  } catch {
    return isForm ? htmlErrors({ form: 'The form could not be read.' }) : json(400, { error: 'bad_request' });
  }
  if (!input || typeof input !== 'object') return json(400, { error: 'bad_request' });

  if (!site.booking.enabled) return isForm ? redirect('/book', 303) : json(404, { error: 'disabled' });
  if (!env.DB) return isForm ? redirect('/book/unavailable', 303) : json(503, { error: 'not_configured' });

  const result = validateBooking(input, londonToday());
  if (!result.ok) return isForm ? htmlErrors(result.errors) : json(400, { error: 'invalid', errors: result.errors });

  const ip = request.headers.get('cf-connecting-ip') ?? '';
  try {
    await ensureSchema(env.DB);
    if ((await countRecent(env.DB, ip, 15)) >= 5) {
      return isForm ? htmlErrors({ rate: 'Too many requests from this connection. Please call the shop instead.' }, 429) : json(429, { error: 'too_many' });
    }
    const id = crypto.randomUUID();
    await insertBooking(env.DB, { id, ...result.value, ip });
    try {
      await notify(env, { id, ...result.value });
    } catch {
      /* email is best-effort */
    }
    return isForm ? redirect('/book/sent', 303) : json(201, { ok: true, id, value: result.value });
  } catch (err) {
    console.error('booking failed', err);
    return isForm ? redirect('/book/unavailable', 303) : json(500, { error: 'server_error' });
  }
};

export const GET: APIRoute = () => new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
