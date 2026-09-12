// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { site } from './site.config.ts';

export default defineConfig({
  output: 'static',
  site: site.url,
  trailingSlash: 'never',
  build: { inlineStylesheets: 'always' },
  image: {
    responsiveStyles: true,
    layout: 'constrained',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          // Keep the 3D hero (and its three.js imports) in one clearly named lazy chunk.
          manualChunks(id) {
            if (id.includes('/hero3d/') || id.includes('node_modules/three') || id.includes('node_modules/@react-three') || id.includes('node_modules/react')) return 'pole';
          },
        },
      },
    },
  },
});
