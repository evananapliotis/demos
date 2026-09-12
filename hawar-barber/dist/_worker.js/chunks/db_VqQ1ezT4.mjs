globalThis.process ??= {}; globalThis.process.env ??= {};
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    day TEXT NOT NULL,
    time TEXT NOT NULL,
    service TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    ip TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS bookings_status_day ON bookings(status, day, time)`,
  `CREATE INDEX IF NOT EXISTS bookings_ip_created ON bookings(ip, created_at)`,
  `CREATE INDEX IF NOT EXISTS bookings_created ON bookings(created_at)`,
  `CREATE TABLE IF NOT EXISTS auth_failures (ip TEXT NOT NULL, ts TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS auth_failures_ip_ts ON auth_failures(ip, ts)`
];
function ipKey(ip) {
  const s = ip.trim().toLowerCase();
  if (!s) return "";
  if (!s.includes(":")) return s;
  const [head] = s.split("::");
  const hextets = head.split(":").filter(Boolean);
  while (hextets.length < 4) hextets.push("0");
  return `${hextets.slice(0, 4).join(":")}::/64`;
}
const ready = /* @__PURE__ */ new WeakSet();
async function ensureSchema(db) {
  if (ready.has(db)) return;
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
  ready.add(db);
}
const LIMITS = { perIp: 5, perIpMinutes: 15, global: 40, globalMinutes: 60 };
async function insertBookingLimited(db, row) {
  const created = (/* @__PURE__ */ new Date()).toISOString();
  const ipSince = new Date(Date.now() - LIMITS.perIpMinutes * 6e4).toISOString();
  const globalSince = new Date(Date.now() - LIMITS.globalMinutes * 6e4).toISOString();
  const r = await db.prepare(
    `INSERT INTO bookings (id, created_at, name, phone, day, time, service, notes, status, ip)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?
       WHERE (SELECT COUNT(*) FROM bookings WHERE ip = ? AND created_at > ?) < ?
         AND (SELECT COUNT(*) FROM bookings WHERE created_at > ?) < ?`
  ).bind(row.id, created, row.name, row.phone, row.day, row.time, row.service, row.notes, row.ip, row.ip, ipSince, LIMITS.perIp, globalSince, LIMITS.global).run();
  return (r.meta?.changes ?? 0) > 0;
}
async function countAuthFailures(db, ip, minutes) {
  if (!ip) return 0;
  const since = new Date(Date.now() - minutes * 6e4).toISOString();
  const r = await db.prepare("SELECT COUNT(*) AS n FROM auth_failures WHERE ip = ? AND ts > ?").bind(ip, since).first();
  return r?.n ?? 0;
}
async function recordAuthFailure(db, ip) {
  if (!ip) return;
  const now = /* @__PURE__ */ new Date();
  await db.batch([
    db.prepare("INSERT INTO auth_failures (ip, ts) VALUES (?, ?)").bind(ip, now.toISOString()),
    db.prepare("DELETE FROM auth_failures WHERE ts < ?").bind(new Date(now.getTime() - 24 * 36e5).toISOString())
  ]);
}
async function listBookings(db, limit = 300) {
  const r = await db.prepare(
    `SELECT id, created_at, name, phone, day, time, service, notes, status, ip FROM bookings
       ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'confirmed' THEN 1 WHEN 'declined' THEN 2 ELSE 3 END, day, time
       LIMIT ?`
  ).bind(limit).all();
  return r.results ?? [];
}
async function setStatus(db, id, status) {
  const r = await db.prepare("UPDATE bookings SET status = ? WHERE id = ?").bind(status, id).run();
  return (r.meta?.changes ?? 0) > 0;
}

export { insertBookingLimited as a, countAuthFailures as c, ensureSchema as e, ipKey as i, listBookings as l, recordAuthFailure as r, setStatus as s };
