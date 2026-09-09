import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function slugArg(usage) {
  const slug = process.argv[2];
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    console.error(`Usage: ${usage}\n  <slug> must be lowercase letters, digits and hyphens (e.g. brixham-barber-shop).`);
    process.exit(1);
  }
  return slug;
}

export function requireClient(slug) {
  const p = resolve(`clients/${slug}/site.json`);
  if (!existsSync(p)) {
    console.error(`No client at clients/${slug}/site.json. Create one with:\n  npm run new -- ${slug} "<Business name>"`);
    process.exit(1);
  }
  return p;
}

export function run(cmd, args, extraEnv = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...extraEnv }, shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
