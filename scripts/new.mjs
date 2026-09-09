// npm run new -- <slug> "<Business name>"
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { slugArg } from './_lib.mjs';

const slug = slugArg('npm run new -- <slug> "<Business name>"');
const name = process.argv[3];
if (!name) {
  console.error('Missing business name. Usage: npm run new -- <slug> "<Business name>"');
  process.exit(1);
}
const dir = resolve(`clients/${slug}`);
if (existsSync(resolve(dir, 'site.json'))) {
  console.error(`clients/${slug}/site.json already exists. Pick another slug or edit that file.`);
  process.exit(1);
}
mkdirSync(resolve(dir, 'photos'), { recursive: true });
const example = JSON.parse(readFileSync(resolve('template/site.example.json'), 'utf8'));
example.name = name;
example.slug = slug;
example.url = `https://${slug}.netlify.app`;
writeFileSync(resolve(dir, 'site.json'), JSON.stringify(example, null, 2) + '\n');
writeFileSync(resolve(dir, 'photos/.gitkeep'), '');
console.log(`Created clients/${slug}/site.json and clients/${slug}/photos/\n`);
console.log('Next:');
console.log(`  1. Drop the client's photos into clients/${slug}/photos/ (hero.jpg + gallery-01.jpg …).`);
console.log(`  2. Fill in clients/${slug}/site.json (phone, address, hours, prices, reviews, about).`);
console.log(`  3. npm run dev -- ${slug}      # check it at http://localhost:4321`);
console.log(`  4. npm run build -- ${slug} && npm run deploy -- ${slug}`);
