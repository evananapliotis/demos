// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import { site } from './site.config.ts';

export default defineConfig({
  output: 'static',
  // Cloudflare Workers: the marketing pages stay prerendered; /api/*, /admin and /cancel/* render on request.
  adapter: cloudflare({
    platformProxy: { enabled: true },
    // Images are only on prerendered pages, so sharp runs at build time, never on the Worker.
    imageService: 'compile',
    // src/worker.ts adds the cron handler for the nightly clean-up.
    workerEntryPoint: { path: 'src/worker.ts' },
  }),
  site: site.url,
  trailingSlash: 'never',
  build: { inlineStylesheets: 'always', format: 'file' },
  image: {
    responsiveStyles: true,
    layout: 'constrained',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
