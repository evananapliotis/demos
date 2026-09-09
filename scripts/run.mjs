// Usage: node scripts/run.mjs <dev|build|preview> <slug>
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const [cmd, slug, ...rest] = process.argv.slice(2);
const usage = 'Usage: npm run <dev|build|preview> -- <client-slug>';
if (!cmd || !['dev', 'build', 'preview'].includes(cmd)) { console.error(usage); process.exit(1); }
if (!slug) { console.error(usage); process.exit(1); }
if (!existsSync(`clients/${slug}/site.json`)) { console.error(`No clients/${slug}/site.json. Run: npm run new -- ${slug} "<Name>"`); process.exit(1); }

const r = spawnSync('npx', ['astro', cmd, ...rest], { stdio: 'inherit', env: { ...process.env, CLIENT: slug }, shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
