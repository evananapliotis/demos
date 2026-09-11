// node build.mjs [--allow-standins]   → checks every photograph exists, builds dist/, zips it to
// ../../ninefold-tattoo.zip (the repo root). With --allow-standins it builds using the gitignored
// dev stand-ins for layout review and refuses to zip.
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SLOTS, DERIVED, IMAGES_DIR } from './scripts/slots.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const allowStandIns = process.argv.includes('--allow-standins');
const imagesDir = fileURLToPath(IMAGES_DIR);
const sh = (c, a, o = {}) => spawnSync(c, a, { stdio: 'inherit', cwd: here, shell: process.platform === 'win32', ...o });

const missing = SLOTS.map((s) => s.slot).filter((s) => !existsSync(`${imagesDir}${s}.jpg`));
const missingDerived = DERIVED.map((d) => d.slot).filter((s) => !existsSync(`${imagesDir}derived/${s}.jpg`));
if (missing.length && !allowStandIns) {
  console.error(`Missing photographs for: ${missing.join(', ')}.\nRun \`pnpm images\` (needs network access to unsplash.com / pexels.com), then \`pnpm images:prepare\`.`);
  process.exit(1);
}
if (!missing.length && missingDerived.length) {
  console.log('Deriving the fresh/healed pair…');
  if (sh('node', ['scripts/prepare-images.mjs']).status !== 0) process.exit(1);
}
if (allowStandIns && missing.length) {
  const standIn = missing.filter((s) => existsSync(`${imagesDir}_dev/${s}.jpg`));
  if (standIn.length !== missing.length) { console.error('Stand-ins missing too. Run `pnpm standins`.'); process.exit(1); }
  console.log(`Building with ${missing.length} stand-in image(s): ${missing.join(', ')}. This build will not be zipped.`);
}

if (sh('npx', ['astro', 'build']).status !== 0) process.exit(1);

if (allowStandIns && missing.length) { console.log('\nDone: dist/ (layout review only, not zipped).'); process.exit(0); }

const zip = 'ninefold-tattoo.zip';
rmSync(`${repoRoot}${zip}`, { force: true });
const z = sh('zip', ['-qr', `${repoRoot}${zip}`, '.'], { cwd: `${here}dist` });
if (z.status !== 0) {
  const py = sh('python3', ['-c', `import shutil; shutil.make_archive('${repoRoot}ninefold-tattoo', 'zip', 'dist')`]);
  if (py.status !== 0) process.exit(1);
}
console.log(`\nDone: ${repoRoot}${zip} (drop it on https://app.netlify.com/drop or any static host)`);
