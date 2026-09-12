// node scripts/booking-test.mjs [base]  → end-to-end checks against a running site (default: wrangler dev on :8787).
// Needs a fresh-ish local database; everything it creates is cancelled again at the end.
import { chromium } from 'playwright-core';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { chromePath } from './_chrome.mjs';

const BASE = (process.argv[2] || 'http://127.0.0.1:8787').replace(/\/$/, '');
const vars = Object.fromEntries((existsSync('.dev.vars') ? readFileSync('.dev.vars', 'utf8') : '').split('\n').filter((l) => l.includes('=')).map((l) => l.split('=').map((x) => x.trim())));
const ADMIN = vars.ADMIN_PASSWORD || 'local-dev-password';
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'ok ' : 'FAIL'} ${msg}`); if (!cond) failures++; };
const api = async (path, body, extra = {}) => {
  const res = await fetch(`${BASE}${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE, ...extra }, body: JSON.stringify(body) } : { headers: extra });
  return { status: res.status, json: await res.json().catch(() => ({})), headers: res.headers };
};
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fromMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const HOURS = { sunday: ['09:00', '16:00'], monday: ['09:00', '18:00'], tuesday: ['09:00', '18:00'], wednesday: ['09:00', '18:00'], thursday: ['09:00', '18:15'], friday: ['08:30', '18:30'], saturday: ['08:30', '18:00'] };
const dayName = (iso) => ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date(`${iso}T00:00:00Z`).getUTCDay()];
const created = [];

// 1. availability: shape, closing-time rule, notice rule
const av = await api('/api/availability?service=haircut');
ok(av.status === 200 && av.json.days?.length === 22, `availability: 22 days (today + 21) → ${av.json.days?.length}`);
const av45 = await api('/api/availability?service=skin-fade');
let closingOk = true;
for (const [svc, mins] of [[av, 30], [av45, 45]]) for (const d of svc.json.days) {
  if (d.closed) continue;
  const [open, close] = HOURS[dayName(d.date)];
  ok(d.hours.open === open && d.hours.close === close, `${d.date} ${dayName(d.date)} hours ${d.hours.open}-${d.hours.close}`) ;
  for (const s of d.slots) if (toMin(s) + mins > toMin(close) || toMin(s) < toMin(open)) { closingOk = false; console.log('   bad slot', d.date, s, mins); }
}
ok(closingOk, 'no slot ends after closing (30 and 45 minute services), none before opening');
const thu = av45.json.days.find((d) => dayName(d.date) === 'thursday' && d.slots.length);
const sun = av45.json.days.find((d) => dayName(d.date) === 'sunday' && d.slots.length);
ok(thu && thu.slots.at(-1) === '17:30', `Thursday last 45-min start is 17:30 (closes 18:15) → ${thu?.slots.at(-1)}`);
ok(sun && sun.slots.at(-1) === '15:15', `Sunday last 45-min start is 15:15 (closes 16:00) → ${sun?.slots.at(-1)}`);
const todayRow = av.json.days[0];
const nowLondon = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
ok(todayRow.slots.every((s) => toMin(s) >= toMin(nowLondon) + 60), `today's slots respect the 60-minute notice (now ${nowLondon}, first ${todayRow.slots[0] ?? 'none'})`);

// pick a day with plenty of room (skip today)
const day = av.json.days.slice(1).find((d) => !d.closed && d.slots.length > 6);
const t0 = day.slots[2];
const t15 = fromMin(toMin(t0) + 15);
const t30 = fromMin(toMin(t0) + 30);
console.log(`   using ${day.date} ${t0}`);

// 2. book, double-book, overlap, adjacent
const b1 = await api('/api/book', { service: 'haircut', date: day.date, time: t0, name: 'Test One', phone: '07700 900123' });
ok(b1.status === 201 && b1.json.booking?.token, `book ${t0} → 201 with a cancel token`);
if (b1.json.booking) created.push(b1.json.booking.token);
const dup = await api('/api/book', { service: 'haircut', date: day.date, time: t0, name: 'Test Two', phone: '07700 900124' });
ok(dup.status === 409 && dup.json.error === 'taken', `same slot again → 409 taken (got ${dup.status} ${dup.json.error})`);
ok(Array.isArray(dup.json.slots) && !dup.json.slots.includes(t0), 'the 409 lists the times still free, without the taken one');
const overlap = await api('/api/book', { service: 'skin-fade', date: day.date, time: t15, name: 'Test Three', phone: '07700 900125' });
ok(overlap.status === 409, `45-min fade at ${t15} overlapping the haircut → 409 (got ${overlap.status})`);
const adjacent = await api('/api/book', { service: 'haircut', date: day.date, time: t30, name: 'Test Four', phone: '07700 900126' });
ok(adjacent.status === 201, `haircut at ${t30}, right after → 201 (got ${adjacent.status})`);
if (adjacent.json.booking) created.push(adjacent.json.booking.token);
const av2 = await api('/api/availability?service=haircut');
const d2 = av2.json.days.find((d) => d.date === day.date);
ok(!d2.slots.includes(t0) && !d2.slots.includes(t15) && !d2.slots.includes(t30), 'availability no longer offers the booked times or the one that would overlap');

// 3. validation and abuse rules
const bad = await api('/api/book', { service: 'haircut', date: day.date, time: t0, name: 'X', phone: '12345', email: 'nope' });
ok(bad.status === 400 && bad.json.errors?.name && bad.json.errors?.phone && bad.json.errors?.email, 'bad name / phone / email → 400 with field errors');
const bot = await api('/api/book', { service: 'haircut', date: day.date, time: t0, name: 'Bot', phone: '07700 900127', website: 'spam' });
ok(bot.status === 400, 'honeypot filled → 400');
const past = await api('/api/book', { service: 'haircut', date: '2020-01-06', time: '10:00', name: 'Old', phone: '07700 900128' });
ok(past.status === 400 && past.json.errors?.date, 'a past date → 400');
const csrf = await fetch(`${BASE}/api/book`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: JSON.stringify({}) });
ok(csrf.status === 403, `POST from another origin → 403 (got ${csrf.status})`);
// phone limit: two more on other days with one number, third refused
const others = av2.json.days.slice(2).filter((d) => !d.closed && d.slots.length && d.date !== day.date).slice(0, 3);
const p = '07700 900129';
const l1 = await api('/api/book', { service: 'beard-trim', date: others[0].date, time: others[0].slots[0], name: 'Limit', phone: p });
const l2 = await api('/api/book', { service: 'beard-trim', date: others[1].date, time: others[1].slots[0], name: 'Limit', phone: p });
const l3 = await api('/api/book', { service: 'beard-trim', date: others[2].date, time: others[2].slots[0], name: 'Limit', phone: p });
for (const r of [l1, l2]) if (r.json.booking) created.push(r.json.booking.token);
ok(l1.status === 201 && l2.status === 201 && l3.status === 409 && l3.json.error === 'phone_limit', `two upcoming bookings per number, the third refused (${l1.status}/${l2.status}/${l3.status})`);

// 4. customer cancel through the page; slot returns
const browser = await chromium.launch({ executablePath: chromePath(), args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('dialog', (d) => d.accept());
mkdirSync('reports', { recursive: true });
await page.goto(`${BASE}${adjacent.json.booking.cancelUrl}`, { waitUntil: 'networkidle' });
ok((await page.textContent('h1'))?.includes('in.'), 'cancel page shows the booking');
await page.screenshot({ path: 'reports/cancel-390.png' });
await page.click('button:has-text("Cancel this booking")');
await page.waitForURL(/done=1/);
ok((await page.textContent('h1'))?.includes('Cancelled'), 'cancel page confirms the cancellation');
const av3 = await api('/api/availability?service=haircut');
ok(av3.json.days.find((d) => d.date === day.date).slots.includes(t30), `after cancelling, ${t30} is offered again`);
await page.goto(`${BASE}${adjacent.json.booking.cancelUrl}`);
ok((await page.textContent('h1'))?.includes('Already'), 'the same link now says already cancelled');
const missing = await page.goto(`${BASE}/cancel/nope-not-a-real-token-at-all-000`);
ok(missing.status() === 404, 'an unknown token is a 404');

// 5. admin: sign-in, list, cancel, block-out, clash, unblock
await page.goto(`${BASE}/admin`);
ok(await page.isVisible('input[name="password"]'), 'admin shows the sign-in form when signed out');
await page.fill('input[name="password"]', 'wrong-password');
await page.click('button:has-text("Sign in")');
await page.waitForURL(/err=wrong/);
ok(await page.isVisible('text=Wrong password'), 'wrong password is refused');
await page.fill('input[name="password"]', ADMIN);
await page.click('button:has-text("Sign in")');
await page.waitForURL((u) => !u.search.includes('err'));
ok(await page.isVisible('text=The list'), 'right password signs in');
const cookie = (await ctx.cookies()).find((c) => c.name === 'hb_admin');
ok(cookie?.httpOnly && cookie?.sameSite === 'Strict', `session cookie is HttpOnly + SameSite=Strict (${JSON.stringify({ httpOnly: cookie?.httpOnly, sameSite: cookie?.sameSite })})`);
// a booking for tomorrow so it shows on the dashboard: the last slot of the day, so the block-out below only overlaps it
const tomorrow = av3.json.days[1];
let tb = null;
if (!tomorrow.closed && tomorrow.slots.length) {
  const last = tomorrow.slots.at(-1);
  const from = fromMin(toMin(last) - 30);
  const to = tomorrow.hours.close;
  const r = await api('/api/book', { service: 'kids-cut', date: tomorrow.date, time: last, name: 'Dashboard Kid', phone: '07700 900130' });
  tb = r.json.booking; if (tb) created.push(tb.token);
  ok(r.status === 201, `booked Dashboard Kid at ${last} tomorrow (${r.status})`);
  await page.goto(`${BASE}/admin`);
  ok(await page.isVisible('text=Dashboard Kid'), "tomorrow's booking appears on the dashboard");
  await page.screenshot({ path: 'reports/admin-390.png', fullPage: true });
  // block-out that collides with it → refused with the name
  await page.selectOption('#block-date', tomorrow.date);
  await page.selectOption('#block-from', from);
  await page.selectOption('#block-to', to);
  await page.click('button:has-text("Block this time")');
  await page.waitForURL(/err=clash/);
  ok(await page.isVisible('text=Dashboard Kid'), 'a block over a booking is refused and names it');
  // cancel it from the dashboard
  await page.click('li:has-text("Dashboard Kid") form[action="/api/admin/cancel"] button');
  await page.waitForURL(/msg=cancelled/);
  ok(!(await page.isVisible('text=Dashboard Kid')), 'admin cancel removes it from the list');
  // block-out now succeeds and hides the slots
  await page.selectOption('#block-date', tomorrow.date);
  await page.selectOption('#block-from', from);
  await page.selectOption('#block-to', to);
  await page.fill('#block-note', 'Test block');
  await page.click('button:has-text("Block this time")');
  await page.waitForURL(/msg=blocked/);
  ok(await page.isVisible('text=Test block'), 'the block shows on the dashboard');
  const av4 = await api('/api/availability?service=haircut');
  const tom4 = av4.json.days.find((d) => d.date === tomorrow.date);
  const hidden = tomorrow.slots.filter((t) => toMin(t) + 30 > toMin(from));
  ok(hidden.length > 0 && hidden.every((t) => !tom4.slots.includes(t)), `blocked time hides its slots (${hidden.join(', ')})`);
  await page.click('li:has-text("Test block") form[action="/api/admin/unblock"] button');
  await page.waitForURL(/msg=unblocked/);
  const av5 = await api('/api/availability?service=haircut');
  ok(av5.json.days.find((d) => d.date === tomorrow.date).slots.includes(last), 'removing the block brings the slots back');
} else console.log('   (tomorrow is closed or full; dashboard checks skipped)');
const apiNoSession = await fetch(`${BASE}/api/admin/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE }, body: JSON.stringify({ id: '00000000-0000-0000-0000-000000000000' }) });
ok(apiNoSession.status === 401, `admin API without a session → 401 (got ${apiNoSession.status})`);
await page.click('button:has-text("Sign out")');
await page.waitForURL(/\/admin$/);
ok(await page.isVisible('input[name="password"]'), 'sign out works');

// 6. the customer flow in the browser at 390px
await page.goto(`${BASE}/book`, { waitUntil: 'networkidle' });
await page.click('label.choice:has-text("Skin fade")');
await page.waitForSelector('[data-days] .chip input:not([disabled])');
const dayInputs = await page.$$('[data-days] .chip input:not([disabled])');
await dayInputs[1].dispatchEvent('click');
await page.waitForSelector('[data-slots] .chip');
await page.screenshot({ path: 'reports/book-390-slots.png' });
const slotInputs = await page.$$('[data-slots] .chip input');
await slotInputs[slotInputs.length - 1].dispatchEvent('click');
await page.waitForSelector('[data-step="details"]:not([hidden])');
await page.fill('#name', 'Browser Test');
await page.fill('#phone', '07700 900131');
await page.fill('#email', 'browser@example.com');
await page.click('[data-submit]');
await page.waitForSelector('[data-done]:not(.hidden)');
const cancelHref = await page.getAttribute('[data-cancel-link]', 'href');
ok(cancelHref?.startsWith('/cancel/'), `browser flow: booked, confirmation shows a cancel link (${cancelHref})`);
ok((await page.textContent('[data-done-when]'))?.includes('Skin fade'), 'confirmation names the service, day and time');
await page.screenshot({ path: 'reports/book-390-done.png', fullPage: true });
if (cancelHref) created.push(cancelHref.split('/').pop());
// keyboard reachability: every control on /book has a focusable input
const focusables = await page.$$eval('[data-book] input, [data-book] button', (els) => els.filter((e) => !e.disabled && e.type !== 'hidden').length);
ok(focusables > 10, `booking form controls are real inputs and buttons (${focusables})`);
await browser.close();

// 7. clean up everything created
for (const token of created) await api('/api/cancel', { token });
console.log(failures ? `\n${failures} FAILED` : '\nBOOKING TESTS OK');
process.exit(failures ? 1 : 0);
