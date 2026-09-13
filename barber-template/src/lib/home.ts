/**
 * The front page's fixed facts (phone, WhatsApp, the offer) and every line of
 * its copy. The made-up shop its mockups show lives in showcase.ts.
 */

export const OWNER = {
  name: 'Evan',
  phone: { display: '07546 685660', tel: '+447546685660' },
  whatsapp: 'https://wa.me/447546685660?text=Hi%20Evan%2C%20I%27d%20like%20my%20shop%20page',
  whatsappBooking: 'https://wa.me/447546685660?text=Hi%20Evan%2C%20I%27d%20like%20my%20shop%20page%20with%20booking',
};
export const telHref = `tel:${OWNER.phone.tel}`;


/** The offer, as given. Every figure on the page comes from here. */
export const OFFER = {
  page: 500,
  booking: 400,
  deposit: 100,
  hours: 48,
};

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
    heading: 'What a new customer <span class="ac">sees.</span>',
    leftLabel: 'Today',
    leftLine: 'Your Google listing and not much else. No prices, nowhere to book, nothing of yours to share.',
    leftRows: [['Prices', 'Not shown'], ['Book', 'Call and ask'], ['Your link', 'None']],
    rightLabel: 'With your page',
    rightLine: 'Photos, rating, open now. One tap to call, get directions or book.',
  },
  whatYouGet: {
    heading: 'What <span class="ac">you get.</span>',
    items: [
      { title: 'Your photos, your Google rating', line: 'Real photos of your shop and the rating you have already earned, front and centre.' },
      { title: 'Opening hours, with open now', line: "Shows open now when you are, so nobody turns up to a locked door." },
      { title: 'Call and directions, one tap', line: 'One tap to ring you. One tap to get directions to the door.' },
      { title: 'Your own link to share', line: "Put it on Instagram, WhatsApp, your window. It's yours, not a profile on somebody's app." },
      { title: 'Online booking, if you want it', line: 'Add deposit-protected booking for £400 one-off. No platform fees.' },
    ],
  },
  booking: {
    heading: 'No-shows cost <span class="ac">you less.</span>',
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
    heading: 'How it <span class="ac">works.</span>',
    steps: [
      { title: 'I build it first', line: 'I make your page from your Google listing before you pay a penny. You see it, then decide.' },
      { title: '£100 holds your slot', line: 'Like it? £100 holds your slot. Then WhatsApp me your prices and opening hours.' },
      { title: 'Live in 48 hours', line: "Live within 48 hours of getting them. Pay the rest when it's live and you're happy." },
    ],
    whatsapp: [
      { from: 'owner', text: "Hi Evan, I'd like my shop page" },
      { from: 'evan', text: 'Nice one. Here it is to look over: mybarbersite.co.uk/marlow-finch. Like it? £100 holds your slot, then send me your prices and opening hours.' },
      { from: 'owner', text: 'Love it. Skin fade £22, beard trim £12, cut and beard £30. Mon 10 to 6, Tue to Fri 9 to 7, Sat 8 to 5. Closed Sunday.' },
      { from: 'evan', text: "Got them. Live within 48 hours, and the rest when it's live and you're happy." },
    ],
  },
  pricing: {
    heading: "Pay once. <span class=\"ac\">That's it.</span>",
    page: { name: 'Shop page', lines: ['Your photos, prices and Google rating', 'Hours, open now, call, directions', 'Your own link to share'] },
    pageBooking: { name: 'Shop page + booking', sum: '£500 page + £400 booking', lines: ['Everything in the shop page', 'Deposit-protected online booking', 'No platform fees'] },
    note: "£100 holds your slot, balance when you're happy.",
    button: 'WhatsApp me',
  },
  faq: {
    heading: 'Straight <span class="ac">answers.</span>',
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
    heading: 'My<span class="ac">Barber</span>Site.',
    eyebrow: "Who you're dealing with",
    lines: ['MyBarberSite builds shop pages and online booking for barbers across the UK.', 'Evan runs it and answers the phone himself.'],
    fromEvan: "Send me your shop's name and I'll take it from there.",
  },
  cta: {
    heading: 'See yours <span class="ac">before you pay.</span>',
    line: "WhatsApp me your shop's name. I'll build it first and send you the link.",
  },
  footer: {
    demoLine: 'The shop pages on this domain are demos, built for their owners. Marlow & Finch is made up.',
  },
};
