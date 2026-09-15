/**
 * Facts a shop's owner has confirmed directly, for the handful of demos that
 * have been talked through with them.
 *
 * src/data/barbers.json is a machine export and is left exactly as it came;
 * anything a person told us goes here instead, keyed by slug. A shop with no
 * entry renders precisely as before, so this file can only ever add to one
 * page at a time.
 *
 * `hours` is written the way the export writes hours — day label to a list of
 * range strings — so owner-given hours go through the same parser, formatter
 * and week table as listing hours, with no second code path. A day with two
 * ranges is a split day (closed over lunch), which the export happens never to
 * contain but real shops certainly do.
 */

/** One line of a price list. */
export type PriceRow = { name: string; price: string; minutes?: number };

/** One bookable service. `price` shows on the booking page's service chips when the shop has given one. */
export type ServiceRow = { id: string; name: string; minutes: number; price?: string };

export interface ShopOverride {
  /** Day label ("Monday" … "Sunday") to one or more ranges: ["9am-12:30pm", "2:30pm-7pm"]. */
  hours?: Record<string, string[]>;
  /** The shop's own price list, replacing "prices on request". */
  prices?: PriceRow[];
  /** The bookable menu, replacing the six standard services. */
  services?: ServiceRow[];
  /** About, in the owner's own words. Replaces the paragraphs derived from the listing. */
  story?: string[];
  socials?: { instagram?: string; facebook?: string };
  /**
   * A listing "photo" that is really a logo or wordmark. It is taken out of the
   * gallery — cropping a wordmark into a 4:5 tile mangles it — and shown as a
   * mark at its own aspect ratio instead.
   */
  logoPhoto?: string;
  /**
   * Leave the gallery section out. For a listing with one real photograph,
   * a two-tile gallery repeating the hero reads as a page with nothing in it;
   * the space goes to the shop's own prices, hours and story instead.
   */
  gallery?: false;
}

export const OVERRIDES: Record<string, ShopOverride> = {
  /**
   * Hinckley. Spoken to the owner: prices, hours and the shop's story are his,
   * given over the phone. Friday is a genuine split day — he shuts at half
   * twelve and opens again at half two.
   *
   * The Google listing carries two images: one photograph of the shopfront and
   * one black wordmark card. That is not enough for a gallery, so the gallery
   * is off, the photograph is the hero and the wordmark is shown as a mark.
   *
   * Service durations are the one thing here he did not give: they are ordinary
   * barbershop lengths, set so the booking calendar has slot lengths to work
   * with. Everything else on the page is his.
   */
  'patel-and-co': {
    hours: {
      Monday: ['9am-5pm'],
      Tuesday: ['9am-5pm'],
      Wednesday: ['9am-5pm'],
      Thursday: ['9am-5pm'],
      Friday: ['9am-12:30pm', '2:30pm-7pm'],
      Saturday: ['8am-12pm'],
      Sunday: ['Closed'],
    },
    prices: [
      { name: 'Senior Stylist Haircut & Style', price: 'from £20', minutes: 30 },
      { name: 'Senior Cut, Style & Beard Shape Up', price: '£25', minutes: 45 },
      { name: 'Junior Cut & Style', price: '£15', minutes: 30 },
      { name: 'Junior Cut, Style & Beard', price: '£20', minutes: 45 },
      { name: 'OAP Senior Cut & Style', price: '£18', minutes: 30 },
      { name: 'Boys 10 and under', price: '£17', minutes: 20 },
      { name: 'Senior Beard Trim', price: '£14', minutes: 15 },
    ],
    services: [
      { id: 'senior-cut', name: 'Senior Stylist Haircut & Style', minutes: 30, price: 'from £20' },
      { id: 'senior-cut-beard', name: 'Senior Cut, Style & Beard Shape Up', minutes: 45, price: '£25' },
      { id: 'junior-cut', name: 'Junior Cut & Style', minutes: 30, price: '£15' },
      { id: 'junior-cut-beard', name: 'Junior Cut, Style & Beard', minutes: 45, price: '£20' },
      { id: 'oap-cut', name: 'OAP Senior Cut & Style', minutes: 30, price: '£18' },
      { id: 'boys-cut', name: 'Boys 10 and under', minutes: 20, price: '£17' },
      { id: 'beard-trim', name: 'Senior Beard Trim', minutes: 15, price: '£14' },
    ],
    story: [
      'Two brothers opened Patel & Co on Rugby Road in 2018, and they have been behind the chairs ever since. Thirteen years of barbering between them: skin fades, scissor work, beard shape-ups and the kind of cut that still sits right a month later.',
      'Senior and junior stylists work every day, so there is a price for whoever you sit with, with rates for pensioners and for boys ten and under. Walk in if the door is open, or pick a time below.',
    ],
    socials: { instagram: 'patelandco', facebook: 'PatelandCo' },
    logoPhoto: '/photos/patel-and-co-2.jpg',
    gallery: false,
  },
};

/** The owner-confirmed facts for a slug, or an empty object. */
export function overrideFor(slug: string): ShopOverride {
  return OVERRIDES[slug] ?? {};
}
