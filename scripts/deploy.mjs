// npm run deploy -- <slug>
// With NETLIFY_AUTH_TOKEN: creates (if needed) and deploys the Netlify site <slug>.
// Without it: zips dist/ to <slug>.zip at the repo root for drag-and-drop on app.netlify.com/drop.
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { slugArg, requireClient, run } from './_lib.mjs';

const slug = slugArg('npm run deploy -- <slug>');
requireClient(slug);

const built = existsSync('dist/.client') ? readFileSync('dist/.client', 'utf8').trim() : null;
if (built !== slug) {
  console.log(`dist/ ${built ? `holds "${built}"` : 'is missing'}; building ${slug} first…`);
  run('node', ['scripts/build.mjs', slug]);
}

if (process.env.NETLIFY_AUTH_TOKEN) {
  // sites:create fails if the name is taken (including by us, on a re-deploy) — that's fine.
  const create = spawnSync('npx', ['netlify', 'sites:create', '--name', slug], { stdio: 'inherit', env: process.env });
  if (create.status !== 0) console.log(`(sites:create returned ${create.status}; assuming "${slug}" already exists)`);
  run('npx', ['netlify', 'deploy', '--prod', '--dir', 'dist', '--site', slug]);
  console.log(`\nDeployed: https://${slug}.netlify.app`);
} else {
  const zip = `${slug}.zip`;
  if (existsSync(zip)) rmSync(zip);
  const r = spawnSync('zip', ['-rq', `../${zip}`, '.'], { cwd: 'dist', stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('zip failed. Install `zip` or set NETLIFY_AUTH_TOKEN to deploy directly.');
    process.exit(1);
  }
  console.log(`\nNETLIFY_AUTH_TOKEN not set. Wrote ${zip} at the repo root.`);
  console.log('Drop it on https://app.netlify.com/drop to publish (or add the token and re-run to deploy from here).');
}
