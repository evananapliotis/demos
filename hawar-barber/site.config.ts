/**
 * HAWAR BARBER — the one file to edit.
 *
 * Every word, number, link and hour the site shows comes from here. Nothing below
 * was invented: each value is either from the shop's Google listing or was left
 * empty because it could not be verified. Empty things are simply not rendered —
 * fill them in and the matching section appears.
 *
 * Photos: drop real photos into public/images/ and reference them in `images`.
 *   hero.jpg       big cut shot behind the hero (optional; without it the hero is type on a dark gradient)
 *   shopfront.jpg  the front of the shop (optional; shown in the About section)
 *   gallery-1.jpg, gallery-2.jpg …  (optional; the gallery appears when at least one exists)
 */

export type Day = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export interface HoursRange { open: string; close: string } // 24h "09:00"
export interface Service {
  /** Short id used in URLs and the database, e.g. 'haircut'. */
  id: string;
  name: string;
  /** How long it takes: sets the slots offered and the time it blocks out. */
  minutes: number;
  /** Optional. Prices are not shown until the shop confirms them. */
  price?: string;
  note?: string;
}
export interface Review { author: string; rating: number; text: string; date?: string }
export interface Social { label: string; url: string }

export const site = {
  name: 'HAWAR BARBER',
  /** One line under the name. Only claims the listing supports. */
  tagline: 'Five-star barbering on North Road, Darlington.',
  /** Meta description (~150 chars). */
  description:
    'HAWAR BARBER, 321 North Rd, Darlington DL1 3BL. Barber shop rated 5.0 from 56 Google reviews. Open 7 days, wheelchair accessible. Call 07918 899141.',
  /** Public URL: the live domain on Cloudflare. Canonical, sitemap, link preview and the poster's QR code all use it. */
  url: 'https://hawarbarbers.co.uk',

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


  /** Services and how long each takes (confirmed by the owner). No prices until he confirms them. */
  services: [
    { id: 'haircut', name: 'Haircut', minutes: 30 },
    { id: 'skin-fade', name: 'Skin fade', minutes: 45 },
    { id: 'beard-trim', name: 'Beard trim', minutes: 20 },
    { id: 'haircut-beard', name: 'Haircut & beard', minutes: 50 },
    { id: 'kids-cut', name: 'Kids cut', minutes: 20 },
    { id: 'hot-towel-shave', name: 'Hot towel shave', minutes: 30 },
  ] as Service[],
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

  /** Online booking (the built-in system at /book). Every number here is safe to change. */
  booking: {
    /** Switch the whole booking system on or off. Off = the Book buttons disappear. */
    enabled: true,
    /** Barbers working at once. One for now; raise it once the owner confirms. */
    chairs: 1,
    /** Start times are offered every this many minutes. */
    slotMinutes: 15,
    /** Occupied time is stored in cells this long; every service length must be a multiple of it. */
    cellMinutes: 5,
    /** Nothing can be booked closer than this to now. */
    minNoticeMinutes: 60,
    /** How far ahead customers can book. */
    horizonDays: 21,
    /** Bookings older than this are deleted by the nightly job. */
    retentionDays: 90,
    /** A phone number can hold at most this many upcoming bookings. */
    maxActivePerPhone: 2,
  },

  /** Social profiles. Only the Facebook page could be confirmed as this shop. */
  socials: [{ label: 'Facebook', url: 'https://www.facebook.com/61574727154851' }] as Social[],

  images: {
    hero: 'hero.jpg',
    shopfront: 'shopfront.jpg',
    galleryPrefix: 'gallery-',
    /**
     * Alt text per file. Every photo is a real photo of the shop, named to match this list.
     * Gallery order: back-of-head fades first, then barbers at work, then face-on and profile cuts and beards.
     * Only full-size photos are kept (JPEG or WebP, any size). The shopfront slot is empty until a shopfront photo arrives.
     */
    alt: {
      'hero.jpg': 'Inside HAWAR BARBER in Darlington: a row of black and gold barber chairs under hexagon ceiling lights',
      'gallery-0.jpg': 'Blonde skin fade with a slicked-back top, seen from behind, cut at HAWAR BARBER in Darlington',
      'gallery-1.webp': 'Skin fade with a shaved line detail at the nape, seen from behind, cut at HAWAR BARBER in Darlington',
      'gallery-2.webp': 'A barber cutting a client in a striped cape at a black and gold station, the street outside the window, at HAWAR BARBER in Darlington',
      'gallery-3.webp': 'A barber combing a client’s slicked-back hair at the chair at HAWAR BARBER in Darlington',
      'gallery-4.webp': 'Wide view of the shop floor at HAWAR BARBER in Darlington: two barbers at work, a marble floor and green seating under the hexagon lights',
      'gallery-5.webp': 'A row of black and gold chairs with striped capes ready under the hexagon ceiling lights at HAWAR BARBER in Darlington',
      'gallery-6.webp': 'The shop floor at HAWAR BARBER in Darlington: gold-trimmed chairs on a marble floor under the hexagon lights',
      'gallery-7.webp': 'Textured crop with a low fade and a shaped beard, face on, at HAWAR BARBER in Darlington',
    } as Record<string, string>,
    galleryAlt: 'Haircut from the chair at HAWAR BARBER, Darlington',
  },
};

export type Site = typeof site;
