export const prerender = false;
/** POST /api/admin/status — confirm / decline / done a request. Basic-auth protected like /admin. */
import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/auth';
import { ensureSchema, setStatus } from '@/lib/db';
import { STATUSES, type Status } from '@/lib/booking';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const env = locals.runtime?.env ?? {};
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (!env.DB) return new Response('No database bound.', { status: 503 });
  const form = await request.formData();
  const id = String(form.get('id') ?? '');
  const status = String(form.get('status') ?? '') as Status;
  if (!/^[0-9a-f-]{36}$/.test(id) || !STATUSES.includes(status)) return new Response('Bad request', { status: 400 });
  await ensureSchema(env.DB);
  await setStatus(env.DB, id, status);
  return redirect(`/admin#r-${id}`, 303);
};
