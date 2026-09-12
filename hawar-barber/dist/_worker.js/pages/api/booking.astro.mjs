globalThis.process ??= {}; globalThis.process.env ??= {};
import { f as fmtDay, a as fmtTime, d as displayPhone, v as validateBooking, l as londonNowMinutes, b as londonToday } from '../../chunks/booking_CAnzIwTU.mjs';
import { i as ipKey, e as ensureSchema, b as insertBookingLimited } from '../../chunks/db_BS7IL_Nv.mjs';
import { s as site } from '../../chunks/site.config_MgM_RWsI.mjs';
export { renderers } from '../../renderers.mjs';

const esc$1 = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
async function notify(env, b) {
  const key = env.RESEND_API_KEY?.trim();
  const to = env.BOOKINGS_EMAIL?.trim();
  if (!key || !to) return false;
  const when = `${fmtDay(b.day)} at ${fmtTime(b.time)}`;
  const phone = displayPhone(b.phone);
  const quoted = (t) => t.split("\n").map((l) => `> ${l}`).join("\n");
  const lines = [
    `Name: ${b.name}`,
    `Phone: ${phone}`,
    `When: ${when}`,
    b.service ? `For: ${b.service}` : "",
    b.notes ? `Notes:
${quoted(b.notes)}` : "",
    "",
    `Confirm or decline: ${site.url}/admin`
  ].filter(Boolean);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.BOOKINGS_FROM?.trim() || `${site.name} <onboarding@resend.dev>`,
      to: [to],
      subject: `Booking request: ${b.name}, ${when}`,
      text: lines.join("\n"),
      html: `<p>${lines.map((l) => esc$1(l).replace(/\n/g, "<br>")).join("<br>")}</p>`
    })
  });
  if (!res.ok) console.error("notify failed", res.status, await res.text().catch(() => ""));
  return res.ok;
}

const prerender = false;
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const htmlErrors = (errors, status = 400) => new Response(
  `<!doctype html><html lang="en-GB"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Check the form</title>
<body style="font-family:system-ui,sans-serif;background:#0e0c0a;color:#f4eee4;padding:1.5rem;max-width:34rem;margin:auto;font-size:17px;line-height:1.5">
<h1 style="font-size:1.6rem">Please check the form</h1><ul>${Object.values(errors).map((e) => `<li>${esc(e)}</li>`).join("")}</ul>
<p><a href="/book" style="color:#f2a93b;font-weight:700">Go back and try again</a></p></body></html>`,
  { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
);
const POST = async ({ request, locals, redirect }) => {
  const env = locals.runtime?.env ?? {};
  const type = request.headers.get("content-type") ?? "";
  const isForm = type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data");
  let input = {};
  try {
    input = isForm ? Object.fromEntries((await request.formData()).entries()) : await request.json();
  } catch {
    return isForm ? htmlErrors({ form: "The form could not be read." }) : json(400, { error: "bad_request" });
  }
  if (!input || typeof input !== "object") return json(400, { error: "bad_request" });
  if (!env.DB) return isForm ? redirect("/book/unavailable", 303) : json(503, { error: "not_configured" });
  const now = /* @__PURE__ */ new Date();
  const result = validateBooking(input, londonToday(now), londonNowMinutes(now));
  if (!result.ok) return isForm ? htmlErrors(result.errors) : json(400, { error: "invalid", errors: result.errors });
  const ip = ipKey(request.headers.get("cf-connecting-ip") ?? "");
  try {
    await ensureSchema(env.DB);
    const id = crypto.randomUUID();
    const stored = await insertBookingLimited(env.DB, { id, ...result.value, ip });
    if (!stored) {
      return isForm ? htmlErrors({ rate: "Too many requests right now. Please call the shop instead." }, 429) : json(429, { error: "too_many" });
    }
    try {
      await notify(env, { id, ...result.value });
    } catch {
    }
    return isForm ? redirect("/book/sent", 303) : json(201, { ok: true, id, value: result.value });
  } catch (err) {
    console.error("booking failed", err);
    return isForm ? redirect("/book/unavailable", 303) : json(500, { error: "server_error" });
  }
};
const GET = () => new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
