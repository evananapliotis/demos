// Usage: npm run new -- <slug> "<Business Name>"
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';

const [slug, name] = process.argv.slice(2);
if (!slug || !name || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('Usage: npm run new -- <slug> "<Business Name>"   (slug: lowercase letters, digits, hyphens)');
  process.exit(1);
}
const dir = `clients/${slug}`;
if (existsSync(dir)) { console.error(`${dir} already exists`); process.exit(1); }

const tpl = JSON.parse(readFileSync('clients/_template.json', 'utf8'));
const filled = JSON.parse(JSON.stringify(tpl).replaceAll('{{NAME}}', name).replaceAll('{{SLUG}}', slug));
mkdirSync(`${dir}/photos`, { recursive: true });
writeFileSync(`${dir}/site.json`, JSON.stringify(filled, null, 2) + '\n');
writeFileSync(`${dir}/photos/.gitkeep`, '');

console.log(`Created ${dir}/site.json and ${dir}/photos/

Next:
  1. Drop the client's real photos into ${dir}/photos/ (webp/jpg/png).
  2. Fill in ${dir}/site.json — every "src" must match a photo file name (no extension).
  3. npm run dev -- ${slug}        # check it at 390px wide first
  4. npm run build -- ${slug}
  5. npm run deploy -- ${slug}
`);
