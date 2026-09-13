import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Static output, no adapter. Cloudflare serves dist/ as-is:
//   root directory: barber-template, build command: npm run build, output: dist
export default defineConfig({
  // The live domain: canonical links and link-preview images are built on it.
  site: 'https://mybarbersite.co.uk',
  output: 'static',
  // The barber pages moved from /demo/<slug> to /<slug>. These produce a
  // meta-refresh page per old path; public/_redirects gives Cloudflare a 301.
  redirects: {
    '/demo/[slug]': '/[slug]',
    '/demo/[slug]/book': '/[slug]/book',
  },
  compressHTML: true,
  build: {
    inlineStylesheets: 'always',
  },
  // Tailwind is only pulled in by src/styles/demo.css, for the /demo pages.
  vite: {
    plugins: [tailwindcss()],
  },
});
