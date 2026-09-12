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

## Run

```sh
npm install
npm run dev              # http://localhost:4321
npm run build            # renders public/og.jpg (link preview), then builds → dist/
npm run preview          # serves dist/ on http://localhost:4321
npm run verify -- http://localhost:4321/       # phone checks + screenshots → reports/
npm run lighthouse -- http://localhost:4321/   # mobile Lighthouse → reports/
npm run desktopshots -- http://localhost:4321/ # hero at four desktop sizes
npm run sizes                                  # gzip size of every built asset
npm run poster                                 # A4 window poster with a QR code → hawar-barber-poster.pdf
npm run zip                                    # dist/ → hawar-barber.zip
```

## Deploy

Upload the **`dist/`** folder, or `hawar-barber.zip`, to Cloudflare (Workers & Pages → Create application →
Upload and deploy, or the Pages "Upload assets" flow), Netlify, Vercel or any static host. `public/_headers`
sets long cache on `/_astro/*` and security headers on Cloudflare and Netlify.

Set `url` in `site.config.ts` to the final domain so the canonical, sitemap and Open Graph URLs are right,
then rebuild, and re-run `npm run poster` so the QR code points at the live address.

## What is on the page, and where it came from

Everything shown was checked against a source. Nothing was made up to fill space.

| shown | source |
| --- | --- |
| Name, address, phone, "Barber shop", wheelchair accessible, closes 6pm | the Google Maps listing |
| 5.0 rating from 56 Google reviews | the Google Maps listing |
| Facebook link | the page titled "Hawar Barbers \| Darlington" (facebook.com/61574727154851) |
| Map pin coordinates in the structured data | centre of postcode DL1 3BL (approximate, not the shop's own pin) |

Left blank until the shop confirms them (each has a slot in `site.config.ts` and its section appears once filled in):
weekly opening hours, services and prices, review text, a booking link, Instagram/TikTok, and photos.
