/** Derived values from site.config.ts. Nothing here adds facts; it only formats them. */
import { site, type Day } from '@config';

export { site };

export const fullAddress = `${site.address.street}, ${site.address.locality} ${site.address.postcode}`;
export const telHref = `tel:${site.phone.tel}`;
/** Where "Book" buttons go: the external booking page when one is set, otherwise the buttons are not rendered. */
export const bookHref: string | null = site.bookingUrl ?? null;
export const bookExternal = !!site.bookingUrl;

const placeQuery = encodeURIComponent(site.google.query);
const destQuery = encodeURIComponent(`${site.name}, ${fullAddress}`);
/** Opens the Google listing (reviews, photos). */
export const listingUrl = `https://www.google.com/maps/search/?api=1&query=${placeQuery}`;
/** Opens turn-by-turn directions. */
export const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destQuery}`;
/** Map embed (no API key). Loaded on tap only. */
export const embedUrl = `https://www.google.com/maps?q=${destQuery}&z=16&output=embed`;

export const DAYS: Day[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const dayLabel = (d: Day) => d.charAt(0).toUpperCase() + d.slice(1);

/** "18:00" → "6pm", "09:30" → "9:30am" */
export function fmtTime(t: string) {
  const [hh, mm] = t.split(':').map(Number);
  const suffix = hh >= 12 ? 'pm' : 'am';
  const h = hh % 12 === 0 ? 12 : hh % 12;
  return mm ? `${h}:${String(mm).padStart(2, '0')}${suffix}` : `${h}${suffix}`;
}

/** How many days a week the shop opens. */
export function openDaysCount() {
  const week = site.hours.week;
  return week ? DAYS.filter((d) => week[d]).length : 0;
}
/** "Open 7 days" / "Open 6 days a week". */
export function openDaysLabel() {
  const n = openDaysCount();
  return n === 7 ? 'Open 7 days' : n ? `Open ${n} days a week` : '';
}

/** Rows for the hours table, Monday first (the browser moves today to the top). */
export function weekRows() {
  const week = site.hours.week;
  if (!week) return null;
  return DAYS.map((d) => {
    const h = week[d];
    return { day: d, label: dayLabel(d), open: h?.open ?? null, close: h?.close ?? null, closed: !h };
  });
}

export function openingHoursSpec() {
  const week = site.hours.week;
  if (!week) return undefined;
  return DAYS.filter((d) => week[d]).map((d) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: `https://schema.org/${dayLabel(d)}`,
    opens: week[d]!.open,
    closes: week[d]!.close,
  }));
}

export function jsonLd(pageUrl: string, imageUrl: string) {
  const hours = openingHoursSpec();
  return {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
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
      addressRegion: site.address.region,
      postalCode: site.address.postcode,
      addressCountry: site.address.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: site.google.rating,
      reviewCount: site.google.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    ...(hours ? { openingHoursSpecification: hours } : {}),
    amenityFeature: site.features.map((f) => ({ '@type': 'LocationFeatureSpecification', name: f, value: true })),
    hasMap: listingUrl,
    sameAs: site.socials.map((s) => s.url),
    ...(site.reviews.length
      ? {
          review: site.reviews.map((r) => ({
            '@type': 'Review',
            author: { '@type': 'Person', name: r.author },
            reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
            reviewBody: r.text,
            ...(r.date ? { datePublished: r.date } : {}),
          })),
        }
      : {}),
  };
}
