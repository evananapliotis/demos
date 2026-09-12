// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import { site } from './site.config.ts';

/** Keep the 3D hero and its three.js imports in one clearly named lazy chunk (client build only). */
const poleChunk = {
  name: 'pole-chunk',
  hooks: {
    'astro:build:setup': ({ vite, target }) => {
      if (target !== 'client') return;
      vite.build ??= {};
      vite.build.rollupOptions ??= {};
      const output = vite.build.rollupOptions.output;
      const out = Array.isArray(output) ? output[0] : (output ?? {});
      out.manualChunks = (id) => {
        if (id.includes('/hero3d/') || id.includes('node_modules/three')) return 'pole';
      };
      vite.build.rollupOptions.output = out;
    },
  },
};

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
  integrations: [poleChunk],
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
