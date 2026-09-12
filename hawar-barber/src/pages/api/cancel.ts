export const prerender = false;
/** POST /api/cancel — { token }. The customer's own cancel link. Form posts are redirected back to the cancel page. */
import type { APIRoute } from 'astro';
import { isFormPost, json, readInput, seeOther } from '@/lib/api';
import { bookingByToken, cancelBooking } from '@/lib/db';
import { notifyCancelled } from '@/lib/notify';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;
  if (!env?.DB) return json(503, { error: 'not_configured' });
  const input = await readInput(request);
  const token = typeof input?.token === 'string' ? input.token.trim() : '';
  const form = isFormPost(request);
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return form ? seeOther('/cancel/invalid') : json(400, { error: 'bad_request' });
  const b = await bookingByToken(env.DB, token);
  if (!b) return form ? seeOther(`/cancel/${token}`) : json(404, { error: 'not_found' });
  if (b.status === 'confirmed') {
    const done = await cancelBooking(env.DB, b.id, 'customer');
    if (done) {
      const mail = notifyCancelled(env, b).catch((e) => console.error('notify failed', e));
      locals.runtime?.ctx?.waitUntil ? locals.runtime.ctx.waitUntil(mail) : await mail;
    }
  }
  return form ? seeOther(`/cancel/${token}?done=1`) : json(200, { ok: true, status: 'cancelled' });
};

export const GET: APIRoute = () => new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
