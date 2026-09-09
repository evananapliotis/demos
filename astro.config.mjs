// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

// One template, many clients. `CLIENT=<slug>` picks the folder under clients/.
const slug = process.env.CLIENT;
if (!slug) {
  throw new Error('CLIENT is not set. Use `npm run build -- <slug>` (or `npm run dev -- <slug>`).');
}
const client = JSON.parse(readFileSync(new URL(`./clients/${slug}/site.json`, import.meta.url), 'utf8'));

export default defineConfig({
  site: client.url,
  srcDir: './template',
  publicDir: './template/public',
  outDir: './dist',
  output: 'static',
  trailingSlash: 'never',
  build: { inlineStylesheets: 'auto' },
  compressHTML: true,
  vite: { plugins: [tailwindcss()] },
});
