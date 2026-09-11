/**
 * Every word on the page lives here. Ninefold Tattoo is a fictional studio built as a
 * portfolio sample; contact details are placeholders and the testimonials are written samples.
 */

export type StyleKey = 'fine-line' | 'blackwork' | 'japanese' | 'colour';

export const styles: { key: StyleKey; label: string }[] = [
  { key: 'fine-line', label: 'Fine line' },
  { key: 'blackwork', label: 'Blackwork' },
  { key: 'japanese', label: 'Japanese' },
  { key: 'colour', label: 'Colour' },
];

export const site = {
  name: 'Ninefold Tattoo',
  shortName: 'Ninefold',
  url: 'https://ninefold-tattoo.netlify.app',
  established: '2017',
  area: 'Northern Quarter',
  city: 'Manchester',
  seo: {
    title: 'Ninefold Tattoo | Tattoo Studio in Manchester',
    description:
      'Ninefold is a four-artist tattoo studio on Tib Street in Manchester’s Northern Quarter. Fine line, blackwork, Japanese and colour realism, by appointment since 2017.',
  },
  phone: { display: '0161 555 0190', tel: '+441615550190' },
  email: 'studio@ninefoldtattoo.co.uk',
  address: { street: '14 Tib Street', area: 'Northern Quarter', city: 'Manchester', postcode: 'M4 1SH', country: 'GB' },
  geo: { lat: 53.4839, lng: -2.2364 },
  hours: [
    { days: 'Tue–Sat', open: '11:00', close: '19:00' },
    { days: 'Sun–Mon', closed: true },
  ] as { days: string; open?: string; close?: string; closed?: boolean }[],
  hoursNote: 'Appointment only. Consultations Thursday afternoons, walk in or call.',
  socials: [
    { label: 'Instagram', handle: '@ninefoldtattoo', href: 'https://www.instagram.com/' },
    { label: 'TikTok', handle: '@ninefoldtattoo', href: 'https://www.tiktok.com/' },
  ],
  disclaimer: 'Portfolio sample site · Placeholder contact details',
  disclaimerLong:
    'Ninefold Tattoo is a fictional studio created to demonstrate this design. The phone number, email and address are placeholders and the testimonials are written samples. Photography is royalty-free stock, credited in CREDITS.md.',
};

export const hero = {
  slot: 'hero',
  alt: 'Close-up of a large tattoo across a shoulder and upper arm, lit from one side in a dark studio',
  position: '50% 40%',
  label: 'Northern Quarter · Est. 2017',
  line: 'Four artists. Four styles. Nothing off the wall.',
  primary: { label: 'Book a consultation', href: '#consultation' },
  secondary: { label: 'See the work', href: '#work' },
};

export const intro = {
  label: 'The studio',
  heading: 'Nine years in, still',
  accent: 'particular.',
  lines: [
    'Every piece is drawn for the body it’s going on, by the artist who’ll ink it.',
    'Four artists, four styles, none of them watered down to say yes.',
    'We work slowly so that in twenty years it still looks like it was worth it.',
  ],
};

export interface Piece {
  slot: string;
  title: string;
  artist: ArtistKey;
  style: StyleKey;
  alt: string;
  lead?: boolean;
  position?: string;
}

export type ArtistKey = 'iris' | 'marcus' | 'dee' | 'kofi';

export const artists: {
  key: ArtistKey;
  name: string;
  style: string;
  styleKey: StyleKey;
  bio: string;
  slot: string;
  alt: string;
  position?: string;
}[] = [
  {
    key: 'iris',
    name: 'Iris',
    style: 'Fine line & botanical',
    styleKey: 'fine-line',
    bio: 'Single-needle botanicals and lettering, drawn from life. Iris works small and precise, and her healed work stays that way.',
    slot: 'fine-line-small',
    alt: 'A small fine-line tattoo by Iris on the inside of a wrist',
  },
  {
    key: 'marcus',
    name: 'Marcus',
    style: 'Japanese & large-scale',
    styleKey: 'japanese',
    bio: 'Trained in the Japanese tradition and works at scale: sleeves, backs, full suits. His waiting list is real, so book early.',
    slot: 'japanese-sleeve',
    alt: 'A Japanese-style sleeve by Marcus, waves and blossoms wrapping the forearm',
  },
  {
    key: 'dee',
    name: 'Dee',
    style: 'Blackwork & geometric',
    styleKey: 'blackwork',
    bio: 'Heavy black, clean geometry, ornamental work that follows the muscle. Dee designs on the body, never on a flat page.',
    slot: 'blackwork-heavy',
    alt: 'Heavy blackwork by Dee covering a shoulder and upper arm',
  },
  {
    key: 'kofi',
    name: 'Kofi',
    style: 'Colour realism',
    styleKey: 'colour',
    bio: 'Colour realism with real depth: florals, portraits, animals. Kofi mixes his own palettes and photographs every piece healed.',
    slot: 'colour-realism-2',
    alt: 'A colour realism piece by Kofi on an upper arm',
  },
];

export const artistByKey = Object.fromEntries(artists.map((a) => [a.key, a])) as Record<ArtistKey, (typeof artists)[number]>;

export const work = {
  label: 'The work',
  heading: 'Ink that',
  accent: 'holds.',
  pieces: [
    { slot: 'japanese-large', title: 'Dragon and chrysanthemum back piece', artist: 'marcus', style: 'japanese', lead: true, alt: 'Large-scale Japanese back piece in progress, a dragon and chrysanthemums across the whole back' },
    { slot: 'fine-line-botanical', title: 'Peony stem', artist: 'iris', style: 'fine-line', alt: 'Fine-line peony stem tattooed down the inside of a forearm' },
    { slot: 'blackwork-geometric', title: 'Geometric forearm', artist: 'dee', style: 'blackwork', alt: 'Geometric blackwork tattoo, repeating lines and dots down a forearm' },
    { slot: 'colour-realism-1', title: 'Koi in colour', artist: 'kofi', style: 'colour', alt: 'Colour realism tattoo of a koi carp, orange and white scales on an upper arm' },
    { slot: 'japanese-sleeve', title: 'Waves and blossom sleeve', artist: 'marcus', style: 'japanese', alt: 'Japanese sleeve of waves and cherry blossom wrapping a forearm' },
    { slot: 'healed', title: 'Healed at eight weeks', artist: 'iris', style: 'fine-line', alt: 'A healed fine-line tattoo photographed in daylight, lines settled and matte' },
    { slot: 'blackwork-heavy', title: 'Ornamental shoulder', artist: 'dee', style: 'blackwork', alt: 'Solid ornamental blackwork across a shoulder and upper arm' },
    { slot: 'colour-realism-2', title: 'Florals in colour', artist: 'kofi', style: 'colour', alt: 'Colour realism floral tattoo with deep reds and greens on an upper arm' },
    { slot: 'fine-line-small', title: 'Wrist script', artist: 'iris', style: 'fine-line', alt: 'A small fine-line tattoo on the inside of a wrist' },
    { slot: 'extra-1', title: 'Snake and dagger', artist: 'dee', style: 'blackwork', alt: 'Close-up of a black tattoo, snake and dagger on a forearm' },
    { slot: 'extra-2', title: 'Hand piece', artist: 'marcus', style: 'japanese', alt: 'Close-up of a tattooed hand, Japanese-style detail across the knuckles' },
  ] as Piece[],
};

export const freshHealed = {
  label: 'Fresh → Healed',
  heading: 'What it looks like',
  accent: 'six weeks',
  headingEnd: 'on.',
  baseSlot: 'healed',
  freshLabel: 'Fresh · day one',
  healedLabel: 'Healed · week six',
  paragraphs: [
    'Fresh ink sits on top of the skin, slightly raised, with the skin around it flushed. Over the next six weeks the piece settles a layer down: the lines soften by a hair, the black goes matte, and your own skin tone comes back over the top.',
    'That settled version is the tattoo you live with, and it’s the one we design for. Every artist here photographs their work healed, not just fresh.',
  ],
  note: 'Comparison prepared for this sample site from a single photograph.',
  alt: 'The same fine-line tattoo shown fresh on the day and healed six weeks later',
};

export const artistsSection = {
  label: 'The artists',
  heading: 'Four hands, four',
  accent: 'disciplines.',
  intro: 'You book the artist, not the studio. Pick the one whose work you keep coming back to.',
  cta: (name: string) => `Book with ${name}`,
};

export const process = {
  label: 'How it works',
  heading: 'From first message to',
  accent: 'last',
  headingEnd: 'session.',
  slot: 'artist-at-work',
  alt: 'A tattoo artist in black gloves working a machine over a forearm under a lamp',
  steps: [
    { title: 'Consultation', line: 'Twenty minutes with your artist, in the studio or on a call. Bring references, a placement and honest questions.' },
    { title: 'Design', line: 'Drawn for you and shown before the day. Small changes on the spot, bigger ones before your session.' },
    { title: 'Session', line: 'Stencil on, checked in the mirror, then the work. Breaks when you need them. Big pieces run in sittings.' },
    { title: 'Aftercare', line: 'You leave wrapped, with a printed sheet and your artist’s number. A healed check at six weeks is on us.' },
  ],
};

export const interstitial = {
  slot: 'interstitial',
  alt: 'A tattooed forearm resting on the arm of a studio chair in low light',
  line: 'Drawn once, for one body, by the hand that inks it.',
  position: '50% 50%',
};

export const aftercare = {
  label: 'Aftercare',
  heading: 'The work isn’t',
  accent: 'finished',
  headingEnd: 'when you leave.',
  intro: 'How it heals is half the tattoo. This is what we tell everyone, and it’s what the sheet in your pocket says.',
  items: [
    { title: 'Leave the wrap on', body: 'Cling film for two to four hours, or a second-skin film for up to three days. Your artist will tell you which you have.' },
    { title: 'Wash it clean', body: 'Clean hands, lukewarm water, a fragrance-free soap. Pat dry with clean paper. No flannels, no towels, no scrubbing.' },
    { title: 'Moisturise, thinly', body: 'A thin layer of unscented moisturiser two or three times a day. A tattoo that can’t breathe heals badly and loses detail.' },
    { title: 'Let it peel', body: 'Flaking from day three to day seven is normal. Do not pick, do not scratch. Anything you pull off takes ink with it.' },
    { title: 'No soaking, no sun', body: 'Showers are fine. Baths, pools, the gym sauna and the sea are not, for at least two weeks. Keep it out of direct sun until it’s healed.' },
    { title: 'Healed at four to six weeks', body: 'Once it’s settled, sunscreen is what keeps black black and colour colour. If it’s hot, swollen or weeping, message the studio. We’d rather look than guess.' },
  ],
};

export const kindWords = {
  label: 'Kind words',
  heading: 'What people',
  accent: 'say.',
  sampleNote: 'Sample testimonials, written for this demo. Real reviews would be quoted verbatim.',
  items: [
    { quote: 'Iris drew the peony from a photo of my grandmother’s garden. Eight weeks on it looks exactly like the drawing, which I’m told is the hard part.', name: 'Hannah R.', piece: 'Fine-line peony · Iris' },
    { quote: 'Three sittings for the back piece. Marcus checked the stencil in the mirror four times before he’d start, and I understood why by the end.', name: 'Tom A.', piece: 'Japanese back piece · Marcus' },
    { quote: 'I came in with a Pinterest board and left with something that was actually mine. Dee talked me out of two ideas and was right both times.', name: 'Priya S.', piece: 'Blackwork sleeve · Dee' },
  ],
};

export const consult = {
  label: 'Consultation',
  heading: 'Tell us what you’re',
  accent: 'thinking.',
  intro: 'A few details and we’ll match you with the right artist and come back within two working days. No commitment yet.',
  deposit: 'A £50 deposit secures your session and comes off the final price.',
  referenceNote: 'Reference images: reply to our confirmation email with anything you’ve saved. Two or three is plenty.',
  sizes: ['Small', 'Medium', 'Large', 'Sleeve'],
  budgets: ['£150–300', '£300–600', '£600–1,200', '£1,200+'],
  styleOptions: ['Not sure yet', 'Fine line', 'Blackwork', 'Japanese', 'Colour realism'],
  submit: 'Send the enquiry',
  success: {
    heading: 'Got it.',
    body: 'We’ll read it properly and come back within two working days. If an artist is a better fit than the one you picked, we’ll say so.',
  },
  mailtoNotice: 'This form isn’t connected to a server here, so your email app has opened with everything filled in. Send it from there.',
};

export const stickyBar = { book: 'Book a consultation', call: 'Call' };

export const footer = {
  blurb: 'Fine line, blackwork, Japanese and colour realism. Tib Street, since 2017.',
};

export const telHref = `tel:${site.phone.tel}`;
export const mailHref = `mailto:${site.email}`;
export const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.name} ${site.address.street} ${site.address.city} ${site.address.postcode}`)}`;

export function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, '0')}${suffix}` : `${hour}${suffix}`;
}

export function openingHoursSpec() {
  const names: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
  const order = Object.keys(names);
  const out: object[] = [];
  for (const h of site.hours) {
    if (h.closed || !h.open || !h.close) continue;
    const [a, b] = h.days.toLowerCase().split(/[–-]/).map((s) => s.trim().slice(0, 3));
    const i = order.indexOf(a);
    const j = b ? order.indexOf(b) : i;
    out.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: order.slice(i, j + 1).map((d) => names[d]), opens: h.open, closes: h.close });
  }
  return out;
}
