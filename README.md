# demos — one-page sites for local businesses

One Astro 5 + Tailwind 4 template, many clients. Everything visual lives in `template/`;
everything client-specific lives in `clients/<slug>/` (a `site.json` and a `photos/` folder).
Static output, no JavaScript shipped to the browser, images through `astro:assets` (WebP, responsive
`srcset`, lazy below the fold, hero preloaded).

```
template/            components, layout, styles, page (never edit per client)
clients/<slug>/      site.json + photos/  (all client data)
scripts/             new / dev / build / deploy / verify / lighthouse
dist/                build output for the last `npm run build -- <slug>`
reports/             lighthouse + screenshot output from the last run
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run new -- <slug> "<Name>"` | Scaffolds `clients/<slug>/site.json` (from `template/site.example.json`) and `photos/` |
| `npm run dev -- <slug>` | Dev server for that client at http://localhost:4321 |
| `npm run build -- <slug>` | Builds with `CLIENT=<slug>` into `dist/` |
| `npm run deploy -- <slug>` | With `NETLIFY_AUTH_TOKEN`: `netlify sites:create --name <slug>` then `netlify deploy --prod`. Without it: writes `<slug>.zip` at the repo root for https://app.netlify.com/drop |
| `npm run preview` | Serves `dist/` (needs `CLIENT=<slug>` in the env) |
| `npm run verify -- <url>` | 200 check, `tel:` link, every image loads, 390px screenshot → `reports/mobile-390.png` |
| `npm run lighthouse -- <url>` | Mobile Lighthouse, fails if any category < 90, report → `reports/lighthouse-mobile.report.html` |

## The 10-minute per-client checklist

1. **Scaffold** — `npm run new -- joes-barbers "Joe's Barbers"`.
2. **Photos** — drop the client's own photos into `clients/joes-barbers/photos/`. Name the hero `hero.jpg`
   and the rest `gallery-01.jpg` … Look at them: the hero is the one that reads at 390px wide with
   text over the bottom third (dark, wide, not busy). Any size; the build resizes and converts to WebP.
3. **Facts** — in `site.json` fill: `name`, `phone` (display, E.164 `tel`, WhatsApp digits),
   `address`, `google.rating` / `reviewCount` / `listingUrl` / `mapQuery`, `hours` (`"0"` is Sunday,
   `null` = closed), `services` with prices, `hero.alt`, `gallery[]` with alt text.
4. **Reviews** — paste real reviews from the Google listing into `reviews[]` (author, rating, text,
   date). Never invent one; leave the array empty and the section becomes a rating band with a link.
   No photos yet? Omit `hero` and leave `gallery` empty: the hero becomes typographic and the gallery
   section is skipped. Never use stock, generated or fetched images.
5. **Copy** — `tagline` (one line), `description` (meta, ~150 chars), `about` (two short paragraphs
   in the owner's voice). Optional `hoursNote`, `servicesNote`, `socials`.
6. **Geo** — set `geo.lat/lng` from the Google listing (right-click the pin → copy coordinates) and
   remove `"approximate": true`.
7. **Look** — `npm run dev -- joes-barbers`, check at 390px and desktop.
8. **Build + check** — `npm run build -- joes-barbers`, then in another shell
   `CLIENT=joes-barbers npm run preview`, then `npm run lighthouse -- http://localhost:4321/` and
   `npm run verify -- http://localhost:4321/`.
9. **Deploy** — `npm run deploy -- joes-barbers` (token → live at `https://joes-barbers.netlify.app`;
   no token → drop the zip on Netlify).
10. **Commit** — `git add clients/joes-barbers && git commit -m "Add joes-barbers"`.

Re-deploy after edits: `npm run build -- <slug> && npm run deploy -- <slug>`.

## Environment

- Node 20+. `npm install` once.
- `NETLIFY_AUTH_TOKEN` (optional) for direct deploys via the Netlify CLI (`npx netlify`).
- Lighthouse/verify need a Chromium: they look at `CHROME_PATH`, then `PLAYWRIGHT_BROWSERS_PATH`,
  then common system paths.

## Design notes

Dark editorial: near-black warm ground, one brass accent, Fraunces (display serif, italic for the
accent word) with Instrument Sans for body. Fonts are self-hosted via `@fontsource-variable`, so the
page makes zero third-party requests apart from the Google Maps iframe (lazy, no API key). Mobile
gets a sticky Call / WhatsApp bar; every tap target is ≥ 44px. One `h1`, JSON-LD `HairSalon`
(schema.org has no BarberShop type) with address, phone, geo, aggregate rating and opening hours.
