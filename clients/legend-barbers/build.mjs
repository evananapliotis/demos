// Usage: node clients/legend-barbers/build.mjs [build|dev|preview]
// `build` (default) writes dist/ and zips it to legend-barbers.zip at the repo root.
import { spawnSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cmd = process.argv[2] ?? 'build';
const root = fileURLToPath(new URL('../../', import.meta.url));
const config = 'clients/legend-barbers/astro.config.mjs';
const sh = (c, a, o = {}) => spawnSync(c, a, { stdio: 'inherit', cwd: root, shell: process.platform === 'win32', ...o });

if (!['build', 'dev', 'preview'].includes(cmd)) { console.error('Usage: node clients/legend-barbers/build.mjs [build|dev|preview]'); process.exit(1); }
if (!existsSync(`${root}/node_modules`)) { console.error('Run `npm install` at the repo root first.'); process.exit(1); }

const r = sh('npx', ['astro', cmd, '--config', config, ...process.argv.slice(3)]);
if (r.status !== 0 || cmd !== 'build') process.exit(r.status ?? 1);

const zip = 'legend-barbers.zip';
rmSync(`${root}/${zip}`, { force: true });
const z = sh('zip', ['-qr', `../${zip}`, '.'], { cwd: `${root}/dist` });
if (z.status !== 0) {
  const py = sh('python3', ['-c', `import shutil; shutil.make_archive('legend-barbers', 'zip', 'dist')`]);
  if (py.status !== 0) process.exit(1);
}
console.log(`\nDone: ${zip} (drop it on https://app.netlify.com/drop or any static host)`);
