globalThis.process ??= {}; globalThis.process.env ??= {};
function safeEqual(a, b) {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}
const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
function requireAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return new Response("Admin is switched off: set the ADMIN_PASSWORD secret on the Cloudflare Pages project.", { status: 503, headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" } });
  }
  const header = request.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  let ok = false;
  if (scheme === "Basic" && encoded) {
    try {
      const decoded = atob(encoded);
      const pass = decoded.slice(decoded.indexOf(":") + 1);
      ok = safeEqual(pass, env.ADMIN_PASSWORD);
    } catch {
      ok = false;
    }
  }
  if (ok) return null;
  return new Response("Sign in to see booking requests.", {
    status: 401,
    headers: { ...NO_STORE, "WWW-Authenticate": 'Basic realm="Booking requests", charset="UTF-8"', "Content-Type": "text/plain; charset=utf-8" }
  });
}
const noStoreHeaders = NO_STORE;

export { noStoreHeaders as n, requireAdmin as r };
