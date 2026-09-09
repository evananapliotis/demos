# Taunton Barber Van

Mobile barber, Taunton. One page, static. Lewis is the business, so the copy names him throughout.

This client carries its own source tree (`src/`) rather than rendering through `template/`, because the
shared template assumes a shopfront: fixed address, map, walk-ins, a call-only CTA. A van needs
"How to book" instead of "Find us", WhatsApp first, a "How it works" and a "Families" section, and
`HairSalon` JSON-LD with `areaServed` rather than a street address. The structure, loader, favicon
routes, image pipeline and reveal script follow the Maestro build; nothing under `template/` was touched.

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
npm install                                   # once, at the repo root
node clients/taunton-barber-van/build.mjs     # dist/ + taunton-barber-van.zip at the repo root
node clients/taunton-barber-van/build.mjs dev # local dev server
SITE_URL=https://example.co.uk node clients/taunton-barber-van/build.mjs   # override the deploy URL
```

## Confirm with Lewis before it goes live

- **Deploy URL.** `url` in site.json is `https://tauntonbarbervan.co.uk`. It feeds the canonical,
  Open Graph image and JSON-LD; the WhatsApp link preview breaks if it does not match where the site
  actually lives. Change it (or pass `SITE_URL`) and rebuild.
- **Hours.** Mon–Sat 9:00–17:30, Sun closed. Google only confirms the 5:30pm close.
- **Prices.** None shown. The page says "prices agreed before we start". Add a `price` field to any
  service in site.json once he confirms one and the design will need a small addition to show it.
- **Area covered.** The copy says "Taunton and the villages around it". Widen or narrow to taste.
- **Base.** Creech Heathfield Rd, TA3 5DW appears once in "How to book" and in the footer.

## Design notes

- Palette: `#0a0a0b` ink, `#f2eee6` paper, brass `#c8a165` (deep `#7a5a30` on paper). Brass only on
  CTAs, the rating, hairline rules and the one italic word per heading.
- Type: Archivo condensed 800 for headings, Instrument Serif italic for the accent word, Inter for body
  at 17px (18px from tablet up), 1.6 line-height.
- Sections: hero · the van · how it works · families · services · the work · reviews · how to book · footer.
  Sticky WhatsApp + call bar on mobile once the hero scrolls out. Buttons are pills with a lit face, hover lift, press and touch ripple.
- Motion: fade-and-rise on scroll only, 560ms, staggered 70ms; hero entrance; everything off under
  `prefers-reduced-motion`.
