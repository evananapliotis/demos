/**
 * The showcase shop: a made-up barbershop shown inside the front page's phone
 * and mockups, in a design of its own (light, warm, editorial) so it looks
 * nothing like the demo template that goes out to real shops. Nothing here is
 * real: the name, street, phone number (an Ofcom drama range), rating, review
 * count and prices are all invented.
 */
export type Range = { open: string; close: string } | null;

export const SHOP = {
  name: 'Marlow & Finch',
  nameLines: ['Marlow', '& Finch'] as const,
  slug: 'marlow-finch',
  kind: 'Barbers',
  town: 'Sheffield',
  tagline: 'Cuts, fades and hot towel shaves on Kelham Row, six days a week.',
  phone: { display: '0114 496 0311', tel: '+441144960311' },
  address: { street: '4 Kelham Row', locality: 'Sheffield', postcode: 'S3 8RY' },
  rating: 4.8,
  reviews: 186,
  /** Opening hours on the shop's clock, in the shape src/lib/open-status.ts and src/lib/demo-booking.ts read. */
  week: {
    monday: { open: '10:00', close: '18:00' },
    tuesday: { open: '09:00', close: '19:00' },
    wednesday: { open: '09:00', close: '19:00' },
    thursday: { open: '09:00', close: '19:00' },
    friday: { open: '09:00', close: '19:00' },
    saturday: { open: '08:00', close: '17:00' },
    sunday: null,
  } as Record<string, Range>,
  hours: [
    { day: 'monday', label: 'Monday', text: '10am – 6pm' },
    { day: 'tuesday', label: 'Tuesday', text: '9am – 7pm' },
    { day: 'wednesday', label: 'Wednesday', text: '9am – 7pm' },
    { day: 'thursday', label: 'Thursday', text: '9am – 7pm' },
    { day: 'friday', label: 'Friday', text: '9am – 7pm' },
    { day: 'saturday', label: 'Saturday', text: '8am – 5pm' },
    { day: 'sunday', label: 'Sunday', text: 'Closed', closed: true },
  ],
  openLabel: 'Open six days a week',
  prices: [
    { name: 'Haircut', minutes: 30, price: '£18' },
    { name: 'Skin fade', minutes: 45, price: '£22' },
    { name: 'Beard trim', minutes: 20, price: '£12' },
    { name: 'Cut & beard', minutes: 50, price: '£30' },
    { name: 'Kids cut', minutes: 20, price: '£14' },
    { name: 'Hot towel shave', minutes: 30, price: '£20' },
  ],
  photos: [
    { path: '/img/about-shop-640.webp', avif: '/img/about-shop-640.avif', width: 640, height: 427, alt: 'Inside the shop: leather chairs and the long mirror' },
    { path: '/img/gallery-3-960.webp', avif: '/img/gallery-3-960.avif', width: 960, height: 960, alt: 'Clipper guards laid out in the tool case' },
    { path: '/img/gallery-4-960.webp', avif: '/img/gallery-4-960.avif', width: 960, height: 960, alt: 'Scissors in the tool roll' },
  ],
  about: [
    'A two-chair shop on Kelham Row, a short walk from the city centre. Walk in or book online; either way you get a proper cut and a decent brew.',
    'Card and contactless, a step-free door, and open until seven most nights.',
  ],
  facts: ['Walk-ins welcome', 'Card & contactless', 'Step-free entrance'],
};
