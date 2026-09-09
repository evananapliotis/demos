import type { ImageMetadata } from 'astro';
import data from '../../site.json';

export interface Review { author: string; rating: number; text: string }
export interface Hours { days: string; open?: string; close?: string; closed?: boolean }
export interface Photo { src: string; alt: string; position?: string; caption?: string; aspect?: string }
export interface Step { title: string; body: string }
export interface Service { name: string; note?: string }
export interface Quote { text: string; author: string }

export interface Client {
  name: string;
  owner: string;
  barber: string;
  url: string;
  area: string;
  region: string;
  seo: { title: string; description: string };
  phone: { display: string; tel: string; whatsapp: string; whatsappText: string };
  address: { street: string; locality: string; town: string; postcode: string; country: string };
  geo: { lat: number; lng: number };
  rating: { value: number; count: number; url: string };
  hours: Hours[];
  hoursNote: string;
  hero: Photo & { label: string; line: string; cta: string };
  services: { label: string; heading: string; accent: string; pricingLabel: string; pricingNote: string; items: Service[] };
  shave: { label: string; heading: string; accent: string; paragraphs: string[]; quote: Quote; steps: Step[]; cta: string };
  families: { label: string; heading: string; accent: string; paragraphs: string[]; quote: Quote; photo: Photo };
  gallery: { label: string; heading: string; accent: string; photos: Photo[] };
  reviews: { label: string; heading: string; accent: string; intro: string; linkText: string; items: Review[] };
  about: { label: string; heading: string; accent: string; photo: Photo; paragraphs: string[] };
  find: { label: string; heading: string; accent: string; mapQuery: string; directions: string };
  sticky: { line1: string; line2: string };
}

export const client = data as Client;

const photoFiles = import.meta.glob<ImageMetadata>('../../photos/*.{webp,jpg,jpeg,png,avif}', { eager: true, import: 'default' });

/** Resolve a photo by file name (no extension) to an astro:assets ImageMetadata. */
export function photo(name: string): ImageMetadata {
  const hit = Object.entries(photoFiles).find(([k]) => k.split('/').pop()!.replace(/\.[^.]+$/, '') === name)?.[1];
  if (!hit) throw new Error(`Photo "${name}" not found in clients/legend-barbers/photos/`);
  return hit;
}

export const telHref = `tel:${client.phone.tel}`;
export const waHref = `https://wa.me/${client.phone.whatsapp}?text=${encodeURIComponent(client.phone.whatsappText)}`;

/** Google Maps embed by address query. No API key. */
export const mapsEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(client.find.mapQuery)}&output=embed`;
export const mapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(client.find.mapQuery)}`;

/** "09:00" -> "9am", "17:30" -> "5:30pm". */
export function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, '0')}${suffix}` : `${hour}${suffix}`;
}
export function fmtHours(h: Hours): string {
  return h.closed || !h.open || !h.close ? 'Closed' : `${fmtTime(h.open)} – ${fmtTime(h.close)}`;
}

/** schema.org openingHoursSpecification from the hours table. */
export function openingHoursSpec() {
  const names: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
  const order = Object.keys(names);
  const out: object[] = [];
  for (const h of client.hours) {
    if (h.closed || !h.open || !h.close) continue;
    const [a, b] = h.days.toLowerCase().split(/[–-]/).map((s) => s.trim().slice(0, 3));
    const i = order.indexOf(a), j = b ? order.indexOf(b) : i;
    out.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: order.slice(i, j + 1).map((d) => names[d]), opens: h.open, closes: h.close });
  }
  return out;
}
