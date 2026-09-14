#!/usr/bin/env node
/**
 * Drop every entry in barber-template/src/data/barbers.json that has no photo
 * to show: photo empty, street_view empty and photos[] empty or missing.
 *
 *   node remove-photoless.js            remove, rewrite barbers.json, write removed-photoless.txt
 *   node remove-photoless.js --dry-run  report only, write nothing
 *
 * The 150 original entries are protected. If any of them would be removed,
 * they are listed and nothing is written. The removed slugs go to
 * removed-photoless.txt, one per line, so they can be filtered out of the
 * dialling CSV (they are the Demo column without the host).
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const ROOT = __dirname;
const TARGET = resolve(ROOT, "barber-template", "src", "data", "barbers.json");
const REMOVED_LIST = resolve(ROOT, "removed-photoless.txt");
const dryRun = process.argv.includes("--dry-run");

/** Slugs of the 150 entries barbers.json held before any fresh rows were merged in. */
const ORIGINAL_SLUGS = new Set([
  "jacksons-for-hair",
  "hm-barbers",
  "nandj-cutz",
  "gentlemans-fade-barberstm-aldgate-east",
  "what-the-barber",
  "toni-and-tiger-barber-club",
  "milad-and-co-barber-shop",
  "the-noble-fellas-barbershop",
  "headmasters-fitzrovia",
  "turkish-barber-dunstable",
  "scissor-hand",
  "culture-2-barbers",
  "magic-scissors-traditional-turkish-barber",
  "look-sharp",
  "barber-house",
  "on-point-barbers",
  "rayan-barber",
  "hodges-hair-barber-shop",
  "fletcher-clarke-and-co-barber-shop",
  "sharp-and-flask-westbourne-park",
  "london-base-barbershop",
  "square-barber",
  "elms-barbers",
  "duke-hare",
  "maniac-barbers-worcester",
  "allesley-barber-ltd",
  "dexters-ilkley",
  "highgate-barbers",
  "captain-jack-s-barbershop",
  "sharp-and-flask-golborne-road",
  "muswell-hill-cuts-barbershop",
  "tony-and-son-barbers",
  "the-barber-catterick",
  "star-professional-hair-stylist",
  "ozzy-s-traditional-barbers",
  "worcester-barbers",
  "levre-beauty",
  "posh-pro-hair-and-beauty",
  "the-big-star-barbers",
  "poda-barbers",
  "rose-galaxy-beauty-centre",
  "cut-above-barbers",
  "sofia-s-gents-hair-design",
  "cutting-crew",
  "studio-22-hitchin",
  "snodland-barbers",
  "gazza-s-chop-shop-gents-barbering",
  "handsome-barbers",
  "barber-time",
  "gs-barber-shop",
  "mr-fade-grooming",
  "kath-s-barbers",
  "istanbul-turkish-barbers-taunton-just-walk-in",
  "cavalier-cuts",
  "blackbird-barbers-primrose-hill",
  "yaeger-barbers",
  "ebeneezers-barbers",
  "de-novo-barbershop",
  "states-barbers",
  "glance-barber",
  "barberesso-ldn",
  "mill-lane-barbers",
  "tayper-and-balla",
  "andrew-s-barbers",
  "the-noble-barbers",
  "barberhood",
  "terry-s-barber-shop",
  "men-at-work",
  "kings-barber",
  "moad-s-barbershop",
  "no-1-barber",
  "huntsman-male-grooming-and-academy",
  "ozzy-s-barber",
  "forever-barber-shop-hair-salon",
  "st-johns-barbers-coventry-by-ned",
  "chop-it-like-its-hot",
  "barberkingz-nw2",
  "hakan-barbers",
  "toddington-traditional-turkish-barbers",
  "the-gentry-at-highgate",
  "true-gents-barbers",
  "adam-barber",
  "heath-barbers",
  "vintage-barbers",
  "evolution-modern-grooming",
  "ace-of-fades",
  "gentex-barbers",
  "grizzly-felons",
  "poshe-nails-hair-and-beauty",
  "manny-s-barber-shop",
  "true-gents-barbers-london",
  "the-barber-shop",
  "the-barber-shop-tiverton",
  "head-kandi-barbers",
  "gio-s-barbers-royston",
  "deans-barber-shop-dean-winstanley-est-2008",
  "citybarbers",
  "fellas-and-kings",
  "take-2-hair-and-beauty-sittingbourne",
  "fade-n-blade",
  "the-barber-richmond-catterick",
  "magic-cuts",
  "naturally-u",
  "kaz-barber-shop",
  "the-beach-barber-bispham",
  "jj-s-barber-shop-coventry",
  "son-of-a-barber",
  "best-one-barber",
  "yaz-studio-barber-park-royal",
  "s-r-w-barber-shop",
  "mosesdan-barbers",
  "alermann-grooming-and-pet-supplies",
  "the-ottoman-traditional-turkish-barber",
  "danda-barber-shop",
  "the-barber-bar",
  "tiny-s-barbershop",
  "shivs-barbershop",
  "sandy-s-barbers",
  "harrys-hair-and-beauty",
  "iwade-village-barbers",
  "east-finchley-barbers",
  "scruples",
  "malvern-barbers",
  "kurdish-barber",
  "kaders-barber-shop",
  "royal-barber",
  "sami-barber-shop",
  "ca1-barber-shop",
  "universal-barber",
  "the-cockney-rebel-barbering-co",
  "abbey-unisex-salon",
  "gavin-s-barber-shop",
  "figaro-unisex-salon",
  "paul-s-barber-shop-hornsea",
  "tyler-s-of-baldock-barbershop",
  "charlie-parkers-cut-throat-and-coffee",
  "billy-s-barber",
  "eds-barbers",
  "wandy-s-barbers",
  "the-barber-co",
  "salsa-hairdressers-london",
  "oakley-s-barber-shop-and-smp",
  "peel-and-adams",
  "alis-barber-shop",
  "aro-barber",
  "covcuts-barbers",
  "jj-s-turkish-barbers",
  "fadeaway-barbers",
  "the-barber-shop-taunton",
  "lava-s-2"
]);

const photoless = (e) => !e.photo && !e.street_view && !(Array.isArray(e.photos) && e.photos.length > 0);

const entries = JSON.parse(readFileSync(TARGET, "utf8"));
if (!Array.isArray(entries)) throw new Error(`${TARGET} is not a JSON array`);

const removed = entries.filter(photoless);
const kept = entries.filter((e) => !photoless(e));
const protectedHits = removed.filter((e) => ORIGINAL_SLUGS.has(e.slug));

if (protectedHits.length) {
  console.error(`${protectedHits.length} of the original ${ORIGINAL_SLUGS.size} entries would be removed. Nothing written.`);
  for (const e of protectedHits) console.error(`  ${e.slug}`);
  process.exit(1);
}

if (!dryRun) {
  writeFileSync(TARGET, `${JSON.stringify(kept, null, 2)}\n`);
  writeFileSync(REMOVED_LIST, removed.length ? `${removed.map((e) => e.slug).join("\n")}\n` : "");
}

const originalsLeft = kept.filter((e) => ORIGINAL_SLUGS.has(e.slug)).length;
console.log(dryRun ? "Dry run, nothing written." : `Wrote ${TARGET} and ${REMOVED_LIST}.`);
console.log(`Entries: ${entries.length}, removed ${removed.length}, remaining ${kept.length}`);
console.log(`Original entries present: ${originalsLeft} of ${ORIGINAL_SLUGS.size}`);
