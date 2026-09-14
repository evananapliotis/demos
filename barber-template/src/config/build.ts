/**
 * Build flags for a single-client deploy, read from the environment when the
 * build starts. With none of them set the build is the full demo site,
 * unchanged.
 *
 *   CLIENT_SLUG=ca1-barber-shop           only that listing gets a page, and
 *                                         its page is the front page
 *   BOOKING_ENABLED=false                 no /<slug>/book page, and no booking
 *                                         link or button anywhere
 *   SITE_URL=https://ca1barbershop.co.uk  the domain canonicals, link-preview
 *                                         tags and the sitemap are built on
 *
 * astro.config.mjs reads SITE_URL and BOOKING_ENABLED from here too, so the
 * flags are parsed in one place.
 */

/** An environment variable, trimmed, or null when unset or blank. */
function env(key: string): string | null {
  const value = process.env[key];
  return value == null || value.trim() === '' ? null : value.trim();
}

/** The one listing this build is for, or null for the whole demo site. */
export const CLIENT_SLUG: string | null = env('CLIENT_SLUG');

/**
 * Whether the booking page and every link to it are built. Unset means yes;
 * only an explicit off value ("false", "0", "no", "off") turns booking off,
 * so a typo cannot quietly drop the booking page.
 */
export const BOOKING_ENABLED: boolean = !/^(false|0|no|off)$/i.test(env('BOOKING_ENABLED') ?? '');

/** The live domain. Canonical links, OG tags and the sitemap are built on it. */
export const SITE_URL: string = env('SITE_URL') ?? 'https://mybarbersite.co.uk';
