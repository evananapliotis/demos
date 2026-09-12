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
    'HAWAR BARBER, 321 North Rd, Darlington DL1 3BL. Barber shop rated 5.0 from 56 Google reviews. Open 7 days, wheelchair accessible. Call 07918 899141.',
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
    /** Weekly hours, confirmed from the Google listing. 24h "HH:MM". `null` on a day = closed. */
    week: {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '18:15' },
      friday: { open: '08:30', close: '18:30' },
      saturday: { open: '08:30', close: '18:00' },
      sunday: { open: '09:00', close: '16:00' },
    } as Record<Day, HoursRange | null> | null,
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
    'Open seven days a week, with the full hours below, and wheelchair accessible. Call 07918 899141 if you want to check before you set off.',
  ],

  /** Online booking link (Fresha, Booksy …). None found yet. When set, "Book" buttons appear and open it. */
  bookingUrl: null as string | null,

  /** Social profiles. Only the Facebook page could be confirmed as this shop. */
  socials: [{ label: 'Facebook', url: 'https://www.facebook.com/61574727154851' }] as Social[],

  images: {
    hero: 'hero.jpg',
    shopfront: 'shopfront.jpg',
    galleryPrefix: 'gallery-',
    /**
     * Alt text per file. Every photo is a real photo of the shop, named to match this list.
     * Gallery order: back-of-head fades first, then barbers at work, then face-on and profile cuts and beards.
     * Only full-size photos are kept; the shopfront slot is empty until a full-size shopfront photo arrives.
     */
    alt: {
      'hero.jpg': 'Inside HAWAR BARBER in Darlington: a row of black and gold barber chairs under hexagon ceiling lights',
      'gallery-0.jpg': 'Blonde skin fade with a slicked-back top, seen from behind, cut at HAWAR BARBER in Darlington',
      'gallery-1.jpg': 'A barber at HAWAR BARBER in Darlington cutting a client in a striped cape at a black and gold station',
      'gallery-2.jpg': 'A barber at work under the hexagon ceiling lights at HAWAR BARBER in Darlington',
    } as Record<string, string>,
    galleryAlt: 'Haircut from the chair at HAWAR BARBER, Darlington',
  },
};

export type Site = typeof site;
