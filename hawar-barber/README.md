# HAWAR BARBER — 321 North Rd, Darlington

Phone-first site: one static page plus a booking-request form, with `/api/*` and `/admin` served by a Cloudflare Pages Function. Astro 5 + Tailwind 4, a lazy three.js barber pole in the hero.

## Edit

Everything editable is in **`site.config.ts`**: name, address, phone, hours, services, prices, reviews,
booking URL, socials, about copy, image names and alt text. Empty values are not rendered, so the page only
ever shows what is filled in.

Photos go in **`public/images/`** and are picked up automatically:

| file | where it shows |
| --- | --- |
| `hero.jpg` | behind the hero (optional) |
| `shopfront.jpg` | About section |
| `gallery-1.jpg`, `gallery-2.jpg` … | gallery (swipe on phones, grid on desktop) |

Any size; the build resizes, converts to WebP and lazy-loads everything below the fold.

## Run

```sh
npm install
npm run dev              # http://localhost:4321
npm run build            # renders public/og.png, then builds → dist/ (pages + _worker.js)
npm run preview:cf       # serves dist/ like Cloudflare does, with a local D1 → http://localhost:8788
node scripts/verify.mjs http://localhost:8788/      # phone checks + screenshots → reports/
node scripts/lighthouse.mjs http://localhost:8788/  # mobile Lighthouse → reports/
node scripts/scrollshots.mjs http://localhost:8788/ reports/scroll   # the hero at several scroll offsets
node scripts/sizes.mjs                              # gzip size of every built asset
```

## Booking requests

`/book` is a phone-first form: name, phone, day, time, what for, notes. It posts to `/api/booking`, a
Cloudflare Pages Function that stores the request in a D1 database and, if configured, emails the shop.
The shop reviews requests at `/admin` (password protected) and confirms by text or phone. Nothing is booked
automatically, which is honest while the shop's opening hours and services are not published: once
`hours.week` is filled in, the time field becomes a list of real slots.

**Before this goes live, the shop has to agree to check `/admin` (or the emails) and reply to people.**
Until then set `booking.enabled: false` in `site.config.ts`: every Book button and the sitemap entry disappear.

If the database is not bound, the form still works: it turns into a prefilled text message to the shop,
and a plain form post (no JavaScript) lands on `/book/unavailable` with call and text buttons.

Abuse brakes: honeypot field, 5 requests per connection per 15 minutes and 40 per hour site-wide (one
atomic insert, so parallel requests cannot slip past it), and 10 wrong admin passwords per connection per
15 minutes. Worker responses carry `nosniff`, `X-Frame-Options` and `Referrer-Policy` from `src/middleware.ts`.

Setup, once, in this order:

1. `npx wrangler login`.
2. `npx wrangler d1 create hawar-barber-bookings` and paste the `database_id` it prints into `wrangler.toml`
   (`npm run deploy` refuses to run while the placeholder is still there). The tables are created on first use.
3. `npx wrangler pages project create hawar-barber --production-branch main`. If the `hawar-barber.pages.dev`
   name is taken, pick another and update `name` in `wrangler.toml` and `url` in `site.config.ts`.
4. `npx wrangler pages secret put ADMIN_PASSWORD --project-name hawar-barber` with a long random password
   (any username works at `/admin`). Optional: `RESEND_API_KEY` and `BOOKINGS_EMAIL` for an email per request.
   Without `BOOKINGS_FROM` set to an address on a domain verified in Resend, Resend only delivers to the
   email address that owns the Resend account. Secrets are per environment: repeat for Preview if you use
   preview URLs.
5. `npm run deploy` (preflight, build, `wrangler pages deploy dist --branch main`). This applies the D1
   binding and compatibility settings from `wrangler.toml`.

Local run with a throwaway database: copy `.dev.vars.example` to `.dev.vars`, then `npm run build` and
`npm run preview:cf` (http://localhost:8788). `/admin` asks for any username plus the password from `.dev.vars`.
The build prints "Enabling sessions with Cloudflare KV" every time; that notice can be ignored and no
`SESSION` binding is needed.

## Deploy (Cloudflare Pages)

`npm run deploy` is the route that works out of the box (see Booking requests above).

Uploading `dist/` in the dashboard also deploys the Worker, but you then have to add the D1 binding
(Settings → Bindings), the secrets (Settings → Variables and Secrets) and the runtime settings
(compatibility date 2025-09-01 with the `nodejs_compat` flag) by hand, for Production and Preview.
`hawar-barber.zip` at the root is that same `dist/` zipped for a drag-and-drop upload; regenerate it after
a build with `npm run zip`. `public/_headers` sets long cache on `/_astro/*` and security headers on the
static pages.

Set `url` in `site.config.ts` to the final domain so the canonical, sitemap and Open Graph URLs are right.

## What is on the page, and where it came from

Everything shown was checked against a source. Nothing was made up to fill space.

| shown | source |
| --- | --- |
| Name, address, phone, "Barber shop", wheelchair accessible, closes 6pm | the Google Maps listing |
| 5.0 rating from 56 Google reviews | the Google Maps listing |
| Facebook link | the page titled "Hawar Barbers \| Darlington" (facebook.com/61574727154851) |
| Map pin coordinates in the structured data | centre of postcode DL1 3BL (approximate, not the shop's own pin) |

Left blank until the shop confirms them (each has a slot in `site.config.ts` and its section appears once filled in):
weekly opening hours, services and prices, review text, an external booking link, Instagram/TikTok, and photos.
Online booking requests are built in but need the shop to agree to check `/admin` (see above).
