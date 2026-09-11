// @ts-check
// Ninefold Tattoo — portfolio sample site. Static Astro 5 + Tailwind 4.
//   pnpm build                      # dist/
//   node build.mjs                  # dist/ + ninefold-tattoo.zip at the repo root
// Set SITE_URL to override the deploy URL used for canonical, Open Graph and JSON-LD.
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: process.env.SITE_URL || 'https://ninefold-tattoo.pages.dev',
  output: 'static',
  trailingSlash: 'never',
  compressHTML: true,
  build: { inlineStylesheets: 'always' },
  vite: { plugins: [tailwindcss()] },
});
