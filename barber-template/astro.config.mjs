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
  // The /demo pages resize their listing photos through astro:assets. The main
  // site's graded images in public/img bypass it, so this changes nothing there.
  image: {
    layout: 'constrained',
    responsiveStyles: true,
  },
  // Tailwind is only pulled in by src/styles/demo.css, for the /demo pages.
  vite: {
    plugins: [tailwindcss()],
  },
});
