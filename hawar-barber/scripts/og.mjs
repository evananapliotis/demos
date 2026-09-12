// Renders public/og.png (1200×630) from site.config.ts with the site's own fonts. Runs before `astro build`.
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fontsDir = resolve(root, 'src/og/fonts');
const conf = resolve(root, 'src/og/fonts.conf');
writeFileSync(
  conf,
  `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${fontsDir}</dir><cachedir>/tmp/hawar-og-fontcache</cachedir><config></config></fontconfig>`,
);
process.env.FONTCONFIG_FILE = conf;

const { site } = await import('../site.config.ts');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, '’');
const [first, ...rest] = site.name.split(' ');
const stars = '★★★★★';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <pattern id="stripes" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
      <rect width="80" height="80" fill="#f4eee4"/><rect width="80" height="26" fill="#f2a93b"/><rect y="42" width="80" height="14" fill="#0e0c0a"/>
    </pattern>
    <linearGradient id="chrome" x1="0" x2="1"><stop offset="0" stop-color="#6d675e"/><stop offset="0.3" stop-color="#ece7dd"/><stop offset="0.5" stop-color="#fbf8f2"/><stop offset="0.75" stop-color="#b3ab9e"/><stop offset="1" stop-color="#4d4840"/></linearGradient>
    <linearGradient id="shade" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="0.3" stop-color="#000" stop-opacity="0"/><stop offset="0.55" stop-color="#fff" stop-opacity="0.14"/><stop offset="1" stop-color="#000" stop-opacity="0.6"/></linearGradient>
    <radialGradient id="glow" cx="0.95" cy="0.05" r="0.7"><stop offset="0" stop-color="#f2a93b" stop-opacity="0.22"/><stop offset="1" stop-color="#f2a93b" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#0e0c0a"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g transform="translate(940 60) rotate(-6 80 250)">
    <circle cx="80" cy="34" r="30" fill="url(#chrome)"/>
    <rect x="64" y="56" width="32" height="18" fill="url(#chrome)"/>
    <rect x="18" y="70" width="124" height="22" rx="5" fill="url(#chrome)"/>
    <rect x="30" y="92" width="100" height="330" fill="url(#stripes)"/>
    <rect x="30" y="92" width="100" height="330" fill="url(#shade)"/>
    <rect x="18" y="420" width="124" height="22" rx="5" fill="url(#chrome)"/>
    <rect x="64" y="442" width="32" height="60" fill="url(#chrome)"/>
  </g>
  <text x="80" y="128" font-family="DM Sans" font-weight="700" font-size="24" letter-spacing="5" fill="#f2a93b">BARBER SHOP · NORTH ROAD, ${esc(site.address.locality.toUpperCase())}</text>
  <text x="76" y="330" font-family="Big Shoulders Display" font-weight="800" font-size="210" fill="#f4eee4">${esc(first)}</text>
  <text x="76" y="500" font-family="Big Shoulders Display" font-weight="800" font-size="210" fill="#f2a93b">${esc(rest.join(' '))}</text>
  <text x="80" y="566" font-family="DM Sans" font-weight="700" font-size="30" fill="#f4eee4"><tspan fill="#f2a93b">${site.google.rating.toFixed(1)} ${stars}</tspan>  from ${site.google.reviewCount} Google reviews</text>
  <text x="80" y="604" font-family="DM Sans" font-weight="500" font-size="24" fill="#b9b0a2">${esc(site.address.street)}, ${esc(site.address.locality)} ${esc(site.address.postcode)}  ·  ${esc(site.phone.display)}</text>
</svg>`;

mkdirSync(resolve(root, 'public'), { recursive: true });
const out = resolve(root, 'public/og.png');
await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile(out);
console.log(`og: wrote ${out}`);
