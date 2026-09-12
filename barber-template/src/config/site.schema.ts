/**
 * Schema for src/config/site.ts.
 *
 * Every object is strict and nothing has a default: a missing key, a typo'd
 * key or an empty string throws at import time, which fails `astro build`
 * instead of rendering a placeholder.
 */
import { z } from 'zod';
import { derivedSlotIds, searchedSlotIds, searchedSlots } from './images.ts';

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type Day = (typeof DAYS)[number];

const text = z.string().trim().min(1, 'must not be empty');
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be a lowercase slug');
const url = z.url();
const internalHref = z.string().regex(/^(#[a-z0-9-]+|\/[a-z0-9\-/]*)$/, 'must be an anchor like #services or a path like /book');
const href = z.union([internalHref, url]);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'must be HH:MM in 24h');
const hexColour = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a 6-digit hex colour');
const e164 = z.string().regex(/^\+[1-9]\d{7,14}$/, 'must be E.164, e.g. +441144960782');
const day = z.enum(DAYS);

/** A photo slot reference plus its alt text. */
const image = z.strictObject({
  slot: z.enum(searchedSlotIds),
  alt: text,
});

const link = z.strictObject({ label: text, href });

const dayHours = z.union([
  z.literal('closed'),
  z.strictObject({ open: hhmm, close: hhmm }).refine((h) => h.open < h.close, 'open must be before close'),
]);

export const SiteSchema = z
  .strictObject({
    business: z.strictObject({
      name: text,
      shortName: text,
      tagline: text,
      foundedYear: z.number().int().min(1800).max(2100),
      area: text,
    }),

    seo: z.strictObject({
      siteUrl: url,
      titleTemplate: z.string().includes('%s', { message: 'must contain %s where the page title goes' }),
      defaultTitle: text,
      description: text,
      ogImage: z.enum(derivedSlotIds),
      locale: text,
      themeColour: hexColour,
    }),

    nav: z.array(link).min(1),

    /** Micro-copy used by shared components. */
    ui: z.strictObject({
      skipToContent: text,
      navLabel: text,
      menuOpen: text,
      menuClose: text,
      minutes: text,
      bookThis: text,
      dayNames: z.strictObject(Object.fromEntries(DAYS.map((d) => [d, text])) as Record<Day, typeof text>),
      dayNamesShort: z.strictObject(Object.fromEntries(DAYS.map((d) => [d, text])) as Record<Day, typeof text>),
      stickyBar: z.strictObject({
        label: text,
        call: text,
        book: text,
      }),
    }),

    hero: z.strictObject({
      eyebrow: text,
      heading: text,
      subheading: text,
      primaryCta: link,
      secondaryCta: link,
      image,
      imagePortrait: image,
    }),

    services: z.strictObject({
      heading: text,
      intro: text,
      items: z
        .array(
          z.strictObject({
            id: slug,
            name: text,
            description: text,
            priceGBP: z.number().nonnegative(),
            durationMinutes: z.number().int().positive(),
            image,
          }),
        )
        .min(1),
    }),

    team: z.strictObject({
      heading: text,
      intro: text,
      members: z
        .array(
          z.strictObject({
            id: slug,
            name: text,
            role: text,
            bio: text,
            image,
            /** Days this barber takes bookings. */
            days: z.array(day).min(1),
            instagram: url.optional(),
          }),
        )
        .min(1),
    }),

    gallery: z.strictObject({
      heading: text,
      intro: text,
      images: z.array(image).min(1),
    }),

    hours: z.strictObject({
      heading: text,
      note: text,
      closedLabel: text,
      image,
      schedule: z.strictObject({
        monday: dayHours,
        tuesday: dayHours,
        wednesday: dayHours,
        thursday: dayHours,
        friday: dayHours,
        saturday: dayHours,
        sunday: dayHours,
      }),
    }),

    contact: z.strictObject({
      heading: text,
      intro: text,
      phoneDisplay: text,
      /** Used in every tel: link, including the sticky bar. */
      phoneHref: e164,
      email: z.email(),
      address: z.strictObject({
        line1: text,
        line2: text.optional(),
        city: text,
        postcode: text,
      }),
      mapsUrl: url,
      directionsLabel: text,
      ctaLabel: text,
      image,
      social: z.array(
        z.strictObject({
          platform: z.enum(['instagram', 'facebook', 'tiktok', 'x']),
          label: text,
          url,
        }),
      ),
    }),

    /** Front-end only booking flow at /book. */
    booking: z.strictObject({
      heading: text,
      intro: text,
      /** Shown on every step and on the confirmation. */
      demoNotice: text,
      horizonDays: z.number().int().min(1).max(90),
      minNoticeHours: z.number().int().min(0).max(168),
      slotIntervalMinutes: z.number().int().min(5).max(60),
      closedDates: z.array(z.iso.date()),
      demo: z.strictObject({
        /** Fraction of slots shown as already taken, so the calendar looks real. 0 disables. */
        busyFraction: z.number().min(0).max(1),
      }),
      steps: z.strictObject({
        service: text,
        barber: text,
        date: text,
        time: text,
        details: text,
        confirmation: text,
      }),
      ui: z.strictObject({
        progress: text,
        next: text,
        back: text,
        confirm: text,
        startOver: text,
        chooseService: text,
        chooseBarber: text,
        chooseDate: text,
        chooseTime: text,
        yourDetails: text,
        name: text,
        phone: text,
        email: text,
        notes: text,
        optional: text,
        required: text,
        invalidEmail: text,
        invalidPhone: text,
        noSlots: text,
        closedDay: text,
        taken: text,
        dayOff: text,
        full: text,
        summary: text,
        with: text,
        at: text,
        confirmedHeading: text,
        /** May use {name}, {service}, {barber}, {date}, {time}. */
        confirmedBody: text,
        reference: text,
      }),
    }),

    footer: z.strictObject({
      /** Permanent label. The site is a demo and must say so. */
      sampleLabel: text,
      copyrightHolder: text,
    }),

    notFound: z.strictObject({
      title: text,
      heading: text,
      body: text,
      homeLabel: text,
    }),
  })
  .superRefine((site, ctx) => {
    const unique = (path: (string | number)[], values: string[], what: string) => {
      const dupes = values.filter((v, i) => values.indexOf(v) !== i);
      if (dupes.length) ctx.addIssue({ code: 'custom', path, message: `duplicate ${what}: ${[...new Set(dupes)].join(', ')}` });
    };
    unique(['services', 'items'], site.services.items.map((s) => s.id), 'service id');
    unique(['team', 'members'], site.team.members.map((m) => m.id), 'team member id');

    // Every open day needs at least one barber taking bookings.
    for (const d of DAYS) {
      if (site.hours.schedule[d] === 'closed') continue;
      if (!site.team.members.some((m) => m.days.includes(d))) {
        ctx.addIssue({ code: 'custom', path: ['hours', 'schedule', d], message: `shop is open on ${d} but no team member works that day` });
      }
    }

    // Hero art direction: landscape slot up top, portrait slot for phones.
    const heroSlot = searchedSlots.find((s) => s.id === site.hero.image.slot);
    const heroPortraitSlot = searchedSlots.find((s) => s.id === site.hero.imagePortrait.slot);
    if (heroSlot && heroSlot.orientation !== 'landscape') {
      ctx.addIssue({ code: 'custom', path: ['hero', 'image', 'slot'], message: 'hero.image must be a landscape slot' });
    }
    if (heroPortraitSlot && heroPortraitSlot.orientation !== 'portrait') {
      ctx.addIssue({ code: 'custom', path: ['hero', 'imagePortrait', 'slot'], message: 'hero.imagePortrait must be a portrait slot' });
    }
  });

export type SiteInput = z.input<typeof SiteSchema>;
export type SiteConfig = z.output<typeof SiteSchema>;

/** Parse and throw a readable error listing every problem. */
export function parseSite(raw: unknown): SiteConfig {
  const result = SiteSchema.safeParse(raw);
  if (result.success) return result.data;
  throw new Error(`src/config/site.ts is invalid:\n\n${z.prettifyError(result.error)}\n`);
}
