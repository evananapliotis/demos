/**
 * Everything a /[slug] page shows, derived from one listing. Nothing here
 * adds facts: it formats what the listing has and leaves out what it lacks.
 */
import { DAYS, type Day } from '../config/site.schema.ts';
import { copyFor } from './copy.ts';
import { creditFor, photoFor, type PhotoAuthor } from './photos.ts';
import { paletteFor } from './shop-palette.ts';
import { layoutFor, type HeroVariant } from './theme.ts';
import { hoursList, kindOf, phoneDisplay, reviewsPerScore, telHref, toSchedule, trueAttributes, type Shop } from './shops.ts';
import { SERVICES } from './demo-booking.ts';
import { overrideFor, type PriceRow, type ServiceRow } from '../data/overrides.ts';

export const dayLabel = (d: Day) => d.charAt(0).toUpperCase() + d.slice(1);

const ROADS: Record<string, string> = {
  Rd: 'Road', St: 'Street', Ave: 'Avenue', Av: 'Avenue', Ln: 'Lane', Dr: 'Drive', Pl: 'Place', Sq: 'Square', Cres: 'Crescent',
  Ter: 'Terrace', Gdns: 'Gardens', Pk: 'Park', Cl: 'Close', Ct: 'Court', Grn: 'Green', Hl: 'Hill', Mkt: 'Market', Pde: 'Parade',
  Bvd: 'Boulevard', Blvd: 'Boulevard', Hwy: 'Highway', Wy: 'Way',
};
/** A house number, so the road name proper can be found: "244", "23A", "13-14". */
const HOUSE_NUMBER = /^\d+[a-z]?(?:-\d+[a-z]?)?$/i;
/** A compass initial can sit between the number and the road name: "7C E St Mary's Gate". */
const COMPASS = new Set(['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW']);

/**
 * "91 Balham High Rd" -> "91 Balham High Road". A trailing comma ("Globe Rd,
 * Harpley Square") stays where it is.
 *
 * "St" is the one abbreviation that is not always a road type: at the head of a
 * road name it is Saint ("St Paul's Rd"), everywhere else it is Street ("High
 * St", "St Nicholas St" — both at once). So each comma-separated part is
 * scanned for where its road name actually begins, past any house number and
 * compass initial, and an "St" in that one position is left alone.
 */
export const expandRoad = (street: string) =>
  street
    .split(',')
    .map((part) => {
      const words = part.split(' ');
      let head = 0;
      while (head < words.length && (words[head] === '' || HOUSE_NUMBER.test(words[head]!) || COMPASS.has(words[head]!.replace(/[,.]$/, '')))) head++;
      return words
        .map((w, i) =>
          w.replace(/^([A-Za-z]+)([,.]?)$/, (_, word: string, tail: string) => {
            if (word === 'St' && i === head && i < words.length - 1) return `${word}${tail}`;
            // The full stop is the abbreviation's own mark ("Watling St."), so it
            // goes with the abbreviation rather than surviving the expansion.
            return ROADS[word] ? ROADS[word]! : `${word}${tail}`;
          }),
        )
        .join(' ');
    })
    .join(',');
/** "91 Balham High Rd" -> "Balham High Road": the road without the building number. */
export const roadName = (street: string) => expandRoad(street.replace(/^\d+[a-z]?(?:-\d+[a-z]?)?\s+/i, '').replace(/^(unit|shop|flat)\s+\S+,?\s+/i, ''));

/**
 * Words that carry no address information, so a leading segment made only of
 * these plus the shop's own words is the shop's name rather than a place.
 */
const TRADE_WORDS = new Set([
  'the', 'and', 'a', 'of', 'ltd', 'limited', 'co', 'company', 'barber', 'barbers', 'barbershop', 'barbershops',
  'hair', 'haircut', 'haircuts', 'hairdresser', 'hairdressers', 'salon', 'saloon', 'studio', 'cuts', 'cutz',
  'grooming', 'gents', 'mens', 'turkish', 'kurdish',
]);

const addressTokens = (s: string) =>
  s.replace(/[™®©️]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);

/**
 * Some listings repeat the business name at the front of the address, so the
 * street comes through as "Classic Barber, 19 Butts" and the page ends up
 * saying "barbering on Classic Barber, 19 Butts". Drop those leading segments.
 *
 * Deliberately narrow, because most no-number leading segments are the building
 * the shop sits in — "Post Office", "Maylord shopping centre", "White & Bishop
 * Ltd" — and those belong in the address. A segment is only dropped when it
 * carries no house number, says nothing the business name does not already say,
 * and a house number still survives further along. That last guard is what
 * keeps a shop named after its road ("Church Street Barbers" at "Church
 * Street, Longwood") from having its address emptied out.
 *
 * Over the 1107 listings this changes 14 and leaves every other address alone.
 */
export function stripBusinessName(street: string, name: string): string {
  const nameTokens = new Set(addressTokens(name));
  if (!nameTokens.size) return street;
  // The same name is written both ways across the export — "Procutz" against
  // "Pro-Cutz barbers" — so the words are also compared with their punctuation
  // and spacing taken out. One squashed form has to START with the other and
  // the leftover has to be nothing but trade words, which is what lets
  // "procutzbarbers" match "procutz" while keeping "High St" away from a shop
  // called "High Street Barbers": there the leftover is "reetbarbers", which is
  // not a trade word.
  const informative = (words: string[]) => words.filter((w) => !TRADE_WORDS.has(w));
  const nameSquashed = addressTokens(name).join('');
  const isOnlyTradeWords = (rest: string) => {
    let left = rest;
    const byLongest = [...TRADE_WORDS].sort((a, b) => b.length - a.length);
    while (left) {
      const hit = byLongest.find((w) => left.startsWith(w));
      if (!hit) return false;
      left = left.slice(hit.length);
    }
    return true;
  };
  const sameNameDifferentlyWritten = (segmentSquashed: string) => {
    if (!segmentSquashed || !nameSquashed) return false;
    if (segmentSquashed.startsWith(nameSquashed)) return isOnlyTradeWords(segmentSquashed.slice(nameSquashed.length));
    if (nameSquashed.startsWith(segmentSquashed)) return isOnlyTradeWords(nameSquashed.slice(segmentSquashed.length));
    return false;
  };
  let segments = street.split(',').map((s) => s.trim()).filter(Boolean);
  while (segments.length > 1) {
    const [first, ...rest] = segments as [string, ...string[]];
    if (/\d/.test(first)) break;
    const words = addressTokens(first);
    if (!words.length) break;
    const saysNothingNew = informative(words).every((w) => nameTokens.has(w));
    if (!saysNothingNew && !sameNameDifferentlyWritten(words.join(''))) break;
    if (!rest.some((s) => /\d/.test(s))) break;
    segments = rest;
  }
  return segments.join(', ');
}

/** Trademark marks and emoji variation selectors render as boxes in the display face, so they stay out of the type. */
export const displayName = (name: string) => name.replace(/[™®©️]/g, '').replace(/\s+/g, ' ').trim();

/** Two lines of roughly equal length for the big type. A one-word name gets one line. */
export function nameLines(name: string): [string, string] {
  const words = name.split(' ').filter(Boolean);
  if (words.length < 2) return [name, ''];
  let best = 1;
  let bestLength = Infinity;
  for (let i = 1; i < words.length; i++) {
    const longest = Math.max(words.slice(0, i).join(' ').length, words.slice(i).join(' ').length);
    if (longest < bestLength) {
      bestLength = longest;
      best = i;
    }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];

/** Google listing attributes as short clauses for the about copy. Anything not listed here is left unsaid. */
const ATTRIBUTE_CLAUSES: [RegExp, string][] = [
  [/^toilets?$/i, 'there is a toilet'],
  [/^gender-neutral toilets$/i, 'there are gender-neutral toilets'],
  [/^good for kids$/i, 'it is good for kids'],
  [/^free of charge street parking$/i, 'street parking nearby is free'],
  [/^on-site parking$/i, 'there is parking on site'],
  [/^beverages$/i, 'drinks are offered'],
  [/^lgbtq\+ friendly$/i, 'it is LGBTQ+ friendly'],
  [/^transgender safe space$/i, 'it is a transgender safe space'],
  [/^identifies as women-owned$/i, 'the shop is women-owned'],
];
/** Up to four clauses, the practical ones first: appointments, walk-ins, payments, then the rest in listing order. */
function amenityClauses(attributes: string[]): string[] {
  const has = (re: RegExp) => attributes.some((a) => re.test(a));
  const out: string[] = [];
  if (has(/^accepts walk-ins$/i)) out.push('walk-ins are welcome');
  if (has(/^appointment required$/i) && !has(/^accepts walk-ins$/i)) out.push('appointments are required');
  else if (has(/^appointments? (required|recommended)$/i)) out.push('appointments are recommended');
  const cards = has(/^(credit|debit) cards$/i);
  const contactless = has(/^nfc mobile payments$/i);
  if (cards && contactless) out.push('cards and contactless are taken');
  else if (cards) out.push('cards are taken');
  else if (contactless) out.push('contactless is taken');
  for (const [re, clause] of ATTRIBUTE_CLAUSES) if (has(re) && !out.includes(clause)) out.push(clause);
  return out.slice(0, 4);
}
/** ["a", "b", "c"] -> "a, b and c". */
const listJoin = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
/** Text that goes through set:html. */
export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface Photo {
  /** Root-absolute, served straight from public/photos. */
  path: string;
  width: number;
  height: number;
  alt: string;
  authors: PhotoAuthor[];
}
export interface TrustCell {
  big: string;
  small: string;
  href?: string;
  count?: number;
  decimals?: number;
}

export function derive(shop: Shop) {
  /** Anything this shop's owner has confirmed directly. Empty for all but a handful. */
  const own = overrideFor(shop.slug);
  const nf = new Intl.NumberFormat('en-GB');
  const name = displayName(shop.name);
  const kind = kindOf(shop);
  const street = stripBusinessName(shop.street ?? shop.address.split(',')[0]!.trim(), name);
  const address = { street, locality: shop.city, postcode: shop.postcode };
  const fullAddress = `${street}, ${shop.city} ${shop.postcode}`;
  /** The road, for the strapline, the About heading and the title. Hand-set where the listing's street line will not reduce to one. */
  const road = own.roadName ?? roadName(street);
  const phone = { display: phoneDisplay(shop.phone), tel: shop.phone.replace(/[^\d+]/g, '') };

  // Links to the Google listing. The place id comes from the reviews link or the photo credits when either has it.
  const placeId = shop.reviews_link?.match(/[?&]placeid=([^&]+)/i)?.[1] ?? shop.photos.map((p) => creditFor(p)?.placeId).find(Boolean) ?? null;
  const destQuery = encodeURIComponent(`${name}, ${fullAddress}`);
  const listingUrl = placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : `https://www.google.com/maps/search/?api=1&query=${destQuery}`;
  const reviewsUrl = shop.reviews_link ?? listingUrl;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destQuery}${placeId ? `&destination_place_id=${placeId}` : ''}`;
  /** Map embed (no API key). Loaded on tap only. */
  const embedUrl = `https://www.google.com/maps?q=${destQuery}&z=16&output=embed`;

  const week = toSchedule(shop.hours);
  const openDays = week ? DAYS.filter((d) => week[d]).length : 0;
  const closedDays = week ? DAYS.filter((d) => !week[d]).map(dayLabel) : [];
  const openDaysLabel = openDays === 7 ? 'Open 7 days' : openDays ? `Open ${openDays} days a week` : '';
  const hoursRows = hoursList(shop.hours);

  const attributes = [...new Set(trueAttributes(shop.about))];
  const wheelchair = attributes.some((a) => /wheelchair/i.test(a));
  const features = wheelchair ? ['Wheelchair accessible'] : [];
  const amenities = amenityClauses(attributes);

  const rating = shop.rating ?? null;
  const reviewCount = shop.reviews;
  const reviewsText = `${nf.format(reviewCount)} Google review${reviewCount === 1 ? '' : 's'}`;
  const ratingWord = rating == null ? 'Independent' : rating >= 4.9 ? 'Five-star' : rating >= 4.5 ? 'Top-rated' : `${rating.toFixed(1)}-star`;
  const craft = /hairdress|hair salon/i.test(kind) ? 'hairdressing' : /beauty/i.test(kind) ? 'grooming' : 'barbering';
  const tagline = `${ratingWord} ${craft} on ${road}, ${shop.city}.`;
  const facts = [openDaysLabel, wheelchair ? 'wheelchair accessible' : ''].filter(Boolean).join(', ');
  const description = `${name}, ${fullAddress}. ${kind} ${rating != null ? `rated ${rating.toFixed(1)} from ${reviewsText}` : `with ${reviewsText}`}.${facts ? ` ${facts}.` : ''} Call ${phone.display}.`;

  const listingAbout = [
    `${name} is a ${kind.toLowerCase()} at ${expandRoad(street)}, ${shop.city} ${shop.postcode}.` +
      (rating != null
        ? ` On Google, ${nf.format(reviewCount)} ${reviewCount === 1 ? 'person has' : 'people have'} reviewed the shop and the rating stands at ${rating.toFixed(1)} out of 5.`
        : ` The shop has ${reviewsText} so far.`),
    [
      openDays === 7
        ? 'Open seven days a week, with the full hours below'
        : openDays
          ? `Open ${NUMBER_WORDS[openDays]} days a week (closed ${listJoin(closedDays)}), with the full hours below`
          : 'Opening hours are not published online',
      wheelchair ? ', and wheelchair accessible' : '',
      '.',
      amenities.length ? ` The listing also notes that ${listJoin(amenities)}.` : '',
      ` Call ${phone.display} if you want to check before you set off.`,
    ].join(''),
  ];
  /** The owner's own words where we have them, the listing's facts where we do not. */
  const about = own.story ?? listingAbout;


  const trust: TrustCell[] = [
    ...(rating != null ? [{ big: rating.toFixed(1), small: 'Google rating', href: listingUrl, count: rating, decimals: 1 }] : []),
    { big: nf.format(reviewCount), small: 'Google reviews', href: reviewsUrl, count: reviewCount, decimals: 0 },
    ...(openDays ? [{ big: String(openDays), small: 'Days a week', count: openDays, decimals: 0 }] : []),
    ...features.map((f) => ({ big: '✓', small: f })),
  ];

  const perScore = reviewsPerScore(shop);
  const scoreTotal = perScore ? Object.values(perScore).reduce((a, b) => a + b, 0) : 0;
  const scoreBars =
    perScore && scoreTotal
      ? ([5, 4, 3, 2, 1] as const).map((score) => ({ score, count: perScore[String(score) as keyof typeof perScore], share: perScore[String(score) as keyof typeof perScore] / scoreTotal }))
      : null;

  /**
   * A listing image the owner has told us is a logo or wordmark rather than a
   * photograph. It leaves the gallery — a 4:5 tile crops the middle out of a
   * wordmark — and is shown whole, at its own aspect ratio, instead.
   */
  const logo: Photo | null =
    own.logoPhoto && photoFor(own.logoPhoto)
      ? { path: own.logoPhoto, ...photoFor(own.logoPhoto)!, alt: `${name} logo`, authors: creditFor(own.logoPhoto)?.authors ?? [] }
      : null;
  /** The shop's own photographs where it has sent us a set, the listing's otherwise. */
  const ownPhotos = (own.photos ?? []).filter((p) => photoFor(p));
  const fromOwner = ownPhotos.length > 0;
  const found = fromOwner ? ownPhotos : own.usePhotos === false ? [] : shop.photos.filter((p) => photoFor(p) && p !== logo?.path);
  const source = fromOwner ? 'the shop' : 'the Google listing';
  const photos: Photo[] = found.map((path, i) => ({
    path,
    ...photoFor(path)!,
    alt: `${name}, ${shop.city}: photo ${i + 1} of ${found.length} from ${source}`,
    authors: creditFor(path)?.authors ?? [],
  }));
  // Only the images the page actually shows are credited, so nobody is thanked for a picture that is not there.
  const authors: PhotoAuthor[] = [];
  for (const p of [...photos, ...(logo ? [logo] : [])]) for (const a of p.authors) if (a.name && !authors.some((x) => x.name === a.name && x.uri === a.uri)) authors.push(a);
  /**
   * The photograph behind the first screen. Null when the listing has none, or
   * when its owner would rather the page did not lean on the one it has: the
   * hero then carries the name, the rating and the actions on their own.
   */
  const hero = (own.heroPhoto ? photos.find((p) => p.path === own.heroPhoto) : null) ?? photos[0] ?? null;
  /**
   * Whether the page runs a gallery section at all, and so whether the
   * navigation and the footer offer a link to one. A shop with one photograph
   * has nothing to fill a grid with, and a gallery whose only tile repeats the
   * hero makes a page look emptier than leaving it out does.
   */
  const showGallery = photos.length > 0;

  const layout = layoutFor(shop.slug);
  const palette = paletteFor(shop.slug);
  const lines = nameLines(name);
  const longest = Math.max(lines[0].length, lines[1].length, 1);
  /**
   * The big type shrinks with the name so each line stays on one line at every
   * width. The vw term is sized for a phone, where every hero is one column;
   * the rem cap is sized for the column the theme's hero actually gives it.
   */
  const em = layout.display.width * longest;
  /**
   * The hero treatment this page actually renders: its layout's, unless the shop
   * is pinned to the ruled one, or a full-bleed hero has no photograph to be
   * built around.
   */
  const heroVariant: HeroVariant = own.heroVariant ?? (layout.hero === 'full-bleed' && hero === null ? 'ruled' : layout.hero);
  /**
   * The ruled hero gives the name the whole width of the first screen, and the
   * name is then doing the picture's job, so its cap is lifted. Section headings
   * are unaffected: theirs is already at its own 6rem ceiling well below either
   * figure.
   */
  const typeOnlyHero = heroVariant === 'ruled';
  const maxRem = typeOnlyHero ? layout.display.maxRem * 1.15 : layout.display.maxRem;
  const h1Rem = Math.min(maxRem, layout.display.budgetPx / em / 16);
  const h1Size = `clamp(2rem, ${Math.min(typeOnlyHero ? layout.display.maxVw * 1.3 : layout.display.maxVw, 88 / em).toFixed(1)}vw, ${h1Rem.toFixed(2)}rem)`;
  /**
   * Every section heading is sized off the shop's name, so the name is the
   * first and largest thing on the page whatever the theme, and whatever the
   * name's length: a split hero gives it half the width, and a heading that
   * runs the full width would otherwise out-shout it.
   */
  const sectionTitleSize = `clamp(1.75rem, 8.5vw, ${Math.min(6, Math.max(2.2, h1Rem * 0.7), h1Rem * 0.85).toFixed(2)}rem)`;

  return {
    slug: shop.slug,
    /**
     * The two halves of the page's identity: the layout is fixed by the slug,
     * the palette is derived from this shop's own photo. Both come from
     * committed data, so a live link never changes appearance.
     */
    layout,
    /** The hero treatment rendered, which is the layout's unless this shop overrides it. */
    heroVariant,
    /**
     * Custom properties for the hero band, where this shop's hero needs colours
     * of its own. Written onto <header>, so only the first screen changes.
     */
    heroVars: own.heroPalette
      ? [
          `--color-ink:${own.heroPalette.ink}`, `--color-ink-2:${own.heroPalette.ink2}`, `--color-ink-3:${own.heroPalette.ink3}`,
          `--color-cream:${own.heroPalette.cream}`, `--color-cream-2:${own.heroPalette.cream2}`,
          `--color-amber:${own.heroPalette.accent}`, `--color-amber-2:${own.heroPalette.accentHover}`,
          `--color-onaccent:${own.heroPalette.onAccent}`, '--hero-photo-opacity:0.62',
        ].join(';')
      : null,
    /** The reviews section is given the room its numbers deserve. */
    featureReviews: own.featureReviews === true,
    /** The gallery lays out at mixed sizes rather than a uniform grid. */
    galleryMosaic: own.galleryMosaic === true,
    palette,
    copy: copyFor(shop.slug),
    /** This shop's page and its booking page. */
    home: `/${shop.slug}`,
    bookHref: `/${shop.slug}/book`,
    /**
     * Whether the page offers booking at all. Off unless this shop's owner has
     * agreed to it (src/data/overrides.ts). The booking page is still generated
     * for every shop, so turning it on needs no other change.
     */
    showBooking: own.showBooking === true,
    name,
    nameLines: lines,
    h1Size,
    sectionTitleSize,
    kind,
    tagline,
    description,
    phone,
    telHref: telHref(shop.phone),
    address,
    fullAddress,
    roadName: road,
    geo: { lat: shop.lat, lng: shop.lng },
    google: { rating, reviewCount, reviewsText, placeId },
    listingUrl,
    reviewsUrl,
    directionsUrl,
    embedUrl,
    week,
    hoursRows,
    openDays,
    openDaysLabel,
    features,
    amenities,
    about,
    trust,
    scoreBars,
    photos,
    hero,
    /** A wordmark among the listing images, kept out of the gallery and shown whole. */
    logo,
    showGallery,
    /** The photographs are the shop's own, not a Google reviewer's, so they are credited to the shop. */
    photosFromOwner: fromOwner,
    authors,
    /** The shop's own price list, when its owner has given one. */
    prices: (own.prices ?? null) as PriceRow[] | null,
    /** The bookable menu: the shop's own where it has one, the six standard services otherwise. */
    services: (own.services ?? SERVICES) as ServiceRow[],
    /** Where the shop posts its work. */
    socials: own.socials ?? null,
  };
}

/** A price list line and a bookable service: both are things an owner tells us, so they are defined with the rest. */
export type { PriceRow, ServiceRow } from '../data/overrides.ts';

export type DemoSite = ReturnType<typeof derive>;

export function jsonLd(site: DemoSite, pageUrl: string, imageUrl: string) {
  // One specification per opening span, so a split day is published as the two
  // periods it really is rather than as one block over the lunch close.
  const hours = site.week
    ? DAYS.flatMap((d) =>
        (site.week![d] ?? []).map((span) => ({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: `https://schema.org/${dayLabel(d)}`,
          opens: span.open,
          closes: span.close,
        })),
      )
    : [];
  return {
    '@context': 'https://schema.org',
    '@type': /barber/i.test(site.kind) ? 'BarberShop' : 'HairSalon',
    '@id': `${pageUrl}#business`,
    name: site.name,
    url: pageUrl,
    telephone: site.phone.tel,
    description: site.description,
    image: imageUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.locality,
      postalCode: site.address.postcode,
      addressCountry: 'GB',
    },
    geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng },
    ...(site.google.rating != null
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: site.google.rating, reviewCount: site.google.reviewCount, bestRating: 5, worstRating: 1 } }
      : {}),
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
    amenityFeature: site.features.map((f) => ({ '@type': 'LocationFeatureSpecification', name: f, value: true })),
    hasMap: site.listingUrl,
  };
}
