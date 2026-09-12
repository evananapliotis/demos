# HAWAR BARBER — 321 North Rd, Darlington

One-page, phone-first site. Astro 5 + Tailwind 4, static output, a lazy three.js barber pole in the hero.

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
npm run build            # renders public/og.png, then builds → dist/
npm run preview          # serves dist/ on http://localhost:4321
node scripts/verify.mjs http://localhost:4321/      # phone checks + screenshots → reports/
node scripts/lighthouse.mjs http://localhost:4321/  # mobile Lighthouse → reports/
node scripts/sizes.mjs                              # gzip size of every built asset
```

## Booking requests

`/book` is a phone-first form: name, mobile, day, time, what for, notes. It posts to `/api/booking`, a
Cloudflare Pages Function that stores the request in a D1 database and, if configured, emails the shop.
The shop reviews requests at `/admin` (password protected) and confirms by text or phone. Nothing is booked
automatically, which is honest while the shop's opening hours and services are not published: once
`hours.week` is filled in, the time field becomes a list of real slots.

If the database is not bound, the form still works: it turns into a prefilled text message to the shop,
and a plain form post (no JavaScript) lands on `/book/unavailable` with call and text buttons.

Setup, once:

1. `npx wrangler login`, then `npx wrangler d1 create hawar-barber-bookings` and paste the `database_id`
   it prints into `wrangler.toml`. The table is created automatically on first use.
2. In the Pages project (Settings → Environment variables), add the secret `ADMIN_PASSWORD`. Optional:
   `RESEND_API_KEY` + `BOOKINGS_EMAIL` to get an email per request (and `BOOKINGS_FROM` once a sending
   domain is verified in Resend).
3. Deploy with `npm run deploy` (`wrangler pages deploy dist`), which applies the D1 binding from
   `wrangler.toml`. The dashboard zip upload publishes the pages but cannot attach the D1 binding.

Local run with a throwaway database: copy `.dev.vars.example` to `.dev.vars`, then `npm run build` and
`npm run preview:cf` (http://localhost:8788). `/admin` asks for any username plus the password from `.dev.vars`.

## Deploy (Cloudflare Pages)

`npm run deploy` builds and pushes `dist/` with Wrangler (recommended: it also wires the D1 binding for bookings).
Uploading the `dist/` folder or `hawar-barber.zip` in the dashboard works for the pages themselves.
`public/_headers` sets long cache on `/_astro/*` and the usual security headers.
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
weekly opening hours, services and prices, review text, an online booking link, Instagram/TikTok, and photos.
