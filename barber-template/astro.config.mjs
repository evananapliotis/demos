import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { site } from './src/config/site.ts';

// Static output, no adapter. Cloudflare Pages serves dist/ as-is:
//   root directory: barber-template, build command: npm run build, output: dist
export default defineConfig({
  site: site.seo.siteUrl,
  output: 'static',
  compressHTML: true,
  build: {
    inlineStylesheets: 'always',
  },
  // Tailwind is only pulled in by src/styles/demo.css, for the /demo pages.
  vite: {
    plugins: [tailwindcss()],
  },
});
