/**
 * Components astro.config.mjs picks per build, so only the one a build needs
 * is in the module graph. A component that is imported and never rendered
 * still gets its stylesheet inlined and its script bundled.
 */

/** The client's own shop page on a CLIENT_SLUG build, the MyBarberSite offer otherwise. */
declare module 'virtual:front-page' {
  const FrontPage: (props: Record<string, never>) => unknown;
  export default FrontPage;
}

/** The booking page, or src/components/Nothing.astro when BOOKING_ENABLED=false. */
declare module 'virtual:booking-page' {
  import type { DemoSite } from './lib/demo.ts';
  const BookingPage: (props: { site: DemoSite }) => unknown;
  export default BookingPage;
}
