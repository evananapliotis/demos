/**
 * Minimal .env loader. Walks up from the working directory so the repo-root
 * .env (one level above this project) is found without configuration.
 * Existing process.env values always win over the file.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function findDotenv(start: string = process.cwd()): string | null {
  let dir = start;
  for (;;) {
    const candidate = join(dir, '.env');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function loadDotenv(): string | null {
  const file = findDotenv();
  if (!file) return null;
  for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, '');
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
  return file;
}

export function requireEnv(name: string): string {
  const file = loadDotenv();
  const value = process.env[name];
  if (value && value.trim()) return value.trim();
  const where = file ? `Loaded ${file} but it has no ${name}.` : 'No .env file was found walking up from the current directory.';
  throw new Error(`${name} is not set. ${where}\nAdd a line like ${name}=... to the repo-root .env file.`);
}
