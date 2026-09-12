globalThis.process ??= {}; globalThis.process.env ??= {};
const site = {
  name: "HAWAR BARBER",
  /** One line under the name. Only claims the listing supports. */
  tagline: "Five-star barbering on North Road, Darlington.",
  /** Meta description (~150 chars). */
  description: "HAWAR BARBER, 321 North Rd, Darlington DL1 3BL. Barber shop rated 5.0 from 56 Google reviews. Wheelchair accessible, closes 6pm. Call 07918 899141.",
  /** Public URL. Cloudflare Pages gives <project>.pages.dev; change when a domain is attached. */
  url: "https://hawar-barber.pages.dev",
  phone: { display: "07918 899141", tel: "+447918899141" },
  address: { street: "321 North Rd", locality: "Darlington", postcode: "DL1 3BL", region: "County Durham", country: "GB" },
  /** Centre of postcode DL1 3BL (public postcode data). Approximate: not the pin itself. */
  geo: { lat: 54.547023, lng: -1.547865},
  google: {
    rating: 5,
    reviewCount: 56,
    /** The search that finds the listing on Google Maps. */
    query: "HAWAR BARBER 321 North Rd Darlington"
  },
  /** Attributes shown on the Google listing. */
  features: ["Wheelchair accessible"],
  hours: {
    /** Google shows "Closes 6 pm". */
    closes: "18:00"},
  /** No services or prices are published anywhere we could read. Add them and the list renders. */
  services: [],
  pricesNote: "Prices are not published online. Call and ask before you come in.",
  /** Paste real Google reviews here (author first name, rating, exact text). Empty = rating band only. */
  reviews: [],
  /** About copy. Facts only. */
  about: [
    "HAWAR BARBER is a barber shop at 321 North Road, Darlington, DL1 3BL.",
    "Fifty-six people have reviewed the shop on Google, and the rating stands at 5.0 out of 5.",
    "The shop is wheelchair accessible and closes at 6pm. Call 07918 899141 to check today’s hours before you set off."
  ],
  /**
   * Built-in booking requests (/book → Cloudflare D1 → /admin). Customers pick a day and time; the shop
   * confirms by text or phone. Set `enabled: false` to hide every "Book" button.
   */
  booking: {
    /** How far ahead a request can be made. */
    daysAhead: 60,
    /** Slot spacing, used once `hours.week` is filled in. */
    slotMinutes: 30,
    /** Latest request must be at least this many minutes before closing. */
    lastSlotBeforeClose: 30,
    /** Shown on the form and on the confirmation. */
    confirmNote: "Nothing is booked until the shop confirms. They will text or call you back."
  },
  /** Social profiles. Only the Facebook page could be confirmed as this shop. */
  socials: [{ label: "Facebook", url: "https://www.facebook.com/61574727154851" }],
  images: {
    hero: "hero.jpg",
    shopfront: "shopfront.jpg",
    galleryPrefix: "gallery-",
    /** Alt text per file. Name the service and the town. */
    alt: {
      "hero.jpg": "Fresh haircut at HAWAR BARBER, Darlington",
      "shopfront.jpg": "The front of HAWAR BARBER on North Road, Darlington"
    },
    galleryAlt: "Haircut from the chair at HAWAR BARBER, Darlington"
  }
};

export { site as s };
