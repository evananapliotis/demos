# HAWAR BARBER — 321 North Rd, Darlington

Static, phone-first one-page site. Astro 5 + Tailwind 4, a three.js barber pole in the hero, a tap-to-enlarge
photo gallery, a photo-backed link preview for WhatsApp and Facebook, and a home-screen icon (web manifest).
Nothing runs on a server: upload `dist/` (or `hawar-barber.zip`) to any static host.

## Edit

Everything editable is in **`site.config.ts`**: name, address, phone, hours, services, prices, reviews,
an external booking link, socials, about copy, image names and alt text. Empty values are not rendered,
so the page only ever shows what is filled in. Set `bookingUrl` (Fresha, Booksy …) and "Book" buttons appear.

Photos go in **`public/images/`** and are picked up automatically:

| file | where it shows |
| --- | --- |
| `hero.jpg` | behind the hero (optional) |
| `shopfront.jpg` | About section |
| `gallery-0.jpg`, `gallery-1.jpg` … | gallery (swipe on phones, grid on desktop; tap opens the lightbox) |

Any size; the build resizes, converts to WebP and lazy-loads everything below the fold.

## Run locally

```sh
npm install
cp .dev.vars.example .dev.vars   # local secrets (any values will do for local runs)
npm run db:migrate               # creates the local D1 database from migrations/
npm run preview                  # build, then wrangler dev on http://127.0.0.1:8787 (site + booking + admin)
npm run dev                      # or: Astro dev server with hot reload (uses the same local D1)
```

Checks (each needs a Chrome, Chromium or Edge on the machine; set `CHROME_PATH` if it is somewhere unusual):

```sh
npm run check                                     # astro check: types in every .astro and .ts file
npm run verify -- http://127.0.0.1:8787/          # phone checks at 390 and 320 px, screenshots → reports/
npm run test:booking -- http://127.0.0.1:8787     # end to end: slots, double booking, cancel, admin, block-outs
npm run lighthouse -- http://127.0.0.1:8787/      # mobile Lighthouse → reports/
npm run poster                                    # A4 window poster with a QR code → hawar-barber-poster.pdf
```

## Booking system

Customers book at `/book`: service → day → time → name and phone (email optional). The booking is written to
D1 and confirmed on screen with a cancel link (`/cancel/<token>`). The shop gets an email for every booking
and every customer cancellation (Resend). `/admin` (password) lists today and tomorrow, cancels bookings and
blocks out time. A nightly cron deletes bookings older than `booking.retentionDays`.

Everything adjustable is in `site.config.ts`: `services` (name and minutes), `hours.week`, and `booking`
(`chairs`, `slotMinutes`, `minNoticeMinutes`, `horizonDays`, `retentionDays`, `maxActivePerPhone`, `enabled`).

Double bookings are impossible at the database level: `cells` holds one row per chair per 5-minute cell of
occupied time with a primary key on `(chair, cell_start)`. A booking or block-out inserts all of its cells in
one atomic D1 batch, so any overlap, of any length, fails the whole write and the customer is offered the
times still free. Slot maths runs in Europe/London (`src/lib/time.ts`), so the clock changes are handled.

| route | what |
| --- | --- |
| `GET /api/availability?service=<id>` | every day in the window with the start times still free |
| `GET /api/availability?service=all` | the next free start for every service (the "Next free" lines on the home page) |
| `/book?service=<id>&date=YYYY-MM-DD` | deep link that preselects the service and the day (the services list, the hero line and the hours table use it) |
| `POST /api/book` | JSON `{service, date, time, name, phone, email?}` → 201, or 409 with free times |
| `POST /api/cancel` | `{token}` from the customer's link |
| `/admin`, `POST /api/admin/{login,logout,cancel,block,unblock}` | session cookie, same-origin only |

## Deploy from GitHub (no terminal)

Cloudflare can build and deploy this folder itself on every push to `hawar-barber-static`:
Workers & Pages → Create → Import a repository → `evananapliotis/demos`, then Worker name `hawar-barber`,
branch `hawar-barber-static`, root directory `hawar-barber`, build command `npm run build`, deploy command
`npx wrangler d1 migrations apply hawar-barber-bookings --remote && npx wrangler deploy`. The D1 database
is created in the dashboard (Storage & Databases → D1) and its id goes in `wrangler.toml`; the five secrets
are added under the Worker's Settings → Variables and Secrets. `.node-version` pins the builder to Node 22.
Cloudflare builds the repository's default branch unless Settings → Build → Branch control says otherwise;
the repository's default branch is `hawar-barber-static` for that reason.

## Deploy from a terminal (Cloudflare Workers)

The site, the booking API, `/admin` and the cron run as one Worker with static assets, at
`https://hawarbarbers.co.uk`. Deploys go through wrangler from a terminal; the dashboard's drag-and-drop
upload only takes static files.

First time only:

```sh
npx wrangler login                                   # opens the browser
npx wrangler d1 create hawar-barber-bookings         # paste the database_id it prints into wrangler.toml
npm run db:migrate:remote                            # creates the tables in the live database
npx wrangler secret put ADMIN_PASSWORD               # password for /admin
npx wrangler secret put SESSION_SECRET               # long random string (signs the admin cookie)
npx wrangler secret put RESEND_API_KEY               # from resend.com → API Keys
npx wrangler secret put SHOP_EMAIL                   # where booking emails go
npx wrangler secret put MAIL_FROM                    # e.g. HAWAR BARBER <bookings@hawarbarbers.co.uk>
```

Every deploy:

```sh
npm run deploy                                       # preflight, build, wrangler deploy
```

`wrangler.toml` attaches the custom domain `hawarbarbers.co.uk`. If another Worker still holds that domain
(the earlier dashboard uploads), remove it there first: Workers & Pages → that Worker → Settings → Domains &
Routes → delete the domain, then run the deploy again. Old upload-only Workers can be deleted once the new
one is serving the domain.

Resend: add the domain in the Resend dashboard, copy its DNS records into the hawarbarbers.co.uk zone in
Cloudflare (DNS → Records), wait for Resend to show it verified, then set `MAIL_FROM` to an address on it.
Until then, leave `MAIL_FROM` unset and Resend's `onboarding@resend.dev` sender is used, which can only
deliver to the address that owns the Resend account.

After the first deploy, a smoke test: open `https://hawarbarbers.co.uk/book`, book a test slot, check the
email, open the cancel link and cancel, sign in at `/admin`, block out an hour and confirm the slots vanish.

## What is on the page, and where it came from

Everything shown was checked against a source. Nothing was made up to fill space.

| shown | source |
| --- | --- |
| Name, address, phone, "Barber shop", wheelchair accessible, opening hours | the Google Maps listing |
| 5.0 rating from 56 Google reviews | the Google Maps listing |
| Facebook link | the page titled "Hawar Barbers \| Darlington" (facebook.com/61574727154851) |
| Map pin coordinates in the structured data | centre of postcode DL1 3BL (approximate, not the shop's own pin) |

Confirmed by the owner: weekly opening hours, the services and how long each takes. Still left blank until he
confirms them: prices, review text, Instagram/TikTok, and the shopfront photo.
