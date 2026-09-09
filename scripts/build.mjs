// npm run build -- <slug>   → builds clients/<slug> into dist/
import { writeFileSync } from 'node:fs';
import { slugArg, requireClient, run } from './_lib.mjs';
const slug = slugArg('npm run build -- <slug>');
requireClient(slug);
run('npx', ['astro', 'build', ...process.argv.slice(3)], { CLIENT: slug });
// Marker so deploy knows which client dist/ holds.
writeFileSync('dist/.client', slug + '\n');
console.log(`\nBuilt clients/${slug} → dist/`);
