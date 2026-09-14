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

`src/pages/index.astro` is the offer to UK barbershop owners, composed from `src/components/home/*` on `src/layouts/HomeBase.astro` (indexable, with `/og.jpg` from `src/pages/og.jpg.ts` as its link preview). Every line of copy, the phone number, the WhatsApp links and the figures of the offer live in `src/lib/home.ts`; nothing on the page states a number that is not in `OFFER` there.

The front page has its own identity, deliberately unlike the shop pages: warm paper with a fine grain, Instrument Serif at one weight for every headline (the accent word italic, in copper), Instrument Sans for text, Geist Mono for the small labels, hairlines instead of boxes, navy buttons and bands, one copper accent. It lives in `src/styles/home.css` (tokens under `@theme`: `paper`, `surface`, `navy`, `rule`, `copper`; utilities `cta`, `label`, `plate`, `object`, `clipping`). Anything that shows the product is wrapped in `.object`, which keeps the showcase's type and colours inside a rounded, shadowed frame while the page around it stays square-cornered and ruled. The three faces are self-hosted from `@fontsource` (latin subsets, with metric-matched local fallbacks so the swap does not move a line) and, as TTFs in `src/og/fonts`, drawn into the share image.

The MyBarberSite identity is generated, not drawn by hand: `npm run brand` (`scripts/brand.mjs`) writes `public/brand/`, which holds the mark (three angled bars, a barber pole's stripe laid flat, the middle one copper), the wordmark and the horizontal lockups as SVG on light and on dark, the square icon, PNGs at 1600 and 800 square, and the favicon set with its web manifest. The wordmark is Instrument Serif set as outlines ("Barber" italic) so the files need no font. The homepage uses the mark inline (`src/components/home/Logo.astro`), the favicons from `public/brand/`, and inlines `lockup.svg` into its share image (`renderHomeOg` in `src/lib/og.ts`). The shop pages keep their own black-and-gold identity and `/favicon.svg`; the brand touches only `/`.

Its mockups show a made-up shop, Marlow & Finch (`src/lib/showcase.ts`), in a design of its own (`src/components/showcase/*`, `src/styles/showcase.css`: linen and sand, Fraunces and Plus Jakarta Sans, moss green, pills and round corners) that is deliberately nothing like the demo template real shops receive. It has no page of its own: the phone in the hero holds the whole page at a phone's 390px and scrolls it, the before/after panel and the five "what you get" minis are its pieces, and the "Try it" booking taster runs the listing pages' availability rules from `src/lib/demo-booking.ts` in the showcase's controls, confirming on screen only.

### Barber pages, `/<slug>`

`src/pages/[slug].astro` builds one page per entry in `src/data/barbers.json`, an Outscraper export of Google Business listings plus the `photos` paths that `npm run photos` adds. Every page is built from the same components (Tailwind 4, pulled in only by `src/styles/demo.css`): hero on the listing's first photo with the name, a rating badge that opens the Google listing, a one-line tagline, Call and Directions; a trust strip and a ticker of listing facts; Prices (no listing publishes one, so the number goes up big, with the bookable services under it); The work (the photos on a swipe track with a lightbox, credited from `src/data/photo-credits.json`); the Google reviews block (per-star bar when the export carries `reviews_per_score`); The shop (two paragraphs written from the listing); Find us (address, copy-address, hours with today first, directions, map on tap); a closing call to action; footer; sticky Call/Directions bar. Each page gets its own link-preview image from `src/pages/[slug]/og.jpg.ts`, drawn with the faces in `src/og/fonts`. Every page is `noindex,nofollow`. The pages used to live at `/demo/<slug>`: `astro.config.mjs` still builds a meta-refresh page for each old path and `public/_redirects` gives Cloudflare a 301 for `/demo/*`.

#### Five themes

Those components are shared, but no two neighbouring shops should be handed the same website. Each page is built in one of five themes, defined in `src/lib/theme.ts`:

| Theme | Look | Display / text | Hero | Services |
| --- | --- | --- | --- | --- |
| Midnight | near-black, gold | Big Shoulders Display / DM Sans | photo full-bleed behind the type | list |
| Ivory | off-white and warm grey, black type, editorial | Instrument Serif / Instrument Sans | rule across the top, type left, a tall photo right | list |
| Forest | deep green and bone, terracotta accent | Plus Jakarta Sans / DM Sans | type alone, a wide photo band under it | cards |
| Tan | tobacco and brass, the traditional shopfront | Fraunces / Instrument Sans | a ruled sign over the photo | cards |
| Steel | cool grey and white, one high-contrast blue | Instrument Sans (condensed) / Plus Jakarta Sans, Geist Mono labels | photo one half, type the other | cards |

A theme also sets the section order, whether the ticker and the outsized section numerals render, the corner radius, and the palette of the share image. Midnight is the look the pages have always had, unchanged.

The shop's name is the first and the largest thing on every page. A theme that gives the name half the page (Steel's split, Ivory's column) would otherwise let a full-width section heading out-shout it, so section headings are not sized independently: `derive()` sizes the name against the theme's face and the width its hero gives it, then sizes every section heading — and the closing call to action — off that, as `--section-title`. Across all 1107 listings the largest a heading ever gets is 85% of its page's name.

The palettes and the faces are custom properties on `html[data-theme="…"]` in `src/styles/demo.css`, under one set of token names (`ink`/`ink-2`/`ink-3` for grounds, `cream`/`cream-2` for type, `amber`/`amber-2` for the accent, `onaccent` for type on an accent ground, `line` for hairlines). No component names a colour, and a light theme reads sensibly under the dark-sounding names. The seven faces are all self-hosted from `@fontsource`; every page declares them and downloads only the two or three its own theme sets, so a theme costs no extra request.

The wording varies too, because five palettes do not stop five pages reading as one template. Every heading, eyebrow and standing line that states no fact about the shop is drawn from a small pool in `src/lib/copy.ts` — the gallery is "Fresh from the chair" on one page and "Recent cuts" on the next. Nothing in the pools adds a fact; anything specific to a shop is still derived from the listing in `src/lib/demo.ts`.

Both the theme and the wording are chosen by hashing the shop's slug (FNV-1a, in `src/lib/theme.ts`) — nothing else. The same slug gives the same theme and the same words in every build, on every machine, so a live link a prospect has already opened never changes appearance. The copy pools are drawn with the same hash under a per-field key, so two shops that land on the same theme still read differently.

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
