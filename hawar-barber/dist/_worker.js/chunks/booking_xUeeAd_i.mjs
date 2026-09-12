globalThis.process ??= {}; globalThis.process.env ??= {};
import { s as site } from './site.config_BFMOv_wd.mjs';

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const STATUSES = ["pending", "confirmed", "declined", "done"];
function londonToday(now = /* @__PURE__ */ new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function addDays(iso, n) {
  const d = /* @__PURE__ */ new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function isIsoDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = /* @__PURE__ */ new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
const toMin = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const fromMin = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
function rangeFor(iso) {
  return { open: null, close: site.hours.closes, closed: false };
}
function latestTime(iso) {
  return fromMin(toMin(rangeFor().close) - site.booking.lastSlotBeforeClose);
}
function slotsFor(iso) {
  const r = rangeFor();
  if (r.closed || !r.open) return r.closed ? [] : null;
  const out = [];
  for (let m = toMin(r.open); m <= toMin(latestTime()); m += site.booking.slotMinutes) out.push(fromMin(m));
  return out;
}
function normalisePhone(raw) {
  let s = raw.replace(/[\s().-]/g, "");
  if (s.startsWith("0044")) s = `+44${s.slice(4)}`;
  else if (s.startsWith("44") && s.length === 12) s = `+${s}`;
  else if (s.startsWith("0")) s = `+44${s.slice(1)}`;
  return /^\+44[1-9]\d{8,9}$/.test(s) ? s : null;
}
function displayPhone(e164) {
  const n = e164.startsWith("+44") ? `0${e164.slice(3)}` : e164;
  return n.length === 11 ? `${n.slice(0, 5)} ${n.slice(5)}` : n;
}
function fmtDay(iso) {
  return (/* @__PURE__ */ new Date(`${iso}T00:00:00Z`)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}
function fmtTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hh}:${String(m).padStart(2, "0")}${suffix}` : `${hh}${suffix}`;
}
const str = (v, max) => typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max + 1) : "";
function validateBooking(input, today) {
  const errors = {};
  const name = str(input.name, 80);
  const phoneRaw = str(input.phone, 40);
  const day = str(input.day, 10);
  const time = str(input.time, 5);
  const service = str(input.service, 120);
  const notes = typeof input.notes === "string" ? input.notes.trim().slice(0, 301) : "";
  const website = str(input.website, 10);
  if (website) return { ok: false, errors: { website: "Spam check failed." } };
  if (name.length < 2) errors.name = "Enter your name.";
  else if (name.length > 80) errors.name = "That name is too long.";
  const phone = normalisePhone(phoneRaw);
  if (!phone) errors.phone = "Enter a UK phone number, like 07123 456789.";
  if (!isIsoDate(day)) errors.day = "Pick a day.";
  else if (day < today) errors.day = "That day has passed.";
  else if (day > addDays(today, site.booking.daysAhead)) errors.day = `Pick a day within the next ${site.booking.daysAhead} days.`;
  else if (rangeFor().closed) errors.day = "The shop is closed that day.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) errors.time = "Pick a time.";
  else if (!errors.day) {
    const r = rangeFor();
    const slots = slotsFor();
    if (slots && !slots.includes(time)) errors.time = `Pick a time between ${fmtTime(r.open)} and ${fmtTime(latestTime())}.`;
    else if (toMin(time) > toMin(latestTime())) errors.time = `The shop closes at ${fmtTime(r.close)}. Pick a time before ${fmtTime(latestTime())}.`;
  }
  if (site.services.length && service && !site.services.some((s) => s.name === service)) errors.service = "Pick one of the listed services.";
  if (service.length > 120) errors.service = "Keep that under 120 characters.";
  if (notes.length > 300) errors.notes = "Keep notes under 300 characters.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, phone, day, time, service, notes } };
}

export { DAY_KEYS as D, STATUSES as S, fmtTime as a, addDays as b, latestTime as c, displayPhone as d, fmtDay as f, londonToday as l, rangeFor as r, slotsFor as s, validateBooking as v };
