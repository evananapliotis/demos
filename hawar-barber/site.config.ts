/**
 * HAWAR BARBER — the one file to edit.
 *
 * Every word, number, link and hour the site shows comes from here. Nothing below
 * was invented: each value is either from the shop's Google listing or was left
 * empty because it could not be verified. Empty things are simply not rendered —
 * fill them in and the matching section appears.
 *
 * Photos: drop real photos into public/images/ and reference them in `images`.
 *   hero.jpg       big cut shot behind the hero (optional; without it the hero is type + 3D pole)
 *   shopfront.jpg  the front of the shop (optional; shown in the About section)
 *   gallery-1.jpg, gallery-2.jpg …  (optional; the gallery appears when at least one exists)
 */

export type Day = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export interface HoursRange { open: string; close: string } // 24h "09:00"
export interface Service { name: string; price?: string; note?: string }
export interface Review { author: string; rating: number; text: string; date?: string }
export interface Social { label: string; url: string }

export const site = {
  name: 'HAWAR BARBER',
  /** One line under the name. Only claims the listing supports. */
  tagline: 'Five-star barbering on North Road, Darlington.',
  /** Meta description (~150 chars). */
  description:
    'HAWAR BARBER, 321 North Rd, Darlington DL1 3BL. Barber shop rated 5.0 from 56 Google reviews. Wheelchair accessible, closes 6pm. Call 07918 899141.',
  /** Public URL. Cloudflare Pages gives <project>.pages.dev; change when a domain is attached. */
  url: 'https://hawar-barber.pages.dev',

  phone: { display: '07918 899141', tel: '+447918899141' },
  address: { street: '321 North Rd', locality: 'Darlington', postcode: 'DL1 3BL', region: 'County Durham', country: 'GB' },
  /** Centre of postcode DL1 3BL (public postcode data). Approximate: not the pin itself. */
  geo: { lat: 54.547023, lng: -1.547865, approximate: true },

  google: {
    rating: 5.0,
    reviewCount: 56,
    /** The search that finds the listing on Google Maps. */
    query: 'HAWAR BARBER 321 North Rd Darlington',
  },
  /** Attributes shown on the Google listing. */
  features: ['Wheelchair accessible'],

  hours: {
    /** Google shows "Closes 6 pm". */
    closes: '18:00',
    /**
     * Full week, once confirmed with the shop. `null` for the whole week hides the table and
     * shows the closing time with a "call to check" line. `null` on a day = closed that day.
     * Example: { monday: { open: '09:00', close: '18:00' }, …, sunday: null }
     */
    week: null as Record<Day, HoursRange | null> | null,
  },

  /** No services or prices are published anywhere we could read. Add them and the list renders. */
  services: [] as Service[],
  pricesNote: 'Prices are not published online. Call and ask before you come in.',

  /** Paste real Google reviews here (author first name, rating, exact text). Empty = rating band only. */
  reviews: [] as Review[],

  /** About copy. Facts only. */
  about: [
    'HAWAR BARBER is a barber shop at 321 North Road, Darlington, DL1 3BL.',
    'Fifty-six people have reviewed the shop on Google, and the rating stands at 5.0 out of 5.',
    'The shop is wheelchair accessible and closes at 6pm. Call 07918 899141 to check today’s hours before you set off.',
  ],

  /** Online booking link (Fresha, Booksy …). None found yet. When set, "Book" buttons appear and open it. */
  bookingUrl: null as string | null,

  /** Social profiles. Only the Facebook page could be confirmed as this shop. */
  socials: [{ label: 'Facebook', url: 'https://www.facebook.com/61574727154851' }] as Social[],

  images: {
    hero: 'hero.jpg',
    shopfront: 'shopfront.jpg',
    galleryPrefix: 'gallery-',
    /** Alt text per file. Name the service and the town. */
    alt: {
      'hero.jpg': 'Fresh haircut at HAWAR BARBER, Darlington',
      'shopfront.jpg': 'The front of HAWAR BARBER on North Road, Darlington',
    } as Record<string, string>,
    galleryAlt: 'Haircut from the chair at HAWAR BARBER, Darlington',
  },
};

export type Site = typeof site;
