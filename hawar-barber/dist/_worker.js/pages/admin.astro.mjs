globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createAstro, a as createComponent, r as renderHead, b as renderTemplate, d as addAttribute } from '../chunks/astro/server_B7m6tOq4.mjs';
/* empty css                                */
import { s as site } from '../chunks/site.config_BFMOv_wd.mjs';
import { r as requireAdmin, n as noStoreHeaders } from '../chunks/auth_DfX3C_SF.mjs';
import { e as ensureSchema, l as listBookings } from '../chunks/db_BVh1G7o9.mjs';
import { f as fmtDay, a as fmtTime, d as displayPhone } from '../chunks/booking_xUeeAd_i.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro("https://hawar-barber.pages.dev");
const prerender = false;
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const env = Astro2.locals.runtime?.env ?? {};
  const denied = requireAdmin(Astro2.request, env);
  if (denied) return denied;
  for (const [k, v] of Object.entries(noStoreHeaders)) Astro2.response.headers.set(k, v);
  let rows = [];
  let dbError = "";
  if (!env.DB) dbError = 'No D1 database is bound as "DB" on this Pages project yet.';
  else {
    try {
      await ensureSchema(env.DB);
      rows = await listBookings(env.DB);
    } catch (e) {
      dbError = `Database error: ${e.message}`;
    }
  }
  const groups = [
    { status: "pending", label: "Waiting for you", rows: rows.filter((r) => r.status === "pending") },
    { status: "confirmed", label: "Confirmed", rows: rows.filter((r) => r.status === "confirmed") },
    { status: "declined", label: "Declined", rows: rows.filter((r) => r.status === "declined") },
    { status: "done", label: "Done", rows: rows.filter((r) => r.status === "done") }
  ];
  const actions = [
    { status: "confirmed", label: "Confirm", cls: "btn-amber" },
    { status: "declined", label: "Decline", cls: "btn-outline" },
    { status: "done", label: "Done", cls: "btn-outline" },
    { status: "pending", label: "Reopen", cls: "btn-outline" }
  ];
  return renderTemplate`<html lang="en-GB" class="bg-ink"> <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>Booking requests | ${site.name}</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">${renderHead()}</head> <body class="bg-ink text-cream antialiased"> <main class="mx-auto max-w-2xl px-5 py-8 sm:px-8"> <p class="eyebrow">${site.name}</p> <h1 class="mt-2 text-[clamp(2.5rem,12vw,4.5rem)]">Booking <span class="text-amber">requests.</span></h1> <p class="mt-3 text-cream-2">${groups[0].rows.length} waiting · ${rows.length} total. Confirm by texting or calling the customer, then mark it here.</p> ${dbError && renderTemplate`<p class="mt-6 rounded-md border border-amber/50 bg-amber/10 p-4 text-cream">${dbError}</p>`} ${groups.map((g) => g.rows.length > 0 && renderTemplate`<section class="mt-10"${addAttribute(`g-${g.status}`, "aria-labelledby")}> <h2${addAttribute(`g-${g.status}`, "id")} class="text-3xl">${g.label} <span class="text-cream-2">(${g.rows.length})</span></h2> <ul class="mt-4 grid gap-4" role="list"> ${g.rows.map((r) => renderTemplate`<li${addAttribute(`rounded-md border p-5 ${r.status === "pending" ? "border-amber/50 bg-ink-2" : "border-line bg-ink-2/60"}`, "class")}> <p class="display text-3xl">${fmtDay(r.day)} · ${fmtTime(r.time)}</p> <p class="mt-2 text-xl font-bold">${r.name}</p> <p class="mt-1"><a${addAttribute(`tel:${r.phone}`, "href")} class="inline-flex min-h-11 items-center font-bold text-amber">${displayPhone(r.phone)}</a> <a${addAttribute(`sms:${r.phone}`, "href")} class="ml-3 inline-flex min-h-11 items-center text-cream-2 underline">Text</a></p> ${r.service && renderTemplate`<p class="mt-1 text-cream/90">For: ${r.service}</p>`} ${r.notes && renderTemplate`<p class="mt-1 whitespace-pre-line text-cream-2">${r.notes}</p>`} <p class="mt-2 text-xs text-cream-2">Requested ${new Date(r.created_at).toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" })}</p> <div class="mt-4 flex flex-wrap gap-2"> ${actions.filter((a) => a.status !== r.status).map((a) => renderTemplate`<form method="post" action="/api/admin/status"> <input type="hidden" name="id"${addAttribute(r.id, "value")}> <input type="hidden" name="status"${addAttribute(a.status, "value")}> <button type="submit"${addAttribute(`btn ${a.cls} min-h-12 px-4 text-base`, "class")}>${a.label}</button> </form>`)} </div> </li>`)} </ul> </section>`)} ${!dbError && rows.length === 0 && renderTemplate`<p class="mt-10 text-lg text-cream-2">No requests yet. They’ll appear here the moment someone sends one from /book.</p>`} </main> </body></html>`;
}, "/home/user/demos/hawar-barber/src/pages/admin/index.astro", void 0);

const $$file = "/home/user/demos/hawar-barber/src/pages/admin/index.astro";
const $$url = "/admin.html";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
