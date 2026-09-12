export const prerender = false;
/** POST /api/admin/login — form { password }. Sets the session cookie and returns to /admin. Ten wrong guesses in 15 minutes locks the connection out. */
import type { APIRoute } from 'astro';
import { clientIp, readInput, seeOther } from '@/lib/api';
import { allowAttempt, clearAttempts, ipKey } from '@/lib/db';
import { issueSession, safeEqual, setSessionCookie } from '@/lib/session';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;
  if (!env?.DB || !env.ADMIN_PASSWORD || !env.SESSION_SECRET) return seeOther('/admin?err=setup');
  const input = await readInput(request);
  const password = typeof input?.password === 'string' ? input.password : '';
  const key = `login:${ipKey(clientIp(request))}`;
  if (!(await allowAttempt(env.DB, key, 10, 15))) return seeOther('/admin?err=locked');
  if (!password || !safeEqual(password, env.ADMIN_PASSWORD)) return seeOther('/admin?err=wrong');
  await clearAttempts(env.DB, key);
  return new Response(null, { status: 303, headers: { Location: '/admin', 'Set-Cookie': setSessionCookie(await issueSession(env.SESSION_SECRET)), 'Cache-Control': 'no-store' } });
};
