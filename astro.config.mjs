// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Which client are we building? `npm run build -- <slug>` sets CLIENT=<slug>.
const CLIENT = process.env.CLIENT;
if (!CLIENT) {
  throw new Error(
    'CLIENT is not set. Run `npm run build -- <slug>` or `npm run dev -- <slug>` (see README).',
  );
}
const sitePath = resolve(`clients/${CLIENT}/site.json`);
if (!existsSync(sitePath)) {
  throw new Error(`No client found at clients/${CLIENT}/site.json. Run \`npm run new -- ${CLIENT} "<Name>"\` first.`);
}
const site = JSON.parse(readFileSync(sitePath, 'utf8'));

export default defineConfig({
  // All components live in template/. Client data lives in clients/<slug>/.
  srcDir: './template',
  output: 'static',
  site: site.url || `https://${CLIENT}.netlify.app`,
  trailingSlash: 'never',
  build: { inlineStylesheets: 'always' },
  image: {
    // Let astro:assets emit responsive srcset/sizes on <Image> automatically.
    responsiveStyles: true,
    layout: 'constrained',
  },
  vite: {
    plugins: [tailwindcss()],
    define: { 'import.meta.env.CLIENT': JSON.stringify(CLIENT) },
  },
});
