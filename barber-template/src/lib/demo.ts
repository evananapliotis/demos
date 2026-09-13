/**
 * Everything a /demo/[slug] page shows, derived from one listing. Nothing here
 * adds facts: it formats what the listing has and leaves out what it lacks.
 */
import type { ImageMetadata } from 'astro';
import { DAYS, type Day } from '../config/site.schema.ts';
import { creditFor, photoFor, type PhotoAuthor } from './photos.ts';
import { hoursList, kindOf, phoneDisplay, reviewsPerScore, telHref, toSchedule, trueAttributes, type Shop } from './shops.ts';

export const dayLabel = (d: Day) => d.charAt(0).toUpperCase() + d.slice(1);

const ROADS: Record<string, string> = {
  Rd: 'Road', St: 'Street', Ave: 'Avenue', Av: 'Avenue', Ln: 'Lane', Dr: 'Drive', Pl: 'Place', Sq: 'Square', Cres: 'Crescent',
  Ter: 'Terrace', Gdns: 'Gardens', Pk: 'Park', Cl: 'Close', Ct: 'Court', Grn: 'Green', Hl: 'Hill', Mkt: 'Market', Pde: 'Parade',
  Bvd: 'Boulevard', Blvd: 'Boulevard', Hwy: 'Highway', Wy: 'Way',
};
/** "91 Balham High Rd" -> "91 Balham High Road". */
export const expandRoad = (street: string) => street.split(' ').map((w) => ROADS[w] ?? w).join(' ');
/** "91 Balham High Rd" -> "Balham High Road": the road without the building number. */
export const roadName = (street: string) => expandRoad(street.replace(/^\d+[a-z]?(?:-\d+[a-z]?)?\s+/i, '').replace(/^(unit|shop|flat)\s+\S+,?\s+/i, ''));

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
/** ["a", "b", "c"] -> "a, b and c". */
const listJoin = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
/** Text that goes through set:html. */
export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface Photo {
  path: string;
  image: ImageMetadata;
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
  const nf = new Intl.NumberFormat('en-GB');
  const name = displayName(shop.name);
  const kind = kindOf(shop);
  const street = shop.street ?? shop.address.split(',')[0]!.trim();
  const address = { street, locality: shop.city, postcode: shop.postcode };
  const fullAddress = `${street}, ${shop.city} ${shop.postcode}`;
  const road = roadName(street);
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

  const attributes = trueAttributes(shop.about);
  const wheelchair = attributes.some((a) => /wheelchair/i.test(a));
  const features = wheelchair ? ['Wheelchair accessible'] : [];
  const amenities = attributes.filter((a) => !/wheelchair/i.test(a)).slice(0, 4).map((a) => a.toLowerCase());

  const rating = shop.rating ?? null;
  const reviewCount = shop.reviews;
  const reviewsText = `${nf.format(reviewCount)} Google review${reviewCount === 1 ? '' : 's'}`;
  const ratingWord = rating == null ? 'Independent' : rating >= 4.9 ? 'Five-star' : rating >= 4.5 ? 'Top-rated' : `${rating.toFixed(1)}-star`;
  const craft = /hairdress|hair salon/i.test(kind) ? 'hairdressing' : /beauty/i.test(kind) ? 'grooming' : 'barbering';
  const tagline = `${ratingWord} ${craft} on ${road}, ${shop.city}.`;
  const facts = [openDaysLabel, wheelchair ? 'wheelchair accessible' : ''].filter(Boolean).join(', ');
  const description = `${name}, ${fullAddress}. ${kind} ${rating != null ? `rated ${rating.toFixed(1)} from ${reviewsText}` : `with ${reviewsText}`}.${facts ? ` ${facts}.` : ''} Call ${phone.display}.`;

  const about = [
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
      amenities.length ? ` The listing also notes ${listJoin(amenities)}.` : '',
      ` Call ${phone.display} if you want to check before you set off.`,
    ].join(''),
  ];

  const ticker = [
    rating != null ? `${rating.toFixed(1)} on Google` : '',
    `${nf.format(reviewCount)} reviews`,
    ...features,
    openDaysLabel,
    `${expandRoad(street)}, ${shop.city}`,
    `Call ${phone.display}`,
  ].filter(Boolean);

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

  const found = shop.photos.filter((p) => photoFor(p));
  const photos: Photo[] = found.map((path, i) => ({
    path,
    image: photoFor(path)!,
    alt: `${name}, ${shop.city}: photo ${i + 1} of ${found.length} from the Google listing`,
    authors: creditFor(path)?.authors ?? [],
  }));
  const authors: PhotoAuthor[] = [];
  for (const p of photos) for (const a of p.authors) if (a.name && !authors.some((x) => x.name === a.name && x.uri === a.uri)) authors.push(a);
  const hero = photos[0] ?? null;

  const lines = nameLines(name);
  const longest = Math.max(lines[0].length, lines[1].length, 1);
  /** The big type shrinks with the name so each line stays on one line at every width. */
  const h1Size = `clamp(2rem, ${Math.min(26, 88 / (0.44 * longest)).toFixed(1)}vw, ${Math.min(12.5, 1100 / (0.44 * longest) / 16).toFixed(2)}rem)`;

  return {
    slug: shop.slug,
    name,
    nameLines: lines,
    h1Size,
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
    ticker,
    trust,
    scoreBars,
    photos,
    hero,
    authors,
  };
}

export type DemoSite = ReturnType<typeof derive>;

export function jsonLd(site: DemoSite, pageUrl: string, imageUrl: string) {
  const hours = site.week
    ? DAYS.filter((d) => site.week![d]).map((d) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${dayLabel(d)}`,
        opens: site.week![d]!.open,
        closes: site.week![d]!.close,
      }))
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
