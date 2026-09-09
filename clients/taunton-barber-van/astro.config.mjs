// @ts-check
// Taunton Barber Van — a mobile barber, so this client carries its own source tree
// (clients/taunton-barber-van/src) instead of the fixed-address template/. Build with:
//   node clients/taunton-barber-van/build.mjs            # build + zip
//   node clients/taunton-barber-van/build.mjs dev        # dev server
//   node clients/taunton-barber-van/build.mjs preview    # serve dist/
// Set SITE_URL to override the deploy URL in site.json without editing it.
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = new URL('.', import.meta.url);
const site = JSON.parse(readFileSync(new URL('site.json', here), 'utf8'));

export default defineConfig({
  root: fileURLToPath(new URL('../../', here)),
  site: process.env.SITE_URL || site.url,
  srcDir: './clients/taunton-barber-van/src',
  publicDir: './clients/taunton-barber-van/public',
  outDir: './dist',
  output: 'static',
  trailingSlash: 'never',
  build: { inlineStylesheets: 'always' },
  compressHTML: true,
  vite: { plugins: [tailwindcss()] },
});
