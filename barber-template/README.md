# Halden & Crane, barber site template

Flagship demo site for a fictional UK barbershop. Astro, static output, deployed to Cloudflare Pages. Mobile-first, built to score 90+ on Lighthouse mobile.

## What a client changes

Two places, nothing else:

- `src/config/site.ts`: every string, price, opening hour, link and image alt text. Validated on build by `src/config/site.schema.ts`. A missing or empty value fails the build with a message naming the key. Nothing has a default.
- `public/img/`: the graded photos, produced by the image pipeline below.

Components contain no literal text. Even nav labels and button copy come from `site.ui`.

## Image pipeline

Photos are sourced from Pexels, chosen by hand, and pushed through one grade so that photos from many photographers read as a single shoot.

```
src/config/images.ts      slot manifest: query, orientation, crop, widths, budget
        |
        v
npm run images:fetch      5 candidates per slot -> .candidates/<slot>/   (gitignored)
        |                 writes .candidates/contact-sheet.html
        v
you pick                  open the contact sheet, copy the JSON into image-picks.json
        |
        v
npm run images:grade      grade + encode -> public/img/<slot>-<width>.avif|webp  (committed)
                          writes src/config/credits.json                         (committed)
        |
        v
npm run build             prebuild check refuses to build with a missing or oversized image
```

### 1. Fetch

Needs `PEXELS_API_KEY` in a `.env` file. The loader walks up from this directory, so the repo-root `.env` works.

```sh
npm run images:fetch                          # every slot, 5 candidates each
npm run images:fetch -- --slot hero,team-1    # a few slots
npm run images:fetch -- --page 2              # the next 5 for every slot
npm run images:fetch -- --sheet-only          # rebuild the contact sheet without network
```

Candidates land in `.candidates/<slot>/<rank>-<pexelsId>.jpg` with a `credits.json` beside them recording photographer, source URL and licence. Nothing is picked automatically.

### 2. Pick

Open `.candidates/contact-sheet.html` in a browser. Every candidate is shown cropped to its slot's aspect. Select one per slot and copy the JSON at the bottom into `image-picks.json`. The file is committed: picks are Pexels photo ids, so anyone can regenerate the images from a clean clone.

Pick formats:

```jsonc
"hero": 1234567,                                    // photo id
"hero": { "id": 1234567, "focal": "top" },          // with a crop focus override
"gallery-2": {                                      // reuse another slot's photo, ungraded
  "sameAs": "gallery-1", "treatment": "raw"
},
"hero": null                                        // not picked yet
```

### 3. Grade

```sh
npm run images:grade                 # every picked slot
npm run images:grade -- --slot hero  # only these
npm run images:grade -- --force      # regrade even if nothing changed
```

For each pick the full-resolution original is fetched once and cached in `.candidates/<slot>/original-<id>.jpg`. If the candidates folder is gone, the photo is fetched by id. The grade lives in `scripts/lib/grade.ts` and is the only place the look is defined:

1. crop to the slot's aspect at each width in the manifest,
2. desaturate 15%,
3. lift blacks to a warm near-black and pull whites to cream (the amber cast),
4. multiply a soft vignette,
5. encode AVIF and WebP, stepping quality down until each file is under the slot's budget.

Budgets: hero 150KB, everything else 120KB, per file. The encoder guarantees this. The social share image `public/img/og.jpg` is cut from the hero pick as a JPEG.

### Placeholders

`npm run images:placeholders` fills `public/img` with generated placeholder art (warm gradients, labelled by slot) and an empty `credits.json`, so the site builds and deploys before any photo has been picked. `npm run images:grade` overwrites them slot by slot as picks are made. The committed images are currently these placeholders.

### 4. Build

`npm run build` runs `scripts/check-assets.ts` first. It fails the build when the config is invalid, when any image the config references is missing a width or format, when any file in `public/img` is over budget, or when `credits.json` is missing. A hand-dropped oversized photo cannot ship.

Image URLs carry a content hash as a query string (`/img/hero-1024.avif?v=…`), so `public/_headers` marks `/img/*` immutable and a swapped photo still busts the cache.

## Pages

The site is served at https://mybarbersite.co.uk. `/` is the MyBarberSite front page (below) and `404` matches its style. The Halden & Crane page described by `src/config/site.ts` is no longer served: its components, config and graded images stay in the repo as the template, checked on every build, but no page renders them. Photo provenance is kept in `src/config/credits.json` but not rendered.

### Front page, `/`

`src/pages/index.astro` is the offer to UK barbershop owners, composed from `src/components/home/*` on `src/layouts/HomeBase.astro` (indexable, with `/og.jpg` from `src/pages/og.jpg.ts` as its link preview). Every line of copy, the phone number, the WhatsApp links and the figures of the offer live in `src/lib/home.ts`; nothing on the page states a number that is not in `OFFER` there. The page's own styles are `src/styles/home.css`, which imports the shop pages' stylesheet, so the front page and the listing pages share one look.

Its mockups are built from the shop pages' real components around a made-up shop, Halden & Crane (`mockSite` in `src/lib/home.ts`, photos from the template's own `public/img`). The phone in the hero shows that shop's actual page: `/example` (`src/pages/example.astro`, `noindex`, with `/example/book` and `/example/og.jpg`) is rendered by the same `ShopPage`/`BookingPage` components as every listing, and is loaded into the phone in an iframe once the front page has finished loading, over a still laid out with the same classes and sizes so nothing moves when it arrives. `public/_headers` therefore allows same-origin framing (`SAMEORIGIN` and `frame-ancestors 'self'`); the frame is dropped, and the still kept, if the page fails to render in it. The "Try it" booking taster runs the listing pages' own availability rules from `src/lib/demo-booking.ts` and confirms on screen only.

### Barber pages, `/<slug>`

`src/pages/[slug].astro` builds one page per entry in `src/data/barbers.json`, an Outscraper export of Google Business listings plus the `photos` paths that `npm run photos` adds. The pages follow the HAWAR BARBER one-page structure and look (Tailwind 4, Big Shoulders Display and DM Sans, pulled in only by `src/styles/demo.css`): hero on the first photo with the name, a rating badge that opens the Google listing, a one-line tagline, Call and Directions; a trust strip and a ticker of listing facts; 01 Prices (ask, with a Call button); 02 The work (the photos on a swipe track with a lightbox, credited from `src/data/photo-credits.json`); the Google reviews block (per-star bar when the export carries `reviews_per_score`); 03 The shop (two paragraphs written from the listing); 04 Find us (address, copy-address, hours with today first, directions, map on tap); a closing call to action; footer; sticky Call/Directions bar. Each page gets its own link-preview image from `src/pages/[slug]/og.jpg.ts`, drawn with the faces in `src/og/fonts`. Every page is `noindex,nofollow`. The pages used to live at `/demo/<slug>`: `astro.config.mjs` still builds a meta-refresh page for each old path and `public/_redirects` gives Cloudflare a 301 for `/demo/*`.

`/<slug>/book` is the HAWAR BARBER booking page for the listing (`src/pages/[slug]/book.astro`): service, day, time, then name and phone. The live site asked a booking API; here the days and times come from the listing's opening hours and the six standard services in `src/lib/demo-booking.ts`, with a stable pattern of taken times per shop, and the booking is confirmed on screen only, with a note saying so. "Book online" buttons in the hero, the closing call to action and the sticky bar lead there; `?service=<id>` preselects a service.

Listings are validated by `src/lib/shops.ts` at build time (`about` and `reviews_per_score` are optional: without them the wheelchair chip and the star bar are left out); everything a page shows is derived in `src/lib/demo.ts`; the components live in `src/components/demo/`. Nothing on a page is specific to one shop.

Photos for these pages come from Google Places. `npm run photos` (needs `GOOGLE_PLACES_KEY` in `.env`, see `.env.example`) finds each listing on Places API (New) by name within 500m of its coordinates and saves up to eight photos to `public/photos/<slug>-<n>.jpg`, each resized to at most 1400px and encoded as JPEG at quality 80, writing their paths into the entry as `photos` and author attributions to `src/data/photo-credits.json`. Existing files are kept (a shop with fewer than eight is topped up); `-- --force` re-downloads, `-- --slug a,b` limits the run. The pages serve these files as they are, so a build never resizes them; only their dimensions are read.

## Deploy

Static output, no adapter. Two routes, pick one:

**Cloudflare Workers (static assets), from this repo.** `wrangler.jsonc` points a Worker at `dist/`.

```sh
npx wrangler login      # once, opens the browser
npm run deploy          # builds, then wrangler deploy -> https://halden-crane.<account>.workers.dev
```

Or connect the repo in the dashboard (Workers & Pages, Create, Import a repository) with root directory `barber-template`, build command `npm run build`, deploy command `npx wrangler deploy`.

**Cloudflare Pages, zip upload.** Build, zip the contents of `dist/` (files at the zip root, not a `dist/` folder), then Workers & Pages, Create, **Pages** tab, Upload assets. The result is `<name>.pages.dev`. A zip dropped into the **Workers** tab creates a Worker with no assets and every URL returns 404.

Node version comes from `.node-version`. Asset paths are root-absolute (`/img/...`), so `dist/index.html` opened straight from disk shows no images; serve it (`npm run preview`) or deploy it.

## Layout

```
image-picks.json          slot -> Pexels photo id, hand-edited, committed
public/img/               graded outputs, committed
public/_headers           Cloudflare cache and security headers
src/config/site.ts        client-editable content
src/config/site.schema.ts strict schema, no defaults
src/config/images.ts      slot manifest
src/config/credits.json   generated by images:grade, photo provenance, not rendered
scripts/fetch-images.ts   Pexels -> .candidates/
scripts/grade-images.ts   picks -> public/img/
scripts/check-assets.ts   prebuild gate
scripts/lib/grade.ts      the look, tuned once
scripts/lib/budget.ts     encode under a byte budget
.candidates/              gitignored working area
```
