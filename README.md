# demos

One-page demo websites for local businesses. One Astro 5 + Tailwind template, one folder per client, static output.

```
template/            the whole site: layout, components, styles, fonts, favicon routes
clients/<slug>/      one client: site.json (all copy, prices, hours, photos) + photos/
scripts/             new / build / deploy helpers
```

The template reads the client from `CLIENT=<slug>`; the npm scripts set that for you.

## Commands

```bash
npm install
npm run new -- <slug> "<Business Name>"   # scaffold clients/<slug>/
npm run dev -- <slug>                     # local dev server
npm run build -- <slug>                   # static build to dist/
npm run preview -- <slug>                 # serve dist/ locally
npm run deploy -- <slug>                  # build, then Netlify (if NETLIFY_AUTH_TOKEN) or zip dist/ → <slug>.zip
```

Deploy uses `netlify sites:create --name <slug>` then `netlify deploy --prod --dir dist --site <slug>`.
Without `NETLIFY_AUTH_TOKEN` it writes `<slug>.zip` at the repo root, which drops straight onto https://app.netlify.com/drop.

## Per-client checklist (about ten minutes)

1. `npm run new -- <slug> "<Name>"`.
2. Save their real Google photos into `clients/<slug>/photos/`. Real photos only. No stock, nothing generated.
3. Open `clients/<slug>/site.json` and fill in, top to bottom:
   - `url` – the address it will live at (used for canonical, Open Graph and JSON-LD).
   - `seo.title` / `seo.description`.
   - `phone.display` and `phone.tel` (E.164, e.g. `+441582966060`).
   - `address`, `geo` (lat/lng from Google Maps), `rating` (value, count, the listing URL).
   - `hours` – confirm with the owner. `days` takes `Mon–Sat` style ranges.
   - `accent` – one colour lifted from their signage.
   - `hero` – `src` is a photo file name without extension. `position` is CSS object-position; keep faces in frame at 390px wide. A `\n` in `line` forces a line break.
   - `services.items` – real prices if you have them, typical local prices if not (flag them to the owner).
   - `team.members` – one line each, drawn from what reviews actually say.
   - `offer` – their real promotion, or delete the `<Offer />` line in `template/pages/index.astro`.
   - `gallery.photos`, `reviews.items` (verbatim, never invented), `about.paragraphs`, `find.mapQuery`.
4. `npm run dev -- <slug>` and look at it at 390px wide first. Check every face is in frame.
5. `npm run build -- <slug>` then Lighthouse it against `npm run preview -- <slug>` (mobile, all four ≥ 90).
6. `npm run deploy -- <slug>`.
7. Text the link. The Open Graph image is a 1200×630 crop of the hero.

## Design rules baked into the template

- Mobile first, composed at 390px. Full-bleed imagery, no cards, no rounded grids.
- Near-black ground, warm off-white type, one accent used only on CTAs and small details.
- Bricolage Grotesque (condensed) for headings, Inter for body. Both self-hosted, latin subset, preloaded.
- Sections in order: hero · services & prices · barbers · offer · gallery · reviews · about · hours + map · footer. Sticky Call bar on mobile once the hero scrolls out.
- Images through `astro:assets`: WebP, responsive srcset, lazy below the fold, hero preloaded, explicit dimensions.
- One `h1`, semantic sections, alt text everywhere, LocalBusiness (`BarberShop`) JSON-LD, OG/Twitter tags, SVG favicon + apple-touch-icon generated from the name and accent.
- Scroll reveal via IntersectionObserver only; respects `prefers-reduced-motion`.

## Structure notes

- `template/lib/client.ts` loads `clients/<slug>/site.json` and the photos via `import.meta.glob`, and exposes `client`, `photo(name)`, `telHref`, map URLs and the opening-hours schema.
- Astro config (`astro.config.mjs`) points `srcDir` and `publicDir` at `template/`, and sets `site` from `site.json`.
- The favicon, apple-touch-icon, robots.txt and sitemap.xml are generated at build time from client data.
