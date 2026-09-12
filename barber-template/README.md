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
"before-after-1-before": {                          // reuse another slot's photo, ungraded
  "sameAs": "before-after-1-after", "treatment": "raw"
},
"hero": null                                        // not picked yet
```

The before/after pairs are placeholders. Pexels has no matched pairs, so either pick two similar photos or use the `sameAs` form to show the same photo raw against graded. Swap them for real pairs when a client supplies them.

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

One page with anchor sections (`/`), plus `/book` (front-end only booking flow, marked as a demo), `/credits` (photographer attribution, which the Pexels API terms ask for) and `404`.

## Deploy

Cloudflare Pages, no adapter. Root directory `barber-template`, build command `npm run build`, output directory `dist`. Node version comes from `.node-version`.

## Layout

```
image-picks.json          slot -> Pexels photo id, hand-edited, committed
public/img/               graded outputs, committed
public/_headers           Cloudflare cache and security headers
src/config/site.ts        client-editable content
src/config/site.schema.ts strict schema, no defaults
src/config/images.ts      slot manifest
src/config/credits.json   generated by images:grade
scripts/fetch-images.ts   Pexels -> .candidates/
scripts/grade-images.ts   picks -> public/img/
scripts/check-assets.ts   prebuild gate
scripts/lib/grade.ts      the look, tuned once
scripts/lib/budget.ts     encode under a byte budget
.candidates/              gitignored working area
```
