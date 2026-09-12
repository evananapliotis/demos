export const prerender = false;
/** GET /api/health → is the database bound and reachable, are the secrets set. No values, only yes/no. */
import type { APIRoute } from 'astro';
import { json } from '@/lib/api';
import { fmtInstant } from '@/lib/time';

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime?.env;
  let db = false;
  try {
    db = !!env?.DB && (await env.DB.prepare('SELECT 1 AS one').first<{ one: number }>())?.one === 1;
  } catch {
    db = false;
  }
  const admin = !!(env?.ADMIN_PASSWORD && env?.SESSION_SECRET);
  const email = !!(env?.RESEND_API_KEY && env?.SHOP_EMAIL);
  return json(db ? 200 : 503, { ok: db, db, admin, email, sender: !!env?.MAIL_FROM, shopTime: fmtInstant(new Date()) });
};
