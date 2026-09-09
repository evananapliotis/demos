// Usage: npm run deploy -- <slug>
// Builds the client, then deploys to Netlify if NETLIFY_AUTH_TOKEN is set; otherwise zips dist/ at the repo root.
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

const slug = process.argv[2];
if (!slug || !existsSync(`clients/${slug}/site.json`)) {
  console.error('Usage: npm run deploy -- <client-slug>');
  process.exit(1);
}
const sh = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });

console.log(`\n▸ Building ${slug}`);
if (sh('node', ['scripts/run.mjs', 'build', slug]).status !== 0) process.exit(1);

if (process.env.NETLIFY_AUTH_TOKEN) {
  console.log(`\n▸ Deploying ${slug} to Netlify`);
  // Create the site if it does not exist yet; ignore the error if it already does.
  sh('npx', ['-y', 'netlify-cli', 'sites:create', '--name', slug], { stdio: ['inherit', 'inherit', 'ignore'] });
  const r = sh('npx', ['-y', 'netlify-cli', 'deploy', '--prod', '--dir', 'dist', '--site', slug]);
  process.exit(r.status ?? 1);
} else {
  const zip = `${slug}.zip`;
  rmSync(zip, { force: true });
  console.log(`\n▸ NETLIFY_AUTH_TOKEN not set — zipping dist/ to ./${zip}`);
  const r = sh('zip', ['-qr', `../${zip}`, '.'], { cwd: 'dist' });
  if (r.status !== 0) {
    // Fallback for machines without `zip`.
    const py = sh('python3', ['-c', `import shutil; shutil.make_archive('${slug}', 'zip', 'dist')`]);
    if (py.status !== 0) process.exit(1);
  }
  console.log(`Done: ${zip}\nDrag it onto https://app.netlify.com/drop, or hand it to any static host.`);
}
