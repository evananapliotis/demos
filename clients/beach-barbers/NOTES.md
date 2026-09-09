# The Beach Barbers — things to confirm before this goes live

Built from the Maestro template, untouched. Everything below lives in `site.json`.

## Photos (the attachments never reached the build session)
`photos/` currently holds signage-style plates, not photographs. Replace the four slot plates with the real Google photos, keeping the file names, then `npm run build -- beach-barbers`:

| File | Used for | Best fit |
|---|---|---|
| `hero.webp` | hero + link preview | keep the signage plate, or swap in the strongest cut photo (portrait, face in the top half) |
| `cut-1.webp`, `cut-2.webp` | gallery, 3:4 | fresh cuts / a shave |
| `interior.webp` | gallery, full width, 4:3 | the shop floor |
| `shopfront.webp` | about section, 4:3 on phone | the shopfront photo with the sign, `position` 50% 20% |

## Placeholders
- `rating.value` 4.8 and `rating.count` 60 — not found online, replace with the Google figures.
- Reviews: two verbatim Fresha reviews (Highfield Rd listing), author shown as "Verified client · via Fresha", 5 stars assumed. Replace with the Google reviews (name, stars, text) when pasted.
- Barbers "Nik" and "Lucas" — names taken from those Fresha reviews; confirm they cut at Highfield Road.
- Hours: Mon–Sat 9–6, Sun closed as briefed. Fresha lists Sun 10:00–17:00 — confirm with the owner.
- `geo` is the FY4 2JG postcode centroid; nudge to the shop pin if needed.
- `url` is https://beach-barbers.pages.dev (Cloudflare Pages, same convention as Unique Barber). Change it if it deploys elsewhere and rebuild.
