import type { ImageMetadata } from 'astro';

export interface Service { name: string; price: string; note?: string }
export interface Barber { name: string; line: string }
export interface Review { author: string; rating: number; text: string; badge?: string }
export interface Hours { days: string; open?: string; close?: string; closed?: boolean }
export interface Photo { src: string; alt: string; position?: string; caption?: string; /** CSS aspect-ratio for the gallery, e.g. "4 / 3" */ aspect?: string }

export interface Client {
  slug: string;
  name: string;
  url: string;
  area: string;
  seo: { title: string; description: string };
  phone: { display: string; tel: string; /** WhatsApp number, digits only with country code (wa.me). Optional. */ whatsapp?: string };
  address: { street: string; locality: string; region?: string; postcode: string; country: string };
  geo: { lat: number; lng: number };
  rating: { value: number; count: number; url: string; /** Give the rating real weight in the hero and reviews (big figure + stars). */ feature?: boolean; /** One line shown next to the featured rating. */ line?: string };
  hours: Hours[];
  hoursNote?: string;
  accent: string;
  /** Optional CSS overrides for the dark surfaces, emitted as --p-<key> on <html>: ink-2, ink-blue, surface, hero-scrim, hero-glow, footer-line. */
  palette?: Record<string, string>;
  hero: Photo & { label: string; line: string; cta: string; /** Optional CSS font-size for the h1, e.g. a clamp(). */ titleSize?: string };
  services: { label: string; heading: string; items: Service[]; note?: string };
  team: { label: string; heading: string; members: Barber[] };
  offer?: { label: string; big: string; heading: string; body: string; cta: string };
  /** Optional full-bleed statement band for one signature service, rendered after Services. */
  signature?: { label: string; heading: string; body: string; detail?: string; cta?: string };
  gallery: { label: string; heading: string; photos: Photo[] };
  reviews: { label: string; heading: string; items: Review[]; linkText: string; /** Optional line under the featured rating figure. */ standfirst?: string };
  about: { label: string; heading: string; photo?: Photo; paragraphs: string[] };
  find: { label: string; heading: string; mapQuery: string };
}

const slug = process.env.CLIENT;
if (!slug) throw new Error('CLIENT env var is not set');

const dataFiles = import.meta.glob<Client>('/clients/*/site.json', { eager: true, import: 'default' });
const photoFiles = import.meta.glob<ImageMetadata>('/clients/*/photos/*.{webp,jpg,jpeg,png,avif}', {
  eager: true,
  import: 'default',
});

const data = dataFiles[`/clients/${slug}/site.json`];
if (!data) throw new Error(`No clients/${slug}/site.json found`);

export const client: Client = { ...data, slug };

/** Resolve a photo by file name (no extension needed) to an astro:assets ImageMetadata. */
export function photo(name: string): ImageMetadata {
  const base = `/clients/${slug}/photos/`;
  const hit =
    photoFiles[base + name] ??
    Object.entries(photoFiles).find(([k]) => k.startsWith(base) && k.slice(base.length).replace(/\.[^.]+$/, '') === name)?.[1];
  if (!hit) throw new Error(`Photo "${name}" not found in clients/${slug}/photos/`);
  return hit;
}

export const telHref = `tel:${client.phone.tel}`;
/** https://wa.me/<digits>, or undefined when the client has no WhatsApp number. */
export const waHref = client.phone.whatsapp ? `https://wa.me/${client.phone.whatsapp.replace(/\D/g, '')}` : undefined;

/** "09:00" -> "9am", "19:00" -> "7pm", "09:30" -> "9:30am". */
export function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, '0')}${suffix}` : `${hour}${suffix}`;
}

export function fmtHours(h: Hours): string {
  return h.closed || !h.open || !h.close ? 'Closed' : `${fmtTime(h.open)} – ${fmtTime(h.close)}`;
}

export function mapsSearchUrl(): string {
  const a = client.address;
  const q = `${client.name} ${a.street} ${a.locality} ${a.postcode}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function mapsEmbedUrl(): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(client.find.mapQuery)}&z=16&output=embed`;
}

/** schema.org openingHoursSpecification from the hours table. */
export function openingHoursSpec() {
  const map: Record<string, string[]> = {
    mon: ['Monday'], tue: ['Tuesday'], wed: ['Wednesday'], thu: ['Thursday'],
    fri: ['Friday'], sat: ['Saturday'], sun: ['Sunday'],
  };
  const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const out: object[] = [];
  for (const h of client.hours) {
    if (h.closed || !h.open || !h.close) continue;
    const [a, b] = h.days.toLowerCase().split(/[–-]/).map((s) => s.trim().slice(0, 3));
    const i = order.indexOf(a), j = b ? order.indexOf(b) : i;
    const days = order.slice(i, j + 1).flatMap((d) => map[d]);
    out.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: days, opens: h.open, closes: h.close });
  }
  return out;
}
