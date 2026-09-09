# Legend Barbers

Barbers at 29 Main Street, Menston, Ilkley LS29 6NB. One page, static. Owner Dyako; Azad is named
where the reviews name him.

Built on the Taunton Barber Van tree (`src/`), the standard for these demos: full-bleed hero, real
review cards, a themed feature section, generous type. Nothing under `template/` was touched.

```
astro.config.mjs   points Astro at ./src and ./public, sets `site` from site.json (or SITE_URL)
build.mjs          build + zip, dev, preview
site.json          all copy, reviews, hours, photo choices
photos/            the five real Google photos, each used once
public/fonts/      Archivo (display), Instrument Serif italic (accent word), Inter (body)
public/_headers    long cache for hashed assets on Netlify
reports/           390px screenshot and Lighthouse scores from the last build
```

## Rebuild

```bash
npm install                               # once, at the repo root
node clients/legend-barbers/build.mjs     # dist/ + legend-barbers.zip at the repo root
node clients/legend-barbers/build.mjs dev # local dev server
SITE_URL=https://example.co.uk node clients/legend-barbers/build.mjs   # override the deploy URL
```

## Confirm with Dyako before it goes live

- **Deploy URL.** `url` in site.json is `https://legend-barbers.netlify.app`, which is where
  `npm run deploy` (Netlify, site name `legend-barbers`) puts it. It feeds the canonical, Open Graph
  image and JSON-LD; the WhatsApp link preview breaks if it does not match where the site actually
  lives. Change it (or pass `SITE_URL`) and rebuild.
- **Hours.** Site shows Mon–Sat 9am–6pm, Sun closed. The opening-times sticker on the door in the
  shopfront photo looks like it lists later Friday and Saturday closes and Sunday hours. Read it off
  the door and correct `hours` in site.json.
- **Prices.** None shown. The page says "prices agreed in the chair". Add a `price` field to any
  service once he confirms one; the list will need a small addition to display it.
- **Map pin.** `geo` in site.json is an estimate for Main Street, Menston. Take the exact lat/lng from
  the Google listing. The map itself is an address-query embed and is right regardless.
- **Google listing link.** `rating.url` is a Maps search for the shop name and address. Swap in the
  listing's own share link if he has it.
- **Azad.** Named in About and in Justin Leeming's review. Add the other barbers if he wants them on.

## Design notes

- Palette: `#0a0a0b` ink, `#f2eee6` paper, signage red `#d2232a` (soft `#e8474d` for small text on
  ink, deep `#a3161c` on paper). Red only on CTAs, the rating, hairline rules and list numerals.
- Type: Archivo condensed 800 for headings, Instrument Serif italic for the accent word, Inter for
  body at 17px (18px from tablet up), 1.6 line-height.
- Sections: hero · services · Turkish hot towel shave · first cuts · the work · reviews · about ·
  hours + map · footer. Sticky Call + WhatsApp bar on mobile once the hero scrolls out.
- Motion: fade-and-rise on scroll only, 560ms, staggered 70ms; hero entrance; everything off under
  `prefers-reduced-motion`.
