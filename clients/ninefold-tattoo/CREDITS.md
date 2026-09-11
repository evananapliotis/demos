# Image credits

No photographs have been downloaded yet. The build that produced this commit ran in a Claude Code
cloud environment whose network policy blocks unsplash.com and pexels.com, so `src/images/` is empty
and this file is a placeholder.

Run `pnpm images` (see README.md) to download the seventeen-slot shot list in `scripts/slots.mjs`
from Unsplash (Pexels as fallback). The script rewrites this file with one row per photograph:
slot, photographer, source link, original size and licence (Unsplash License or Pexels License).
The fresh/healed comparison (`pair-fresh`, `pair-healed`) is derived from the `healed` photograph by
`scripts/prepare-images.mjs`: the same image graded twice, so the slider shows one piece rather
than two.

Typefaces: [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) and
[Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans), SIL Open Font License,
self-hosted in `public/fonts/`.
