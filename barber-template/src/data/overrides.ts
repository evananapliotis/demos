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
  /**
   * Whether the page offers online booking. Off for every shop unless it is
   * turned on here, one slug at a time.
   *
   * The booking page is generated either way, so switching this to true restores
   * every Book link with no other change. Off, the page still says everything it
   * knows — the number, the address, the hours, the rating — it just stops
   * offering a booking system to a shop that has not agreed to one.
   */
  showBooking?: boolean;
  /**
   * The road the shop is on, where the listing's street line does not reduce to
   * one. The derivation strips a leading house number, which handles almost
   * every listing, but not a street written as a building first — "Cameo House,
   * 323 Buxton Rd" reduces to itself, and a strapline then reads "barbering on
   * Cameo House, 323 Buxton Road".
   *
   * This is the road only, for the places that want to name a road: the
   * strapline, the About heading and the page title. The postal address is
   * untouched and keeps the building name, because that is where the post goes.
   */
  roadName?: string;
  /** Colours chosen by hand, in place of the ones derived from the shop's photo. */
  palette?: PaletteOverride;
  /**
   * Colours for the hero band only, leaving the rest of the page alone.
   *
   * A light-ground page cannot carry a photograph behind dark type: measured on
   * duhok-barber, the picture has to be washed to 15% opacity before the small
   * type clears AA, by which point it is not a photograph any more. A dark band
   * takes the same picture at 62% with every element clear. Every colour in the
   * hero is expressed through custom properties, so redefining them on <header>
   * darkens the scrim and lightens the type together.
   */
  heroPalette?: PaletteOverride;
  /**
   * Give the reviews section the room its numbers deserve. For a shop whose
   * rating and review count are the strongest things it can prove, the default
   * block undersells them.
   */
  featureReviews?: boolean;
  /**
   * Lay the gallery out at mixed sizes rather than as a uniform grid. Worth it
   * where a shop has enough photographs to fill one.
   */
  galleryMosaic?: boolean;
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
    showBooking: true,
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
    /*
     * Every clause here is traceable: the trade, the road and the town come from
     * the listing; the rating and the review count come from the listing; the
     * stylist tiers, the concession rates and the opening pattern come from the
     * price list and hours the shop confirmed. Nothing about when the shop
     * opened, how many people work in it, how long they have been doing it, or
     * how they are related — none of that was ever sourced, so none of it is
     * here. Two short paragraphs is the honest length.
     */
    story: [
      'Patel & Co is a barber shop on Rugby Road in Hinckley. Seventy people have reviewed it on Google and the rating stands at 4.9 out of 5.',
      'There are senior and junior stylist rates, and set prices for pensioners and for boys ten and under — the full list is above. Open six days a week, with Friday running in two halves either side of a midday close.',
    ],
    /*
     * No socials. The handles we had came to us in the same unsourced note as
     * the founding year and the brothers, and neither was confirmed with the
     * shop. A link that goes to the wrong account is worse than no link, so
     * they stay out until someone checks them.
     */
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

  /**
   * Stockport. The listing's street is "Cameo House, 323 Buxton Rd", which is a
   * building and a house number; neither belongs in a strapline. Hand-set to the
   * road so the strapline, the About heading and the title all name it. Fixed
   * for this shop only — the corpus has not been audited for the same shape yet.
   */
  'duhok-barber': {
    roadName: 'Buxton Road',
    /*
     * The wide interior shot. Chosen over the shopfront, which is the striking
     * one but carries the shop's name in neon and would fight the page's own
     * name set over it.
     */
    heroPhoto: '/photos/duhok-barber-1.jpg',
    /*
     * The hero band only. Measured: on the ivory ground the photograph must be
     * washed to 15% before the eyebrow and the navigation clear AA; on this one
     * it sits at 62% and all 24 text elements over it clear AA. The palette's
     * own eight pairs clear too, the lowest at 9.93:1.
     */
    heroPalette: {
      scheme: 'dark',
      ink: '#14110c',
      ink2: '#1e1a13',
      ink3: '#2a251b',
      cream: '#f7f4ee',
      cream2: '#cfc9bb',
      accent: '#e0c25c',
      accentHover: '#ecd68c',
      onAccent: '#14110c',
      reason: 'hero band only: a dark ground is the only one that lets the photograph stay a photograph',
    },
    featureReviews: true,
    galleryMosaic: true,
    /*
     * One paragraph, and only what the listing carries: the trade, the road, the
     * town, the review count and the rating. The absence of opening hours is
     * stated once, in Find us, where the hours would be — it used to be said
     * here as well.
     */
    story: [
      'Duhok barber is a barber shop on Buxton Road in Stockport. 136 people have reviewed it on Google and the rating stands at 4.9 out of 5.',
    ],
  },

  /** Hitchin. Booking stays on here; nothing else about the page is overridden. */
  'studio-22-hitchin': {
    showBooking: true,
  },
};

/** The owner-confirmed facts for a slug, or an empty object. */
export function overrideFor(slug: string): ShopOverride {
  return OVERRIDES[slug] ?? {};
}
