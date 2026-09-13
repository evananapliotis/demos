/**
 * The front page's fixed facts (phone, WhatsApp, the offer) and the fictional
 * shop its mockups are built from. Halden & Crane is the template's own
 * invented shop: its photos in public/img are the three from the template's
 * Pexels set that show no people.
 */
import { derive, type DemoSite, type Photo, type PriceRow } from './demo.ts';
import { ShopSchema } from './shops.ts';

export const OWNER = {
  name: 'Evangelos',
  phone: { display: '07546 685660', tel: '+447546685660' },
  whatsapp: 'https://wa.me/447546685660?text=Hi%20Evangelos%2C%20I%27d%20like%20my%20shop%20page',
  whatsappBooking: 'https://wa.me/447546685660?text=Hi%20Evangelos%2C%20I%27d%20like%20my%20shop%20page%20with%20booking',
};
export const telHref = `tel:${OWNER.phone.tel}`;


/** The offer, as given. Every figure on the page comes from here. */
export const OFFER = {
  page: 500,
  booking: 400,
  deposit: 100,
  hours: 48,
};

const MOCK_PHOTOS: Photo[] = [
  { path: '/img/about-shop-640.webp', width: 640, height: 427, alt: 'Inside the shop: three leather chairs and the long mirror', authors: [] },
  { path: '/img/gallery-3-960.webp', width: 960, height: 960, alt: 'Clipper guards laid out in the tool case', authors: [] },
  { path: '/img/gallery-4-960.webp', width: 960, height: 960, alt: 'Scissors in the tool roll', authors: [] },
];

const mockShop = ShopSchema.parse({
  slug: 'example',
  name: 'Halden & Crane',
  phone: '+44 114 496 0782',
  address: "12 Tanner's Yard, Sheffield S3 8XY",
  street: "12 Tanner's Yard",
  city: 'Sheffield',
  postcode: 'S3 8XY',
  rating: 4.9,
  reviews: 212,
  hours: {
    Monday: ['10am-6pm'],
    Tuesday: ['9am-7pm'],
    Wednesday: ['9am-7pm'],
    Thursday: ['9am-7pm'],
    Friday: ['9am-7pm'],
    Saturday: ['8am-5pm'],
    Sunday: ['Closed'],
  },
  photo: null,
  street_view: null,
  reviews_link: null,
  subtypes: 'Barber shop',
  lat: 53.3889,
  lng: -1.4726,
  photos: MOCK_PHOTOS.map((p) => p.path),
  about: {
    Accessibility: { 'Wheelchair-accessible entrance': true },
    Planning: { 'Accepts walk-ins': true },
    Payments: { 'Credit cards': true, 'NFC mobile payments': true },
  },
  reviews_per_score: { '1': 3, '2': 2, '3': 4, '4': 19, '5': 184 },
});

/** The example shop's price list: the three prices in the WhatsApp mock, plus the booking page's other services. */
const MOCK_PRICES: PriceRow[] = [
  { name: 'Haircut', price: '£18', minutes: 30 },
  { name: 'Skin fade', price: '£22', minutes: 45 },
  { name: 'Beard trim', price: '£12', minutes: 20 },
  { name: 'Haircut & beard', price: '£30', minutes: 50 },
  { name: 'Kids cut', price: '£14', minutes: 20 },
  { name: 'Hot towel shave', price: '£20', minutes: 30 },
];

/** The fictional shop as a DemoSite, with its photos wired to public/img, a plain tagline and its prices. */
export const mockSite: DemoSite = {
  ...derive(mockShop),
  photos: MOCK_PHOTOS,
  hero: MOCK_PHOTOS[0]!,
  authors: [],
  tagline: "Barbers on Tanner's Yard, Sheffield. Walk in or book online.",
  prices: MOCK_PRICES,
};

/** The example's name size on a 390px phone, in px: the page's clamp() resolved for the still that stands in until the live page loads. */
export const MOCK_H1_PX = (() => {
  const m = /clamp\(([\d.]+)rem, ([\d.]+)vw, ([\d.]+)rem\)/.exec(mockSite.h1Size);
  if (!m) return 96;
  const [lo, vw, hi] = m.slice(1).map(Number) as [number, number, number];
  return Math.round(Math.min(Math.max(lo * 16, (vw * 390) / 100), hi * 16) * 10) / 10;
})();

/** Every line of copy on the front page. Short, plain, UK English; every claim traces to OFFER. */
export const COPY = {
  hero: {
    eyebrow: 'For UK barbers',
    headline: ['Get seen.', 'Get booked.'],
    support: 'Your photos, prices, hours and Google rating, with one tap to call. Built before you pay a penny.',
    under: '£500 one-off. No monthly fee, ever.',
    sent: "Been sent a link to your shop? That's your page, already built.",
    example: 'An example page for a made-up shop. Yours gets your name, your photos, your rating.',
  },
  proof: ['Built in 48 hours', 'No monthly fee', 'You see it before you pay', 'Your photos, your Google rating'],
  beforeAfter: {
    heading: 'What a new customer <span class="text-amber">sees.</span>',
    leftLabel: 'Today',
    leftLine: 'Your Google listing and not much else. No prices, nowhere to book, nothing of yours to share.',
    leftRows: [['Prices', 'Not shown'], ['Book', 'Call and ask'], ['Your link', 'None']],
    rightLabel: 'With your page',
    rightLine: 'Photos, rating, open now. One tap to call, get directions or book.',
  },
  whatYouGet: {
    heading: 'What <span class="text-amber">you get.</span>',
    items: [
      { title: 'Your photos, your Google rating', line: 'Real photos of your shop and the rating you have already earned, front and centre.' },
      { title: 'Opening hours, with open now', line: "Shows open now when you are, so nobody turns up to a locked door." },
      { title: 'Call and directions, one tap', line: 'One tap to ring you. One tap to get directions to the door.' },
      { title: 'Your own link to share', line: "Put it on Instagram, WhatsApp, your window. It's yours, not a profile on somebody's app." },
      { title: 'Online booking, if you want it', line: 'Add deposit-protected booking for £400 one-off. No platform fees.' },
    ],
  },
  booking: {
    heading: 'No-shows cost <span class="text-amber">you less.</span>',
    lines: [
      'Every booking takes a deposit up front. An empty chair costs the customer, not just you.',
      'No platform fees. Nobody takes a cut of your bookings.',
      'Add up what no-shows and platform fees cost you in a month.',
    ],
    price: 'Add it for £400 one-off. No monthly fee, ever.',
    button: 'WhatsApp me about booking',
    tryIt: 'Try it',
    steps: ['1. What are you in for?', '2. Which day?', '3. What time?'],
    confirm: 'Pay deposit and confirm',
    depositLine: 'A deposit holds the slot.',
    doneLine: 'Deposit taken, slot held.',
    demoLine: 'A demo. Nothing was sent and nobody is expecting anyone.',
    again: 'Start again',
  },
  how: {
    heading: 'How it <span class="text-amber">works.</span>',
    steps: [
      { title: 'I build it first', line: 'I make your page from your Google listing before you pay a penny. You see it, then decide.' },
      { title: '£100 holds your slot', line: 'Like it? £100 holds your slot. Then WhatsApp me your prices and opening hours.' },
      { title: 'Live in 48 hours', line: "Live within 48 hours of getting them. Pay the rest when it's live and you're happy." },
    ],
    whatsapp: [
      { from: 'owner', text: "Hi Evangelos, I'd like my shop page" },
      { from: 'evangelos', text: 'Nice one. Here it is to look over: mybarbersite.co.uk/halden-crane. Like it? £100 holds your slot, then send me your prices and opening hours.' },
      { from: 'owner', text: 'Love it. Skin fade £22, beard trim £12, cut and beard £30. Mon 10 to 6, Tue to Fri 9 to 7, Sat 8 to 5. Closed Sunday.' },
      { from: 'evangelos', text: "Got them. Live within 48 hours, and the rest when it's live and you're happy." },
    ],
  },
  pricing: {
    heading: "Pay once. <span class=\"text-amber\">That's it.</span>",
    page: { name: 'Shop page', lines: ['Your photos, prices and Google rating', 'Hours, open now, call, directions', 'Your own link to share'] },
    pageBooking: { name: 'Shop page + booking', sum: '£500 page + £400 booking', lines: ['Everything in the shop page', 'Deposit-protected online booking', 'No platform fees'] },
    note: "£100 holds your slot, balance when you're happy.",
    button: 'WhatsApp me',
  },
  faq: {
    heading: 'Straight <span class="text-amber">answers.</span>',
    items: [
      { q: 'Do I have to do anything?', a: "WhatsApp me your shop's name and I'll build it. Like it? Send your prices and opening hours and it's live within 48 hours." },
      { q: "What if I don't like it?", a: "You see it before you pay a penny. Not for you? Walk away, nothing owed. Want changes? Tell me and I'll make them." },
      { q: 'Who owns it?', a: "You do. You pay once and it's yours. No subscription, nothing that switches off if you stop paying." },
      { q: 'Does it work on phones?', a: "Yes. You're probably reading this on one. It's built for a thumb: tap to call, tap for directions, open now at a glance." },
      { q: 'Can I change prices later?', a: "Yes. WhatsApp me the new prices or hours and I'll update your page." },
      { q: 'What happens after 48 hours?', a: "It's live. Check it on your phone, and if you're happy you pay the rest. There's no bill after that." },
    ],
  },
  about: {
    heading: 'Evangelos.',
    eyebrow: "Who you're dealing with",
    lines: ["I'm Evangelos. I build every one of these myself and I answer my own phone.", 'No team, no office, just me.'],
  },
  cta: {
    heading: 'See yours before you pay.',
    line: "WhatsApp me your shop's name. I'll build it first and send you the link.",
  },
  footer: {
    demoLine: 'The shop pages on this domain are demos, built for their owners. Halden & Crane is made up.',
  },
};
