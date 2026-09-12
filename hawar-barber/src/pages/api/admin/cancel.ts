export const prerender = false;
/** POST /api/admin/cancel — form { id }. Session checked in middleware. */
import type { APIRoute } from 'astro';
import { readInput, seeOther, json, isFormPost } from '@/lib/api';
import { bookingById, cancelBooking } from '@/lib/db';
import { notifyCancelledByShop } from '@/lib/notify';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;
  if (!env?.DB) return json(503, { error: 'not_configured' });
  const input = await readInput(request);
  const id = typeof input?.id === 'string' ? input.id : '';
  if (!/^[0-9a-f-]{36}$/.test(id)) return isFormPost(request) ? seeOther('/admin?err=bad') : json(400, { error: 'bad_request' });
  const b = await bookingById(env.DB, id);
  const ok = await cancelBooking(env.DB, id, 'admin');
  if (ok && b) {
    const mail = notifyCancelledByShop(env, b).catch((e) => console.error('notify failed', e));
    locals.runtime?.ctx?.waitUntil ? locals.runtime.ctx.waitUntil(mail) : await mail;
  }
  return isFormPost(request) ? seeOther(ok ? '/admin?msg=cancelled' : '/admin?err=gone') : json(ok ? 200 : 409, { ok });
};
