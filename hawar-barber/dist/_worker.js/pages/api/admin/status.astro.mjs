globalThis.process ??= {}; globalThis.process.env ??= {};
import { r as requireAdmin } from '../../../chunks/auth_CwivacKv.mjs';
import { e as ensureSchema, s as setStatus } from '../../../chunks/db_VqQ1ezT4.mjs';
import { S as STATUSES } from '../../../chunks/booking_iEIU8MmW.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const POST = async ({ request, locals, redirect }) => {
  const env = locals.runtime?.env ?? {};
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (!env.DB) return new Response("No database bound.", { status: 503 });
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id) || !STATUSES.includes(status)) return new Response("Bad request", { status: 400 });
  await ensureSchema(env.DB);
  await setStatus(env.DB, id, status);
  return redirect(`/admin#r-${id}`, 303);
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
