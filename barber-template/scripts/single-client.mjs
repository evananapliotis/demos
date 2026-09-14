/**
 * Astro integration for a CLIENT_SLUG build, where one shop's page is the
 * whole site. Two jobs, both once the pages are written:
 *
 *   1. dist/_redirects. The page is the root of the client's own domain, so
 *      the paths it lives at on the demo site — /<slug>, and the older
 *      /demo/<slug> — are 301s to it. public/_redirects is the demo site's
 *      own file and is replaced.
 *   2. dist/photos, dist/img and dist/brand. public/ is copied whole, which
 *      on a single-client build means every other shop's photos (over a
 *      gigabyte of them) and the whole MyBarberSite identity. Every file
 *      under those three that no built page asks for is deleted.
 *
 * Nothing here runs on a full demo build.
 */
import { readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Public directories a single-client build prunes. Everything else in dist/ is kept. */
const PRUNED = ['photos', 'img', 'brand'];
/** Files worth reading for references: the pages, their stylesheets and scripts, and the manifests those reach. */
const READABLE = /\.(html|css|js|mjs|json|webmanifest|svg)$/i;
/** A root-absolute path into one of the pruned directories, up to the query string. */
const REFERENCE = /\/(?:photos|img|brand)\/[A-Za-z0-9._~@+-]+/g;

function filesUnder(dir) {
  const out = [];
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const path = join(d, entry.name);
      if (entry.isDirectory()) walk(path);
      else out.push(path);
    }
  };
  try {
    walk(dir);
  } catch {
    /* the directory is not in this build */
  }
  return out;
}

/**
 * Every file under the pruned directories a built page reaches, directly or
 * through a manifest it names. Read in rounds: a file only has its own
 * references followed once something already kept points at it.
 */
function reachable(dist) {
  const kept = new Set();
  let queue = filesUnder(dist).filter((f) => !PRUNED.some((d) => f.startsWith(join(dist, d) + '/')) && READABLE.test(f));
  while (queue.length) {
    const found = new Set();
    for (const file of queue) for (const match of readFileSync(file, 'utf8').matchAll(REFERENCE)) found.add(match[0]);
    queue = [];
    for (const path of found) {
      if (kept.has(path)) continue;
      kept.add(path);
      const file = join(dist, path);
      if (READABLE.test(file) && statSync(file, { throwIfNoEntry: false })?.isFile()) queue.push(file);
    }
  }
  return kept;
}

/** Removes a directory once nothing is left in it, and its now-empty parents below dist. */
function dropEmpty(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) if (entry.isDirectory()) dropEmpty(join(dir, entry.name));
  if (readdirSync(dir).length === 0) rmSync(dir, { recursive: true });
}

export function singleClient(slug) {
  return {
    name: 'barber-template:single-client',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const dist = fileURLToPath(dir);

        writeFileSync(
          join(dist, '_redirects'),
          [
            `# Single-client build for ${slug}: the shop's page is the root of this domain.`,
            '# The paths it has on the demo site are permanent redirects to it.',
            `/demo/${slug} / 301`,
            `/demo/${slug}/* / 301`,
            `/${slug} / 301`,
            `/${slug}/* / 301`,
            '',
          ].join('\n'),
        );

        const kept = reachable(dist);
        let removed = 0;
        let freed = 0;
        for (const name of PRUNED) {
          for (const file of filesUnder(join(dist, name))) {
            if (kept.has('/' + relative(dist, file).split(sep).join('/'))) continue;
            freed += statSync(file).size;
            rmSync(file);
            removed++;
          }
          dropEmpty(join(dist, name));
        }
        logger.info(`single-client: kept ${kept.size} public asset(s), removed ${removed} (${(freed / 1e9).toFixed(2)} GB), wrote _redirects for ${slug}`);
      },
    },
  };
}
