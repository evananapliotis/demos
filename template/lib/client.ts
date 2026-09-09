/**
 * Loads the active client's data (clients/<slug>/site.json) and photos
 * (clients/<slug>/photos/*) through astro:assets so every image gets
 * WebP + responsive srcset for free.
 */
import type { ImageMetadata } from 'astro';

export interface Service {
  name: string;
  price: string;
  note?: string;
}
export interface Review {
  author: string;
  rating: number; // 1-5
  text: string;
  date?: string; // e.g. "2025-06"
}
export interface Hours {
  /** 0 = Sunday … 6 = Saturday. `null` = closed. */
  [day: string]: { open: string; close: string } | null;
}
export interface Photo {
  file: string;
  alt: string;
}
export interface Site {
  name: string;
  slug: string;
  url?: string;
  tagline: string; // one-line hook in the hero
  description: string; // meta description
  phone: { display: string; tel: string; whatsapp: string };
  address: {
    street: string;
    locality: string;
    postcode: string;
    country: string;
  };
  geo?: { lat: number; lng: number; approximate?: boolean };
  google: { rating: number; reviewCount: number; listingUrl: string; mapQuery: string };
  hours: Hours;
  hoursNote?: string;
  services: Service[];
  servicesNote?: string;
  gallery: Photo[];
  /** Full-bleed statement band shown in place of the gallery until photos exist. */
  statement?: { line: string; accent: string; sub?: string };
  hero: Photo;
  reviews: Review[];
  about: string[]; // paragraphs
  established?: string;
  socials?: { label: string; url: string }[];
}

const slug = import.meta.env.CLIENT;

const sites = import.meta.glob<{ default: Site }>('/clients/*/site.json', { eager: true });
const siteModule = sites[`/clients/${slug}/site.json`];
if (!siteModule) throw new Error(`clients/${slug}/site.json not found`);
export const site: Site = siteModule.default;

const images = import.meta.glob<{ default: ImageMetadata }>(
  '/clients/*/photos/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}',
  { eager: true },
);

export function photo(file: string): ImageMetadata {
  const key = `/clients/${slug}/photos/${file}`;
  const mod = images[key];
  if (!mod) {
    throw new Error(
      `Photo "${file}" referenced in site.json but not found in clients/${slug}/photos/. ` +
        `Available: ${Object.keys(images).map((k) => k.split('/').pop()).join(', ') || '(none)'}`,
    );
  }
  return mod.default;
}

export const heroImage: ImageMetadata | null = site.hero?.file ? photo(site.hero.file) : null;
export const galleryImages = (site.gallery ?? []).map((g) => ({ ...g, image: photo(g.file) }));

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Rows for the hours table, Monday first. */
export function hoursRows() {
  return [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const h = site.hours[String(d)] ?? null;
    return { day: DAY_NAMES[d], open: h?.open ?? null, close: h?.close ?? null, closed: !h };
  });
}

/** schema.org openingHoursSpecification, grouping identical consecutive days. */
export function openingHoursSpec() {
  return [1, 2, 3, 4, 5, 6, 0]
    .map((d) => ({ d, h: site.hours[String(d)] }))
    .filter((x) => x.h)
    .map(({ d, h }) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${DAY_NAMES[d]}`,
      opens: h!.open,
      closes: h!.close,
    }));
}

/** Compact "Mon–Sat 9–6" style string for the badge / footer. */
export function hoursSummary(): string {
  const rows = hoursRows();
  const openRows = rows.filter((r) => !r.closed);
  if (!openRows.length) return 'Hours on request';
  const sameTimes = openRows.every((r) => r.open === openRows[0].open && r.close === openRows[0].close);
  if (sameTimes) {
    const first = openRows[0].day.slice(0, 3);
    const last = openRows[openRows.length - 1].day.slice(0, 3);
    return `${first}–${last} ${fmt(openRows[0].open!)}–${fmt(openRows[0].close!)}`;
  }
  return openRows.map((r) => `${r.day.slice(0, 3)} ${fmt(r.open!)}–${fmt(r.close!)}`).join(', ');
}

export function fmt(t: string) {
  // "09:00" -> "9am", "17:30" -> "5:30pm"
  const [hh, mm] = t.split(':').map(Number);
  const suffix = hh >= 12 ? 'pm' : 'am';
  const h = hh % 12 === 0 ? 12 : hh % 12;
  return mm ? `${h}:${String(mm).padStart(2, '0')}${suffix}` : `${h}${suffix}`;
}

export const fullAddress = `${site.address.street}, ${site.address.locality} ${site.address.postcode}`;
export { DAY_SHORT };
