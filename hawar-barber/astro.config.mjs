// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
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
