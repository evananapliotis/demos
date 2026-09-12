/**
 * Halden & Crane, site content.
 *
 * This is the one file a barber (or the person setting the site up for them)
 * edits. Every string, price, opening hour, link and image alt text on the
 * site comes from here. Photos live in public/img and are referenced by slot.
 *
 * The object is validated against site.schema.ts when the site builds. A
 * missing or empty value fails the build with a message naming the key.
 */
import { parseSite, type SiteInput } from './site.schema.ts';

const raw = {
  business: {
    name: 'Halden & Crane',
    shortName: 'H&C',
    tagline: 'Barbers, Kelham Island',
    foundedYear: 2016,
    area: 'Kelham Island, Sheffield',
  },

  seo: {
    siteUrl: 'https://halden-crane.pages.dev',
    titleTemplate: '%s | Halden & Crane',
    defaultTitle: 'Halden & Crane, barbers in Kelham Island, Sheffield',
    description:
      'Classic cuts, skin fades, beard work and hot towel shaves in Kelham Island, Sheffield. Walk-ins welcome, bookings preferred. Open six days a week.',
    ogImage: 'og',
    locale: 'en_GB',
    themeColour: '#1a1714',
  },

  nav: [
    { label: 'Services', href: '#services' },
    { label: 'Team', href: '#team' },
    { label: 'Gallery', href: '#gallery' },
    { label: 'Hours', href: '#hours' },
    { label: 'Contact', href: '#contact' },
    { label: 'Book', href: '/book' },
  ],

  ui: {
    skipToContent: 'Skip to content',
    navLabel: 'Main navigation',
    menuOpen: 'Menu',
    menuClose: 'Close',
    minutes: 'min',
    bookThis: 'Book this',
    dayNames: {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
    },
    dayNamesShort: {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun',
    },
    stickyBar: {
      label: 'Quick actions',
      call: 'Call',
      book: 'Book',
    },
  },

  hero: {
    eyebrow: 'Barbers · Kelham Island · Est. 2016',
    heading: 'Sharp cuts. No fuss.',
    subheading:
      'Classic cuts, skin fades and hot towel shaves from three barbers who have been doing this a long time. Walk-ins welcome when there is a free chair, bookings preferred.',
    primaryCta: { label: 'Book online', href: '/book' },
    secondaryCta: { label: 'See services', href: '#services' },
    image: { slot: 'hero', alt: 'Barber finishing a scissor cut under warm lights in the Halden & Crane shop' },
    imagePortrait: { slot: 'hero-portrait', alt: 'Close-up of a barber working clippers through a fade' },
  },

  services: {
    heading: 'Services',
    intro: 'Straightforward pricing. Every cut finishes with a hot towel and a tidy of the neckline.',
    items: [
      {
        id: 'classic-cut',
        name: 'Classic cut',
        description: 'Scissor or clipper cut, washed and styled. The one most people come in for.',
        priceGBP: 28,
        durationMinutes: 30,
        image: { slot: 'service-classic-cut', alt: 'Barber cutting hair with scissors and a comb' },
      },
      {
        id: 'skin-fade',
        name: 'Skin fade',
        description: 'Blended from the skin up, any height. Finished with a razor edge.',
        priceGBP: 32,
        durationMinutes: 45,
        image: { slot: 'service-skin-fade', alt: 'Clippers blending a skin fade at the temple' },
      },
      {
        id: 'beard-trim',
        name: 'Beard trim & shape',
        description: 'Shaped with clippers and scissors, lined up, finished with oil.',
        priceGBP: 18,
        durationMinutes: 20,
        image: { slot: 'service-beard', alt: 'Barber shaping a beard with a trimmer' },
      },
      {
        id: 'hot-towel-shave',
        name: 'Hot towel shave',
        description: 'Two hot towels, pre-shave oil, straight razor, cold towel to finish.',
        priceGBP: 30,
        durationMinutes: 30,
        image: { slot: 'service-hot-towel-shave', alt: 'Straight razor shave with a hot towel on the chair side' },
      },
      {
        id: 'cut-and-beard',
        name: 'Cut & beard',
        description: 'The classic cut and the beard trim together, at a better price than both.',
        priceGBP: 42,
        durationMinutes: 60,
        image: { slot: 'service-cut-and-beard', alt: 'Barber styling hair and beard together' },
      },
      {
        id: 'kids-cut',
        name: "Kids' cut",
        description: 'Under 12s. Patient barbers, a stool for the small ones, lollipop at the end.',
        priceGBP: 18,
        durationMinutes: 30,
        image: { slot: 'service-kids', alt: 'Child having a haircut in a barber chair' },
      },
    ],
  },

  team: {
    heading: 'The team',
    intro: 'Three barbers, three chairs. Pick who you like or take whoever is free.',
    members: [
      {
        id: 'tom-halden',
        name: 'Tom Halden',
        role: 'Founder & master barber',
        bio: 'Twenty years behind the chair, the last nine running this one. Tom still believes a scissor cut should look good six weeks later.',
        image: { slot: 'team-1', alt: 'Tom Halden in a work apron in front of his chair' },
        days: ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      },
      {
        id: 'jess-crane',
        name: 'Jess Crane',
        role: 'Co-founder & head barber',
        bio: 'Fades, tapers and the tricky stuff. Jess trained in Manchester and has judged more barber battles than she has entered.',
        image: { slot: 'team-2', alt: 'Jess Crane holding clippers, smiling at the camera' },
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      },
      {
        id: 'marcus-obi',
        name: 'Marcus Obi',
        role: 'Barber',
        bio: 'The beard specialist. Marcus joined in 2021 and runs the hot towel shaves. Ask him about beard oil, then set aside ten minutes.',
        image: { slot: 'team-3', alt: 'Marcus Obi with arms crossed beside the shop window' },
        days: ['wednesday', 'thursday', 'friday', 'saturday'],
      },
    ],
  },

  gallery: {
    heading: 'Recent work',
    intro: 'A few from the chair this month.',
    images: [
      { slot: 'gallery-1', alt: 'Fresh skin fade seen from the side' },
      { slot: 'gallery-2', alt: 'Beard oil and a comb on the counter' },
      { slot: 'gallery-3', alt: 'Vintage leather barber chair in the shop' },
      { slot: 'gallery-4', alt: 'Straight razor mid-shave' },
      { slot: 'gallery-5', alt: 'Pomade being worked into a textured crop' },
      { slot: 'gallery-6', alt: 'Neon barber sign in the shop window at dusk' },
    ],
  },

  hours: {
    heading: 'Opening hours',
    note: 'Last appointment 30 minutes before closing. Walk-ins taken when there is a free chair.',
    closedLabel: 'Closed',
    image: { slot: 'about-shop', alt: 'Inside the shop: three leather chairs and the long mirror' },
    schedule: {
      monday: { open: '10:00', close: '18:00' },
      tuesday: { open: '09:00', close: '19:00' },
      wednesday: { open: '09:00', close: '19:00' },
      thursday: { open: '09:00', close: '19:00' },
      friday: { open: '09:00', close: '19:00' },
      saturday: { open: '08:00', close: '17:00' },
      sunday: 'closed',
    },
  },

  contact: {
    heading: 'Find us',
    intro: 'Two minutes from the Kelham Island tram stop. Street parking on the yard after 6pm.',
    phoneDisplay: '0114 496 0782',
    phoneHref: '+441144960782',
    email: 'hello@haldenandcrane.example',
    address: {
      line1: "12 Tanner's Yard",
      city: 'Sheffield',
      postcode: 'S3 8XY',
    },
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Kelham+Island+Sheffield',
    directionsLabel: 'Get directions',
    ctaLabel: 'Book online',
    image: { slot: 'contact-exterior', alt: 'The Halden & Crane shopfront on a brick-terraced street' },
    social: [
      { platform: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/' },
      { platform: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/' },
    ],
  },

  booking: {
    heading: 'Book an appointment',
    intro: 'Pick a service, a barber and a time. Takes about a minute.',
    demoNotice: 'This is a demo booking flow. Nothing is sent and no appointment is made.',
    horizonDays: 21,
    minNoticeHours: 2,
    slotIntervalMinutes: 15,
    closedDates: ['2026-12-25', '2026-12-26', '2027-01-01'],
    demo: {
      busyFraction: 0.35,
    },
    steps: {
      service: 'Service',
      barber: 'Barber',
      date: 'Date',
      time: 'Time',
      details: 'Your details',
      confirmation: 'Confirmed',
    },
    ui: {
      progress: 'Booking steps',
      next: 'Next',
      back: 'Back',
      confirm: 'Confirm booking',
      startOver: 'Start again',
      chooseService: 'What are you in for?',
      chooseBarber: 'Who would you like?',
      chooseDate: 'Pick a day',
      chooseTime: 'Pick a time',
      yourDetails: 'Your details',
      name: 'Name',
      phone: 'Mobile number',
      email: 'Email',
      notes: 'Anything we should know?',
      optional: 'optional',
      required: 'This field is required',
      invalidEmail: 'That email address does not look right',
      invalidPhone: 'Enter a UK mobile or landline number',
      noSlots: 'No times left that day. Try another.',
      closedDay: 'Closed',
      taken: 'Taken',
      dayOff: 'Day off',
      full: 'Full',
      summary: 'Your booking',
      with: 'with',
      at: 'at',
      confirmedHeading: 'See you soon',
      confirmedBody: 'Thanks {name}. {service} with {barber} on {date} at {time}.',
      reference: 'Reference',
    },
  },

  footer: {
    sampleLabel: 'This is a sample site. Halden & Crane is a fictional business.',
    copyrightHolder: 'Halden & Crane',
  },

  notFound: {
    title: 'Page not found',
    heading: 'That page has gone the way of the mullet.',
    body: 'It is not here. Head back to the shop.',
    homeLabel: 'Back home',
  },
} satisfies SiteInput;

export const site = parseSite(raw);
export type { SiteConfig } from './site.schema.ts';
