/**
 * Section wording, drawn from small pools by the shop's slug.
 *
 * Five palettes do not stop five pages reading as one template: a prospect who
 * opens two links in the same town sees the same headings word for word and
 * knows. So every heading, eyebrow and standing line that states no fact about
 * the shop is drawn from a pool, by the same hash that picks the theme
 * (src/lib/theme.ts) with a per-field key — two shops on the same theme still
 * read differently, and a shop's wording never changes between visits.
 *
 * Nothing here adds a fact. Every line says the same thing in another voice;
 * anything specific to a shop (the tagline, the two paragraphs, the hours) is
 * still derived from the listing in src/lib/demo.ts.
 */
import { pick } from './theme.ts';

/** A section heading as two parts: the lead, then the accented tail. */
export type Heading = readonly [lead: string, accent: string];

/* Neutral either way: no listing publishes a price list, so an eyebrow must not promise one. */
const PRICES_EYEBROW = ['Prices', 'What it costs', 'Cost', 'Prices and booking'] as const;
const PRICES_ASK_TITLE: readonly Heading[] = [
  ['Ask for', 'prices.'],
  ['Call for', 'the price.'],
  ['Prices on', 'request.'],
  ['Give us a', 'ring.'],
];
const PRICES_LIST_TITLE: readonly Heading[] = [
  ['What it', 'costs.'],
  ['The', 'price list.'],
  ['Prices, in', 'full.'],
  ['What you', 'pay.'],
];
const PRICES_LEDE = [
  'Prices are not published online. Call and ask before you come in.',
  'The shop has not put a price list online. One call and you will know.',
  'There is no price list on the Google listing. Ring the shop and ask.',
  'Prices are not listed online — the shop will tell you over the phone.',
] as const;
const SERVICES_HEADING = ['What you can book', 'Bookable online', 'Book any of these', 'On the booking page'] as const;

const GALLERY_EYEBROW = ['The work', 'In the chair', 'The shop in photos', 'Recent work'] as const;
const GALLERY_TITLE: readonly Heading[] = [
  ['Fresh from the', 'chair.'],
  ['Recent', 'cuts.'],
  ['A look', 'inside.'],
  ['Straight from the', 'shop.'],
  ['The work', 'itself.'],
];

const REVIEWS_EYEBROW = ['Google reviews', 'What people say', 'Reviews', 'Word of mouth'] as const;
const REVIEWS_ACCENT = ['Read them yourself.', 'Straight from Google.', 'See for yourself.', 'All of them public.'] as const;
const REVIEWS_LEDE = [
  'Every one is on the shop’s Google listing, word for word, from the people who sat in the chair.',
  'These are the shop’s Google reviews: public, unedited, and written by customers.',
  'Nothing here is picked or trimmed. It is the whole Google rating, as it stands today.',
  'Written on Google by people who came in, and left exactly as they wrote it.',
] as const;

const ABOUT_EYEBROW = ['The shop', 'About', 'Where you’re going', 'Inside'] as const;

const FIND_US_EYEBROW = ['Find us', 'Where we are', 'Getting here', 'The address'] as const;
const FIND_US_TITLE: readonly Heading[] = [
  ['Come and', 'see us.'],
  ['Where to', 'find us.'],
  ['On the', 'map.'],
  ['Drop', 'in.'],
];

const CTA_TITLE: readonly Heading[] = [
  ['Ready when', 'you are.'],
  ['See you in', 'the chair.'],
  ['Book your', 'next cut.'],
  ['Your next cut', 'starts here.'],
];

const BOOK_TITLE: readonly Heading[] = [
  ['Book a', 'time.'],
  ['Pick a', 'time.'],
  ['Book your', 'cut.'],
  ['Choose a', 'slot.'],
];

export interface Copy {
  pricesEyebrow: string;
  /** Heading for the "no price list published" branch. */
  pricesAskTitle: Heading;
  /** Heading for the branch where the shop has given a price list. */
  pricesListTitle: Heading;
  pricesLede: string;
  servicesHeading: string;
  galleryEyebrow: string;
  galleryTitle: Heading;
  reviewsEyebrow: string;
  reviewsAccent: string;
  reviewsLede: string;
  aboutEyebrow: string;
  findUsEyebrow: string;
  findUsTitle: Heading;
  ctaTitle: Heading;
  bookTitle: Heading;
}

/** This shop's wording. Pure function of the slug, like the theme. */
export function copyFor(slug: string): Copy {
  return {
    pricesEyebrow: pick(PRICES_EYEBROW, slug, 'prices-eyebrow'),
    pricesAskTitle: pick(PRICES_ASK_TITLE, slug, 'prices-title'),
    pricesListTitle: pick(PRICES_LIST_TITLE, slug, 'prices-title'),
    pricesLede: pick(PRICES_LEDE, slug, 'prices-lede'),
    servicesHeading: pick(SERVICES_HEADING, slug, 'services-heading'),
    galleryEyebrow: pick(GALLERY_EYEBROW, slug, 'gallery-eyebrow'),
    galleryTitle: pick(GALLERY_TITLE, slug, 'gallery-title'),
    reviewsEyebrow: pick(REVIEWS_EYEBROW, slug, 'reviews-eyebrow'),
    reviewsAccent: pick(REVIEWS_ACCENT, slug, 'reviews-accent'),
    reviewsLede: pick(REVIEWS_LEDE, slug, 'reviews-lede'),
    aboutEyebrow: pick(ABOUT_EYEBROW, slug, 'about-eyebrow'),
    findUsEyebrow: pick(FIND_US_EYEBROW, slug, 'find-us-eyebrow'),
    findUsTitle: pick(FIND_US_TITLE, slug, 'find-us-title'),
    ctaTitle: pick(CTA_TITLE, slug, 'cta-title'),
    bookTitle: pick(BOOK_TITLE, slug, 'book-title'),
  };
}
