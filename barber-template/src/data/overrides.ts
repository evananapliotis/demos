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

/**
 * A palette written by hand rather than read off a photograph. Every value is
 * still run through the same WCAG audit as a derived one, so a hand-picked
 * palette cannot ship below AA either.
 */
export interface PaletteOverride {
  scheme: 'dark' | 'light';
  /** Ground, raised ground, and the hairline/border ground. */
  ink: string;
  ink2: string;
  ink3: string;
  /** Body type and quiet type. */
  cream: string;
  cream2: string;
  accent: string;
  accentHover: string;
  /** Type sitting on the accent. */
  onAccent: string;
  /** Why these colours, for anyone auditing the page. */
  reason: string;
}

export interface ShopOverride {
  /** Colours chosen by hand, in place of the ones derived from the shop's photo. */
  palette?: PaletteOverride;
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
   * The shop's own photographs, in gallery order, replacing whatever the Google
   * listing carried. Root-absolute paths under /shops/<slug>/, prepared by
   * scripts/shop-photos.mjs. Credited to the shop, not to a Google reviewer.
   */
  photos?: string[];
  /**
   * Use the ruled hero rather than the one this shop's layout would pick: type
   * ruled across the full width with the photograph held down behind it.
   */
  heroVariant?: 'ruled';
  /**
   * Which of them stands behind the first screen. Any of the set; it is shown
   * heavily darkened, so it is chosen for its tone rather than its detail.
   */
  heroPhoto?: string;
  /**
   * Do not use this listing's photographs anywhere — no hero, no gallery, no
   * credit for a picture nobody can see. For a listing whose only photograph is
   * weak, a hero built on it and a one-tile gallery both read as a page
   * apologising for its picture. Ignored when `photos` above supplies a set.
   */
  usePhotos?: false;
}

export const OVERRIDES: Record<string, ShopOverride> = {
  /**
   * Hinckley. Spoken to the owner: prices, hours and the shop's story are his,
   * given over the phone. Friday is a genuine split day — he shuts at half
   * twelve and opens again at half two.
   *
   * The Google listing's own photograph was not good enough to build a page on;
   * the shop has since sent ten files of its own. Nine are photographs of the
   * work and make the gallery, desaturated so they read as one set; the tenth
   * is the wordmark again, which is shown as the mark it is rather than as a
   * tile in the gallery.
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
    /*
     * Monochrome, taken from his own logo rather than from a photograph: the
     * card is a black ground with white script and a grey subtitle, so the page
     * is built the same way. The one accent is a warm bone — enough to mark a
     * price, a rating or a link as different from body type, not enough to
     * compete with the black. Every pair clears AA by a wide margin; the
     * tightest is quiet type on the raised ground at 7.68:1.
     */
    palette: {
      scheme: 'dark',
      ink: '#0a0a0a',
      ink2: '#151515',
      ink3: '#202020',
      cream: '#f4f4f4',
      cream2: '#a8a8a8',
      accent: '#cbb994',
      accentHover: '#ded0b3',
      onAccent: '#0a0a0a',
      reason: "monochrome, taken from the shop's own black-and-white wordmark",
    },
    /*
     * patel-1 is the wordmark and so is not in this list. The order is the order
     * the files arrived in; the gallery follows it.
     */
    photos: [
      '/shops/patel-and-co/patel-2.webp',
      '/shops/patel-and-co/patel-3.webp',
      '/shops/patel-and-co/patel-4.webp',
      '/shops/patel-and-co/patel-5.webp',
      '/shops/patel-and-co/patel-6.webp',
      '/shops/patel-and-co/patel-7.webp',
      '/shops/patel-and-co/patel-8.webp',
      '/shops/patel-and-co/patel-9.webp',
      '/shops/patel-and-co/patel-10.webp',
    ],
    /* The cut-throat razor at the jaw: the most black in the set, and it holds the name. */
    heroVariant: 'ruled',
    heroPhoto: '/shops/patel-and-co/patel-4.webp',
    /*
     * The wordmark, from the Google listing rather than from patel-1.webp: it is
     * the same mark at 1400px instead of 474, so it stays sharp on the plate.
     */
    logoPhoto: '/photos/patel-and-co-2.jpg',
  },
};

/** The owner-confirmed facts for a slug, or an empty object. */
export function overrideFor(slug: string): ShopOverride {
  return OVERRIDES[slug] ?? {};
}
