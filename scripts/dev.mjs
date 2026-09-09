// npm run dev -- <slug>
import { slugArg, requireClient, run } from './_lib.mjs';
const slug = slugArg('npm run dev -- <slug>');
requireClient(slug);
run('npx', ['astro', 'dev', ...process.argv.slice(3)], { CLIENT: slug });
