import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { BOOKING_ENABLED, CLIENT_SLUG, SITE_URL } from './src/config/build.ts';

/**
 * The components each build picks. A component that is imported and never
 * rendered still has its stylesheet inlined into the page and its script
 * bundled, so the swap happens here rather than behind a conditional in the
 * page: src/pages/index.astro renders one front page, and src/pages/[slug]/
 * book.astro pulls in the booking page only when there is one to build.
 */
const local = (path) => fileURLToPath(new URL(path, import.meta.url));
const aliases = {
  'virtual:front-page': local(CLIENT_SLUG ? './src/components/demo/ClientFrontPage.astro' : './src/components/home/MarketingFrontPage.astro'),
  'virtual:booking-page': local(BOOKING_ENABLED ? './src/components/demo/BookingPage.astro' : './src/components/Nothing.astro'),
};

/**
 * The booking-page rules in src/styles/demo.css are inlined into every shop
 * page, booking page or not. With BOOKING_ENABLED=false there is no booking
 * page, so they are cut out here, between the booking-only markers, before
 * Tailwind reads the file. With booking on the file is passed through
 * untouched and the built CSS is what it has always been.
 */
const bookingCss = /\/\* booking-only:start[\s\S]*?booking-only:end \*\/\n?/g;
const dropBookingCss = {
  name: 'barber-template:drop-booking-css',
  enforce: 'pre',
  transform(code, id) {
    if (BOOKING_ENABLED || !id.split('?')[0].endsWith('/src/styles/demo.css')) return null;
    return { code: code.replace(bookingCss, ''), map: null };
  },
};

// Static output, no adapter. Cloudflare serves dist/ as-is:
//   root directory: barber-template, build command: npm run build, output: dist
export default defineConfig({
  // The live domain: canonical links and link-preview images are built on it.
  // SITE_URL points a single-client build at the client's own domain.
  site: SITE_URL,
  output: 'static',
  // The barber pages moved from /demo/<slug> to /<slug>. These produce a
  // meta-refresh page per old path; public/_redirects gives Cloudflare a 301.
  // The booking redirect goes when the booking page is not built.
  redirects: {
    '/demo/[slug]': '/[slug]',
    ...(BOOKING_ENABLED ? { '/demo/[slug]/book': '/[slug]/book' } : {}),
  },
  compressHTML: true,
  build: {
    inlineStylesheets: 'always',
  },
  // Tailwind is only pulled in by src/styles/demo.css, for the /demo pages.
  vite: {
    // dropBookingCss comes first: Tailwind's transform would have eaten the marker comments by the time it ran after it.
    plugins: [dropBookingCss, tailwindcss()],
    resolve: { alias: aliases },
  },
});
