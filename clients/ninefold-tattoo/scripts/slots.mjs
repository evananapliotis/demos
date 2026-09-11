// The shot list. One entry per photograph the site needs, keyed by slot name.
// `keywords` score search results; `avoid` words disqualify them; `orientation` is passed to the search.
// `aspect` only shapes the gitignored dev stand-ins.
export const SLOTS = [
  { slot: 'hero', orientation: 'portrait', aspect: [4, 5], keywords: ['tattoo', 'sleeve', 'back', 'dark', 'man', 'woman', 'arm', 'body'], avoid: ['drawing', 'illustration', 'vector', 'sticker', 'gun', 'henna'], queries: ['tattoo sleeve dark portrait', 'tattooed man dark studio', 'tattoo back piece', 'tattooed body black background'] },
  { slot: 'fine-line-botanical', orientation: 'portrait', aspect: [4, 5], keywords: ['fine', 'line', 'flower', 'floral', 'botanical', 'forearm', 'arm', 'plant', 'leaf'], avoid: ['drawing', 'illustration', 'vector', 'henna'], queries: ['fine line tattoo flower', 'botanical tattoo forearm', 'minimal floral tattoo arm', 'flower tattoo arm'] },
  { slot: 'fine-line-small', orientation: 'squarish', aspect: [1, 1], keywords: ['small', 'minimal', 'fine', 'line', 'wrist', 'tiny', 'script', 'delicate'], avoid: ['drawing', 'illustration', 'vector', 'henna'], queries: ['small tattoo minimalist wrist', 'fine line tattoo wrist', 'tiny tattoo', 'minimal tattoo hand'] },
  { slot: 'blackwork-geometric', orientation: 'portrait', aspect: [4, 5], keywords: ['geometric', 'dotwork', 'mandala', 'black', 'pattern', 'lines', 'arm', 'forearm'], avoid: ['drawing', 'illustration', 'vector', 'henna', 'colorful'], queries: ['geometric tattoo arm', 'dotwork tattoo', 'mandala tattoo arm', 'black geometric tattoo'] },
  { slot: 'blackwork-heavy', orientation: 'portrait', aspect: [3, 4], keywords: ['blackwork', 'black', 'sleeve', 'chest', 'ornamental', 'solid', 'shoulder', 'tribal'], avoid: ['drawing', 'illustration', 'vector', 'henna', 'colorful'], queries: ['blackwork tattoo sleeve', 'black tattoo chest', 'ornamental tattoo shoulder', 'heavy black tattoo'] },
  { slot: 'japanese-sleeve', orientation: 'portrait', aspect: [3, 4], keywords: ['japanese', 'koi', 'dragon', 'wave', 'sleeve', 'irezumi', 'blossom', 'snake', 'oni'], avoid: ['drawing', 'illustration', 'vector', 'henna', 'print', 'woodblock'], queries: ['japanese tattoo sleeve', 'koi tattoo arm', 'irezumi', 'japanese style tattoo'] },
  { slot: 'japanese-large', orientation: 'portrait', aspect: [4, 5], keywords: ['japanese', 'back', 'dragon', 'koi', 'bodysuit', 'full', 'large', 'torso', 'leg'], avoid: ['drawing', 'illustration', 'vector', 'henna', 'print', 'woodblock'], queries: ['japanese tattoo back', 'dragon tattoo back', 'tattoo bodysuit', 'full back tattoo'] },
  { slot: 'colour-realism-1', orientation: 'landscape', aspect: [3, 2], keywords: ['color', 'colour', 'colorful', 'realism', 'realistic', 'flowers', 'rose', 'animal', 'portrait', 'vivid'], avoid: ['drawing', 'illustration', 'vector', 'henna'], queries: ['colorful tattoo realism', 'color tattoo flowers arm', 'realistic tattoo color', 'colorful tattoo arm'] },
  { slot: 'colour-realism-2', orientation: 'portrait', aspect: [4, 5], keywords: ['color', 'colour', 'colorful', 'sleeve', 'watercolor', 'neo', 'traditional', 'bright'], avoid: ['drawing', 'illustration', 'vector', 'henna'], queries: ['colorful tattoo sleeve', 'watercolor tattoo', 'neo traditional tattoo', 'bright color tattoo'] },
  { slot: 'healed', orientation: 'portrait', aspect: [4, 5], keywords: ['healed', 'old', 'tattoo', 'arm', 'natural', 'daylight', 'skin', 'matte', 'faded'], avoid: ['drawing', 'illustration', 'vector', 'henna', 'wrap', 'plastic'], queries: ['healed tattoo arm', 'tattoo natural light arm', 'old tattoo skin', 'tattoo forearm daylight'] },
  { slot: 'studio-interior', orientation: 'landscape', aspect: [3, 2], keywords: ['studio', 'shop', 'parlor', 'parlour', 'interior', 'chair', 'lamp', 'room'], avoid: ['drawing', 'illustration', 'vector', 'exterior', 'sign', 'street'], queries: ['tattoo studio interior', 'tattoo shop inside', 'tattoo parlour chair', 'tattoo studio'] },
  { slot: 'artist-at-work', orientation: 'landscape', aspect: [3, 2], keywords: ['artist', 'working', 'machine', 'gloves', 'tattooing', 'hands', 'needle', 'process'], avoid: ['drawing', 'illustration', 'vector', 'henna', 'pen'], queries: ['tattoo artist working', 'tattoo machine hands gloves', 'tattooing close up', 'tattoo artist at work'] },
  { slot: 'stencil', orientation: 'portrait', aspect: [4, 5], keywords: ['stencil', 'drawing', 'sketch', 'sketchbook', 'flash', 'design', 'paper', 'pencil', 'tracing'], avoid: ['vector', 'digital', 'screen', 'ipad'], queries: ['tattoo stencil', 'tattoo drawing sketchbook', 'tattoo flash sheet', 'tattoo design paper'] },
  { slot: 'ink-machine', orientation: 'squarish', aspect: [1, 1], keywords: ['ink', 'machine', 'caps', 'needle', 'equipment', 'gun', 'cartridge', 'station'], avoid: ['drawing', 'illustration', 'vector', 'pen', 'printer'], queries: ['tattoo ink caps', 'tattoo machine detail', 'tattoo equipment', 'tattoo machine close up'] },
  { slot: 'interstitial', orientation: 'landscape', aspect: [3, 2], keywords: ['tattooed', 'portrait', 'moody', 'studio', 'hands', 'woman', 'man', 'arm', 'dark'], avoid: ['drawing', 'illustration', 'vector', 'henna'], queries: ['tattooed woman portrait moody', 'tattooed hands', 'tattoo studio atmosphere', 'tattooed person dark'] },
  { slot: 'extra-1', orientation: 'portrait', aspect: [4, 5], keywords: ['tattoo', 'close', 'detail', 'skin', 'black', 'snake', 'dagger', 'arm', 'leg'], avoid: ['drawing', 'illustration', 'vector', 'henna'], queries: ['tattoo close up', 'black tattoo detail', 'snake tattoo', 'tattoo detail skin'] },
  { slot: 'extra-2', orientation: 'squarish', aspect: [1, 1], keywords: ['hand', 'tattoo', 'knuckles', 'fingers', 'detail', 'close'], avoid: ['drawing', 'illustration', 'vector', 'henna', 'ring'], queries: ['hand tattoo close up', 'tattooed hand', 'finger tattoo', 'tattoo knuckles'] },
];

// Derived by scripts/prepare-images.mjs from the `healed` photograph.
export const DERIVED = [
  { slot: 'pair-fresh', aspect: [4, 5] },
  { slot: 'pair-healed', aspect: [4, 5] },
];

import { pathToFileURL } from 'node:url';
// IMAGES_DIR / CREDITS_PATH env overrides exist so the pipeline can be tested against a mock server.
export const IMAGES_DIR = process.env.IMAGES_DIR ? pathToFileURL(process.env.IMAGES_DIR.replace(/\/?$/, '/')) : new URL('../src/images/', import.meta.url);
export const CREDITS_PATH = process.env.CREDITS_PATH ? pathToFileURL(process.env.CREDITS_PATH) : new URL('../CREDITS.md', import.meta.url);
